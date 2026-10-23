import pytest
from pathlib import Path
from backend.app.services.extractor import extract_file_content

def test_extract_plain_text(tmp_path):
    txt_file = tmp_path / "sample.txt"
    txt_file.write_text("Hello Sloth! Slow and steady wins the race.", encoding="utf-8")
    
    extracted = extract_file_content(txt_file)
    assert extracted.is_empty is False
    assert "Hello Sloth!" in extracted.text
    assert extracted.word_count == 8

def test_extract_csv(tmp_path):
    csv_file = tmp_path / "expenses.csv"
    csv_file.write_text("Date,Vendor,Amount\n2026-10-01,OfficeDepot,45.00\n", encoding="utf-8")
    
    extracted = extract_file_content(csv_file)
    assert extracted.is_empty is False
    assert "OfficeDepot" in extracted.text
    assert "Amount" in extracted.text

def test_extract_json(tmp_path):
    json_file = tmp_path / "config.json"
    json_file.write_text('{"name": "sloth", "version": "1.0.0"}', encoding="utf-8")
    
    extracted = extract_file_content(json_file)
    assert extracted.is_empty is False
    assert "version" in extracted.text

def test_extract_empty_file(tmp_path):
    empty_file = tmp_path / "empty.txt"
    empty_file.write_text("", encoding="utf-8")
    
    extracted = extract_file_content(empty_file)
    assert extracted.is_empty is True
    assert extracted.word_count == 0

def test_extract_nonexistent_file(tmp_path):
    missing = tmp_path / "does_not_exist.pdf"
    extracted = extract_file_content(missing)
    assert extracted.error is not None
