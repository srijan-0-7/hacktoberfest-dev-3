import React, { useState, useEffect } from 'react';
import { 
  History, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Filter, 
  ExternalLink, 
  Loader2, 
  FolderTree, 
  FileText,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { HistoryItem, OperationLog } from '../types';

interface ActivityHistoryProps {
  history: HistoryItem[];
  onRefreshHistory: () => void;
  onUndoJob: (jobId: string) => void;
}

export const ActivityHistory: React.FC<ActivityHistoryProps> = ({
  history,
  onRefreshHistory,
  onUndoJob
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [jobOperations, setJobOperations] = useState<OperationLog[]>([]);
  const [loadingOps, setLoadingOps] = useState<boolean>(false);
  const [undoStatus, setUndoStatus] = useState<string | null>(null);

  // Load detailed operations when a job is clicked
  const handleViewOperations = async (jobId: string) => {
    setSelectedJobId(jobId);
    setLoadingOps(true);
    try {
      const data = await api.getJobOperations(jobId);
      setJobOperations(data.operations);
    } catch (e) {
      console.error("Failed to load operations:", e);
    } finally {
      setLoadingOps(false);
    }
  };

  // Undo single operation
  const handleUndoSingleOp = async (opId: string) => {
    setUndoStatus(`Undoing operation #${opId}...`);
    try {
      await api.undoOperation(opId);
      setUndoStatus(`Successfully restored file.`);
      if (selectedJobId) {
        handleViewOperations(selectedJobId);
      }
      onRefreshHistory();
    } catch (e: any) {
      setUndoStatus(`Undo failed: ${e.message}`);
    }
  };

  const filtered = history.filter(item => {
    const matchesSearch = !searchTerm || 
      item.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (item.target_path && item.target_path.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = typeFilter === 'all' || item.job_type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 pb-12">
      
      {/* Title */}
      <div>
        <h2 className="text-2xl font-black text-stone-900 tracking-tight flex items-center space-x-2">
          <History className="w-6 h-6 text-emerald-800" />
          <span>Activity History & Operation Journal</span>
        </h2>
        <p className="text-xs sm:text-sm text-stone-600 mt-1">
          Durable SQLite audit trail of all folder scans, document digests, and reversible file operations.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Job ID or path..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-800 font-mono"
          />
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto text-xs">
          <span className="text-stone-500 font-medium">Filter Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-stone-300 bg-white text-stone-800 text-xs font-medium focus:outline-none"
          >
            <option value="all">All Jobs</option>
            <option value="folder_organize">Folder Organize</option>
            <option value="batch_execution">Batch Execution</option>
            <option value="document_digest">Document Digest</option>
          </select>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-stone-400 text-xs sm:text-sm">
            No activity records match your filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-100/70 text-stone-600 font-semibold border-b border-stone-200">
                <tr>
                  <th className="p-3 pl-6">Job ID</th>
                  <th className="p-3">Job Type</th>
                  <th className="p-3">Target Path</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Items</th>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-stone-50/70 transition-colors">
                    
                    <td className="p-3 pl-6 font-mono font-bold text-stone-900">
                      #{item.id}
                    </td>

                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-stone-100 text-stone-700 border border-stone-200">
                        {item.job_type.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="p-3 font-mono text-stone-600 truncate max-w-xs" title={item.target_path || ''}>
                      {item.target_path || 'Direct document action'}
                    </td>

                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        item.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                        item.status === 'running' ? 'bg-blue-100 text-blue-800' :
                        item.status === 'cancelled' ? 'bg-amber-100 text-amber-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {item.status}
                      </span>
                    </td>

                    <td className="p-3 font-mono">
                      {item.processed_items} / {item.total_items}
                    </td>

                    <td className="p-3 text-stone-400 text-[11px]">
                      {new Date(item.created_at).toLocaleString()}
                    </td>

                    <td className="p-3 pr-6 text-right space-x-2">
                      <button
                        onClick={() => handleViewOperations(item.id)}
                        className="px-2.5 py-1 rounded-lg border border-stone-300 text-[11px] font-medium text-stone-700 hover:bg-stone-100 transition-colors"
                      >
                        Details
                      </button>

                      {item.can_undo && (
                        <button
                          onClick={() => onUndoJob(item.id)}
                          className="px-2.5 py-1 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-[11px] font-bold transition-colors"
                        >
                          Undo Batch
                        </button>
                      )}
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Operations Drilldown Modal */}
      {selectedJobId && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-stone-200 space-y-4 max-h-[85vh] flex flex-col">
            
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div>
                <h3 className="font-bold text-stone-900 text-base">
                  Job Journal: #{selectedJobId}
                </h3>
                <p className="text-xs text-stone-500">
                  Detailed operation log for this batch with conflict-safe undo.
                </p>
              </div>

              <button
                onClick={() => setSelectedJobId(null)}
                className="text-stone-400 hover:text-stone-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {undoStatus && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
                {undoStatus}
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-2">
              {loadingOps ? (
                <div className="p-8 text-center text-stone-400 text-xs">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-800" />
                  <span>Loading operations...</span>
                </div>
              ) : jobOperations.length === 0 ? (
                <div className="p-8 text-center text-stone-400 text-xs">
                  No individual file operations recorded for this job.
                </div>
              ) : (
                jobOperations.map((op) => (
                  <div key={op.id} className="p-3 rounded-xl border border-stone-200 bg-stone-50/60 text-xs font-mono flex items-start justify-between gap-4">
                    <div className="space-y-1 truncate max-w-lg">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-stone-900 text-[11px]">#{op.id}</span>
                        <span className={`px-2 py-0.2 rounded text-[10px] font-semibold ${
                          op.status === 'executed' ? 'bg-emerald-100 text-emerald-800' :
                          op.status === 'undone' ? 'bg-amber-100 text-amber-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {op.status}
                        </span>
                      </div>
                      <div className="text-stone-500 truncate" title={op.original_path}>
                        Original: {op.original_path}
                      </div>
                      <div className="text-emerald-950 font-semibold truncate" title={op.destination_path}>
                        Dest: {op.destination_path}
                      </div>
                      {op.error && (
                        <div className="text-red-600 text-[10px]">
                          Error: {op.error}
                        </div>
                      )}
                    </div>

                    {op.status === 'executed' && (
                      <button
                        onClick={() => handleUndoSingleOp(op.id)}
                        className="px-2.5 py-1 rounded-lg border border-amber-300 bg-white hover:bg-amber-50 text-amber-900 text-[11px] font-bold transition-colors shrink-0"
                      >
                        Undo Move
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-stone-200 flex justify-end">
              <button
                onClick={() => setSelectedJobId(null)}
                className="px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition-colors"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
