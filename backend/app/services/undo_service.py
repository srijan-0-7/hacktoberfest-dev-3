import os
import shutil
import logging
import datetime
from pathlib import Path

from backend.app.database import get_db
from backend.app.models.schemas import UndoResult

logger = logging.getLogger("sloth.undo")

def undo_operation(operation_id: str) -> UndoResult:
    """Safely undo a previously executed file operation using the SQLite journal."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM operations WHERE id = ?", (operation_id,))
        row = cursor.fetchone()
        
        if not row:
            return UndoResult(
                operation_id=operation_id,
                original_path="",
                restored_path="",
                success=False,
                error="Operation not found in journal."
            )
            
        op_status = row["status"]
        if op_status == "undone":
            return UndoResult(
                operation_id=operation_id,
                original_path=row["original_path"],
                restored_path=row["destination_path"],
                success=False,
                error="Operation has already been undone."
            )
            
        if op_status != "executed":
            return UndoResult(
                operation_id=operation_id,
                original_path=row["original_path"],
                restored_path=row["destination_path"],
                success=False,
                error=f"Cannot undo operation with status '{op_status}'."
            )
            
        src_current = Path(row["destination_path"]).resolve()
        dest_original = Path(row["original_path"]).resolve()
        
        # Check current file exists
        if not src_current.exists():
            return UndoResult(
                operation_id=operation_id,
                original_path=str(dest_original),
                restored_path=str(src_current),
                success=False,
                error=f"Current file no longer exists at destination: {src_current}"
            )
            
        # Conflict check: ensure original path isn't occupied
        if dest_original.exists():
            return UndoResult(
                operation_id=operation_id,
                original_path=str(dest_original),
                restored_path=str(src_current),
                success=False,
                error=f"Cannot restore: another file already occupies the original path: {dest_original}"
            )
            
        # Execute undo move
        try:
            dest_original.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(src_current), str(dest_original))
            
            # Clean up empty parent dir if left empty
            try:
                if src_current.parent.exists() and not any(src_current.parent.iterdir()):
                    src_current.parent.rmdir()
            except Exception:
                pass
                
            # Update journal
            now_iso = datetime.datetime.now().isoformat()
            cursor.execute("""
                UPDATE operations
                SET status = 'undone', undone_at = ?
                WHERE id = ?
            """, (now_iso, operation_id))
            conn.commit()
            
            logger.info("Successfully undone operation %s: restored to %s", operation_id, dest_original)
            return UndoResult(
                operation_id=operation_id,
                original_path=str(dest_original),
                restored_path=str(src_current),
                success=True,
                error=None
            )
        except Exception as e:
            err = f"Undo move failed: {str(e)}"
            logger.error(err)
            return UndoResult(
                operation_id=operation_id,
                original_path=str(dest_original),
                restored_path=str(src_current),
                success=False,
                error=err
            )

def undo_job_operations(job_id: str) -> list[UndoResult]:
    """Undo all executed operations associated with a job."""
    results = []
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM operations WHERE job_id = ? AND status = 'executed'", (job_id,))
        rows = cursor.fetchall()
        op_ids = [r["id"] for r in rows]
        
    for op_id in op_ids:
        res = undo_operation(op_id)
        results.append(res)
        
    return results
