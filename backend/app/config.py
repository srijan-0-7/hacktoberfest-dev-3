import os
from pathlib import Path
from pydantic_settings import BaseSettings

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent.parent
BACKEND_DIR = Path(__file__).resolve().parent.parent
DEMO_DIR = WORKSPACE_ROOT / "demo_sandbox"
DB_PATH = BACKEND_DIR / "sloth.db"

class Settings(BaseSettings):
    app_name: str = "SLOTH — Local-First AI Productivity Agent"
    version: str = "1.0.0"
    host: str = "127.0.0.1"
    port: int = 8000
    
    # Ollama Local AI Configuration
    ollama_base_url: str = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
    default_model: str = os.getenv("SLOTH_DEFAULT_MODEL", "qwen2.5:3b")
    request_timeout_seconds: float = 30.0
    max_retries: int = 2
    
    # Concurrency and Safety Limits
    concurrency_limit: int = 2
    max_file_size_bytes: int = 25 * 1024 * 1024  # 25 MB
    max_digest_chars: int = 15000
    
    # Organization Settings
    default_categories: list[str] = [
        "Academics",
        "Research",
        "Finance",
        "Work",
        "Personal",
        "Media",
        "Development",
        "Miscellaneous",
    ]
    
    # Productivity Metrics
    saved_time_per_task_minutes: float = 2.5
    
    # Security
    allowed_roots: list[str] = [str(WORKSPACE_ROOT.resolve())]
    local_only_mode: bool = True

    class Config:
        env_prefix = "SLOTH_"

settings = Settings()
