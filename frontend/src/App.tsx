import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { FolderOrganizer } from './components/FolderOrganizer';
import { DocumentDigest } from './components/DocumentDigest';
import { RelaxMode } from './components/RelaxMode';
import { ActivityHistory } from './components/ActivityHistory';
import { SettingsModal } from './components/SettingsModal';
import { DemoGuideModal } from './components/DemoGuideModal';
import { api } from './services/api';
import { OllamaStatus, HistoryItem } from './types';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

export function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [aiStatus, setAiStatus] = useState<OllamaStatus | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isDemoGuideOpen, setIsDemoGuideOpen] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Initial load & periodic AI status check
  useEffect(() => {
    fetchAIStatus();
    loadHistory();

    const interval = setInterval(() => {
      fetchAIStatus();
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  const fetchAIStatus = async () => {
    try {
      const status = await api.getAIStatus();
      setAiStatus(status);
    } catch (e) {
      setAiStatus({
        reachable: false,
        active_model: 'None',
        available_models: [],
        error: 'Ollama unreachable'
      });
    }
  };

  const loadHistory = async () => {
    try {
      const res = await api.getHistory();
      setHistory(res.history);
    } catch (e) {
      console.error("History loading error:", e);
    }
  };

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleUndoJob = async (jobId: string) => {
    try {
      const res = await api.undoJob(jobId);
      showNotification(`Successfully restored ${res.undone_successful} of ${res.total_operations} files.`);
      loadHistory();
    } catch (e: any) {
      showNotification(e.message || 'Undo batch failed', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#f9f8f5] flex flex-col font-sans text-stone-900 selection:bg-emerald-200">
      
      {/* Navbar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        aiStatus={aiStatus}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenDemoGuide={() => setIsDemoGuideOpen(true)}
      />

      {/* Floating Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div className={`p-4 rounded-2xl shadow-xl border flex items-center space-x-2 text-xs font-bold ${
            notification.type === 'success' 
              ? 'bg-emerald-900 text-white border-emerald-700' 
              : 'bg-red-900 text-white border-red-700'
          }`}>
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-300" />
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {currentTab === 'dashboard' && (
          <Dashboard
            setCurrentTab={setCurrentTab}
            aiStatus={aiStatus}
            history={history}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenDemoGuide={() => setIsDemoGuideOpen(true)}
            onUndoJob={handleUndoJob}
          />
        )}

        {currentTab === 'organizer' && (
          <FolderOrganizer
            aiStatus={aiStatus}
            onRefreshHistory={loadHistory}
          />
        )}

        {currentTab === 'digest' && (
          <DocumentDigest
            aiStatus={aiStatus}
            onRefreshHistory={loadHistory}
          />
        )}

        {currentTab === 'relax' && (
          <RelaxMode
            aiStatus={aiStatus}
            onRefreshHistory={loadHistory}
          />
        )}

        {currentTab === 'history' && (
          <ActivityHistory
            history={history}
            onRefreshHistory={loadHistory}
            onUndoJob={handleUndoJob}
          />
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        aiStatus={aiStatus}
        onRefreshAIStatus={fetchAIStatus}
      />

      {/* Demo Guide Modal */}
      <DemoGuideModal
        isOpen={isDemoGuideOpen}
        onClose={() => setIsDemoGuideOpen(false)}
        onStartDemoInOrganizer={() => setCurrentTab('organizer')}
      />

      {/* Footer */}
      <footer className="border-t border-stone-200/80 bg-white/60 py-6 text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-emerald-950">SLOTH</span>
            <span>•</span>
            <span>Hacktoberfest 2026 “Slow and Steady”</span>
          </div>

          <div className="flex items-center space-x-4 text-[11px] text-stone-400">
            <span>Local Inference: Ollama</span>
            <span>•</span>
            <span>Zero Cloud Telemetry</span>
            <span>•</span>
            <span>MIT License</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default App;
