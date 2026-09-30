import React, { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import AiAssistant from "../components/AiAssistant.jsx";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/dashboard", icon: "🏠", enabled: true },
  { label: "Field Patches", path: "/field-patches", icon: "🌱", enabled: true },
  { label: "Expenses & Bills", path: "/expenses", icon: "💳", enabled: true },
  { label: "Financials & Sales", path: "/financials", icon: "💰", enabled: true, roles: ["admin", "manager_operations"] },
  { label: "Staff", path: "/staff", icon: "👥", enabled: true },
  { label: "Attendance", path: "/attendance", icon: "🕒", enabled: true },
  { label: "Team Attendance", path: "/team-attendance", icon: "📋", enabled: true, roles: ["admin", "manager_operations"] },
  { label: "My Tasks", path: "/my-tasks", icon: "✅", enabled: true },
  { label: "Work Management", path: "/work-management", icon: "🗂️", enabled: true, roles: ["admin", "manager_operations"] },
  {
    label: "Poultry Management",
    path: "/poultry",
    icon: "🐔",
    enabled: true,
    isCollapsible: true,
    children: [
      { label: "1. In Transit Chicks", path: "/poultry/in-transit", icon: "🚚" },
      { label: "2. Brooder Management", path: "/poultry/brooder", icon: "🔥" },
      { label: "3. Vaccination Schedule", path: "/poultry/vaccination", icon: "💉" },
      { label: "4. Layer Farming", path: "/poultry/layer", icon: "🥚" },
      { label: "5. Breeder & Hatchery", path: "/poultry/breeder", icon: "🐣" },
      { label: "6. Broiler", path: "/poultry/broiler", icon: "🍗" },
      { label: "7. Received Chicks", path: "/poultry/received", icon: "📦" },
    ],
  },
  { label: "Animal Tagging", path: "/animals", icon: "🏷️", enabled: true },
  { label: "Assets", path: "/assets", icon: "🧰", enabled: true },
  { label: "Daily Schedule", path: "/schedule", icon: "🗓️", enabled: true, roles: ["admin", "manager_operations"] },
];

const MOBILE_QUICK_NAV = [
  { label: "Home", path: "/dashboard", icon: "🏠" },
  { label: "Patches", path: "/field-patches", icon: "🌱" },
  { label: "Expenses", path: "/expenses", icon: "💳" },
  { label: "Financials", path: "/financials", icon: "💰", roles: ["admin", "manager_operations"] },
  { label: "Poultry", path: "/poultry/in-transit", icon: "🐔" },
  { label: "Tasks", path: "/my-tasks", icon: "✅" },
];

const Layout = () => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const [poultryOpen, setPoultryOpen] = useState(location.pathname.startsWith("/poultry"));

  const filteredNavItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(user?.role)
  );

  const filteredMobileQuick = MOBILE_QUICK_NAV.filter(
    (item) => !item.roles || item.roles.includes(user?.role)
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row pb-16 md:pb-0">
      {/* Mobile Drawer Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 md:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:static z-50 inset-y-0 left-0 w-64 bg-farm-900 text-farm-50 flex flex-col transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-farm-600 rounded-lg flex items-center justify-center text-lg shadow-sm">
              🌾
            </div>
            <div>
              <p className="font-semibold text-sm leading-tight">Farmhouse</p>
              <p className="text-[11px] text-farm-100/60 font-medium">Management System</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-white/70 hover:text-white text-lg p-1"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {filteredNavItems.map((item) => {
            if (!item.enabled) {
              return (
                <div
                  key={item.path}
                  className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-farm-50/30 cursor-not-allowed"
                  title="Coming soon"
                >
                  <span className="flex items-center gap-3">
                    <span className="text-base">{item.icon}</span>
                    {item.label}
                  </span>
                  <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded">Soon</span>
                </div>
              );
            }

            if (item.isCollapsible) {
              const isPoultryActive = location.pathname.startsWith("/poultry");
              return (
                <div key={item.path} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setPoultryOpen(!poultryOpen)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                      isPoultryActive
                        ? "bg-farm-700/80 text-white shadow-xs"
                        : "text-farm-50/80 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-base">{item.icon}</span>
                      <span>{item.label}</span>
                    </span>
                    <span className="text-[10px] transform transition-transform duration-200">
                      {poultryOpen ? "▼" : "▶"}
                    </span>
                  </button>

                  {/* Sub-menu Pills */}
                  {poultryOpen && (
                    <div className="pl-6 space-y-1 py-1 border-l-2 border-farm-600/40 ml-4">
                      {item.children.map((sub) => (
                        <NavLink
                          key={sub.path}
                          to={sub.path}
                          onClick={() => setSidebarOpen(false)}
                          className={({ isActive }) =>
                            `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-medium transition-all ${
                              isActive
                                ? "bg-farm-600 text-white font-bold shadow-xs"
                                : "text-farm-100/70 hover:bg-white/10 hover:text-white"
                            }`
                          }
                        >
                          <span className="text-xs">{sub.icon}</span>
                          <span>{sub.label}</span>
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? "bg-farm-600 text-white shadow-sm"
                      : "text-farm-50/80 hover:bg-white/10 hover:text-white"
                  }`
                }
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="px-4 py-4 border-t border-white/10 bg-black/10">
          <p className="text-xs font-bold truncate text-white">{user?.name}</p>
          <p className="text-[11px] text-farm-100/60 truncate capitalize mb-3">
            Role: {user?.role?.replace("_", " ")}
          </p>
          <button
            onClick={logout}
            className="w-full text-xs font-semibold bg-white/10 hover:bg-white/20 text-red-300 rounded-lg py-2 transition"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-30 shadow-xs">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-700 text-xl p-1 rounded-lg hover:bg-gray-100"
            aria-label="Open Navigation Menu"
          >
            ☰
          </button>
          <span className="font-bold text-gray-800 text-sm flex items-center gap-1.5">
            <span>🌾</span> Farmhouse Management
          </span>
          <div className="w-6" />
        </div>

        <main className="flex-1 min-w-0">
          <Outlet />
        </main>

        {/* Global AI Voice & Chat Assistant */}
        <AiAssistant />
      </div>

      {/* Mobile Touch Bottom Nav Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 px-1 py-1.5 flex justify-around items-center shadow-lg">
        {filteredMobileQuick.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition ${
                isActive ? "text-farm-700 font-bold bg-farm-50" : "text-gray-500 font-medium"
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              <span className="text-[10px] mt-0.5">{item.label}</span>
            </NavLink>
          );
        })}

        <button
          onClick={() => setSidebarOpen(true)}
          className="flex flex-col items-center py-1 px-2.5 rounded-xl text-gray-500 font-medium"
        >
          <span className="text-base leading-none">☰</span>
          <span className="text-[10px] mt-0.5">More</span>
        </button>
      </nav>
    </div>
  );
};

export default Layout;