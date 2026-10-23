import os
import shutil
import uuid
import json
import logging
import datetime
from pathlib import Path
from typing import List, Dict

from backend.app.config import settings
from backend.app.database import get_db
from backend.app.models.schemas import ActionSuggestion, ExecutionResult, BatchExecutionSummary

logger = logging.getLogger("sloth.executor")

class ExecutionError(Exception):
    pass

def execute_approved_batch(
    job_id: str,
    plan_id: str,
    actions_to_execute: List[ActionSuggestion]
) -> BatchExecutionSummary:
    """Execute approved operations safely and log to durable SQLite journal."""
    results: List[ExecutionResult] = []
    successful = 0
    failed = 0
    
    with get_db() as conn:
        cursor = conn.cursor()
        
        for action in actions_to_execute:
            op_id = str(uuid.uuid4())[:8]
            src = Path(action.original_path).resolve()
            dest = Path(action.destination_path).resolve()
            now_iso = datetime.datetime.now().isoformat()
            
            # Step 1: Pre-execution validation
            if not src.exists():
                err_msg = f"Source file no longer exists at: {src}"
                logger.warning(err_msg)
                cursor.execute("""
                    INSERT INTO operations (id, job_id, action_type, original_path, destination_path, status, error, executed_at, metadata_json)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (op_id, job_id, "move", str(src), str(dest), "failed", err_msg, now_iso, json.dumps(action.model_dump())))
                results.append(ExecutionResult(
                    operation_id=op_id,
                    action_id=action.id,
                    original_path=str(src),
                    destination_path=str(dest),
                    status="failed",
                    error=err_msg
                ))
                failed += 1
                continue
                
            # If source is already at destination
            if src == dest:
                cursor.execute("""
                    INSERT INTO operations (id, job_id, action_type, original_path, destination_path, status, error, executed_at, metadata_json)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (op_id, job_id, "no_op", str(src), str(dest), "executed", None, now_iso, json.dumps(action.model_dump())))
                results.append(ExecutionResult(
                    operation_id=op_id,
                    action_id=action.id,
                    original_path=str(src),
                    destination_path=str(dest),
                    status="executed",
                    error=None
                ))
                successful += 1
                continue

            # Collision check: never overwrite silently
            if dest.exists():
                err_msg = f"Destination path already exists and cannot be overwritten: {dest}"
                logger.error(err_msg)
                cursor.execute("""
                    INSERT INTO operations (id, job_id, action_type, original_path, destination_path, status, error, executed_at, metadata_json)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (op_id, job_id, "move", str(src), str(dest), "failed", err_msg, now_iso, json.dumps(action.model_dump())))
                results.append(ExecutionResult(
                    operation_id=op_id,
                    action_id=action.id,
                    original_path=str(src),
                    destination_path=str(dest),
                    status="failed",
                    error=err_msg
                ))
                failed += 1
                continue

            # Step 2: Create directory safely & move
            try:
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.move(str(src), str(dest))
                
                # Step 3: Journal successful move
                cursor.execute("""
                    INSERT INTO operations (id, job_id, action_type, original_path, destination_path, status, error, executed_at, metadata_json)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (op_id, job_id, "move", str(src), str(dest), "executed", None, now_iso, json.dumps(action.model_dump())))
                
                results.append(ExecutionResult(
                    operation_id=op_id,
                    action_id=action.id,
                    original_path=str(src),
                    destination_path=str(dest),
                    status="executed",
                    error=None
                ))
                successful += 1
            except Exception as e:
                err_msg = f"Filesystem move failed: {str(e)}"
                logger.error(err_msg)
                cursor.execute("""
                    INSERT INTO operations (id, job_id, action_type, original_path, destination_path, status, error, executed_at, metadata_json)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (op_id, job_id, "move", str(src), str(dest), "failed", err_msg, now_iso, json.dumps(action.dict())))
                results.append(ExecutionResult(
                    operation_id=op_id,
                    action_id=action.id,
                    original_path=str(src),
                    destination_path=str(dest),
                    status="failed",
                    error=err_msg
                ))
                failed += 1
                
        # Update job status
        cursor.execute("""
            UPDATE jobs
            SET status = ?, processed_items = ?, completed_at = ?
            WHERE id = ?
        """, ("completed" if failed == 0 else "partial_failure", len(results), datetime.datetime.now().isoformat(), job_id))
        
        conn.commit()

    time_saved = successful * settings.saved_time_per_task_minutes
    return BatchExecutionSummary(
        job_id=job_id,
        plan_id=plan_id,
        total_actions=len(results),
        successful_actions=successful,
        failed_actions=failed,
        results=results,
        estimated_time_saved_minutes=time_saved
    )
