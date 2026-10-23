import os
import mimetypes
import uuid
import datetime
from pathlib import Path
from typing import List, Tuple, Optional

from backend.app.config import settings
from backend.app.models.schemas import FileMetadata
from backend.app.services.extractor import extract_file_content

IGNORE_NAMES = {
    ".git",
    "node_modules",
    "__pycache__",
    ".venv",
    "venv",
    ".DS_Store",
    "Thumbs.db",
    "sloth.db",
    "sloth.db-journal",
    ".system_generated",
    "$RECYCLE.BIN",
    "System Volume Information",
}

class SecurityScanError(Exception):
    pass

def validate_safe_directory(dir_path: str) -> Path:
    """Validate that directory exists and is safe to scan."""
    path = Path(dir_path).resolve()
    
    if not path.exists():
        raise SecurityScanError(f"Directory does not exist: {dir_path}")
    if not path.is_dir():
        raise SecurityScanError(f"Path is not a directory: {dir_path}")
        
    # Prevent scanning root directories directly (e.g. C:\ or /)
    if str(path) in ["C:\\", "D:\\", "/", "\\"] or path.parent == path:
        raise SecurityScanError("Scanning root system drive is prohibited for safety.")
        
    # Prevent Windows system directories
    lower_path = str(path).lower()
    if "windows\\system32" in lower_path or "program files" in lower_path:
        raise SecurityScanError("Scanning protected system directories is prohibited.")
        
    return path

def scan_folder(folder_path: str, recursive: bool = False, max_files: int = 150) -> List[FileMetadata]:
    """Scan folder and return metadata for files found."""
    target_dir = validate_safe_directory(folder_path)
    discovered_files: List[FileMetadata] = []
    
    def process_entry(entry: Path):
        if entry.name in IGNORE_NAMES or entry.name.startswith("."):
            return
            
        # Symlink check
        if entry.is_symlink():
            try:
                resolved = entry.resolve()
                if not resolved.exists():
                    return  # Broken symlink
            except Exception:
                return
                
        if entry.is_file():
            stat = entry.stat()
            ext = entry.suffix.lower()
            mime, _ = mimetypes.guess_type(str(entry))
            
            # Extract preview text
            extracted = extract_file_content(entry, max_chars=1500)
            preview = extracted.text[:500] if extracted.text else None
            
            mod_time = datetime.datetime.fromtimestamp(stat.st_mtime).isoformat()
            
            metadata = FileMetadata(
                id=str(uuid.uuid4())[:8],
                original_path=str(entry.resolve()),
                original_name=entry.name,
                extension=ext,
                size_bytes=stat.st_size,
                modified_at=mod_time,
                is_readable=not extracted.is_empty and extracted.error is None,
                mime_type=mime or "application/octet-stream",
                preview_text=preview
            )
            discovered_files.append(metadata)

    if recursive:
        for root, dirs, files in os.walk(target_dir):
            # Prune ignored dirs in-place
            dirs[:] = [d for d in dirs if d not in IGNORE_NAMES and not d.startswith(".")]
            for f in files:
                if len(discovered_files) >= max_files:
                    break
                process_entry(Path(root) / f)
            if len(discovered_files) >= max_files:
                break
    else:
        for entry in target_dir.iterdir():
            if len(discovered_files) >= max_files:
                break
            if entry.is_file():
                process_entry(entry)
                
    return discovered_files
