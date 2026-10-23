import sqlite3
import json
import logging
from datetime import datetime
from pathlib import Path
from contextlib import contextmanager
from backend.app.config import DB_PATH

logger = logging.getLogger("sloth.database")

def get_db_path() -> Path:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    return DB_PATH

@contextmanager
def get_db():
    conn = sqlite3.connect(get_db_path(), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        logger.error(f"Database error: {e}")
        raise
    finally:
        conn.close()

def init_db():
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Jobs table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS jobs (
                id TEXT PRIMARY KEY,
                job_type TEXT NOT NULL,
                target_path TEXT,
                status TEXT NOT NULL,
                total_items INTEGER DEFAULT 0,
                processed_items INTEGER DEFAULT 0,
                error_message TEXT,
                metadata_json TEXT,
                created_at TEXT NOT NULL,
                completed_at TEXT
            )
        """)
        
        # Operations Journal table (for two-phase commit & safe undo)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS operations (
                id TEXT PRIMARY KEY,
                job_id TEXT,
                action_type TEXT NOT NULL,
                original_path TEXT NOT NULL,
                destination_path TEXT NOT NULL,
                status TEXT NOT NULL,
                error TEXT,
                executed_at TEXT,
                undone_at TEXT,
                metadata_json TEXT,
                FOREIGN KEY (job_id) REFERENCES jobs(id)
            )
        """)
        
        # Document Digests table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS document_digests (
                id TEXT PRIMARY KEY,
                file_name TEXT NOT NULL,
                file_path TEXT NOT NULL,
                file_size INTEGER DEFAULT 0,
                summary_length TEXT NOT NULL,
                executive_summary TEXT NOT NULL,
                key_takeaways TEXT NOT NULL,
                action_items TEXT NOT NULL,
                deadlines TEXT NOT NULL,
                important_concepts TEXT NOT NULL,
                questions TEXT NOT NULL,
                category TEXT NOT NULL,
                extracted_preview TEXT,
                is_ai_generated INTEGER DEFAULT 1,
                model_name TEXT,
                created_at TEXT NOT NULL
            )
        """)
        
        # User settings table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_settings (
                key TEXT PRIMARY KEY,
                value_json TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        
        # Indices for fast queries
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at DESC)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_ops_job ON operations(job_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_digests_created ON document_digests(created_at DESC)")
        
        conn.commit()
        logger.info("Database initialized successfully at %s", DB_PATH)
