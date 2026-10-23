import pytest
from pathlib import Path
from backend.app.database import init_db
from backend.app.models.schemas import DigestRequest
from backend.app.services.digest_service import process_document_digest, get_saved_digests
from backend.app.services.history_service import create_job, update_job_progress, get_job_status, get_recent_history

def test_document_digest_generation():
    init_db()
    text = """Project Milestone Update - October 2026
    The Sloth agent has completed Phase 1 of development.
    All team members must submit their code reviews by October 30, 2026.
    Action Items:
    1. Complete unit testing suite.
    2. Deploy backend service on port 8000.
    """
    req = DigestRequest(
        file_name="milestone_update.txt",
        text_content=text,
        summary_length="standard"
    )
    
    resp = process_document_digest(req)
    assert resp.file_name == "milestone_update.txt"
    assert resp.executive_summary != ""
    assert len(resp.key_takeaways) > 0
    assert len(resp.action_items) > 0
    
    # Verify saved in SQLite
    saved = get_saved_digests()
    assert any(d.id == resp.id for d in saved)

def test_history_and_job_tracking():
    init_db()
    import uuid
    job_id = f"test_hist_{uuid.uuid4().hex[:6]}"
    create_job(job_id, "folder_organize", "C:/test/path", total_items=5)
    
    status = get_job_status(job_id)
    assert status.id == job_id
    assert status.status == "running"
    assert status.total_items == 5
    assert status.processed_items == 0
    assert status.progress_percentage == 0.0
    
    # Update progress
    update_job_progress(job_id, processed_items=3)
    status_updated = get_job_status(job_id)
    assert status_updated.processed_items == 3
    assert status_updated.progress_percentage == 60.0
    
    # Complete job
    update_job_progress(job_id, processed_items=5, status="completed")
    status_done = get_job_status(job_id)
    assert status_done.status == "completed"
    assert status_done.progress_percentage == 100.0
