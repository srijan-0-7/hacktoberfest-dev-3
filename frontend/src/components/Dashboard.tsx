import React from 'react';
import { 
  FolderTree, 
  FileText, 
  Coffee, 
  ShieldCheck, 
  Clock, 
  CheckCircle, 
  ArrowRight, 
  Cpu, 
  Sparkles,
  ExternalLink,
  RotateCcw,
  BookOpen
} from 'lucide-react';
import { OllamaStatus, HistoryItem } from '../types';

interface DashboardProps {
  setCurrentTab: (tab: string) => void;
  aiStatus: OllamaStatus | null;
  history: HistoryItem[];
  onOpenSettings: () => void;
  onOpenDemoGuide: () => void;
  onUndoJob: (jobId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  setCurrentTab,
  aiStatus,
  history,
  onOpenSettings,
  onOpenDemoGuide,
  onUndoJob
}) => {
  // Compute aggregate stats from history
  const totalExecutedOps = history.reduce((sum, h) => sum + (h.executed_count || 0), 0);
  const totalDigests = history.filter(h => h.job_type === 'document_digest').length;
  const estimatedMinutesSaved = Math.round((totalExecutedOps + totalDigests) * 2.5);
  const estimatedHoursSaved = (estimatedMinutesSaved / 60).toFixed(1);

  return (
    <div className="space-y-8 pb-12">
      
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-950 text-white p-8 sm:p-10 shadow-lg border border-emerald-700/40">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-700/50 text-emerald-200 border border-emerald-600/40 text-xs font-semibold">
            <span>🦥</span>
            <span>Hacktoberfest 2026 — “Slow and Steady”</span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Your boring tasks.<br />
            <span className="text-emerald-300">Handled while you rest.</span>
          </h1>
          
          <p className="text-emerald-100/90 text-sm sm:text-base leading-relaxed">
            Drop the digital clutter. SLOTH runs open-weight AI directly on your computer to classify files, 
            rename documents cleanly, and summarize lengthy readings. Review once. Relax.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={() => setCurrentTab('organizer')}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white text-emerald-950 font-bold text-sm hover:bg-emerald-50 transition-all shadow-sm"
            >
              <FolderTree className="w-4 h-4 text-emerald-800" />
              <span>Organize a Folder</span>
            </button>
            <button
              onClick={() => setCurrentTab('digest')}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-800/80 hover:bg-emerald-700 text-white font-semibold text-sm border border-emerald-600 transition-all"
            >
              <FileText className="w-4 h-4 text-emerald-300" />
              <span>Summarize a Document</span>
            </button>
            <button
              onClick={onOpenDemoGuide}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-950 text-emerald-200 font-medium text-sm border border-emerald-700/50 transition-all"
            >
              <span>🧪 Try Demo Sandbox</span>
            </button>
          </div>
        </div>

        {/* Sloth Mascot Graphic Accent */}
        <div className="absolute right-4 bottom-2 sm:right-8 sm:bottom-6 opacity-25 sm:opacity-35 pointer-events-none text-8xl sm:text-9xl select-none">
          🦥
        </div>
      </div>

      {/* Local AI Offline Helper Banner (if Ollama offline) */}
      {!aiStatus?.reachable && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-800 shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900">Ollama is currently offline</h4>
              <p className="text-xs text-amber-800 mt-0.5">
                SLOTH is running in <span className="font-semibold">Deterministic Rules Mode</span>. To unlock full open-weight AI inference, start Ollama locally.
              </p>
              <p className="text-xs font-mono bg-amber-100/80 px-2 py-1 rounded mt-1.5 text-amber-950 inline-block">
                ollama run qwen2.5:3b
              </p>
            </div>
          </div>
          <button
            onClick={onOpenSettings}
            className="text-xs font-bold text-amber-900 hover:text-amber-950 px-3 py-1.5 rounded-lg border border-amber-300 bg-white hover:bg-amber-100 transition-colors shrink-0"
          >
            Connection Setup & Guide
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-medium">Estimated Time Saved</span>
            <Clock className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-black text-stone-900">{estimatedHoursSaved} hrs</div>
          <p className="text-[11px] text-stone-500 mt-1">~2.5 mins per organized task</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-medium">Operations Executed</span>
            <CheckCircle className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-black text-stone-900">{totalExecutedOps} files</div>
          <p className="text-[11px] text-stone-500 mt-1">Fully recorded in local journal</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-medium">Document Digests</span>
            <FileText className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-black text-stone-900">{totalDigests} digests</div>
          <p className="text-[11px] text-stone-500 mt-1">Saved in SQLite history</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-medium">Local Privacy Mode</span>
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-black text-emerald-800">100% Offline</div>
          <p className="text-[11px] text-stone-500 mt-1">No files leave your computer</p>
        </div>
      </div>

      {/* Feature Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Organizer */}
        <div 
          onClick={() => setCurrentTab('organizer')}
          className="group cursor-pointer bg-white rounded-2xl p-6 border border-stone-200 hover:border-emerald-500 hover:shadow-md transition-all flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <FolderTree className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-stone-900 group-hover:text-emerald-800 transition-colors">
              Smart Folder Organizer
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              Scan messy folders. Let local AI suggest clean names, categories, and tags. Review the plan in 2 safe phases before applying changes.
            </p>
          </div>
          <div className="pt-4 flex items-center text-xs font-bold text-emerald-800 group-hover:translate-x-1 transition-transform">
            <span>Scan & organize files</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </div>
        </div>

        {/* Card 2: Document Digest */}
        <div 
          onClick={() => setCurrentTab('digest')}
          className="group cursor-pointer bg-white rounded-2xl p-6 border border-stone-200 hover:border-emerald-500 hover:shadow-md transition-all flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-stone-900 group-hover:text-emerald-800 transition-colors">
              Document Digest
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              Upload PDFs, DOCX, or text notes. Get executive summaries, key takeaways, action items, and explicitly stated deadlines.
            </p>
          </div>
          <div className="pt-4 flex items-center text-xs font-bold text-emerald-800 group-hover:translate-x-1 transition-transform">
            <span>Summarize document</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </div>
        </div>

        {/* Card 3: Relax Mode */}
        <div 
          onClick={() => setCurrentTab('relax')}
          className="group cursor-pointer bg-white rounded-2xl p-6 border border-stone-200 hover:border-emerald-500 hover:shadow-md transition-all flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Coffee className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-stone-900 group-hover:text-emerald-800 transition-colors">
              Relax Mode
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              The signature feature. Pick a directory, sit back, and watch Sloth work through tasks calmly in the background with live progress tracking.
            </p>
          </div>
          <div className="pt-4 flex items-center text-xs font-bold text-emerald-800 group-hover:translate-x-1 transition-transform">
            <span>Start Relax Mode</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </div>
        </div>

      </div>

      {/* Recent Activity Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-emerald-800" />
            <h3 className="font-bold text-stone-900 text-sm">Recent Activity & Operation Journal</h3>
          </div>
          <button
            onClick={() => setCurrentTab('history')}
            className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 transition-colors"
          >
            View Full History →
          </button>
        </div>

        {history.length === 0 ? (
          <div className="p-8 text-center text-stone-400 text-xs sm:text-sm">
            <p>No recent activity yet. Organize a folder or run the demo sandbox to see the journal in action.</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {history.slice(0, 5).map((item) => (
              <div key={item.id} className="p-4 sm:px-6 flex items-center justify-between text-xs sm:text-sm hover:bg-stone-50/60 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-stone-900 uppercase text-[10px] tracking-wider px-2 py-0.5 rounded bg-stone-100 border border-stone-200">
                      {item.job_type.replace('_', ' ')}
                    </span>
                    <span className="text-stone-400 font-mono text-xs">#{item.id}</span>
                    <span className="text-stone-400 text-xs">• {new Date(item.created_at).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-stone-600 font-mono text-xs truncate max-w-xs sm:max-w-md">
                    {item.target_path || 'Direct document processing'}
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                    item.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                    item.status === 'running' ? 'bg-blue-100 text-blue-800' :
                    'bg-stone-100 text-stone-700'
                  }`}>
                    {item.status}
                  </span>

                  {item.can_undo && (
                    <button
                      onClick={() => onUndoJob(item.id)}
                      className="flex items-center space-x-1 px-2.5 py-1 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 text-xs font-medium hover:bg-amber-100 transition-colors"
                      title="Undo all operations from this batch"
                    >
                      <RotateCcw className="w-3 h-3 text-amber-700" />
                      <span>Undo</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
