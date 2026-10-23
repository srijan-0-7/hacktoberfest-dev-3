import pytest
from pathlib import Path
from backend.app.database import init_db
from backend.app.services.scanner import scan_folder
from backend.app.services.organizer import create_organization_plan
from backend.app.services.executor import execute_approved_batch
from backend.app.services.undo_service import undo_operation, undo_job_operations
from backend.app.services.history_service import create_job

def test_execute_and_undo_cycle(tmp_path):
    init_db()
    test_file = tmp_path / "messy_notes_october.txt"
    test_file.write_text("Lecture details on binary search.", encoding="utf-8")
    
    files = scan_folder(str(tmp_path))
    import uuid
    job_id = f"test_exec_{uuid.uuid4().hex[:6]}"
    create_job(job_id, "folder_organize", str(tmp_path), len(files))
    
    plan = create_organization_plan(str(tmp_path), files, job_id)
    assert len(plan.actions) == 1
    action = plan.actions[0]
    
    # Execute approved action
    summary = execute_approved_batch(
        job_id=job_id,
        plan_id=plan.plan_id,
        actions_to_execute=[action]
    )
    
    assert summary.successful_actions == 1
    assert summary.failed_actions == 0
    # Original file moved
    assert not test_file.exists()
    dest_path = Path(action.destination_path)
    assert dest_path.exists()
    assert dest_path.read_text(encoding="utf-8") == "Lecture details on binary search."
    
    # Undo operation
    op_id = summary.results[0].operation_id
    undo_res = undo_operation(op_id)
    assert undo_res.success is True
    # Restored to original location
    assert test_file.exists()
    assert not dest_path.exists()

def test_undo_prevents_conflict(tmp_path):
    init_db()
    test_file = tmp_path / "original_file.txt"
    test_file.write_text("Version 1", encoding="utf-8")
    
    files = scan_folder(str(tmp_path))
    import uuid
    job_id = f"test_conflict_{uuid.uuid4().hex[:6]}"
    create_job(job_id, "folder_organize", str(tmp_path), len(files))
    plan = create_organization_plan(str(tmp_path), files, job_id)
    action = plan.actions[0]
    
    summary = execute_approved_batch(job_id, plan.plan_id, [action])
    assert summary.successful_actions == 1
    
    # Simulate a new file being created at original path while original was away
    test_file.write_text("New occupant at original path", encoding="utf-8")
    
    op_id = summary.results[0].operation_id
    undo_res = undo_operation(op_id)
    # Must refuse to overwrite
    assert undo_res.success is False
    assert "already occupies" in undo_res.error
