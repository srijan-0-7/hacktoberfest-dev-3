import pytest
from pathlib import Path
from backend.app.services.scanner import scan_folder, validate_safe_directory, SecurityScanError

def test_safe_scanner_discovers_files(tmp_path):
    f1 = tmp_path / "notes.txt"
    f1.write_text("Lecture notes content", encoding="utf-8")
    f2 = tmp_path / "data.csv"
    f2.write_text("a,b,c\n1,2,3", encoding="utf-8")
    
    # Subdir
    sub = tmp_path / "nested"
    sub.mkdir()
    f3 = sub / "subfile.md"
    f3.write_text("# Markdown file", encoding="utf-8")
    
    # Non-recursive
    files = scan_folder(str(tmp_path), recursive=False)
    filenames = [f.original_name for f in files]
    assert "notes.txt" in filenames
    assert "data.csv" in filenames
    assert "subfile.md" not in filenames
    
    # Recursive
    files_rec = scan_folder(str(tmp_path), recursive=True)
    rec_names = [f.original_name for f in files_rec]
    assert "subfile.md" in rec_names

def test_scanner_rejects_nonexistent_directory():
    with pytest.raises(SecurityScanError):
        validate_safe_directory("C:\\nonexistent_dir_sloth_12345")

def test_scanner_rejects_root_drive():
    with pytest.raises(SecurityScanError):
        validate_safe_directory("C:\\")

def test_scanner_ignores_hidden_and_git(tmp_path):
    git_dir = tmp_path / ".git"
    git_dir.mkdir()
    git_file = git_dir / "HEAD"
    git_file.write_text("ref: refs/heads/main", encoding="utf-8")
    
    normal_file = tmp_path / "normal.txt"
    normal_file.write_text("normal file", encoding="utf-8")
    
    files = scan_folder(str(tmp_path), recursive=True)
    filenames = [f.original_name for f in files]
    assert "normal.txt" in filenames
    assert "HEAD" not in filenames
