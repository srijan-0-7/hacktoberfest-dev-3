import React from 'react';
import { 
  FolderTree, 
  FileText, 
  Coffee, 
  History, 
  Settings as SettingsIcon, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  PlayCircle
} from 'lucide-react';
import { OllamaStatus } from '../types';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  aiStatus: OllamaStatus | null;
  onOpenSettings: () => void;
  onOpenDemoGuide: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  aiStatus,
  onOpenSettings,
  onOpenDemoGuide
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentTab('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-emerald-800 flex items-center justify-center text-white shadow-sm font-bold text-lg">
              🦥
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-xl tracking-tight text-emerald-950">SLOTH</span>
                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Local-First AI
                </span>
              </div>
              <p className="text-xs text-stone-500 font-medium hidden sm:block">Slow and steady wins the race</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 bg-stone-100/80 p-1 rounded-xl border border-stone-200">
            <button
              onClick={() => setCurrentTab('dashboard')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'dashboard'
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setCurrentTab('organizer')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'organizer'
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
              }`}
            >
              <FolderTree className="w-4 h-4 text-emerald-700" />
              <span>Organizer</span>
            </button>
            <button
              onClick={() => setCurrentTab('digest')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'digest'
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
              }`}
            >
              <FileText className="w-4 h-4 text-emerald-700" />
              <span>Document Digest</span>
            </button>
            <button
              onClick={() => setCurrentTab('relax')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'relax'
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
              }`}
            >
              <Coffee className="w-4 h-4 text-emerald-700" />
              <span>Relax Mode</span>
            </button>
            <button
              onClick={() => setCurrentTab('history')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'history'
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
              }`}
            >
              <History className="w-4 h-4 text-emerald-700" />
              <span>History</span>
            </button>
          </nav>

          {/* Right Status & Actions */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            
            {/* Demo Sandbox Guide Button */}
            <button
              onClick={onOpenDemoGuide}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors"
              title="Launch safe Demo Sandbox"
            >
              <PlayCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Demo Sandbox</span>
            </button>

            {/* AI Status Badge */}
            <div 
              onClick={onOpenSettings}
              className={`cursor-pointer flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                aiStatus?.reachable 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                  : 'bg-amber-50 text-amber-800 border-amber-300'
              }`}
              title={aiStatus?.reachable ? `Ollama Active: ${aiStatus.active_model}` : "Ollama Offline - Click for setup"}
            >
              {aiStatus?.reachable ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                  <span className="font-semibold hidden lg:inline">Ollama:</span>
                  <span className="max-w-[120px] truncate">{aiStatus.active_model}</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span className="font-medium">Ollama Offline (Rules Active)</span>
                </>
              )}
            </div>

            {/* Settings Button */}
            <button
              onClick={onOpenSettings}
              className="p-2 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
              title="Settings & Ollama Diagnostics"
            >
              <SettingsIcon className="w-5 h-5" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
