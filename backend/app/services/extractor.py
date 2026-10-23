import os
import csv
import json
import logging
from pathlib import Path
from typing import Optional, Dict, Any

logger = logging.getLogger("sloth.extractor")

class ExtractedContent:
    def __init__(
        self,
        text: str = "",
        page_count: int = 1,
        is_empty: bool = False,
        is_scanned_or_image: bool = False,
        word_count: int = 0,
        error: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        self.text = text
        self.page_count = page_count
        self.is_empty = is_empty
        self.is_scanned_or_image = is_scanned_or_image
        self.word_count = word_count
        self.error = error
        self.metadata = metadata or {}

def extract_pdf_text(file_path: Path, max_chars: int = 25000) -> ExtractedContent:
    text_parts = []
    page_count = 0
    
    # Try pypdf first
    try:
        from pypdf import PdfReader
        reader = PdfReader(str(file_path))
        page_count = len(reader.pages)
        
        for i, page in enumerate(reader.pages):
            page_text = page.extract_text() or ""
            if page_text.strip():
                text_parts.append(f"--- Page {i+1} ---\n{page_text.strip()}")
            if sum(len(p) for p in text_parts) >= max_chars:
                break
                
        full_text = "\n\n".join(text_parts).strip()
        word_count = len(full_text.split())
        
        if not full_text:
            return ExtractedContent(
                text="",
                page_count=page_count,
                is_empty=True,
                is_scanned_or_image=True,
                error="No selectable text detected in this PDF. It may be scanned or image-based, which requires OCR."
            )
            
        return ExtractedContent(
            text=full_text[:max_chars],
            page_count=page_count,
            is_empty=False,
            is_scanned_or_image=False,
            word_count=word_count,
            metadata={"extractor": "pypdf", "total_pages": page_count}
        )
    except Exception as e:
        logger.warning(f"pypdf failed on {file_path}: {e}")
        return ExtractedContent(
            text="",
            is_empty=True,
            error=f"Failed to read PDF: {str(e)}"
        )

def extract_docx_text(file_path: Path, max_chars: int = 25000) -> ExtractedContent:
    try:
        import docx
        doc = docx.Document(str(file_path))
        paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
        
        # Also extract table text
        for table in doc.tables:
            for row in table.rows:
                row_text = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
                if row_text:
                    paragraphs.append(row_text)
                    
        full_text = "\n\n".join(paragraphs).strip()
        if not full_text:
            return ExtractedContent(text="", is_empty=True, error="Document contains no text.")
            
        return ExtractedContent(
            text=full_text[:max_chars],
            page_count=max(1, len(paragraphs) // 10),
            is_empty=False,
            word_count=len(full_text.split()),
            metadata={"paragraphs_count": len(doc.paragraphs), "tables_count": len(doc.tables)}
        )
    except Exception as e:
        logger.warning(f"python-docx failed on {file_path}: {e}")
        return ExtractedContent(text="", is_empty=True, error=f"Failed to read DOCX: {str(e)}")

def extract_csv_text(file_path: Path, max_rows: int = 50) -> ExtractedContent:
    try:
        rows = []
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            reader = csv.reader(f)
            for i, row in enumerate(reader):
                if i >= max_rows:
                    break
                rows.append(", ".join(row))
        full_text = f"CSV Header and Sample Rows ({len(rows)} rows preview):\n" + "\n".join(rows)
        return ExtractedContent(
            text=full_text,
            is_empty=len(rows) == 0,
            word_count=len(full_text.split()),
            metadata={"preview_rows": len(rows)}
        )
    except Exception as e:
        return ExtractedContent(text="", is_empty=True, error=f"Failed to read CSV: {str(e)}")

def extract_json_text(file_path: Path, max_chars: int = 15000) -> ExtractedContent:
    try:
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            data = json.load(f)
        formatted = json.dumps(data, indent=2)
        return ExtractedContent(
            text=formatted[:max_chars],
            is_empty=False,
            word_count=len(formatted.split()),
            metadata={"is_json": True}
        )
    except Exception as e:
        # Fallback to plain text
        return extract_plain_text(file_path, max_chars)

def extract_plain_text(file_path: Path, max_chars: int = 25000) -> ExtractedContent:
    try:
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            text = f.read(max_chars)
        full_text = text.strip()
        return ExtractedContent(
            text=full_text,
            is_empty=len(full_text) == 0,
            word_count=len(full_text.split())
        )
    except Exception as e:
        return ExtractedContent(text="", is_empty=True, error=f"Failed to read text file: {str(e)}")

def extract_file_content(file_path: Path, max_chars: int = 25000) -> ExtractedContent:
    """Extract readable content from supported file types safely."""
    if not file_path.exists():
        return ExtractedContent(error="File does not exist.")
    if file_path.is_dir():
        return ExtractedContent(error="Path is a directory.")
        
    ext = file_path.suffix.lower()
    
    if ext == ".pdf":
        return extract_pdf_text(file_path, max_chars)
    elif ext in [".docx", ".doc"]:
        return extract_docx_text(file_path, max_chars)
    elif ext == ".csv":
        return extract_csv_text(file_path)
    elif ext == ".json":
        return extract_json_text(file_path, max_chars)
    elif ext in [".txt", ".md", ".markdown", ".rst", ".py", ".ts", ".js", ".html", ".css", ".xml", ".yaml", ".yml", ".log"]:
        return extract_plain_text(file_path, max_chars)
    elif ext in [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".ico"]:
        size_kb = file_path.stat().st_size / 1024
        return ExtractedContent(
            text=f"[Image File: {file_path.name}, Size: {size_kb:.1f} KB. Image content classification based on filename and metadata.]",
            is_scanned_or_image=True,
            metadata={"media_type": "image", "size_kb": size_kb}
        )
    elif ext in [".mp4", ".mov", ".mkv", ".mp3", ".wav", ".zip", ".tar", ".gz", ".exe", ".bin"]:
        size_kb = file_path.stat().st_size / 1024
        return ExtractedContent(
            text=f"[Media/Binary File: {file_path.name}, Extension: {ext}, Size: {size_kb:.1f} KB.]",
            metadata={"media_type": "binary", "size_kb": size_kb}
        )
    else:
        # Default try plain text reading with small limit
        return extract_plain_text(file_path, max_chars=4000)
