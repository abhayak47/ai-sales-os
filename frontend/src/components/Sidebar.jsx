import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const NAV_ITEMS = [
  { icon: "DB", label: "Dashboard", path: "/dashboard" },
  { icon: "SC", label: "Sales Coach", path: "/coach" },
  { icon: "FU", label: "AI Follow-Up", path: "/followup" },
  { icon: "PL", label: "Pipeline", path: "/pipeline" },
  { icon: "LD", label: "Leads", path: "/leads" },
  { icon: "PR", label: "Pricing", path: "/pricing" },
];

function ThemePicker() {
  const { theme, setTheme, themes } = useTheme();

  return (
    <div className="border border-white/10 rounded-2xl p-3 bg-white/[0.02]">
      <div className="text-[11px] uppercase tracking-[0.2em] text-white/35 mb-2">Theme</div>
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
      >
        {Object.entries(themes).map(([value, item]) => (
          <option key={value} value={value} className="bg-black text-white">
            {item.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleNav = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  const shellClass =
    "bg-black border-r border-white/10";

  return (
    <>
      <div className={`md:hidden fixed top-0 left-0 right-0 z-50 ${shellClass} px-4 py-4 flex items-center justify-between`}>
        <div className="text-lg font-bold">AI Sales OS</div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-white/60 hover:text-white transition p-2">
          {mobileOpen ? "Close" : "Menu"}
        </button>
      </div>

      {mobileOpen && <div className="md:hidden fixed inset-0 z-40 bg-black/70" onClick={() => setMobileOpen(false)} />}

      <div className={`md:hidden fixed top-0 left-0 h-full w-72 z-50 ${shellClass} p-6 flex flex-col transform transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="text-xl font-bold mb-8 mt-2">AI Sales OS</div>
        <nav className="flex flex-col gap-1 flex-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.path}
              onClick={() => handleNav(item.path)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition text-left ${
                location.pathname === item.path ? "bg-white/10 text-white" : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              <span className="w-8 h-8 rounded-lg border border-white/10 bg-white/[0.03] flex items-center justify-center text-[11px] font-semibold">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="space-y-3 mt-4">
          <ThemePicker />
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-sm text-white/50 hover:text-white hover:bg-white/5 transition border border-white/10"
          >
            Logout
          </button>
        </div>
      </div>

      <div className={`hidden md:flex w-72 ${shellClass} p-6 flex-col min-h-screen`}>
        <div className="mb-8">
          <div className="text-xl font-bold">AI Sales OS</div>
          <div className="text-sm text-white/35 mt-2">Revenue operating system</div>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.path}
              onClick={() => handleNav(item.path)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition text-left ${
                location.pathname === item.path ? "bg-white/10 text-white" : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              <span className="w-8 h-8 rounded-lg border border-white/10 bg-white/[0.03] flex items-center justify-center text-[11px] font-semibold">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="space-y-3 pt-4">
          <ThemePicker />
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-sm text-white/50 hover:text-white hover:bg-white/5 transition border border-white/10"
          >
            Logout
          </button>
        </div>
      </div>
    </>
  );
}
