export interface OllamaStatus {
  reachable: boolean;
  active_model: string;
  available_models: string[];
  error?: string | null;
}

export interface FileMetadata {
  id: string;
  original_path: string;
  original_name: string;
  extension: string;
  size_bytes: number;
  modified_at: string;
  is_readable: boolean;
  mime_type: string;
  preview_text?: string | null;
}

export interface ActionSuggestion {
  id: string;
  original_path: string;
  original_name: string;
  proposed_name: string;
  proposed_category: string;
  proposed_subcategory: string;
  proposed_rel_path: string;
  destination_path: string;
  reason: string;
  tags: string[];
  confidence: number;
  needs_review: boolean;
  is_approved: boolean;
  is_excluded: boolean;
  is_ai_generated: boolean;
  validation_error?: string | null;
}

export interface OrganizationPlan {
  plan_id: string;
  job_id: string;
  folder_path: string;
  total_files: number;
  actions: ActionSuggestion[];
  created_at: string;
  status: string;
}

export interface ExecutionResult {
  operation_id: string;
  action_id: string;
  original_path: string;
  destination_path: string;
  status: 'executed' | 'failed' | 'skipped';
  error?: string | null;
}

export interface BatchExecutionSummary {
  job_id: string;
  plan_id: string;
  total_actions: number;
  successful_actions: number;
  failed_actions: number;
  results: ExecutionResult[];
  estimated_time_saved_minutes: number;
}

export interface UndoResult {
  operation_id: string;
  original_path: string;
  restored_path: string;
  success: boolean;
  error?: string | null;
}

export interface DigestResponse {
  id: string;
  file_name: string;
  file_path?: string | null;
  summary_length: 'quick' | 'standard' | 'detailed' | string;
  executive_summary: string;
  key_takeaways: string[];
  important_concepts: string[];
  action_items: string[];
  deadlines: string[];
  questions: string[];
  category: string;
  extracted_preview: string;
  is_ai_generated: boolean;
  model_name: string;
  created_at: string;
}

export interface JobStatus {
  id: string;
  job_type: string;
  target_path?: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  total_items: number;
  processed_items: number;
  progress_percentage: number;
  error_message?: string | null;
  metadata: Record<string, any>;
  created_at: string;
  completed_at?: string | null;
}

export interface HistoryItem {
  id: string;
  job_type: string;
  target_path?: string | null;
  status: string;
  total_items: number;
  processed_items: number;
  created_at: string;
  completed_at?: string | null;
  operations_count: number;
  executed_count: number;
  undone_count: number;
  can_undo: boolean;
}

export interface OperationLog {
  id: string;
  job_id: string;
  action_type: string;
  original_path: string;
  destination_path: string;
  status: string;
  error?: string | null;
  executed_at: string;
  undone_at?: string | null;
}

export interface AppSettings {
  ollama_base_url: string;
  selected_model: string;
  concurrency_limit: number;
  default_categories: string[];
  local_only_mode: boolean;
  saved_time_per_task_minutes: number;
}
