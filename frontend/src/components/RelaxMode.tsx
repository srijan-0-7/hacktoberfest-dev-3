import React, { useState, useEffect } from 'react';
import { 
  Coffee, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Pause, 
  Play, 
  RotateCcw, 
  Clock, 
  ArrowRight,
  ShieldCheck,
  Loader2,
  FolderOpen
} from 'lucide-react';
import { api } from '../services/api';
import { JobStatus, OrganizationPlan, BatchExecutionSummary, OllamaStatus } from '../types';

interface RelaxModeProps {
  aiStatus: OllamaStatus | null;
  onRefreshHistory: () => void;
}

export const RelaxMode: React.FC<RelaxModeProps> = ({ aiStatus, onRefreshHistory }) => {
  const [folderPath, setFolderPath] = useState<string>('');
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [plan, setPlan] = useState<OrganizationPlan | null>(null);
  const [executionSummary, setExecutionSummary] = useState<BatchExecutionSummary | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isUndoing, setIsUndoing] = useState<boolean>(false);

  // Poll for active background job
  useEffect(() => {
    let interval: any = null;
    if (activeJobId) {
      interval = setInterval(async () => {
        try {
          const status = await api.getJobStatus(activeJobId);
          setJobStatus(status);

          if (status.status === 'completed') {
            setIsProcessing(false);
            if (status.metadata?.plan_id) {
              const p = await api.getPlan(status.metadata.plan_id);
              setPlan(p);
            }
            setActiveJobId(null);
            onRefreshHistory();
          } else if (status.status === 'failed' || status.status === 'cancelled') {
            setIsProcessing(false);
            setErrorMsg(status.error_message || 'Batch task was cancelled or stopped.');
            setActiveJobId(null);
          }
        } catch (e) {
          console.error("Job status polling error:", e);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeJobId]);

  // Load demo sandbox
  const handleLoadDemo = async () => {
    try {
      const demo = await api.setupDemoSandbox(true);
      setFolderPath(demo.demo_path);
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to initialize demo sandbox');
    }
  };

  // Start Relax Mode Batch
  const handleStartRelaxBatch = async () => {
    if (!folderPath) {
      setErrorMsg('Please specify a directory.');
      return;
    }

    setErrorMsg(null);
    setIsProcessing(true);
    setPlan(null);
    setExecutionSummary(null);

    try {
      const res = await api.startFolderAnalysis(folderPath, false);
      setActiveJobId(res.job_id);
    } catch (e: any) {
      setIsProcessing(false);
      setErrorMsg(e.message || 'Failed to start Relax Mode batch');
    }
  };

  // Cancel Job
  const handleCancel = async () => {
    if (activeJobId) {
      await api.cancelJob(activeJobId);
      setIsProcessing(false);
      setActiveJobId(null);
    }
  };

  // Execute All Safe Operations from Relax Mode
  const handleAutoApproveAll = async () => {
    if (!plan) return;
    setIsProcessing(true);
    try {
      const validActionIds = plan.actions
        .filter(a => !a.validation_error)
        .map(a => a.id);

      const summary = await api.executePlan(plan.plan_id, validActionIds);
      setExecutionSummary(summary);
      onRefreshHistory();
    } catch (e: any) {
      setErrorMsg(e.message || 'Batch execution failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Undo Batch
  const handleUndo = async () => {
    if (!executionSummary) return;
    setIsUndoing(true);
    try {
      await api.undoJob(executionSummary.job_id);
      setExecutionSummary(null);
      onRefreshHistory();
    } catch (e: any) {
      setErrorMsg(e.message || 'Undo failed.');
    } finally {
      setIsUndoing(false);
    }
  };

  const discoveredCount = jobStatus?.total_items || (plan?.total_files || 0);
  const analyzedCount = jobStatus?.processed_items || (plan ? plan.actions.length : 0);
  const needsReviewCount = plan?.actions.filter(a => a.needs_review || a.validation_error).length || 0;
  const readyCount = plan ? plan.actions.length - needsReviewCount : 0;

  return (
    <div className="space-y-8 pb-12">
      
      {/* Signature Relax Mode Header */}
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-stone-900 rounded-3xl p-8 sm:p-10 text-white shadow-lg border border-emerald-800/40 relative overflow-hidden">
        <div className="max-w-2xl space-y-4 relative z-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-800/60 border border-emerald-600/40 text-emerald-200 text-xs font-semibold">
            <Coffee className="w-3.5 h-3.5 text-amber-300" />
            <span>Relax Mode • Signature Workflow</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Put your feet up.<br />
            <span className="text-emerald-300">Sloth handles the chores.</span>
          </h2>

          <p className="text-sm text-emerald-100/80 leading-relaxed">
            Select any cluttered folder, kick off the batch, and relax. Sloth runs locally in the background at an energy-friendly pace without overheating your laptop.
          </p>

          {/* Quick Launcher Bar */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                placeholder="Enter folder path or load demo..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-emerald-200/50 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <FolderOpen className="w-4 h-4 text-emerald-300 absolute left-3 top-3" />
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleLoadDemo}
                className="px-3 py-2.5 rounded-xl bg-emerald-800/50 hover:bg-emerald-800 text-emerald-200 text-xs font-semibold border border-emerald-700/60 transition-all shrink-0"
              >
                Load Demo Sandbox
              </button>

              <button
                onClick={handleStartRelaxBatch}
                disabled={isProcessing || !folderPath}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-white text-emerald-950 font-bold text-xs hover:bg-emerald-50 transition-all shadow-sm disabled:opacity-50 shrink-0"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin text-emerald-900" /> : <Play className="w-4 h-4 text-emerald-900" />}
                <span>Start Batch</span>
              </button>
            </div>
          </div>
        </div>

        {/* Relaxing Sloth Mascot Badge */}
        <div className="absolute right-6 bottom-4 select-none opacity-20 sm:opacity-30 text-8xl pointer-events-none">
          🦥☕
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Progress Cards Matrix */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        
        <div className="bg-white p-4 rounded-xl border border-stone-200 text-center space-y-1 shadow-2xs">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Discovered</span>
          <div className="text-2xl font-black text-stone-900">{discoveredCount}</div>
          <span className="text-[10px] text-stone-400">Total in queue</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 text-center space-y-1 shadow-2xs">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Analyzed</span>
          <div className="text-2xl font-black text-emerald-800">{analyzedCount}</div>
          <span className="text-[10px] text-stone-400">Content processed</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 text-center space-y-1 shadow-2xs">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Ready</span>
          <div className="text-2xl font-black text-teal-700">{readyCount}</div>
          <span className="text-[10px] text-stone-400">High confidence</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 text-center space-y-1 shadow-2xs">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Needs Review</span>
          <div className="text-2xl font-black text-amber-700">{needsReviewCount}</div>
          <span className="text-[10px] text-stone-400">Flagged for check</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 text-center space-y-1 shadow-2xs">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Executed</span>
          <div className="text-2xl font-black text-emerald-900">{executionSummary?.successful_actions || 0}</div>
          <span className="text-[10px] text-stone-400">Approved moves</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 text-center space-y-1 shadow-2xs">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Skipped/Failed</span>
          <div className="text-2xl font-black text-stone-400">{executionSummary?.failed_actions || 0}</div>
          <span className="text-[10px] text-stone-400">Protected</span>
        </div>

      </div>

      {/* Live Processing Animation & Controls */}
      {isProcessing && (
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="font-bold text-stone-900 text-sm">
                Relaxing while local agent processes tasks...
              </span>
            </div>

            <button
              onClick={handleCancel}
              className="px-3 py-1.5 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 text-xs font-semibold transition-colors"
            >
              Cancel Batch
            </button>
          </div>

          <div className="w-full bg-stone-100 rounded-full h-3 overflow-hidden">
            <div 
              className="bg-emerald-800 h-3 rounded-full transition-all duration-300"
              style={{ width: `${jobStatus?.progress_percentage || 10}%` }}
            ></div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-stone-500 font-mono">
            <span>Concurrency: 2 workers (Laptop-cool profile)</span>
            <span>Progress: {jobStatus?.progress_percentage || 0}%</span>
          </div>
        </div>
      )}

      {/* Plan Ready Banner & Approval */}
      {plan && !executionSummary && !isProcessing && (
        <div className="bg-emerald-50/80 border border-emerald-300 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-extrabold text-emerald-950 text-base flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                <span>Relax Mode Analysis Complete</span>
              </h3>
              <p className="text-xs text-emerald-900">
                {plan.actions.length} file organization suggestions prepared. Review and approve to finish the batch.
              </p>
            </div>

            <button
              onClick={handleAutoApproveAll}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-sm"
            >
              <span>Approve & Apply All Changes</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick list of planned moves */}
          <div className="bg-white rounded-xl border border-emerald-200 overflow-hidden divide-y divide-stone-100 text-xs font-mono max-h-56 overflow-y-auto">
            {plan.actions.map((a) => (
              <div key={a.id} className="p-2.5 px-4 flex items-center justify-between">
                <div className="truncate max-w-md">
                  <span className="text-stone-500">{a.original_name}</span>
                  <span className="text-emerald-700 mx-2">→</span>
                  <span className="font-bold text-stone-900">{a.proposed_rel_path}</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                  {a.proposed_category}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Execution Results & Estimated Time Saved */}
      {executionSummary && (
        <div className="bg-white rounded-3xl border border-stone-200 p-8 shadow-sm space-y-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto text-2xl font-bold">
            🎉
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="text-2xl font-black text-stone-900 tracking-tight">Batch Finished!</h3>
            <p className="text-xs sm:text-sm text-stone-600">
              Your files have been safely reorganized. All original paths and timestamps are recorded in the local SQLite journal.
            </p>
          </div>

          {/* Estimated Time Saved Counter */}
          <div className="inline-block p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
            <div className="flex items-center justify-center space-x-2 text-emerald-800 font-bold text-xs uppercase tracking-wider mb-1">
              <Clock className="w-4 h-4" />
              <span>Estimated Time Saved</span>
            </div>
            <div className="text-4xl font-black text-emerald-950">
              {executionSummary.estimated_time_saved_minutes} <span className="text-lg font-medium text-emerald-800">minutes</span>
            </div>
            <p className="text-[11px] text-emerald-700/80 mt-1">
              *Based on a standard 2.5-minute manual review & sorting estimate per file.
            </p>
          </div>

          <div className="flex justify-center space-x-3 pt-2">
            <button
              onClick={handleUndo}
              disabled={isUndoing}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition-all shadow-2xs"
            >
              {isUndoing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
              <span>Undo This Entire Batch</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
