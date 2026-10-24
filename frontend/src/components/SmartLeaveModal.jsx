import React, { useState } from 'react';
import { Sparkles, Calendar, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

export default function SmartLeaveModal({ isOpen, onClose, onApplied }) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  if (!isOpen) return null;

  const handleParse = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.aiSmartLeave(prompt);
      setParsed(res.data?.parsedForm);
    } catch (err) {
      setError(err.message || 'Failed to parse natural language request.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAndApply = async () => {
    if (!parsed) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.applyLeave({
        leaveTypeName: parsed.type,
        startDate: parsed.start,
        endDate: parsed.end,
        reason: parsed.reason
      });
      setSuccess('Leave request applied successfully!');
      setTimeout(() => {
        onApplied?.();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to submit leave.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Smart Leave Assistant</h3>
              <p className="text-xs text-slate-500">Apply for leave in plain natural language</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {!parsed ? (
          <div className="mt-4 space-y-3">
            <label className="text-xs font-semibold text-slate-700">Type what dates and reasons you need:</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder='e.g., "Need next Monday and Tuesday off for my sister&apos;s wedding"'
              rows={3}
              className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex justify-between items-center pt-2">
              <span className="text-[11px] text-slate-400">Try English or Roman Urdu</span>
              <button
                onClick={handleParse}
                disabled={loading || !prompt.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-medium px-4 py-2 rounded-xl flex items-center gap-1.5 transition"
              >
                {loading ? <Sparkles className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Auto-Fill Form
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span className="font-medium">Leave Category:</span>
                <span className="capitalize font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">{parsed.type} Leave</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span className="font-medium">Start Date:</span>
                <span className="font-mono text-slate-800">{parsed.start}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span className="font-medium">End Date:</span>
                <span className="font-mono text-slate-800">{parsed.end}</span>
              </div>
              <div className="border-t border-slate-200 pt-2 text-slate-600">
                <span className="font-medium block mb-1">Reason:</span>
                <p className="text-slate-800 italic bg-white p-2 rounded-lg border border-slate-200">{parsed.reason}</p>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setParsed(null)}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Edit Prompt
              </button>
              <button
                onClick={handleConfirmAndApply}
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-4 py-2 rounded-xl transition"
              >
                {submitting ? 'Submitting...' : 'Confirm & Apply'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

