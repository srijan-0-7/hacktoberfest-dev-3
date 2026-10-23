import os
import uuid
import shutil
import logging
import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks, UploadFile, File, Form

from backend.app.config import settings, DEMO_DIR
from backend.app.models.schemas import (
    OllamaStatus, ModelSelectRequest, FolderScanRequest,
    OrganizationPlan, PlanUpdateRequest, PlanExecuteRequest,
    BatchExecutionSummary, UndoRequest, UndoResult,
    DigestRequest, DigestResponse, JobStatusResponse,
    AppSettings, SettingsUpdateRequest
)
from backend.app.services.scanner import scan_folder, SecurityScanError
from backend.app.services.organizer import create_organization_plan, validate_plan_action
from backend.app.services.executor import execute_approved_batch
from backend.app.services.undo_service import undo_operation, undo_job_operations
from backend.app.services.digest_service import process_document_digest, get_saved_digests
from backend.app.services.history_service import (
    create_job, update_job_progress, get_job_status,
    get_recent_history, get_job_operations
)
from backend.app.services.ai_service import ai_service
from backend.app.services.demo_service import init_demo_sandbox

logger = logging.getLogger("sloth.api")
router = APIRouter()

# In-memory store for active plans
ACTIVE_PLANS: Dict[str, OrganizationPlan] = {}

# Cancelled jobs tracking
CANCELLED_JOBS: set[str] = set()

@router.get("/health")
def get_health():
    return {
        "status": "healthy",
        "app": settings.app_name,
        "version": settings.version,
        "timestamp": datetime.datetime.now().isoformat(),
        "local_only_mode": settings.local_only_mode
    }

@router.get("/ai/status", response_model=OllamaStatus)
def get_ai_status():
    status = ai_service.check_status()
    return status

@router.get("/ai/models")
def get_ai_models():
    status = ai_service.check_status()
    return {
        "active_model": status.active_model,
        "available_models": status.available_models,
        "reachable": status.reachable
    }

@router.post("/ai/models/select")
def select_ai_model(req: ModelSelectRequest):
    ai_service.set_model(req.model_name)
    return {"status": "success", "selected_model": req.model_name}

@router.post("/demo/setup")
def setup_demo_sandbox(force_reset: bool = True):
    """Setup or reset the demonstration directory with sample files."""
    try:
        demo_path = init_demo_sandbox(force_reset=force_reset)
        return {
            "status": "success",
            "message": "Demo sandbox initialized with 8 sample files.",
            "demo_path": demo_path
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to setup demo sandbox: {str(e)}")

@router.post("/folders/scan")
def api_scan_folder(req: FolderScanRequest):
    """Scan folder and return metadata for files found."""
    try:
        files = scan_folder(req.folder_path, recursive=req.recursive)
        return {
            "folder_path": req.folder_path,
            "total_files": len(files),
            "files": [f.model_dump() for f in files]
        }
    except SecurityScanError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Folder scan failed: {str(e)}")

def run_organize_job(job_id: str, folder_path: str, recursive: bool):
    """Background task for analyzing files and building organization plan."""
    try:
        files = scan_folder(folder_path, recursive=recursive)
        total = len(files)
        update_job_progress(job_id, processed_items=0, total_items=total, status="running")
        
        def progress_cb(current: int, total: int):
            if job_id in CANCELLED_JOBS:
                raise Exception("Job cancelled by user.")
            update_job_progress(job_id, processed_items=current, total_items=total)

        plan = create_organization_plan(
            folder_path=folder_path,
            files=files,
            job_id=job_id,
            progress_callback=progress_cb
        )
        
        ACTIVE_PLANS[plan.plan_id] = plan
        update_job_progress(
            job_id,
            processed_items=total,
            total_items=total,
            status="completed",
            metadata={"plan_id": plan.plan_id, "total_files": total}
        )
    except Exception as e:
        logger.error(f"Error in organize job {job_id}: {e}")
        status = "cancelled" if job_id in CANCELLED_JOBS else "failed"
        update_job_progress(job_id, processed_items=0, status=status, metadata={"error": str(e)})

@router.post("/folders/analyze")
def api_analyze_folder(req: FolderScanRequest, background_tasks: BackgroundTasks):
    """Start asynchronous folder analysis and organization planning."""
    job_id = str(uuid.uuid4())[:8]
    create_job(job_id, job_type="folder_organize", target_path=req.folder_path)
    
    background_tasks.add_task(run_organize_job, job_id, req.folder_path, req.recursive)
    
    return {
        "job_id": job_id,
        "status": "started",
        "message": "Analysis running in background."
    }

@router.get("/plans/{plan_id}", response_model=OrganizationPlan)
def get_plan(plan_id: str):
    plan = ACTIVE_PLANS.get(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Organization plan not found or expired.")
    return plan

@router.patch("/plans/{plan_id}", response_model=OrganizationPlan)
def update_plan(plan_id: str, update: PlanUpdateRequest):
    plan = ACTIVE_PLANS.get(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Organization plan not found.")
        
    plan.actions = update.actions
    ACTIVE_PLANS[plan_id] = plan
    return plan

@router.post("/plans/{plan_id}/validate")
def validate_plan(plan_id: str):
    plan = ACTIVE_PLANS.get(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Organization plan not found.")
        
    folder_root = Path(plan.folder_path)
    seen_dest = set()
    validated_actions = []
    has_errors = False
    
    for a in plan.actions:
        val_action = validate_plan_action(a, folder_root, seen_dest)
        if val_action.validation_error:
            has_errors = True
        validated_actions.append(val_action)
        
    plan.actions = validated_actions
    ACTIVE_PLANS[plan_id] = plan
    
    return {
        "plan_id": plan_id,
        "is_valid": not has_errors,
        "actions": [a.model_dump() for a in validated_actions]
    }

@router.post("/plans/{plan_id}/execute", response_model=BatchExecutionSummary)
def execute_plan(plan_id: str, req: PlanExecuteRequest):
    """Execute user-approved operations with two-phase verification."""
    plan = ACTIVE_PLANS.get(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found.")
        
    approved_set = set(req.approved_action_ids)
    actions_to_run = [
        a for a in plan.actions
        if a.id in approved_set and not a.is_excluded
    ]
    
    if not actions_to_run:
        raise HTTPException(status_code=400, detail="No approved actions selected for execution.")
        
    exec_job_id = str(uuid.uuid4())[:8]
    create_job(exec_job_id, job_type="batch_execution", target_path=plan.folder_path, total_items=len(actions_to_run))
    
    summary = execute_approved_batch(
        job_id=exec_job_id,
        plan_id=plan_id,
        actions_to_execute=actions_to_run
    )
    
    plan.status = "completed"
    return summary

@router.post("/operations/{operation_id}/undo", response_model=UndoResult)
def api_undo_operation(operation_id: str):
    res = undo_operation(operation_id)
    if not res.success:
        raise HTTPException(status_code=400, detail=res.error)
    return res

@router.post("/jobs/{job_id}/undo")
def api_undo_job(job_id: str):
    results = undo_job_operations(job_id)
    successful = sum(1 for r in results if r.success)
    return {
        "job_id": job_id,
        "total_operations": len(results),
        "undone_successful": successful,
        "results": [r.model_dump() for r in results]
    }

@router.get("/jobs/{job_id}", response_model=JobStatusResponse)
def api_get_job(job_id: str):
    job = get_job_status(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return job

@router.post("/jobs/{job_id}/cancel")
def api_cancel_job(job_id: str):
    CANCELLED_JOBS.add(job_id)
    update_job_progress(job_id, processed_items=0, status="cancelled")
    return {"status": "cancelled", "job_id": job_id}

@router.post("/documents/summarize", response_model=DigestResponse)
def api_summarize_document(req: DigestRequest):
    try:
        resp = process_document_digest(req)
        return resp
    except Exception as e:
        logger.error(f"Digest failed: {e}")
        raise HTTPException(status_code=500, detail=f"Document summarization failed: {str(e)}")

@router.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    summary_length: str = Form("standard")
):
    """Handle document upload for direct digest summarization."""
    try:
        # Save to temp directory in workspace
        upload_dir = Path(settings.allowed_roots[0]) / ".sloth_uploads"
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        file_path = upload_dir / file.filename
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        req = DigestRequest(
            file_path=str(file_path.resolve()),
            file_name=file.filename,
            summary_length=summary_length
        )
        resp = process_document_digest(req)
        return resp
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File upload & digest failed: {str(e)}")

@router.get("/documents/digests", response_model=List[DigestResponse])
def api_get_digests():
    return get_saved_digests()

@router.get("/history")
def api_get_history():
    jobs = get_recent_history()
    return {"history": jobs}

@router.get("/history/{job_id}/operations")
def api_get_history_operations(job_id: str):
    ops = get_job_operations(job_id)
    return {"job_id": job_id, "operations": ops}

@router.get("/settings", response_model=AppSettings)
def get_app_settings():
    return AppSettings(
        ollama_base_url=settings.ollama_base_url,
        selected_model=ai_service.selected_model,
        concurrency_limit=settings.concurrency_limit,
        default_categories=settings.default_categories,
        local_only_mode=settings.local_only_mode,
        saved_time_per_task_minutes=settings.saved_time_per_task_minutes
    )

@router.patch("/settings")
def update_app_settings(req: SettingsUpdateRequest):
    if req.ollama_base_url:
        settings.ollama_base_url = req.ollama_base_url
        ai_service.base_url = req.ollama_base_url.rstrip("/")
    if req.selected_model:
        settings.default_model = req.selected_model
        ai_service.selected_model = req.selected_model
    if req.concurrency_limit is not None:
        settings.concurrency_limit = max(1, min(8, req.concurrency_limit))
    if req.default_categories is not None:
        settings.default_categories = req.default_categories
    if req.saved_time_per_task_minutes is not None:
        settings.saved_time_per_task_minutes = req.saved_time_per_task_minutes
        
    return get_app_settings()
