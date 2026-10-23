import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Cpu, 
  ShieldCheck, 
  RefreshCw, 
  Check, 
  Sliders, 
  Terminal, 
  Copy,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { api } from '../services/api';
import { AppSettings, OllamaStatus } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  aiStatus: OllamaStatus | null;
  onRefreshAIStatus: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  aiStatus,
  onRefreshAIStatus
}) => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [ollamaUrl, setOllamaUrl] = useState<string>('http://127.0.0.1:11434');
  const [selectedModel, setSelectedModel] = useState<string>('qwen2.5:3b');
  const [concurrency, setConcurrency] = useState<number>(2);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [copiedCmd, setCopiedCmd] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      const s = await api.getSettings();
      setSettings(s);
      setOllamaUrl(s.ollama_base_url);
      setSelectedModel(s.selected_model);
      setConcurrency(s.concurrency_limit);
    } catch (e) {
      console.error("Failed to load settings:", e);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.updateSettings({
        ollama_base_url: ollamaUrl,
        selected_model: selectedModel,
        concurrency_limit: concurrency
      });
      await onRefreshAIStatus();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (e) {
      console.error("Save settings error:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    await onRefreshAIStatus();
    setIsTesting(false);
  };

  const copyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-6 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-200">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-stone-900 text-lg">Settings & Local AI Diagnostics</h3>
              <p className="text-xs text-stone-500">Configure your local Ollama connection, models, and concurrency.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 text-lg font-bold p-1"
          >
            ✕
          </button>
        </div>

        {/* Section 1: Ollama Status & Connection */}
        <div className="space-y-4 bg-stone-50/80 p-5 rounded-2xl border border-stone-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-emerald-800" />
              <span className="font-bold text-stone-900 text-xs uppercase tracking-wider">Ollama Local Engine</span>
            </div>

            <div className="flex items-center space-x-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                aiStatus?.reachable 
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300' 
                  : 'bg-amber-100 text-amber-900 border-amber-300'
              }`}>
                {aiStatus?.reachable ? '● Online & Connected' : '○ Offline (Rules Fallback)'}
              </span>

              <button
                onClick={handleTestConnection}
                disabled={isTesting}
                className="p-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-100 text-stone-700"
                title="Test Connection"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Ollama URL & Model Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-stone-600 font-semibold mb-1">Ollama API URL</label>
              <input
                type="text"
                value={ollamaUrl}
                onChange={(e) => setOllamaUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 font-mono text-stone-800 focus:outline-none focus:ring-1 focus:ring-emerald-800"
              />
            </div>

            <div>
              <label className="block text-stone-600 font-semibold mb-1">Active Model</label>
              {aiStatus?.available_models && aiStatus.available_models.length > 0 ? (
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 font-mono text-stone-800 bg-white focus:outline-none"
                >
                  {aiStatus.available_models.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  placeholder="e.g. qwen2.5:3b"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 font-mono text-stone-800 focus:outline-none"
                />
              )}
            </div>
          </div>

          {/* Quick Ollama Install Command Helper */}
          <div className="bg-stone-900 rounded-xl p-3.5 text-white font-mono text-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-emerald-400 uppercase tracking-wider block font-bold">Recommended Local Model</span>
              <span className="text-stone-200">ollama run qwen2.5:3b</span>
            </div>
            <button
              onClick={() => copyCommand("ollama run qwen2.5:3b")}
              className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-[11px] font-sans flex items-center space-x-1"
            >
              {copiedCmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCmd ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Section 2: Concurrency & Performance */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <label className="font-bold text-stone-800 flex items-center space-x-1.5">
              <Sliders className="w-4 h-4 text-emerald-800" />
              <span>Processing Concurrency Limit: {concurrency} workers</span>
            </label>
            <span className="text-stone-400">Laptop-cool profile</span>
          </div>
          <input
            type="range"
            min={1}
            max={6}
            value={concurrency}
            onChange={(e) => setConcurrency(parseInt(e.target.value))}
            className="w-full accent-emerald-800 cursor-pointer"
          />
          <p className="text-[11px] text-stone-500">
            Limits simultaneous document reads and model inference to keep CPU and memory usage lightweight on normal laptops.
          </p>
        </div>

        {/* Section 3: Privacy & Security Statement */}
        <div className="bg-emerald-50/60 border border-emerald-200 p-4 rounded-2xl flex items-start space-x-3 text-xs">
          <ShieldCheck className="w-5 h-5 text-emerald-800 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h5 className="font-bold text-emerald-950">Local-First Privacy Guarantee</h5>
            <p className="text-emerald-900/90 leading-relaxed text-[11px]">
              SLOTH processes your documents and files exclusively on your machine. No telemetry, user files, or prompt contents are ever uploaded to cloud AI providers. The entire application functions offline.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-stone-200">
          <div className="text-[11px] text-stone-400 font-mono">
            SLOTH v1.0.0 • SQLite Persistence
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saveSuccess ? <Check className="w-3.5 h-3.5" /> : null}
              <span>{saveSuccess ? 'Saved!' : 'Save Settings'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
