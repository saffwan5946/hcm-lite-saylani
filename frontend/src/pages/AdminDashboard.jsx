import React, { useState, useEffect } from 'react';
import {
  Users, DollarSign, Activity, Sparkles, Building, Briefcase, Calendar,
  ShieldCheck, FileText, Bell, Search, Filter, Plus, CheckCircle, RefreshCw
} from 'lucide-react';
import { api } from '../services/api';

export default function AdminDashboard({ onOpenAI }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [summarizing, setSummarizing] = useState(false);
  const [summaryBullets, setSummaryBullets] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Org management state
  const [departments, setDepartments] = useState([]);
  const [newDeptName, setNewDeptName] = useState('');
  const [hrEmail, setHrEmail] = useState('');
  const [hrPassword, setHrPassword] = useState('SaylaniHR@2026');
  const [actionMsg, setActionMsg] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dashRes, deptRes] = await Promise.all([
        api.getAdminDashboard(),
        api.getDepartments()
      ]);
      setData(dashRes.data);
      setDepartments(deptRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSummarize = async () => {
    if (!data?.kpis) return;
    setSummarizing(true);
    try {
      const res = await api.aiSummarize(data.kpis);
      setSummaryBullets(res.data?.summaryBullets);
    } catch (err) {
      alert(err.message);
    } finally {
      setSummarizing(false);
    }
  };

  const handleCreateDept = async (e) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    try {
      await api.createDepartment({ name: newDeptName.trim() });
      setNewDeptName('');
      setActionMsg('Department created successfully!');
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateHR = async (e) => {
    e.preventDefault();
    if (!hrEmail.trim()) return;
    try {
      await api.createHR({ email: hrEmail.trim(), password: hrPassword });
      setHrEmail('');
      setActionMsg(`HR login created for ${hrEmail}!`);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleFinalizePayroll = async () => {
    const period = new Date().toISOString().slice(0, 7);
    try {
      await api.finalizePayroll({ period });
      setActionMsg(`Monthly payroll for ${period} successfully finalized and locked.`);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-500">Loading Admin Dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Action banner */}
      {actionMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center justify-between">
          <span>✓ {actionMsg}</span>
          <button onClick={() => setActionMsg(null)} className="text-emerald-600 font-bold">✕</button>
        </div>
      )}

      {/* Top Header & AI Summarizer */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Executive Company Dashboard</h1>
          <p className="text-xs text-slate-500">Organization-wide workforce metrics, governance, and audit logs</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSummarize}
            disabled={summarizing}
            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs px-3.5 py-2.5 rounded-xl border border-indigo-200/80 transition flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            {summarizing ? 'Analyzing...' : 'AI KPI Summary'}
          </button>
          <button
            onClick={onOpenAI}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3.5 py-2.5 rounded-xl shadow-xs transition flex items-center gap-1.5"
          >
            Ask AI Assistant
          </button>
        </div>
      </div>

      {/* AI Summary Card */}
      {summaryBullets && (
        <div className="p-4 bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-2xl shadow-lg border border-indigo-700 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 mb-2 font-semibold text-xs text-indigo-300">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Executive AI Insights
          </div>
          <ul className="space-y-1.5 text-xs text-slate-200">
            {summaryBullets.map((b, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-indigo-400 font-bold">•</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* KPIs Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 block">Total Active Headcount</span>
          <span className="text-2xl font-bold text-slate-900 mt-1 block">{data?.kpis?.headcount || 0}</span>
          <span className="text-[11px] text-emerald-600 font-medium">Across all departments</span>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 block">Attrition Rate (YTD)</span>
          <span className="text-2xl font-bold text-slate-900 mt-1 block">{data?.kpis?.attritionYTD || 0}%</span>
          <span className="text-[11px] text-slate-500">Exits vs Average Headcount</span>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 block">Monthly Payroll Cost</span>
          <span className="text-2xl font-bold text-slate-900 mt-1 block">PKR {Number(data?.kpis?.payrollCost || 0).toLocaleString()}</span>
          <span className="text-[11px] text-blue-600 font-medium">Estimated Gross</span>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 block">Average Salary</span>
          <span className="text-2xl font-bold text-slate-900 mt-1 block">PKR {Number(data?.kpis?.avgSalary || 0).toLocaleString()}</span>
          <span className="text-[11px] text-slate-500">Mean gross per employee</span>
        </div>
      </div>

      {/* Nav Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-2 transition ${activeTab === 'overview' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500'}`}
        >
          Department Overview
        </button>
        <button
          onClick={() => setActiveTab('org')}
          className={`pb-2 transition ${activeTab === 'org' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500'}`}
        >
          Org Setup & HR Logins
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-2 transition ${activeTab === 'audit' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500'}`}
        >
          Immutable Audit Log Feed
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Department Breakdown Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Headcount & Payroll by Department</h3>
            {data?.deptStats?.length === 0 ? (
              <p className="text-xs text-slate-400 py-4">No department statistics available yet.</p>
            ) : (
              <div className="space-y-3">
                {data?.deptStats?.map((dept, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs p-3 bg-slate-50 rounded-2xl">
                    <span className="font-semibold text-slate-800">{dept.department}</span>
                    <div className="flex gap-4">
                      <span className="text-slate-500">{dept.headcount} staff</span>
                      <span className="font-mono font-bold text-slate-900">PKR {dept.payrollCost.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payroll Finalization Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">Monthly Payroll Finalization</h3>
              <p className="text-xs text-slate-500 mb-4">
                Section 2 Rule: Only the Admin can lock and finalize monthly payroll prepared by HR. Once finalized, payroll runs cannot be edited.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 mb-4">
                Current Period: <span className="font-mono font-bold">{new Date().toISOString().slice(0, 7)}</span>
              </div>
            </div>
            <button
              onClick={handleFinalizePayroll}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-3 rounded-2xl transition shadow-xs"
            >
              Finalize & Lock Current Period Payroll
            </button>
          </div>
        </div>
      )}

      {activeTab === 'org' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Create Department Form */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Add Department</h3>
            <form onSubmit={handleCreateDept} className="space-y-3">
              <input
                type="text"
                required
                placeholder="Department Name (e.g. Quality Assurance)"
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200"
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition"
              >
                Create Department
              </button>
            </form>

            <div className="mt-4 pt-4 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-500 mb-2 block">Existing Departments:</span>
              <div className="flex flex-wrap gap-1.5">
                {departments.map((d) => (
                  <span key={d._id} className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-xl">
                    {d.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Create HR Login Form */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Create HR Login (People Operations)</h3>
            <form onSubmit={handleCreateHR} className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">HR Email</label>
                <input
                  type="email"
                  required
                  placeholder="hr@saylani.org"
                  value={hrEmail}
                  onChange={(e) => setHrEmail(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">Temporary Password</label>
                <input
                  type="text"
                  required
                  value={hrPassword}
                  onChange={(e) => setHrPassword(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono"
                />
              </div>
              <button
                type="submit"
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-xl transition"
              >
                Generate HR Credentials
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Immutable Audit Trail (Section 3 & Section 8 #25)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Actor</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Entity</th>
                  <th className="p-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.auditFeed?.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50">
                    <td className="p-3 text-slate-400 font-mono text-[11px]">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3 font-semibold text-slate-800">
                      {log.actorEmail} ({log.actorRole})
                    </td>
                    <td className="p-3">
                      <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 font-medium text-slate-600">{log.entity}</td>
                    <td className="p-3 text-slate-500 max-w-xs truncate">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

