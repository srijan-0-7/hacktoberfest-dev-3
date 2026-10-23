import pytest
import time
from pathlib import Path
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.config import WORKSPACE_ROOT

client = TestClient(app)

def test_full_api_workflow():
    # 1. Health
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

    # 2. AI Status
    res = client.get("/api/ai/status")
    assert res.status_code == 200
    data = res.json()
    assert "reachable" in data
    assert "active_model" in data

    # 3. Setup Demo Sandbox
    res = client.post("/api/demo/setup?force_reset=true")
    assert res.status_code == 200
    demo_info = res.json()
    demo_path = demo_info["demo_path"]
    assert Path(demo_path).exists()

    # 4. Scan Demo Folder
    res = client.post("/api/folders/scan", json={"folder_path": demo_path, "recursive": False})
    assert res.status_code == 200
    scan_data = res.json()
    assert scan_data["total_files"] >= 6
    assert len(scan_data["files"]) >= 6

    # 5. Start Analysis
    res = client.post("/api/folders/analyze", json={"folder_path": demo_path, "recursive": False})
    assert res.status_code == 200
    job_id = res.json()["job_id"]

    # Poll job status until completed
    plan_id = None
    for _ in range(15):
        res = client.get(f"/api/jobs/{job_id}")
        assert res.status_code == 200
        job_data = res.json()
        if job_data["status"] == "completed":
            plan_id = job_data["metadata"]["plan_id"]
            break
        time.sleep(0.5)

    assert plan_id is not None, "Folder analyze job did not complete in time"

    # 6. Retrieve Organization Plan
    res = client.get(f"/api/plans/{plan_id}")
    assert res.status_code == 200
    plan = res.json()
    assert plan["total_files"] >= 6
    assert len(plan["actions"]) >= 6

    # 7. Validate Plan
    res = client.post(f"/api/plans/{plan_id}/validate")
    assert res.status_code == 200
    val_data = res.json()
    assert val_data["is_valid"] is True

    # 8. Execute Approved Actions
    action_ids = [a["id"] for a in plan["actions"]]
    res = client.post(f"/api/plans/{plan_id}/execute", json={
        "plan_id": plan_id,
        "approved_action_ids": action_ids
    })
    if res.status_code != 200:
        print("EXECUTE ERROR:", res.json())
    assert res.status_code == 200
    summary = res.json()
    assert summary["successful_actions"] > 0
    assert summary["estimated_time_saved_minutes"] > 0

    # 9. Test Undo single operation
    first_op = summary["results"][0]
    op_id = first_op["operation_id"]
    res = client.post(f"/api/operations/{op_id}/undo")
    assert res.status_code == 200
    undo_data = res.json()
    assert undo_data["success"] is True

    # 10. Test Undo full batch
    res = client.post(f"/api/jobs/{summary['job_id']}/undo")
    assert res.status_code == 200

    # 11. Test Document Digest endpoint
    sample_text = """Meeting Summary: Product Launch
    The marketing team will deploy campaigns on November 5, 2026.
    Action items:
    1. Complete graphic design assets.
    2. Review copy with legal team.
    """
    res = client.post("/api/documents/summarize", json={
        "file_name": "launch_notes.txt",
        "text_content": sample_text,
        "summary_length": "standard"
    })
    assert res.status_code == 200
    digest_data = res.json()
    assert digest_data["file_name"] == "launch_notes.txt"
    assert len(digest_data["key_takeaways"]) > 0

    # 12. Test Saved Digests endpoint
    res = client.get("/api/documents/digests")
    assert res.status_code == 200
    assert len(res.json()) >= 1

    # 13. Test History endpoint
    res = client.get("/api/history")
    assert res.status_code == 200
    assert len(res.json()["history"]) >= 1

    # 14. Test Settings endpoints
    res = client.get("/api/settings")
    assert res.status_code == 200
    settings_data = res.json()
    assert "ollama_base_url" in settings_data

    res = client.patch("/api/settings", json={"concurrency_limit": 4})
    assert res.status_code == 200
    assert res.json()["concurrency_limit"] == 4
