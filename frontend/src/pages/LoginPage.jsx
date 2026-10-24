import React, { useState } from 'react';
import { LogIn, Building, Shield, Lock, Mail, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, systemStatus } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const fillQuickDemo = (roleEmail, rolePass) => {
    setEmail(roleEmail);
    setPassword(rolePass);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200/80 max-w-md w-full p-8 animate-in zoom-in-95 duration-200">
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600 text-white font-bold text-xl shadow-lg shadow-blue-500/30 mb-2">
            H
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">HCM Lite</h1>
          <p className="text-xs text-slate-500">
            {systemStatus?.companyName || 'Saylani Hackathon — Human Capital Management'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@organization.com"
                className="w-full text-xs pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-xs pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-3 rounded-xl shadow-md transition flex items-center justify-center gap-2"
          >
            {loading ? <Sparkles className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            Sign In to Portal
          </button>
        </form>

        {/* Demo Fast-Login Helpers for Judges */}
        <div className="mt-6 pt-4 border-t border-slate-100">
          <p className="text-[11px] text-slate-400 text-center mb-2.5 font-medium">Demo Quick Credentials:</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => fillQuickDemo('admin@saylani.org', 'Admin@2026!')}
              className="p-2 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg border border-slate-200 text-left transition"
            >
              <span className="block font-bold text-[11px]">Admin Role</span>
              <span className="text-[10px] text-slate-400">admin@saylani.org</span>
            </button>
            <button
              onClick={() => fillQuickDemo('hr@saylani.org', 'SaylaniHR@2026')}
              className="p-2 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg border border-slate-200 text-left transition"
            >
              <span className="block font-bold text-[11px]">HR Operations</span>
              <span className="text-[10px] text-slate-400">hr@saylani.org</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

