import React, { useState } from 'react';
import { 
  PlayCircle, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  FolderTree, 
  FileText, 
  ShieldCheck, 
  RotateCcw,
  Loader2
} from 'lucide-react';
import { api } from '../services/api';

interface DemoGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartDemoInOrganizer: () => void;
}

export const DemoGuideModal: React.FC<DemoGuideModalProps> = ({
  isOpen,
  onClose,
  onStartDemoInOrganizer
}) => {
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [demoPath, setDemoPath] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleInit = async () => {
    setIsInitializing(true);
    try {
      const res = await api.setupDemoSandbox(true);
      setDemoPath(res.demo_path);
    } catch (e) {
      console.error(e);
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-6 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-200">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-800 text-white flex items-center justify-center text-lg font-bold">
              🧪
            </div>
            <div>
              <h3 className="font-extrabold text-stone-900 text-lg">Hacktoberfest Demo Walkthrough</h3>
              <p className="text-xs text-stone-500">5-minute evaluation sequence for judges & reviewers.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 text-lg font-bold p-1"
          >
            ✕
          </button>
        </div>

        {/* Overview */}
        <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 space-y-2 text-xs text-emerald-950">
          <p className="font-bold">Welcome to the SLOTH Live Evaluation!</p>
          <p className="leading-relaxed text-[11px] text-emerald-900">
            SLOTH is built for Hacktoberfest 2026 “Slow and Steady”. It proves that personal AI can run completely on the user's laptop using open-weight models, respecting privacy while handling tedious file sorting.
          </p>
        </div>

        {/* 5 Steps */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
            Recommended 5-Minute Sequence
          </h4>

          <div className="space-y-2.5 text-xs text-stone-700">
            <div className="p-3 rounded-xl border border-stone-200 bg-stone-50/60 flex items-start space-x-3">
              <span className="w-5 h-5 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">1</span>
              <div>
                <span className="font-bold text-stone-900 block">Initialize Sandbox Files</span>
                <span className="text-[11px] text-stone-500">Generates 8 realistic sample files in <code>./demo_sandbox</code> (DSA study notes, receipts CSV, research paper excerpt, DOCX brief, images).</span>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-stone-200 bg-stone-50/60 flex items-start space-x-3">
              <span className="w-5 h-5 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">2</span>
              <div>
                <span className="font-bold text-stone-900 block">Scan & Analyze with Local AI</span>
                <span className="text-[11px] text-stone-500">The local model reads the file contents and proposes structured filenames, folders, tags, and reasons.</span>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-stone-200 bg-stone-50/60 flex items-start space-x-3">
              <span className="w-5 h-5 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">3</span>
              <div>
                <span className="font-bold text-stone-900 block">Review & Inline Edit Plan</span>
                <span className="text-[11px] text-stone-500">Inspect the 2-phase plan. Edit any proposed name directly or switch categories before approval.</span>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-stone-200 bg-stone-50/60 flex items-start space-x-3">
              <span className="w-5 h-5 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">4</span>
              <div>
                <span className="font-bold text-stone-900 block">Execute with Collision Safeguards</span>
                <span className="text-[11px] text-stone-500">Approve the batch. Files are safely organized into subfolders and journaled to SQLite.</span>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-stone-200 bg-stone-50/60 flex items-start space-x-3">
              <span className="w-5 h-5 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">5</span>
              <div>
                <span className="font-bold text-stone-900 block">Safe 1-Click Undo</span>
                <span className="text-[11px] text-stone-500">Click “Undo Batch” to immediately restore files to their exact initial positions and names.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Launch Actions */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-stone-200">
          <div className="text-[11px] text-stone-500 font-mono">
            Sandbox: {demoPath || './demo_sandbox'}
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              onClick={handleInit}
              disabled={isInitializing}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-800 font-bold text-xs"
            >
              {isInitializing ? 'Resetting...' : 'Reset Sandbox Files'}
            </button>

            <button
              onClick={() => {
                onClose();
                onStartDemoInOrganizer();
              }}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm"
            >
              <span>Launch Demo in Organizer</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
