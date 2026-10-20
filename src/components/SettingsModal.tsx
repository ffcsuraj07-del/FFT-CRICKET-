import React, { useState } from 'react';
import { Database, Trash2, RefreshCw, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';
import { apiFetch } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onRefreshData,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleSeedDemo = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await apiFetch('/api/demo/seed', { method: 'POST' });
      setMessage({ type: 'success', text: res.message || 'Demo data loaded successfully' });
      onRefreshData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to seed demo data' });
    } finally {
      setLoading(false);
    }
  };

  const handleClearDemo = async () => {
    if (!window.confirm('Are you sure you want to remove all demo players, teams, and matches? Custom user records will be kept.')) {
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res = await apiFetch('/api/demo/clear', { method: 'POST' });
      setMessage({ type: 'success', text: res.message || 'Demo data removed successfully' });
      onRefreshData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to clear demo data' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-white">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-900/60 border border-emerald-700/60 flex items-center justify-center text-emerald-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base">FFC Data & Settings</h3>
              <p className="text-xs text-slate-400">Manage demo records and database state</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-sm px-2 py-1 rounded-md hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {message && (
          <div
            className={`p-3 rounded-xl mb-4 text-xs flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                : 'bg-red-950/80 text-red-300 border border-red-800'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <div className="space-y-4">
          {/* Admin status */}
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <div className="text-xs font-semibold text-slate-300 mb-1">Admin Access</div>
            <div className="text-xs text-slate-400 flex items-center justify-between">
              <span>Status:</span>
              <span className={`font-semibold ${user ? 'text-emerald-400' : 'text-amber-400'}`}>
                {user ? `Signed in (${user.email})` : 'Public Scorer (Open Mode)'}
              </span>
            </div>
          </div>

          {/* Demo actions */}
          <div className="space-y-2.5">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Demo Data Operations</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Quickly repopulate or clear 10 demo players, 2 demo teams, and 3 demo matches with full ball-by-ball scorecards.
            </p>

            <button
              onClick={handleSeedDemo}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-semibold shadow transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Load / Restore Realistic Demo Data</span>
            </button>

            <button
              onClick={handleClearDemo}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-red-900/40 hover:bg-red-900/70 border border-red-800/60 text-red-200 text-xs font-semibold transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Demo Data Only</span>
            </button>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
