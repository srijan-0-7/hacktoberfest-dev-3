import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.ai_service import AIService

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "SLOTH" in data["app"]
    assert data["local_only_mode"] is True

def test_ai_status_endpoint():
    response = client.get("/api/ai/status")
    assert response.status_code == 200
    data = response.json()
    assert "reachable" in data
    assert "active_model" in data
    assert "available_models" in data

def test_ai_models_endpoint():
    response = client.get("/api/ai/models")
    assert response.status_code == 200
    data = response.json()
    assert "active_model" in data

def test_ai_service_json_extraction():
    service = AIService()
    # Test raw JSON
    raw = '{"proposed_name": "clean.txt", "category": "Work"}'
    parsed = service._extract_json(raw)
    assert parsed == {"proposed_name": "clean.txt", "category": "Work"}

    # Test markdown code block extraction
    md_block = 'Here is the response:\n```json\n{"proposed_name": "clean_md.txt", "category": "Academics"}\n```'
    parsed = service._extract_json(md_block)
    assert parsed == {"proposed_name": "clean_md.txt", "category": "Academics"}

    # Test invalid json
    bad = "Not a json at all"
    parsed = service._extract_json(bad)
    assert parsed is None

def test_ai_offline_deterministic_fallback():
    # Force an invalid URL so it's guaranteed offline
    service = AIService(base_url="http://127.0.0.1:9999")
    res = service.analyze_file_for_organization(
        original_name="DSA_notes_final_v2.txt",
        extension=".txt",
        preview_text="Binary search trees, graph algorithms, big O notation",
        size_bytes=1024,
        default_categories=["Academics", "Work", "Miscellaneous"]
    )
    assert res["is_ai_generated"] is False
    assert "Academics" == res["category"]
    assert "Rule-Based Logic" in res["reason"]
    assert res["needs_review"] is True
