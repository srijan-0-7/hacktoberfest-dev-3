import json
import logging
import datetime
from typing import Optional, List, Dict, Any

from backend.app.database import get_db
from backend.app.models.schemas import JobStatusResponse

logger = logging.getLogger("sloth.history")

def create_job(job_id: str, job_type: str, target_path: Optional[str] = None, total_items: int = 0) -> str:
    """Create a new job entry in SQLite."""
    now_iso = datetime.datetime.now().isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT OR REPLACE INTO jobs (id, job_type, target_path, status, total_items, processed_items, created_at)
            VALUES (?, ?, ?, 'running', ?, 0, ?)
        """, (job_id, job_type, target_path, total_items, now_iso))
        conn.commit()
    return job_id

def update_job_progress(job_id: str, processed_items: int, total_items: Optional[int] = None, status: Optional[str] = None, metadata: Optional[dict] = None):
    """Update progress for live polling / Relax Mode."""
    with get_db() as conn:
        cursor = conn.cursor()
        query = "UPDATE jobs SET processed_items = ?"
        params: List[Any] = [processed_items]
        
        if total_items is not None:
            query += ", total_items = ?"
            params.append(total_items)
        if status is not None:
            query += ", status = ?"
            params.append(status)
            if status in ["completed", "failed", "cancelled"]:
                query += ", completed_at = ?"
                params.append(datetime.datetime.now().isoformat())
        if metadata is not None:
            query += ", metadata_json = ?"
            params.append(json.dumps(metadata))
            
        query += " WHERE id = ?"
        params.append(job_id)
        
        cursor.execute(query, tuple(params))
        conn.commit()

def get_job_status(job_id: str) -> Optional[JobStatusResponse]:
    """Retrieve current job status and progress."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM jobs WHERE id = ?", (job_id,))
        row = cursor.fetchone()
        if not row:
            return None
            
        total = row["total_items"] or 0
        proc = row["processed_items"] or 0
        pct = (proc / total * 100.0) if total > 0 else 0.0
        
        meta = {}
        if row["metadata_json"]:
            try:
                meta = json.loads(row["metadata_json"])
            except Exception:
                pass
                
        return JobStatusResponse(
            id=row["id"],
            job_type=row["job_type"],
            target_path=row["target_path"],
            status=row["status"],
            total_items=total,
            processed_items=proc,
            progress_percentage=round(pct, 1),
            error_message=row["error_message"],
            metadata=meta,
            created_at=row["created_at"],
            completed_at=row["completed_at"]
        )

def get_recent_history(limit: int = 30) -> List[Dict[str, Any]]:
    """Get recent jobs and execution logs."""
    history_items = []
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT j.*, 
                   COUNT(o.id) as op_count,
                   SUM(CASE WHEN o.status = 'executed' THEN 1 ELSE 0 END) as executed_ops,
                   SUM(CASE WHEN o.status = 'undone' THEN 1 ELSE 0 END) as undone_ops
            FROM jobs j
            LEFT JOIN operations o ON j.id = o.job_id
            GROUP BY j.id
            ORDER BY j.created_at DESC
            LIMIT ?
        """, (limit,))
        rows = cursor.fetchall()
        for r in rows:
            history_items.append({
                "id": r["id"],
                "job_type": r["job_type"],
                "target_path": r["target_path"],
                "status": r["status"],
                "total_items": r["total_items"],
                "processed_items": r["processed_items"],
                "created_at": r["created_at"],
                "completed_at": r["completed_at"],
                "operations_count": r["op_count"],
                "executed_count": r["executed_ops"] or 0,
                "undone_count": r["undone_ops"] or 0,
                "can_undo": (r["executed_ops"] or 0) > 0
            })
    return history_items

def get_job_operations(job_id: str) -> List[Dict[str, Any]]:
    """Get all operations belonging to a job."""
    ops = []
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM operations WHERE job_id = ? ORDER BY executed_at ASC", (job_id,))
        for r in cursor.fetchall():
            ops.append({
                "id": r["id"],
                "job_id": r["job_id"],
                "action_type": r["action_type"],
                "original_path": r["original_path"],
                "destination_path": r["destination_path"],
                "status": r["status"],
                "error": r["error"],
                "executed_at": r["executed_at"],
                "undone_at": r["undone_at"]
            })
    return ops
