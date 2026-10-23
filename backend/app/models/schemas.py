from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class OllamaStatus(BaseModel):
    reachable: bool
    active_model: str
    available_models: List[str] = []
    error: Optional[str] = None

class ModelSelectRequest(BaseModel):
    model_name: str

class FolderScanRequest(BaseModel):
    folder_path: str
    recursive: bool = False

class FileMetadata(BaseModel):
    id: str
    original_path: str
    original_name: str
    extension: str
    size_bytes: int
    modified_at: str
    is_readable: bool
    mime_type: str
    preview_text: Optional[str] = None

class ActionSuggestion(BaseModel):
    id: str
    original_path: str
    original_name: str
    proposed_name: str
    proposed_category: str
    proposed_subcategory: str = ""
    proposed_rel_path: str
    destination_path: str
    reason: str
    tags: List[str] = []
    confidence: float = 0.9
    needs_review: bool = False
    is_approved: bool = True
    is_excluded: bool = False
    is_ai_generated: bool = True
    validation_error: Optional[str] = None

class OrganizationPlan(BaseModel):
    plan_id: str
    job_id: str
    folder_path: str
    total_files: int
    actions: List[ActionSuggestion]
    created_at: str
    status: str = "pending"

class PlanUpdateRequest(BaseModel):
    actions: List[ActionSuggestion]

class PlanExecuteRequest(BaseModel):
    plan_id: str
    approved_action_ids: List[str]

class ExecutionResult(BaseModel):
    operation_id: str
    action_id: str
    original_path: str
    destination_path: str
    status: str  # executed, failed, skipped
    error: Optional[str] = None

class BatchExecutionSummary(BaseModel):
    job_id: str
    plan_id: str
    total_actions: int
    successful_actions: int
    failed_actions: int
    results: List[ExecutionResult]
    estimated_time_saved_minutes: float

class UndoRequest(BaseModel):
    operation_id: str

class UndoResult(BaseModel):
    operation_id: str
    original_path: str
    restored_path: str
    success: bool
    error: Optional[str] = None

class DigestRequest(BaseModel):
    file_path: Optional[str] = None
    file_name: Optional[str] = None
    text_content: Optional[str] = None
    summary_length: str = "standard"  # quick, standard, detailed

class DigestResponse(BaseModel):
    model_config = {"protected_namespaces": ()}
    id: str
    file_name: str
    file_path: Optional[str] = None
    summary_length: str
    executive_summary: str
    key_takeaways: List[str] = []
    important_concepts: List[str] = []
    action_items: List[str] = []
    deadlines: List[str] = []
    questions: List[str] = []
    category: str
    extracted_preview: str = ""
    is_ai_generated: bool = True
    model_name: str
    created_at: str

class JobStatusResponse(BaseModel):
    id: str
    job_type: str
    target_path: Optional[str] = None
    status: str  # pending, running, completed, failed, cancelled
    total_items: int = 0
    processed_items: int = 0
    progress_percentage: float = 0.0
    error_message: Optional[str] = None
    metadata: Dict[str, Any] = {}
    created_at: str
    completed_at: Optional[str] = None

class AppSettings(BaseModel):
    ollama_base_url: str
    selected_model: str
    concurrency_limit: int
    default_categories: List[str]
    local_only_mode: bool
    saved_time_per_task_minutes: float

class SettingsUpdateRequest(BaseModel):
    ollama_base_url: Optional[str] = None
    selected_model: Optional[str] = None
    concurrency_limit: Optional[int] = None
    default_categories: Optional[List[str]] = None
    saved_time_per_task_minutes: Optional[float] = None
