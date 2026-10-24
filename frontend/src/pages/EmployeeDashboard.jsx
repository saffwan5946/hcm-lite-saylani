import React, { useState, useEffect } from 'react';
import {
  Clock, Calendar, Sparkles, Camera, CheckCircle2, Download,
  AlertCircle, ShieldCheck, ArrowRight, User
} from 'lucide-react';
import { api } from '../services/api';
import SmartLeaveModal from '../components/SmartLeaveModal';
import CameraAttendanceModal from '../components/CameraAttendanceModal';

export default function EmployeeDashboard({ onOpenAI }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSmartLeave, setShowSmartLeave] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [actionMsg, setActionMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.getEmployeeDashboard();
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleWebCheckIn = async () => {
    setErrorMsg(null);
    try {
      await api.checkIn({ source: 'web' });
      setActionMsg('Web check-in recorded successfully!');
      loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Check-in failed');
    }
  };

  const handleCheckOut = async () => {
    setErrorMsg(null);
    try {
      const res = await api.checkOut();
      setActionMsg(`Check-out recorded (${res.data?.workHours} hrs worked)`);
      loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Check-out failed');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-500">Loading Employee Portal...</div>;
  }

  const isCheckedIn = !!data?.todayAttendance?.checkIn;
  const isCheckedOut = !!data?.todayAttendance?.checkOut;

  return (
    <div className="space-y-6">
      {actionMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center justify-between">
          <span>✓ {actionMsg}</span>
          <button onClick={() => setActionMsg(null)} className="text-emerald-600 font-bold">✕</button>
        </div>
      )}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl flex items-center justify-between">
          <span>✕ {errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-rose-600 font-bold">✕</button>
        </div>
      )}

      {/* Profile Welcome Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs text-blue-600 font-semibold uppercase tracking-wider">Employee Self-Service</span>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5">Welcome, {data?.employee?.name}</h1>
          <p className="text-xs text-slate-500 font-mono">
            {data?.employee?.code} • {data?.employee?.designation} ({data?.employee?.department})
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSmartLeave(true)}
            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs px-3.5 py-2.5 rounded-xl border border-indigo-200 transition flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" /> Smart Leave Form
          </button>
          <button
            onClick={onOpenAI}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3.5 py-2.5 rounded-xl transition shadow-xs flex items-center gap-1.5"
          >
            Ask My Assistant
          </button>
        </div>
      </div>

      {/* Attendance & Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Check-In Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" /> Today's Attendance
              </h3>
              {data?.todayAttendance && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                  data.todayAttendance.status === 'late'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {data.todayAttendance.status}
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Office start: 09:00 AM (Late after 09:15 AM). Half day if under 5 hours.
            </p>

            {isCheckedIn && (
              <div className="bg-slate-50 p-3 rounded-2xl text-xs space-y-1 mb-4 border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-500">Check-In Time:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {new Date(data.todayAttendance.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {isCheckedOut && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Check-Out Time:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {new Date(data.todayAttendance.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            {!isCheckedIn ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleWebCheckIn}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2.5 rounded-xl transition shadow-xs text-center"
                >
                  Web Check-In
                </button>
                <button
                  onClick={() => setShowCameraModal(true)}
                  className="bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 font-semibold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5 text-sky-600" /> Camera & GPS
                </button>
              </div>
            ) : !isCheckedOut ? (
              <button
                onClick={handleCheckOut}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-2.5 rounded-xl transition"
              >
                Check Out Now
              </button>
            ) : (
              <div className="text-center p-2 text-xs text-emerald-700 bg-emerald-50 rounded-xl font-medium border border-emerald-200">
                ✓ Full Day Shift Completed
              </div>
            )}
          </div>
        </div>

        {/* Hours & Late Count Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Hours Worked This Week</h3>
            <p className="text-xs text-slate-500 mb-4">Target: 40 hours weekly</p>
            <div className="text-3xl font-extrabold text-slate-900 font-mono">
              {data?.hoursThisWeek || 0} <span className="text-sm font-normal text-slate-400">/ 40 hrs</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center text-xs">
            <span className="text-slate-500">Late Arrivals This Month:</span>
            <span className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              {data?.lateCountThisMonth || 0}
            </span>
          </div>
        </div>

        {/* Payslip & Salary Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Latest Finalized Payslip</h3>
            <p className="text-xs text-slate-500 mb-4">Official earnings & tax breakdown</p>

            {data?.lastPayslip ? (
              <div className="space-y-1.5 text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-500">Period:</span>
                  <span className="font-mono font-bold text-slate-800">{data.lastPayslip.period}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Net Payable:</span>
                  <span className="font-bold text-emerald-700">PKR {Number(data.lastPayslip.netSalary).toLocaleString()}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-3">No finalized payslips available yet.</p>
            )}
          </div>

          {data?.lastPayslip && (
            <a
              href={api.downloadPayslipPdfUrl(data.lastPayslip._id)}
              target="_blank"
              rel="noreferrer"
              className="mt-3 w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs py-2 rounded-xl transition flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Download Payslip PDF
            </a>
          )}
        </div>
      </div>

      {/* Leave Balances Cards */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-1">Your Statutory Leave Balances</h3>
        <p className="text-xs text-slate-500 mb-4">Statutory quotas: Annual 14, Sick 8, Casual 10, Unpaid Unlimited</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {data?.leaveBalances?.map((lb, idx) => (
            <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
              <span className="text-xs font-semibold text-slate-600 block">{lb.name}</span>
              <span className="text-2xl font-bold text-slate-900 font-mono mt-1 block">
                {lb.remaining} <span className="text-xs font-normal text-slate-400">left</span>
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Used: {lb.used} / Quota: {lb.quota}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      <SmartLeaveModal
        isOpen={showSmartLeave}
        onClose={() => setShowSmartLeave(false)}
        onApplied={() => {
          setActionMsg('Smart leave request submitted!');
          loadData();
        }}
      />

      <CameraAttendanceModal
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        onCheckInSuccess={(att) => {
          setActionMsg(`Camera check-in verified! Status: ${att.status}`);
          loadData();
        }}
      />
    </div>
  );
}

