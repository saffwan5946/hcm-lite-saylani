import React, { useState } from 'react';
import { Bot, Send, Sparkles, X, Minimize2, Maximize2, ShieldAlert } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function AIChatPanel({ isOpen, onClose }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hello ${user?.employee?.firstName || user?.email || 'there'}! I am your HCM Lite AI Assistant. How can I help you today?\n\nYou can ask about headcount, attendance, leaves, late arrivals, company policy rules, or type your questions in Roman Urdu!`,
      toolUsed: null,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const samplePrompts = user?.role === 'Employee' ? [
    "How many sick leaves do I have left this year?",
    "What is the late arrival policy?",
    "Need next Monday off for personal work"
  ] : [
    "Who came late most often this month?",
    "What is today's attendance summary?",
    "How many active employees are in Engineering?"
  ];

  const handleSend = async (textToSend) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    const userMsg = {
      role: 'user',
      content: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.aiChat(query);
      const aiMsg = {
        role: 'assistant',
        content: res.data?.answer || "No response received.",
        toolUsed: res.data?.toolUsed,
        durationMs: res.data?.durationMs,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `AI Service Notice: ${err.message || 'Unable to connect to assistant.'}`,
          isError: true,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-5 right-5 w-96 max-w-[95vw] h-[550px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom duration-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 via-sky-600 to-indigo-700 p-4 text-white flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-sm flex items-center gap-1.5">
              HCM Lite AI Assistant
              <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-mono font-normal">
                {user?.role}
              </span>
            </h3>
            <p className="text-[11px] text-blue-100 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-300" />
              Tool-calling & Roman Urdu enabled
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-white/80 hover:text-white p-1 hover:bg-white/10 rounded-lg transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/60">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs shadow-sm ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : m.isError
                  ? 'bg-rose-50 text-rose-800 border border-rose-200 rounded-bl-none'
                  : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none'
              }`}
            >
              <div className="whitespace-pre-line leading-relaxed">{m.content}</div>

              {m.toolUsed && (
                <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center gap-1 text-[10px] text-blue-600 font-mono">
                  <span>⚡ Tool called:</span>
                  <span className="bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">{m.toolUsed}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1 px-1">
              {m.role === 'assistant' && (
                <span className="text-[9px] text-slate-400 font-medium">AI-generated</span>
              )}
              <span className="text-[9px] text-slate-400">{m.time}</span>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center space-x-2 text-xs text-slate-500 bg-white border border-slate-100 px-3 py-2 rounded-2xl w-fit">
            <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-spin" />
            <span>Consulting real database records...</span>
          </div>
        )}
      </div>

      {/* Suggested prompts chips */}
      <div className="px-3 py-2 bg-white border-t border-slate-100 flex gap-1.5 overflow-x-auto no-scrollbar">
        {samplePrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(p)}
            className="text-[10px] bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 px-2.5 py-1 rounded-full whitespace-nowrap transition border border-slate-200/60"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input bar */}
      <div className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask in English or Roman Urdu..."
          className="flex-1 bg-slate-100 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 border border-transparent"
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white p-2.5 rounded-xl transition shadow-sm"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

