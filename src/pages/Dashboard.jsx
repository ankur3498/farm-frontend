import React from "react";
import { useAuth } from "../context/AuthContext.jsx";

const CARDS = [
  { label: "Total Staff", value: "—", icon: "👥" },
  { label: "Active Farms", value: "—", icon: "🗺️" },
  { label: "Crops Tracked", value: "—", icon: "🌱" },
  { label: "Livestock Units", value: "—", icon: "🐄" },
];

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="px-4 md:px-8 py-6 md:py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-800">
          Welcome, {user?.name?.split(" ")[0] || "there"} 👋
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Overview of your farm operations. This will fill up as modules go live.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {CARDS.map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="text-2xl mb-2">{c.icon}</div>
            <p className="text-2xl font-semibold text-gray-800">{c.value}</p>
            <p className="text-xs text-gray-500 mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
        <p className="text-3xl mb-2">🚧</p>
        <p className="font-medium text-gray-700">Dashboard content coming soon</p>
        <p className="text-sm text-gray-500 mt-1">
          Staff module is live — check the sidebar. Farms, Crops, Livestock and Inventory will show up here once built.
        </p>
      </div>
    </div>
  );
};

export default Dashboard;