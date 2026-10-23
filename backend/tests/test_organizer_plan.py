import pytest
from pathlib import Path
from backend.app.services.scanner import scan_folder
from backend.app.services.organizer import create_organization_plan, sanitize_filename

def test_sanitize_filename():
    assert sanitize_filename("bad<name>:test/file?.txt") == "bad_name__test_file_.txt"
    assert sanitize_filename("   spaced   ") == "spaced"
    assert sanitize_filename("...dots...") == "dots"
    assert sanitize_filename("") == "unnamed_file"

def test_create_organization_plan_generates_valid_actions(tmp_path):
    f1 = tmp_path / "dsa_lecture_notes_v1.txt"
    f1.write_text("Algorithms and data structures lecture notes.", encoding="utf-8")
    
    f2 = tmp_path / "tax_receipts_october.csv"
    f2.write_text("Date,Vendor,Amount\n2026-10-01,Store,10.00", encoding="utf-8")
    
    files = scan_folder(str(tmp_path))
    plan = create_organization_plan(
        folder_path=str(tmp_path),
        files=files,
        job_id="test_job_1"
    )
    
    assert plan.total_files == 2
    assert len(plan.actions) == 2
    for action in plan.actions:
        assert action.proposed_name.endswith(".txt") or action.proposed_name.endswith(".csv")
        assert action.proposed_category in ["Academics", "Finance", "Documents", "Miscellaneous"]
        # Destination path must stay within tmp_path
        assert str(Path(action.destination_path).resolve()).startswith(str(tmp_path.resolve()))
        assert action.validation_error is None

def test_collision_disambiguation(tmp_path):
    # Two files with names that might collide
    f1 = tmp_path / "file_a.txt"
    f1.write_text("Same topic", encoding="utf-8")
    f2 = tmp_path / "file_b.txt"
    f2.write_text("Same topic", encoding="utf-8")
    
    files = scan_folder(str(tmp_path))
    plan = create_organization_plan(str(tmp_path), files, "job_col")
    
    destinations = [a.destination_path for a in plan.actions]
    # No two actions should have the exact same destination
    assert len(destinations) == len(set(destinations))
