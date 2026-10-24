import React, { useState, useEffect } from 'react';
import {
  Users, UserPlus, Clock, Calendar, CheckSquare, Sparkles, FileText,
  Upload, Search, CheckCircle, XCircle, AlertCircle, RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import CSVEmployeeImportModal from '../components/CSVEmployeeImportModal';

export default function HRDashboard({ onOpenAI }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [summarizing, setSummarizing] = useState(false);
  const [summaryBullets, setSummaryBullets] = useState(null);

  // Modals & sub-flows
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);

  // New Employee Form State
  const [newEmp, setNewEmp] = useState({
    employeeCode: 'EMP-001',
    firstName: '',
    lastName: '',
    email: '',
    departmentId: '',
    designationId: '',
    basicSalary: 80000,
    gender: 'Male',
    phone: '',
    address: ''
  });

  // Approvals state
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [actionMsg, setActionMsg] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dashRes, empRes, deptRes, leavesRes] = await Promise.all([
        api.getHRDashboard(),
        api.listEmployees(),
        api.getDepartments(),
        api.listLeaves({ status: 'pending' })
      ]);
      setData(dashRes.data);
      setEmployees(empRes.data.employees || []);
      setDepartments(deptRes.data || []);
      setPendingLeaves(leavesRes.data || []);

      if (deptRes.data?.length > 0) {
        const activeDeptId = newEmp.departmentId || deptRes.data[0]._id;
        setNewEmp((prev) => ({ ...prev, departmentId: activeDeptId }));
        const desigRes = await api.getDesignations(activeDeptId);
        setDesignations(desigRes.data || []);
        if (desigRes.data?.length > 0) {
          setNewEmp((prev) => ({ ...prev, designationId: desigRes.data[0]._id }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeptChange = async (deptId) => {
    setNewEmp((prev) => ({ ...prev, departmentId: deptId }));
    const res = await api.getDesignations(deptId);
    setDesignations(res.data || []);
    if (res.data?.length > 0) {
      setNewEmp((prev) => ({ ...prev, designationId: res.data[0]._id }));
    }
  };

  const handleRegisterEmployee = async (e) => {
    e.preventDefault();
    try {
      const res = await api.registerEmployee(newEmp);
      setActionMsg(`Employee registered! Login created with temp password: ${res.data?.temporaryPassword}`);
      setNewEmp({
        employeeCode: `EMP-00${employees.length + 2}`,
        firstName: '',
        lastName: '',
        email: '',
        departmentId: departments[0]?._id || '',
        designationId: designations[0]?._id || '',
        basicSalary: 80000,
        gender: 'Male',
        phone: '',
        address: ''
      });
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleLeaveReview = async (leaveId, status) => {
    try {
      await api.reviewLeave(leaveId, { status, reviewComment: `Decision recorded by HR: ${status}` });
      setActionMsg(`Leave request ${status}!`);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleGeneratePayrollDraft = async () => {
    const d = new Date();
    try {
      await api.createPayrollDraft({ year: d.getFullYear(), month: d.getMonth() + 1 });
      setActionMsg(`Monthly payroll draft generated successfully!`);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

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

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-500">Loading HR Dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {actionMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center justify-between">
          <span>✓ {actionMsg}</span>
          <button onClick={() => setActionMsg(null)} className="text-emerald-600 font-bold">✕</button>
        </div>
      )}

      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">People Operations (HR Dashboard)</h1>
          <p className="text-xs text-slate-500">Manage employee registration, daily attendance, leaves, and payroll draft</p>
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
        <div className="p-4 bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-2xl shadow-lg border border-blue-700 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 mb-2 font-semibold text-xs text-sky-300">
            <Sparkles className="w-4 h-4 text-amber-400" />
            HR Intelligence Digest
          </div>
          <ul className="space-y-1.5 text-xs text-slate-200">
            {summaryBullets.map((b, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-sky-400 font-bold">•</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Daily KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 block">Total Staff</span>
          <span className="text-xl font-bold text-slate-900 mt-1 block">{data?.kpis?.headcount || 0}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 block">Present Today</span>
          <span className="text-xl font-bold text-emerald-600 mt-1 block">{data?.kpis?.presentToday || 0}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 block">Late Today</span>
          <span className="text-xl font-bold text-amber-600 mt-1 block">{data?.kpis?.lateToday || 0}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 block">On Leave</span>
          <span className="text-xl font-bold text-indigo-600 mt-1 block">{data?.kpis?.onLeaveToday || 0}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 block">Half Day</span>
          <span className="text-xl font-bold text-rose-600 mt-1 block">{data?.kpis?.halfDayToday || 0}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 block">Approvals Due</span>
          <span className="text-xl font-bold text-purple-600 mt-1 block">{pendingLeaves.length}</span>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-2 transition ${activeTab === 'overview' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500'}`}
        >
          Daily Insights & Late Comers
        </button>
        <button
          onClick={() => setActiveTab('register')}
          className={`pb-2 transition ${activeTab === 'register' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500'}`}
        >
          Register Employee & CSV Import
        </button>
        <button
          onClick={() => setActiveTab('approvals')}
          className={`pb-2 transition ${activeTab === 'approvals' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500'}`}
        >
          Leave Approvals ({pendingLeaves.length})
        </button>
        <button
          onClick={() => setActiveTab('payroll')}
          className={`pb-2 transition ${activeTab === 'payroll' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500'}`}
        >
          Monthly Payroll Run
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top 5 Late Comers Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Top 5 Late-Comers This Month</h3>
            <p className="text-xs text-slate-500 mb-4">Rule: 3 lates incurs a 0.5-day salary deduction</p>
            {data?.top5LateComers?.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No late arrivals logged this month.</p>
            ) : (
              <div className="space-y-2.5">
                {data?.top5LateComers?.map((lc, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs p-3 bg-slate-50 rounded-2xl">
                    <div>
                      <span className="font-semibold text-slate-800">{lc.name}</span>
                      <span className="text-[10px] text-slate-400 ml-2 font-mono">{lc.employeeCode} • {lc.department}</span>
                    </div>
                    <span className="bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-full text-[11px]">
                      {lc.count} lates
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Leave Utilization Breakdown */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Leave Utilization by Category</h3>
            <p className="text-xs text-slate-500 mb-4">Statutory quotas: Annual 14, Sick 8, Casual 10, Unpaid unlimited</p>
            <div className="space-y-3">
              {data?.leaveUtilization?.map((lt, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-2xl flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-800">{lt.type}</span>
                  <div className="flex gap-4">
                    <span className="text-slate-500">Used: <strong className="text-slate-800">{lt.used} days</strong></span>
                    <span className="text-slate-400 font-mono">Quota: {lt.quota}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'register' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Registration Form */}
          <div className="md:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Register New Employee</h3>
                <p className="text-xs text-slate-500">Auto-generates user login with temporary password</p>
              </div>
              <button
                onClick={() => setShowCsvModal(true)}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold px-3.5 py-2 rounded-xl border border-emerald-200 flex items-center gap-1.5 transition"
              >
                <Upload className="w-3.5 h-3.5" /> CSV Bulk Import
              </button>
            </div>

            <form onSubmit={handleRegisterEmployee} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Employee Code</label>
                  <input
                    type="text"
                    required
                    value={newEmp.employeeCode}
                    onChange={(e) => setNewEmp({ ...newEmp, employeeCode: e.target.value })}
                    className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Official Email</label>
                  <input
                    type="email"
                    required
                    value={newEmp.email}
                    onChange={(e) => setNewEmp({ ...newEmp, email: e.target.value })}
                    className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={newEmp.firstName}
                    onChange={(e) => setNewEmp({ ...newEmp, firstName: e.target.value })}
                    className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={newEmp.lastName}
                    onChange={(e) => setNewEmp({ ...newEmp, lastName: e.target.value })}
                    className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Department</label>
                  <select
                    value={newEmp.departmentId}
                    onChange={(e) => handleDeptChange(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Designation</label>
                  {designations.length > 0 ? (
                    <select
                      value={newEmp.designationId}
                      onChange={(e) => setNewEmp({ ...newEmp, designationId: e.target.value })}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white"
                    >
                      {designations.map((des) => (
                        <option key={des._id} value={des._id}>{des.title}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="e.g. Officer / Specialist"
                      value={newEmp.designationTitle || ''}
                      onChange={(e) => setNewEmp({ ...newEmp, designationTitle: e.target.value })}
                      className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200"
                    />
                  )}
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Basic Salary (PKR)</label>
                  <input
                    type="number"
                    required
                    value={newEmp.basicSalary}
                    onChange={(e) => setNewEmp({ ...newEmp, basicSalary: Number(e.target.value) })}
                    className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50/70 rounded-2xl text-[11px] text-blue-900 border border-blue-100 flex justify-between">
                <span>Calculated Gross (1.5 × Basic):</span>
                <span className="font-bold font-mono">PKR {(newEmp.basicSalary * 1.5).toLocaleString()}</span>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2.5 rounded-xl transition shadow-xs"
              >
                Register Employee & Issue Temp Login
              </button>
            </form>
          </div>

          {/* Employees List summary */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Registered Employees ({employees.length})</h3>
            <div className="space-y-2.5 max-h-96 overflow-y-auto">
              {employees.map((emp) => (
                <div key={emp._id} className="p-2.5 bg-slate-50 rounded-xl text-xs flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-slate-800 block">{emp.firstName} {emp.lastName}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{emp.employeeCode} • {emp.department?.name}</span>
                  </div>
                  <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded font-mono">
                    PKR {emp.salary?.gross?.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'approvals' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Pending Leave Approval Inbox</h3>
          {pendingLeaves.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">No pending leave requests at this time.</p>
          ) : (
            <div className="space-y-3">
              {pendingLeaves.map((req) => (
                <div key={req._id} className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-slate-900">{req.employee?.firstName} {req.employee?.lastName}</span>
                    <span className="text-slate-400 ml-2 font-mono">({req.employee?.employeeCode})</span>
                    <div className="text-[11px] text-slate-600 mt-1">
                      <strong>{req.leaveTypeName?.toUpperCase()} LEAVE</strong>: {req.startDate} to {req.endDate} ({req.workingDays} working days)
                    </div>
                    <p className="text-slate-500 italic mt-0.5">"{req.reason}"</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleLeaveReview(req._id, 'approved')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-1.5 rounded-xl transition"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleLeaveReview(req._id, 'rejected')}
                      className="bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-semibold px-3 py-1.5 rounded-xl transition"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'payroll' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Monthly Payroll Management</h3>
              <p className="text-xs text-slate-500">Calculate salary structures, attendance deductions, and progressive tax slabs</p>
            </div>
            <button
              onClick={handleGeneratePayrollDraft}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition"
            >
              Generate Draft for Current Month
            </button>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl text-xs space-y-2 border border-slate-200">
            <span className="font-semibold text-slate-700">Saylani Hackathon Calculation Formulae (Section 3):</span>
            <ul className="list-disc list-inside text-slate-600 space-y-1">
              <li>Gross = 1.5 × Basic (HRA 40%, Medical 10%)</li>
              <li>Per Day Rate = Gross ÷ Working Days in Month</li>
              <li>Deductions = (Absent + Unpaid + 0.5 × Half Days + Late Penalty) × Per Day Rate</li>
              <li>Annual Tax Slabs: 0–600k (0%), 600k–1.2M (5%), 1.2M–2.4M (15%), 2.4M–3.6M (25%), &gt;3.6M (35%)</li>
            </ul>
          </div>
        </div>
      )}

      <CSVEmployeeImportModal
        isOpen={showCsvModal}
        onClose={() => setShowCsvModal(false)}
        onImportSuccess={() => {
          setActionMsg('CSV Import completed!');
          loadData();
        }}
      />
    </div>
  );
}

