import {
  OllamaStatus,
  FileMetadata,
  OrganizationPlan,
  ActionSuggestion,
  BatchExecutionSummary,
  UndoResult,
  DigestResponse,
  JobStatus,
  HistoryItem,
  OperationLog,
  AppSettings
} from '../types';

const API_BASE = '/api';

export const api = {
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  },

  async getAIStatus(): Promise<OllamaStatus> {
    const res = await fetch(`${API_BASE}/ai/status`);
    if (!res.ok) throw new Error('Failed to fetch AI status');
    return res.json();
  },

  async selectAIModel(model_name: string) {
    const res = await fetch(`${API_BASE}/ai/models/select`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model_name })
    });
    if (!res.ok) throw new Error('Failed to select AI model');
    return res.json();
  },

  async setupDemoSandbox(force_reset: boolean = true): Promise<{ status: string; message: string; demo_path: string }> {
    const res = await fetch(`${API_BASE}/demo/setup?force_reset=${force_reset}`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to initialize demo sandbox');
    return res.json();
  },

  async scanFolder(folder_path: string, recursive: boolean = false): Promise<{ folder_path: string; total_files: number; files: FileMetadata[] }> {
    const res = await fetch(`${API_BASE}/folders/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder_path, recursive })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Folder scan failed' }));
      throw new Error(err.detail || 'Folder scan failed');
    }
    return res.json();
  },

  async startFolderAnalysis(folder_path: string, recursive: boolean = false): Promise<{ job_id: string; status: string; message: string }> {
    const res = await fetch(`${API_BASE}/folders/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder_path, recursive })
    });
    if (!res.ok) throw new Error('Failed to start folder analysis');
    return res.json();
  },

  async getPlan(plan_id: string): Promise<OrganizationPlan> {
    const res = await fetch(`${API_BASE}/plans/${plan_id}`);
    if (!res.ok) throw new Error('Plan not found or expired');
    return res.json();
  },

  async updatePlan(plan_id: string, actions: ActionSuggestion[]): Promise<OrganizationPlan> {
    const res = await fetch(`${API_BASE}/plans/${plan_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actions })
    });
    if (!res.ok) throw new Error('Failed to update plan');
    return res.json();
  },

  async validatePlan(plan_id: string): Promise<{ plan_id: string; is_valid: boolean; actions: ActionSuggestion[] }> {
    const res = await fetch(`${API_BASE}/plans/${plan_id}/validate`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Validation failed');
    return res.json();
  },

  async executePlan(plan_id: string, approved_action_ids: string[]): Promise<BatchExecutionSummary> {
    const res = await fetch(`${API_BASE}/plans/${plan_id}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan_id, approved_action_ids })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Execution failed' }));
      throw new Error(err.detail || 'Execution failed');
    }
    return res.json();
  },

  async undoOperation(operation_id: string): Promise<UndoResult> {
    const res = await fetch(`${API_BASE}/operations/${operation_id}/undo`, {
      method: 'POST'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Undo operation failed' }));
      throw new Error(err.detail || 'Undo operation failed');
    }
    return res.json();
  },

  async undoJob(job_id: string): Promise<{ job_id: string; total_operations: number; undone_successful: number; results: UndoResult[] }> {
    const res = await fetch(`${API_BASE}/jobs/${job_id}/undo`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Undo batch failed');
    return res.json();
  },

  async getJobStatus(job_id: string): Promise<JobStatus> {
    const res = await fetch(`${API_BASE}/jobs/${job_id}`);
    if (!res.ok) throw new Error('Job status check failed');
    return res.json();
  },

  async cancelJob(job_id: string) {
    const res = await fetch(`${API_BASE}/jobs/${job_id}/cancel`, {
      method: 'POST'
    });
    return res.json();
  },

  async summarizeDocument(params: {
    file_path?: string;
    file_name?: string;
    text_content?: string;
    summary_length?: string;
  }): Promise<DigestResponse> {
    const res = await fetch(`${API_BASE}/documents/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Summarization failed' }));
      throw new Error(err.detail || 'Summarization failed');
    }
    return res.json();
  },

  async uploadDocument(file: File, summary_length: string = 'standard'): Promise<DigestResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('summary_length', summary_length);

    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload and digest failed' }));
      throw new Error(err.detail || 'Upload and digest failed');
    }
    return res.json();
  },

  async getDigests(): Promise<DigestResponse[]> {
    const res = await fetch(`${API_BASE}/documents/digests`);
    if (!res.ok) throw new Error('Failed to fetch digests');
    return res.json();
  },

  async getHistory(): Promise<{ history: HistoryItem[] }> {
    const res = await fetch(`${API_BASE}/history`);
    if (!res.ok) throw new Error('Failed to fetch history');
    return res.json();
  },

  async getJobOperations(job_id: string): Promise<{ job_id: string; operations: OperationLog[] }> {
    const res = await fetch(`${API_BASE}/history/${job_id}/operations`);
    if (!res.ok) throw new Error('Failed to fetch job operations');
    return res.json();
  },

  async getSettings(): Promise<AppSettings> {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  async updateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  }
};
