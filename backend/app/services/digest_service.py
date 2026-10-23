import uuid
import json
import logging
import datetime
from pathlib import Path
from typing import Optional

from backend.app.database import get_db
from backend.app.models.schemas import DigestRequest, DigestResponse
from backend.app.services.extractor import extract_file_content
from backend.app.services.ai_service import ai_service

logger = logging.getLogger("sloth.digest")

def process_document_digest(req: DigestRequest) -> DigestResponse:
    """Generate structured document digest with persistence."""
    digest_id = str(uuid.uuid4())[:8]
    filename = req.file_name or "Uploaded Document"
    file_path_str = req.file_path
    extracted_text = req.text_content or ""
    file_size = 0
    
    # If path provided, read and extract
    if file_path_str:
        p = Path(file_path_str).resolve()
        if p.exists() and p.is_file():
            filename = p.name
            file_size = p.stat().st_size
            extracted = extract_file_content(p, max_chars=30000)
            extracted_text = extracted.text
            if extracted.is_scanned_or_image and not extracted_text.strip():
                extracted_text = f"Scanned/Image Document: {extracted.error or 'No selectable text found. OCR is needed.'}"
                
    summary_length = req.summary_length or "standard"
    
    # Run AI summarization or extractive fallback
    ai_result = ai_service.summarize_document(
        filename=filename,
        text_content=extracted_text,
        summary_length=summary_length
    )
    
    now_iso = datetime.datetime.now().isoformat()
    
    # Save digest to database
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO document_digests (
                id, file_name, file_path, file_size, summary_length,
                executive_summary, key_takeaways, action_items, deadlines,
                important_concepts, questions, category, extracted_preview,
                is_ai_generated, model_name, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            digest_id,
            filename,
            file_path_str or "",
            file_size,
            summary_length,
            ai_result["executive_summary"],
            json.dumps(ai_result["key_takeaways"]),
            json.dumps(ai_result["action_items"]),
            json.dumps(ai_result["deadlines"]),
            json.dumps(ai_result["important_concepts"]),
            json.dumps(ai_result["questions"]),
            ai_result["category"],
            extracted_text[:1500],
            1 if ai_result["is_ai_generated"] else 0,
            ai_result["model_name"],
            now_iso
        ))
        conn.commit()

    return DigestResponse(
        id=digest_id,
        file_name=filename,
        file_path=file_path_str,
        summary_length=summary_length,
        executive_summary=ai_result["executive_summary"],
        key_takeaways=ai_result["key_takeaways"],
        important_concepts=ai_result["important_concepts"],
        action_items=ai_result["action_items"],
        deadlines=ai_result["deadlines"],
        questions=ai_result["questions"],
        category=ai_result["category"],
        extracted_preview=extracted_text[:3000],
        is_ai_generated=ai_result["is_ai_generated"],
        model_name=ai_result["model_name"],
        created_at=now_iso
    )

def get_saved_digests(limit: int = 50) -> list[DigestResponse]:
    """Retrieve saved document digests from SQLite."""
    results = []
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM document_digests ORDER BY created_at DESC LIMIT ?", (limit,))
        rows = cursor.fetchall()
        for r in rows:
            results.append(DigestResponse(
                id=r["id"],
                file_name=r["file_name"],
                file_path=r["file_path"],
                summary_length=r["summary_length"],
                executive_summary=r["executive_summary"],
                key_takeaways=json.loads(r["key_takeaways"]) if r["key_takeaways"] else [],
                important_concepts=json.loads(r["important_concepts"]) if r["important_concepts"] else [],
                action_items=json.loads(r["action_items"]) if r["action_items"] else [],
                deadlines=json.loads(r["deadlines"]) if r["deadlines"] else [],
                questions=json.loads(r["questions"]) if r["questions"] else [],
                category=r["category"],
                extracted_preview=r["extracted_preview"] or "",
                is_ai_generated=bool(r["is_ai_generated"]),
                model_name=r["model_name"] or "Ollama",
                created_at=r["created_at"]
            ))
    return results
