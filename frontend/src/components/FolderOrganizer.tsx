import React, { useState, useEffect } from 'react';
import { 
  FolderTree, 
  Search, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  RotateCcw, 
  ArrowRight, 
  Check, 
  SlidersHorizontal,
  FileCode,
  Tag,
  Loader2,
  FolderOpen,
  Info
} from 'lucide-react';
import { api } from '../services/api';
import { FileMetadata, OrganizationPlan, ActionSuggestion, BatchExecutionSummary, OllamaStatus } from '../types';

interface FolderOrganizerProps {
  aiStatus: OllamaStatus | null;
  onRefreshHistory: () => void;
}

export const FolderOrganizer: React.FC<FolderOrganizerProps> = ({ aiStatus, onRefreshHistory }) => {
  const [folderPath, setFolderPath] = useState<string>('');
  const [recursive, setRecursive] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [scannedFiles, setScannedFiles] = useState<FileMetadata[]>([]);
  const [currentPlan, setCurrentPlan] = useState<OrganizationPlan | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [executionSummary, setExecutionSummary] = useState<BatchExecutionSummary | null>(null);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isUndoing, setIsUndoing] = useState<boolean>(false);

  // Poll for background analysis job status
  useEffect(() => {
    let interval: any = null;
    if (activeJobId && isAnalyzing) {
      interval = setInterval(async () => {
        try {
          const job = await api.getJobStatus(activeJobId);
          setAnalysisProgress({ current: job.processed_items, total: job.total_items });
          
          if (job.status === 'completed') {
            setIsAnalyzing(false);
            if (job.metadata?.plan_id) {
              const plan = await api.getPlan(job.metadata.plan_id);
              setCurrentPlan(plan);
            }
            setActiveJobId(null);
          } else if (job.status === 'failed' || job.status === 'cancelled') {
            setIsAnalyzing(false);
            setErrorMsg(job.error_message || 'Folder analysis failed or was cancelled.');
            setActiveJobId(null);
          }
        } catch (e) {
          console.error("Job polling error:", e);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeJobId, isAnalyzing]);

  // Handle loading demo sandbox
  const handleLoadDemo = async () => {
    setErrorMsg(null);
    try {
      const demo = await api.setupDemoSandbox(true);
      setFolderPath(demo.demo_path);
      // Auto-scan demo folder
      handleScan(demo.demo_path);
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to setup demo sandbox.');
    }
  };

  // Handle Scanning
  const handleScan = async (pathOverride?: string) => {
    const target = pathOverride || folderPath;
    if (!target) {
      setErrorMsg('Please specify a folder path.');
      return;
    }
    setErrorMsg(null);
    setIsScanning(true);
    setCurrentPlan(null);
    setExecutionSummary(null);

    try {
      const res = await api.scanFolder(target, recursive);
      setScannedFiles(res.files);
    } catch (e: any) {
      setErrorMsg(e.message || 'Scan failed.');
    } finally {
      setIsScanning(false);
    }
  };

  // Handle Starting AI Analysis
  const handleStartAnalysis = async () => {
    if (!folderPath) return;
    setErrorMsg(null);
    setIsAnalyzing(true);
    setAnalysisProgress({ current: 0, total: scannedFiles.length });

    try {
      const res = await api.startFolderAnalysis(folderPath, recursive);
      setActiveJobId(res.job_id);
    } catch (e: any) {
      setIsAnalyzing(false);
      setErrorMsg(e.message || 'Failed to start analysis.');
    }
  };

  // Toggle Action Selection (Include/Exclude)
  const toggleActionApproval = (actionId: string) => {
    if (!currentPlan) return;
    const updated = currentPlan.actions.map(a => {
      if (a.id === actionId) {
        return { ...a, is_approved: !a.is_approved };
      }
      return a;
    });
    setCurrentPlan({ ...currentPlan, actions: updated });
  };

  // Toggle Select All / Deselect All
  const toggleSelectAll = (select: boolean) => {
    if (!currentPlan) return;
    const updated = currentPlan.actions.map(a => ({
      ...a,
      is_approved: select && !a.validation_error
    }));
    setCurrentPlan({ ...currentPlan, actions: updated });
  };

  // Inline edit proposed filename
  const handleEditProposedName = (actionId: string, newName: string) => {
    if (!currentPlan) return;
    const updated = currentPlan.actions.map(a => {
      if (a.id === actionId) {
        const parent = a.destination_path.substring(0, a.destination_path.lastIndexOf('\\') + 1);
        return { 
          ...a, 
          proposed_name: newName,
          destination_path: `${parent}${newName}`
        };
      }
      return a;
    });
    setCurrentPlan({ ...currentPlan, actions: updated });
  };

  // Inline edit category
  const handleEditCategory = (actionId: string, newCat: string) => {
    if (!currentPlan) return;
    const updated = currentPlan.actions.map(a => {
      if (a.id === actionId) {
        const destParent = a.destination_path.split('\\');
        // Simple update to category
        return { ...a, proposed_category: newCat };
      }
      return a;
    });
    setCurrentPlan({ ...currentPlan, actions: updated });
  };

  // Execute Approved Operations (Phase 2)
  const handleExecuteApproved = async () => {
    if (!currentPlan) return;
    const approvedIds = currentPlan.actions
      .filter(a => a.is_approved && !a.is_excluded && !a.validation_error)
      .map(a => a.id);

    if (approvedIds.length === 0) {
      setErrorMsg('No valid operations are selected for execution.');
      return;
    }

    setIsExecuting(true);
    setErrorMsg(null);
    try {
      const summary = await api.executePlan(currentPlan.plan_id, approvedIds);
      setExecutionSummary(summary);
      onRefreshHistory();
    } catch (e: any) {
      setErrorMsg(e.message || 'Execution failed.');
    } finally {
      setIsExecuting(false);
    }
  };

  // Safe Undo Batch
  const handleUndoBatch = async () => {
    if (!executionSummary) return;
    setIsUndoing(true);
    try {
      await api.undoJob(executionSummary.job_id);
      setExecutionSummary(null);
      // Re-scan folder to show restored state
      await handleScan();
      onRefreshHistory();
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to undo operations.');
    } finally {
      setIsUndoing(false);
    }
  };

  const approvedCount = currentPlan?.actions.filter(a => a.is_approved && !a.validation_error).length || 0;

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-stone-900 tracking-tight flex items-center space-x-2">
            <FolderTree className="w-6 h-6 text-emerald-800" />
            <span>Smart Folder Organizer</span>
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Analyze cluttered folders, preview intelligent renaming, and approve safe batch operations.
          </p>
        </div>

        <button
          onClick={handleLoadDemo}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold transition-all shadow-2xs self-start sm:self-auto"
        >
          <span>🧪 Load Demo Sandbox (8 files)</span>
        </button>
      </div>

      {/* Folder Selection & Scan Bar */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              placeholder="Enter absolute folder path (e.g. C:\Downloads or click 'Load Demo Sandbox')"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/40 text-sm font-mono text-stone-800"
            />
            <FolderOpen className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleScan()}
              disabled={isScanning || !folderPath}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-sm transition-all disabled:opacity-50"
            >
              {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Scan Folder</span>
            </button>

            {scannedFiles.length > 0 && !currentPlan && (
              <button
                onClick={handleStartAnalysis}
                disabled={isAnalyzing}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-sm transition-all shadow-sm disabled:opacity-50"
              >
                {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>Analyze with AI</span>
              </button>
            )}
          </div>
        </div>

        {/* Options */}
        <div className="flex items-center justify-between text-xs text-stone-500 pt-1">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={recursive}
              onChange={(e) => setRecursive(e.target.checked)}
              className="rounded text-emerald-800 focus:ring-emerald-800"
            />
            <span>Include subdirectories (Recursive scan)</span>
          </label>

          <span className="text-[11px] text-stone-400">
            {aiStatus?.reachable ? `● Using ${aiStatus.active_model}` : "○ Offline: Using deterministic heuristics"}
          </span>
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* AI Analysis Progress State */}
      {isAnalyzing && (
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2 font-bold text-stone-900">
              <Loader2 className="w-4 h-4 text-emerald-800 animate-spin" />
              <span>Analyzing folder contents with {aiStatus?.active_model || 'local engine'}...</span>
            </div>
            <span className="font-mono text-xs text-stone-500">
              {analysisProgress.current} / {analysisProgress.total} files
            </span>
          </div>

          <div className="w-full bg-stone-100 rounded-full h-2.5 overflow-hidden">
            <div 
              className="bg-emerald-800 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${(analysisProgress.current / Math.max(1, analysisProgress.total)) * 100}%` }}
            ></div>
          </div>
          <p className="text-[11px] text-stone-400">
            Extracting text, evaluating metadata, and determining safe target categories...
          </p>
        </div>
      )}

      {/* Execution Results Summary Banner */}
      {executionSummary && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2 text-emerald-950 font-bold text-base">
                <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                <span>Batch Execution Complete!</span>
              </div>
              <p className="text-xs text-emerald-900">
                Successfully executed {executionSummary.successful_actions} of {executionSummary.total_actions} operations. 
                Estimated time saved: <span className="font-bold">{executionSummary.estimated_time_saved_minutes} minutes</span>.
              </p>
            </div>

            <button
              onClick={handleUndoBatch}
              disabled={isUndoing}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-white hover:bg-stone-50 text-amber-900 border border-amber-300 text-xs font-bold transition-all shadow-2xs"
            >
              {isUndoing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5 text-amber-700" />}
              <span>Undo Batch Operations</span>
            </button>
          </div>

          {/* Results table snippet */}
          <div className="bg-white rounded-xl border border-emerald-200 overflow-hidden text-xs">
            <div className="max-h-48 overflow-y-auto divide-y divide-stone-100 font-mono">
              {executionSummary.results.map((r, i) => (
                <div key={i} className="p-2.5 flex items-center justify-between">
                  <div className="truncate max-w-lg">
                    <span className="text-stone-400">{r.original_path.split('\\').pop()}</span>
                    <span className="text-emerald-700 mx-2">→</span>
                    <span className="text-stone-800 font-bold">{r.destination_path.split('\\').slice(-2).join('/')}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                    r.status === 'executed' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Scanned Files List (Before AI Plan) */}
      {!currentPlan && scannedFiles.length > 0 && !isAnalyzing && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
          <div className="p-4 sm:px-6 border-b border-stone-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-stone-900 text-sm">Discovered Files ({scannedFiles.length})</span>
            </div>
            <button
              onClick={handleStartAnalysis}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate Organization Plan</span>
            </button>
          </div>

          <div className="divide-y divide-stone-100 max-h-96 overflow-y-auto">
            {scannedFiles.map((file) => (
              <div key={file.id} className="p-3.5 px-6 flex items-center justify-between text-xs hover:bg-stone-50/60 transition-colors">
                <div className="space-y-0.5 truncate max-w-md">
                  <span className="font-semibold text-stone-900 font-mono">{file.original_name}</span>
                  <div className="flex items-center space-x-3 text-stone-400 text-[11px]">
                    <span>{(file.size_bytes / 1024).toFixed(1)} KB</span>
                    <span>•</span>
                    <span>{file.extension.toUpperCase() || 'FILE'}</span>
                    <span>•</span>
                    <span>{new Date(file.modified_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                  file.is_readable ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-stone-100 text-stone-600'
                }`}>
                  {file.is_readable ? 'Text Extracted' : 'Metadata Only'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Organization Plan Interactive Review Table (Phase 1 Preview) */}
      {currentPlan && !executionSummary && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden space-y-0">
          
          {/* Plan Header & Bulk Controls */}
          <div className="p-4 sm:px-6 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/80">
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-stone-900 text-sm">Organization Plan Preview</span>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200">
                  {currentPlan.actions.length} files planned
                </span>
              </div>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Review proposed filenames and destination folders before approving changes.
              </p>
            </div>

            <div className="flex items-center space-x-2 self-start sm:self-auto">
              <button
                onClick={() => toggleSelectAll(true)}
                className="px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs font-medium text-stone-700 hover:bg-white transition-colors"
              >
                Select All
              </button>
              <button
                onClick={() => toggleSelectAll(false)}
                className="px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs font-medium text-stone-700 hover:bg-white transition-colors"
              >
                Deselect All
              </button>

              <button
                onClick={handleExecuteApproved}
                disabled={isExecuting || approvedCount === 0}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50"
              >
                {isExecuting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>Approve & Execute ({approvedCount})</span>
              </button>
            </div>
          </div>

          {/* Interactive Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-100/70 text-stone-600 font-semibold border-b border-stone-200">
                <tr>
                  <th className="p-3 pl-5 w-10">Approve</th>
                  <th className="p-3">Current File</th>
                  <th className="p-3">Proposed Filename & Destination</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Reason & Tags</th>
                  <th className="p-3 w-28">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {currentPlan.actions.map((action) => (
                  <tr 
                    key={action.id} 
                    className={`hover:bg-stone-50/70 transition-colors ${
                      !action.is_approved ? 'opacity-60 bg-stone-50/40' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="p-3 pl-5 align-top">
                      <input
                        type="checkbox"
                        checked={action.is_approved}
                        onChange={() => toggleActionApproval(action.id)}
                        disabled={!!action.validation_error}
                        className="rounded text-emerald-800 focus:ring-emerald-800 mt-1 cursor-pointer"
                      />
                    </td>

                    {/* Original Name */}
                    <td className="p-3 align-top">
                      <div className="font-mono text-stone-900 font-semibold max-w-xs truncate" title={action.original_name}>
                        {action.original_name}
                      </div>
                      <div className="text-[10px] text-stone-400 font-mono truncate max-w-xs">
                        {action.original_path}
                      </div>
                    </td>

                    {/* Proposed Name & Dest (Editable) */}
                    <td className="p-3 align-top space-y-1">
                      <input
                        type="text"
                        value={action.proposed_name}
                        onChange={(e) => handleEditProposedName(action.id, e.target.value)}
                        className="w-full px-2 py-1 rounded border border-stone-300 font-mono font-bold text-emerald-950 focus:outline-none focus:ring-1 focus:ring-emerald-800 text-xs"
                      />
                      <div className="text-[10px] text-stone-500 font-mono flex items-center space-x-1">
                        <span className="text-emerald-700">↳ Destination:</span>
                        <span className="truncate max-w-xs">{action.proposed_rel_path}</span>
                      </div>

                      {action.validation_error && (
                        <div className="text-[10px] text-red-600 font-semibold flex items-center space-x-1">
                          <AlertTriangle className="w-3 h-3 text-red-500" />
                          <span>{action.validation_error}</span>
                        </div>
                      )}
                    </td>

                    {/* Category Selector */}
                    <td className="p-3 align-top">
                      <select
                        value={action.proposed_category}
                        onChange={(e) => handleEditCategory(action.id, e.target.value)}
                        className="px-2 py-1 rounded border border-stone-300 bg-white text-stone-800 text-xs font-medium focus:outline-none"
                      >
                        <option value="Academics">Academics</option>
                        <option value="Research">Research</option>
                        <option value="Finance">Finance</option>
                        <option value="Work">Work</option>
                        <option value="Personal">Personal</option>
                        <option value="Media">Media</option>
                        <option value="Development">Development</option>
                        <option value="Miscellaneous">Miscellaneous</option>
                      </select>
                      {action.proposed_subcategory && (
                        <div className="text-[10px] text-stone-400 mt-1">
                          Sub: {action.proposed_subcategory}
                        </div>
                      )}
                    </td>

                    {/* Reason & Tags */}
                    <td className="p-3 align-top space-y-1.5 max-w-xs">
                      <p className="text-[11px] text-stone-600 leading-tight">
                        {action.reason}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {action.tags.map((t, idx) => (
                          <span key={idx} className="text-[9px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200">
                            #{t}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Source Model / Rules */}
                    <td className="p-3 align-top">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                        action.is_ai_generated 
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {action.is_ai_generated ? 'Local AI' : 'Rules Engine'}
                      </span>
                      {action.needs_review && (
                        <div className="text-[10px] text-amber-700 font-medium mt-1">
                          Review recommended
                        </div>
                      )}
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom Execution Bar */}
          <div className="p-4 px-6 border-t border-stone-200 bg-stone-50 flex items-center justify-between">
            <span className="text-xs text-stone-500 font-medium">
              Ready to process {approvedCount} files safely into destination subfolders.
            </span>

            <button
              onClick={handleExecuteApproved}
              disabled={isExecuting || approvedCount === 0}
              className="flex items-center space-x-1.5 px-6 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50"
            >
              {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>Approve & Execute Batch</span>
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
