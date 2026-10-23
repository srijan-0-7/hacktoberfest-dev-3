import re
import uuid
import datetime
from pathlib import Path
from typing import List, Dict, Set

from backend.app.config import settings
from backend.app.models.schemas import FileMetadata, ActionSuggestion, OrganizationPlan
from backend.app.services.ai_service import ai_service

INVALID_CHARS_REGEX = re.compile(r'[<>:"/\\|?*\x00-\x1f]')

def sanitize_filename(name: str) -> str:
    """Sanitize filename to prevent illegal filesystem characters."""
    sanitized = INVALID_CHARS_REGEX.sub("_", name)
    # Strip leading/trailing dots and spaces
    sanitized = sanitized.strip(". ")
    if not sanitized:
        sanitized = "unnamed_file"
    return sanitized

def validate_plan_action(
    action: ActionSuggestion,
    folder_root: Path,
    seen_destinations: Set[str]
) -> ActionSuggestion:
    """Validate action for safety, collision, and path traversal."""
    # Ensure destination is within folder_root
    try:
        dest_path = Path(action.destination_path).resolve()
        folder_root_resolved = folder_root.resolve()
        
        # Prevent traversal outside folder_root
        if not str(dest_path).startswith(str(folder_root_resolved)):
            action.validation_error = "Proposed path traverses outside the target directory."
            action.is_approved = False
            return action
            
        # Check collision with already planned destination
        dest_str = str(dest_path).lower()
        if dest_str in seen_destinations:
            # Disambiguate name
            stem = dest_path.stem
            ext = dest_path.suffix
            counter = 1
            while f"{str(dest_path.parent / f'{stem} ({counter}){ext}')}".lower() in seen_destinations:
                counter += 1
            new_dest = dest_path.parent / f"{stem} ({counter}){ext}"
            action.proposed_name = new_dest.name
            action.destination_path = str(new_dest)
            action.reason += f" (Auto-renamed to avoid collision with another file in this batch)"
            dest_str = str(new_dest).lower()
            
        seen_destinations.add(dest_str)
        
        # Check if file already exists at destination (and is not the source itself)
        if dest_path.exists() and dest_path != Path(action.original_path).resolve():
            action.validation_error = f"Destination already exists on disk: {dest_path.name}"
            action.needs_review = True
            action.confidence = min(action.confidence, 0.5)
            
    except Exception as e:
        action.validation_error = f"Validation failed: {str(e)}"
        action.is_approved = False
        
    return action

def create_organization_plan(
    folder_path: str,
    files: List[FileMetadata],
    job_id: str,
    progress_callback = None
) -> OrganizationPlan:
    """Create a structured organization plan for discovered files."""
    folder_root = Path(folder_path).resolve()
    plan_id = str(uuid.uuid4())[:8]
    actions: List[ActionSuggestion] = []
    seen_destinations: Set[str] = set()
    
    total = len(files)
    for idx, f in enumerate(files):
        # AI or rule-based analysis
        analysis = ai_service.analyze_file_for_organization(
            original_name=f.original_name,
            extension=f.extension,
            preview_text=f.preview_text or "",
            size_bytes=f.size_bytes,
            default_categories=settings.default_categories
        )
        
        proposed_name = sanitize_filename(analysis["proposed_name"])
        cat = sanitize_filename(analysis["category"])
        subcat = sanitize_filename(analysis.get("subcategory", "") or "")
        
        if subcat and subcat.lower() != "general":
            rel_folder = f"{cat}/{subcat}"
        else:
            rel_folder = cat
            
        proposed_rel_path = f"{rel_folder}/{proposed_name}"
        destination_path = str((folder_root / cat / subcat / proposed_name).resolve()) if subcat and subcat.lower() != "general" else str((folder_root / cat / proposed_name).resolve())
        
        action = ActionSuggestion(
            id=str(uuid.uuid4())[:8],
            original_path=f.original_path,
            original_name=f.original_name,
            proposed_name=proposed_name,
            proposed_category=cat,
            proposed_subcategory=subcat,
            proposed_rel_path=proposed_rel_path,
            destination_path=destination_path,
            reason=analysis["reason"],
            tags=analysis["tags"],
            confidence=analysis["confidence"],
            needs_review=analysis["needs_review"],
            is_approved=not analysis["needs_review"],
            is_excluded=False,
            is_ai_generated=analysis["is_ai_generated"]
        )
        
        # Validate action
        action = validate_plan_action(action, folder_root, seen_destinations)
        actions.append(action)
        
        if progress_callback:
            progress_callback(idx + 1, total)

    return OrganizationPlan(
        plan_id=plan_id,
        job_id=job_id,
        folder_path=str(folder_root),
        total_files=len(actions),
        actions=actions,
        created_at=datetime.datetime.now().isoformat(),
        status="pending"
    )
