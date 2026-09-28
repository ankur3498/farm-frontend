import React, { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/dashboard", icon: "🏠", enabled: true },
  { label: "Staff", path: "/staff", icon: "👥", enabled: true },
  { label: "Attendance", path: "/attendance", icon: "🕒", enabled: true },
  { label: "Team Attendance", path: "/team-attendance", icon: "📋", enabled: true, roles: ["admin", "manager_operations"] },
  { label: "My Tasks", path: "/my-tasks", icon: "✅", enabled: true },
  { label: "Assets", path: "/assets", icon: "🧰", enabled: true },
  { label: "Hen & Chicken", path: "/poultry", icon: "🐔", enabled: true },
  { label: "Animal Tagging", path: "/animals", icon: "🏷️", enabled: true },
  { label: "Daily Schedule", path: "/schedule", icon: "🗓️", enabled: true, roles: ["admin", "manager_operations"] },
  { label: "Work Management", path: "/work-management", icon: "🗂️", enabled: true, roles: ["admin", "manager_operations"] },
  { label: "Farms", path: "/farms", icon: "🗺️", enabled: false },
  { label: "Crops", path: "/crops", icon: "🌱", enabled: false },
  { label: "Livestock", path: "/livestock", icon: "🐄", enabled: false },
  { label: "Inventory", path: "/inventory", icon: "📦", enabled: false },
];

const Layout = () => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed md:static z-40 inset-y-0 left-0 w-64 bg-farm-900 text-farm-50 flex flex-col transform transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <div className="w-9 h-9 bg-farm-600 rounded-lg flex items-center justify-center text-lg">
            🌾
          </div>
          <div>
            <p className="font-semibold text-sm leading-tight">Farmhouse</p>
            <p className="text-xs text-farm-100/60">Management</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user?.role)).map((item) =>
            item.enabled ? (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? "bg-farm-600 text-white"
                      : "text-farm-50/80 hover:bg-white/10 hover:text-white"
                  }`
                }
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </NavLink>
            ) : (
              <div
                key={item.path}
                className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-farm-50/30 cursor-not-allowed"
                title="Coming soon"
              >
                <span className="flex items-center gap-3">
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </span>
                <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded">Soon</span>
              </div>
            )
          )}
        </nav>

        <div className="px-4 py-4 border-t border-white/10">
          <p className="text-sm font-medium truncate">{user?.name}</p>
          <p className="text-xs text-farm-50/50 truncate mb-3">{user?.role}</p>
          <button
            onClick={logout}
            className="w-full text-xs font-medium bg-white/5 hover:bg-white/10 text-red-300 rounded-lg py-2 transition"
          >
            Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="md:hidden flex items-center justify-between bg-white border-b border-gray-200 px-4 py-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-600 text-xl"
          >
            ☰
          </button>
          <span className="font-semibold text-gray-800 text-sm">Farmhouse Management</span>
          <span className="w-6" />
        </div>

        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;