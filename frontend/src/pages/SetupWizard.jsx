import React, { useState } from 'react';
import { Building2, ShieldCheck, Clock, MapPin, Sparkles, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

export default function SetupWizard({ onCompleted }) {
  const [companyName, setCompanyName] = useState('Saylani Welfare International Trust');
  const [adminEmail, setAdminEmail] = useState('admin@saylani.org');
  const [adminPassword, setAdminPassword] = useState('Admin@2026!');
  const [officeStartTime, setOfficeStartTime] = useState('09:00');
  const [officeEndTime, setOfficeEndTime] = useState('18:00');
  const [graceMinutes, setGraceMinutes] = useState(15);
  const [radiusMeters, setRadiusMeters] = useState(150);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.setupFirstRun({
        companyName,
        adminEmail,
        adminPassword,
        officeHours: {
          start: officeStartTime,
          end: officeEndTime,
          graceMinutes: Number(graceMinutes),
          halfDayHours: 5
        },
        officeLocation: {
          latitude: 24.8607,
          longitude: 67.0011,
          radiusMeters: Number(radiusMeters)
        }
      });
      onCompleted();
    } catch (err) {
      setError(err.message || 'Failed to complete first-run setup.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-xl w-full p-8 animate-in zoom-in-95 duration-200">
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 mb-2">
            <Building2 className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">HCM Lite First-Run Setup</h1>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Saylani Hackathon 2026 — Initialize your company profile, attendance geofence rules, and master Admin account.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Organization Name</label>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Master Admin Email</label>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Master Admin Password</label>
              <input
                type="password"
                required
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" /> Attendance & Office Rules (Section 3)
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <span className="text-[11px] text-slate-500">Office Start</span>
                <input
                  type="time"
                  value={officeStartTime}
                  onChange={(e) => setOfficeStartTime(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                />
              </div>
              <div>
                <span className="text-[11px] text-slate-500">Grace Period</span>
                <input
                  type="number"
                  value={graceMinutes}
                  onChange={(e) => setGraceMinutes(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                />
              </div>
              <div>
                <span className="text-[11px] text-slate-500">Geofence (m)</span>
                <input
                  type="number"
                  value={radiusMeters}
                  onChange={(e) => setRadiusMeters(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-3 rounded-xl shadow-md transition flex items-center justify-center gap-2"
          >
            {loading ? <Sparkles className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            Initialize HCM Lite
          </button>
        </form>
      </div>
    </div>
  );
}

