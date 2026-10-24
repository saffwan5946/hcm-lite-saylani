import React, { useState } from 'react';
import { UploadCloud, CheckCircle2, AlertTriangle, FileSpreadsheet, Play, Check } from 'lucide-react';
import { api } from '../services/api';

export default function CSVEmployeeImportModal({ isOpen, onClose, onImportSuccess }) {
  const [csvText, setCsvText] = useState('');
  const [dryRunReport, setDryRunReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  if (!isOpen) return null;

  const sampleCSVTemplate = `employeeCode,firstName,lastName,email,department,designation,basicSalary,dateOfJoining,gender,phone
EMP-101,Hamza,Khan,hamza@company.com,Engineering,Software Engineer,120000,2026-01-15,Male,03001234567
EMP-102,Ayesha,Malik,ayesha@company.com,HR,HR Specialist,95000,2026-02-01,Female,03129876543
EMP-103,Bilal,Ahmed,bilal@company.com,Finance,Accountant,110000,2026-03-10,Male,03335557788`;

  const parseCsvIntoRows = (text) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map((h) => h.trim());
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const values = lines[i].split(',').map((v) => v.trim());
      const rowObj = {};
      headers.forEach((h, idx) => {
        rowObj[h] = values[idx] || '';
      });
      rows.push(rowObj);
    }
    return rows;
  };

  const handleDryRun = async () => {
    setError(null);
    setSuccess(null);
    const rows = parseCsvIntoRows(csvText);
    if (rows.length === 0) {
      setError('Please provide valid CSV content with a header row.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.csvDryRun(rows);
      setDryRunReport(res.data);
    } catch (err) {
      setError(err.message || 'Dry run failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!dryRunReport?.validRows || dryRunReport.validRows.length === 0) return;
    setImporting(true);
    setError(null);

    try {
      const res = await api.csvImport(dryRunReport.validRows);
      setSuccess(`Successfully imported ${res.data.importedCount} employees! Logins generated.`);
      setTimeout(() => {
        onImportSuccess?.();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Import failed.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full p-6 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">CSV Employee Import with Dry-Run</h3>
              <p className="text-xs text-slate-500">Validate data errors before committing to the database</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          <div className="flex justify-between items-center text-xs">
            <label className="font-semibold text-slate-700">Paste CSV or use template:</label>
            <button
              onClick={() => setCsvText(sampleCSVTemplate)}
              className="text-blue-600 hover:underline font-medium"
            >
              Load Sample Template
            </button>
          </div>

          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            rows={5}
            placeholder="employeeCode,firstName,lastName,email,department,designation,basicSalary,dateOfJoining..."
            className="w-full font-mono text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div className="flex justify-end">
            <button
              onClick={handleDryRun}
              disabled={loading || !csvText.trim()}
              className="bg-slate-800 hover:bg-slate-900 text-white text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 font-medium transition"
            >
              <Play className="w-3.5 h-3.5" />
              {loading ? 'Running Dry-Run...' : 'Run Dry-Run Check'}
            </button>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Dry Run Error Report Table */}
          {dryRunReport && (
            <div className="space-y-3 pt-2">
              <div className="flex gap-4 text-xs font-semibold">
                <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  ✓ Valid Rows: {dryRunReport.validCount}
                </span>
                <span className="text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                  ✕ Error Rows: {dryRunReport.errorCount}
                </span>
              </div>

              {dryRunReport.errors?.length > 0 && (
                <div className="border border-rose-200 rounded-xl overflow-hidden text-xs">
                  <div className="bg-rose-50 px-3 py-2 font-semibold text-rose-800 border-b border-rose-200">
                    Validation Errors Report (Row + Field + Reason)
                  </div>
                  <div className="max-h-40 overflow-y-auto divide-y divide-rose-100">
                    {dryRunReport.errors.map((err, idx) => (
                      <div key={idx} className="p-2.5 flex items-start gap-2 bg-white">
                        <span className="font-mono bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded text-[10px]">
                          Row {err.row}
                        </span>
                        <span className="font-semibold text-slate-700">[{err.field}]:</span>
                        <span className="text-rose-600">{err.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
          <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl">
            Cancel
          </button>
          <button
            onClick={handleExecuteImport}
            disabled={!dryRunReport || dryRunReport.validCount === 0 || importing}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-medium px-4 py-2 rounded-xl transition flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            {importing ? 'Importing Employees...' : `Import ${dryRunReport?.validCount || 0} Valid Records`}
          </button>
        </div>
      </div>
    </div>
  );
}

