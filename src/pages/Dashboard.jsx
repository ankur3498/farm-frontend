import React from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { Sparkles, Mic, MessageSquare, ShieldCheck, Zap } from "lucide-react";

const CARDS = [
  { label: "Total Staff", value: "—", icon: "👥" },
  { label: "Active Farms", value: "—", icon: "🗺️" },
  { label: "Crops Tracked", value: "—", icon: "🌱" },
  { label: "Livestock Units", value: "—", icon: "🐄" },
];

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          Welcome, {user?.name?.split(" ")[0] || "there"} 👋
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Overview of your farm operations and AI-powered management assistant.
        </p>
      </div>

      {/* AI Assistant Banner */}
      <div className="bg-gradient-to-r from-farm-900 via-farm-800 to-emerald-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden border border-white/10">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 bg-[radial-gradient(circle,_var(--tw-gradient-stops))] from-yellow-300 via-emerald-400 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 bg-yellow-400/20 text-yellow-300 px-3 py-1 rounded-full text-xs font-semibold border border-yellow-400/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>NEW: AI Voice & Chat Assistant Integrated</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-white">
              Manage your farm faster with Voice & Chat AI 🌾
            </h2>
            <p className="text-xs md:text-sm text-farm-100/80 leading-relaxed">
              Ask questions about staff attendance, poultry records, animal tags, task schedules, and farm maintenance using real-time voice commands or text chat.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 w-full md:w-auto shrink-0">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10">
              <Mic className="w-5 h-5 text-emerald-300 mx-auto mb-1" />
              <p className="text-xs font-semibold text-white">Voice Commands</p>
              <p className="text-[10px] text-emerald-200/70">Hands-free speech</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10">
              <MessageSquare className="w-5 h-5 text-yellow-300 mx-auto mb-1" />
              <p className="text-xs font-semibold text-white">Smart Answers</p>
              <p className="text-[10px] text-emerald-200/70">Gemini Powered</p>
            </div>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {CARDS.map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition">
            <div className="text-2xl mb-2">{c.icon}</div>
            <p className="text-2xl font-bold text-gray-800">{c.value}</p>
            <p className="text-xs font-medium text-gray-500 mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Module Quick Access */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-farm-600" />
          Active Modules & AI Assistant Guidance
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-farm-50/70 border border-farm-200/70 rounded-xl p-4">
            <p className="font-semibold text-farm-900 text-sm mb-1">👥 Staff & Attendance</p>
            <p className="text-gray-600 mb-3">Track employee shifts, geolocation check-ins, and team logs.</p>
            <span className="text-[11px] font-medium text-farm-700 bg-white px-2.5 py-1 rounded-md border border-farm-200 inline-block">
              💡 Ask AI: "How is attendance calculated?"
            </span>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-xl p-4">
            <p className="font-semibold text-emerald-900 text-sm mb-1">🐔 Poultry & Animal Tagging</p>
            <p className="text-gray-600 mb-3">Record flock numbers, egg yield, goat logs, and ear tag IDs.</p>
            <span className="text-[11px] font-medium text-emerald-700 bg-white px-2.5 py-1 rounded-md border border-emerald-200 inline-block">
              💡 Ask AI: "Poultry egg yield tips"
            </span>
          </div>

          <div className="bg-blue-50/70 border border-blue-200/70 rounded-xl p-4">
            <p className="font-semibold text-blue-900 text-sm mb-1">📋 Tasks & Schedules</p>
            <p className="text-gray-600 mb-3">Organize daily farm duties, prioritize work, and schedule shifts.</p>
            <span className="text-[11px] font-medium text-blue-700 bg-white px-2.5 py-1 rounded-md border border-blue-200 inline-block">
              💡 Ask AI: "How to assign work tasks?"
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;