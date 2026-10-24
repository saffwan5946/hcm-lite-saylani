import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import SetupWizard from './pages/SetupWizard';
import LoginPage from './pages/LoginPage';
import FirstChangePasswordPage from './pages/FirstChangePasswordPage';
import AdminDashboard from './pages/AdminDashboard';
import HRDashboard from './pages/HRDashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import AIChatPanel from './components/AIChatPanel';
import { LogOut, Bot, Building2, User } from 'lucide-react';

export default function App() {
  const { user, loading, systemStatus, checkStatus, logout, isAuthenticated } = useAuth();
  const [showAiChat, setShowAiChat] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-xs">
        Initializing HCM Lite Application...
      </div>
    );
  }

  // 1. Fresh Install -> Setup Wizard
  if (systemStatus && !systemStatus.isConfigured) {
    return <SetupWizard onCompleted={() => checkStatus()} />;
  }

  // 2. Not logged in -> Login Page
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // 3. Mandatory password change on first sign-in
  if (user?.mustChangePassword) {
    return <FirstChangePasswordPage />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
              H
            </div>
            <div>
              <span className="font-bold text-sm text-slate-900 tracking-tight block">
                HCM Lite
              </span>
              <span className="text-[10px] text-slate-400 font-medium block">
                {systemStatus?.companyName || 'Saylani Hackathon 2026'}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Role indicator pill */}
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
              user?.role === 'Admin'
                ? 'bg-purple-50 text-purple-700 border-purple-200'
                : user?.role === 'HR'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-blue-50 text-blue-700 border-blue-200'
            }`}>
              {user?.role} Portal
            </span>

            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-800 leading-tight">
                {user?.employee?.firstName ? `${user.employee.firstName} ${user.employee.lastName}` : user?.email}
              </span>
              <span className="text-[10px] text-slate-400">{user?.email}</span>
            </div>

            <button
              onClick={() => setShowAiChat(true)}
              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 p-2 rounded-xl border border-indigo-200 transition"
              title="Open AI Assistant"
            >
              <Bot className="w-4 h-4" />
            </button>

            <button
              onClick={logout}
              className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-xl transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Role Content View */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full">
        {user?.role === 'Admin' && <AdminDashboard onOpenAI={() => setShowAiChat(true)} />}
        {user?.role === 'HR' && <HRDashboard onOpenAI={() => setShowAiChat(true)} />}
        {user?.role === 'Employee' && <EmployeeDashboard onOpenAI={() => setShowAiChat(true)} />}
      </main>

      {/* Floating AI Chat Assistant Panel */}
      <AIChatPanel isOpen={showAiChat} onClose={() => setShowAiChat(false)} />

      {/* Floating AI trigger pill if closed */}
      {!showAiChat && (
        <button
          onClick={() => setShowAiChat(true)}
          className="fixed bottom-5 right-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs px-4 py-3 rounded-full shadow-xl flex items-center gap-2 z-40 transition animate-bounce duration-1000"
        >
          <Bot className="w-4 h-4" />
          <span>Ask AI Assistant</span>
        </button>
      )}
    </div>
  );
}

