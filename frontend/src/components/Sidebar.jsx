import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const NAV_ITEMS = [
  { icon: "DB", label: "Dashboard", path: "/dashboard" },
  { icon: "SC", label: "Coach", path: "/coach" },
  { icon: "FU", label: "Follow-up", path: "/followup" },
  { icon: "PL", label: "Pipeline", path: "/pipeline" },
  { icon: "LD", label: "Leads", path: "/leads" },
  { icon: "AC", label: "Companies", path: "/companies" },
  { icon: "CT", label: "Contacts", path: "/contacts" },
  { icon: "EM", label: "Email", path: "/emails" },
  { icon: "RP", label: "Reports", path: "/reports" },
  { icon: "TM", label: "Team", path: "/team" },
  { icon: "PR", label: "Plans", path: "/pricing" },
];

function ThemePicker() {
  const { theme, setTheme, themes } = useTheme();
  const isEnterprise = theme === "enterprise";

  return (
    <div
      className={
        isEnterprise
          ? "border border-slate-200 rounded-2xl p-3 bg-slate-50"
          : "border border-white/10 rounded-2xl p-3 bg-white/[0.02]"
      }
    >
      <div
        className={
          isEnterprise
            ? "text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-2"
            : "text-[11px] uppercase tracking-[0.2em] text-white/35 mb-2"
        }
      >
        Appearance
      </div>
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value)}
        className={
          isEnterprise
            ? "w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            : "w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
        }
      >
        {Object.entries(themes).map(([value, item]) => (
          <option key={value} value={value} className={isEnterprise ? "bg-white text-slate-900" : "bg-black text-white"}>
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
  const { logout, user } = useAuth();
  const { theme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isEnterprise = theme === "enterprise";

  const workspaceName = user?.organization_name || "Personal workspace";
  const workspaceSlug = user?.organization_slug ? `/${user.organization_slug}` : null;
  const roleLabel = user?.role ? `${user.role.charAt(0).toUpperCase()}${user.role.slice(1)}` : "Owner";

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleNav = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  const shellClass = isEnterprise
    ? "bg-white border-r border-slate-200 text-slate-800"
    : "bg-black border-r border-white/10";

  const navInactive = isEnterprise
    ? "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
    : "text-white/50 hover:text-white hover:bg-white/5";

  const navActive = isEnterprise ? "bg-blue-50 text-blue-800 font-medium" : "bg-white/10 text-white";

  const workspaceCard = isEnterprise
    ? "border border-slate-200 rounded-2xl p-4 bg-slate-50/80"
    : "border border-white/10 rounded-2xl p-4 bg-white/[0.02]";

  const workspaceLabel = isEnterprise
    ? "text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-2"
    : "text-[11px] uppercase tracking-[0.2em] text-white/35 mb-2";

  const workspaceMeta = isEnterprise ? "text-xs text-slate-500 mt-1" : "text-xs text-white/45 mt-1";

  const workspaceSub = isEnterprise ? "text-xs text-slate-400 mt-3 truncate" : "text-xs text-white/35 mt-3 truncate";

  const creditsClass = isEnterprise ? "mt-3 text-xs text-blue-700 font-medium" : "mt-3 text-xs text-cyan-200/90";

  const iconBox = isEnterprise
    ? "w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-[11px] font-semibold text-slate-600"
    : "w-8 h-8 rounded-lg border border-white/10 bg-white/[0.03] flex items-center justify-center text-[11px] font-semibold";

  const brandTitle = isEnterprise ? "text-xl font-bold text-slate-900" : "text-xl font-bold";

  const brandSub = isEnterprise ? "text-sm text-slate-500 mt-2" : "text-sm text-white/35 mt-2";

  const logoutBtn = isEnterprise
    ? "w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition border border-slate-200"
    : "w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-sm text-white/50 hover:text-white hover:bg-white/5 transition border border-white/10";

  const mobileTop = isEnterprise ? "text-lg font-bold text-slate-900" : "text-lg font-bold";

  const mobileMenuBtn = isEnterprise ? "text-slate-600 hover:text-slate-900 transition p-2" : "text-white/60 hover:text-white transition p-2";

  const overlayClass = isEnterprise ? "md:hidden fixed inset-0 z-40 bg-slate-900/40" : "md:hidden fixed inset-0 z-40 bg-black/70";

  return (
    <>
      <div className={`md:hidden fixed top-0 left-0 right-0 z-50 ${shellClass} px-4 py-4 flex items-center justify-between`}>
        <div className={mobileTop}>AI Sales OS</div>
        <button type="button" onClick={() => setMobileOpen(!mobileOpen)} className={mobileMenuBtn}>
          {mobileOpen ? "Close" : "Menu"}
        </button>
      </div>

      {mobileOpen && <div className={overlayClass} onClick={() => setMobileOpen(false)} role="presentation" />}

      <div
        className={`md:hidden fixed top-0 left-0 h-full w-72 z-50 ${shellClass} p-6 flex flex-col transform transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className={`${brandTitle} mb-8 mt-2`}>AI Sales OS</div>
        {user && (
          <div className={`${workspaceCard} mb-6`}>
            <div className={workspaceLabel}>Workspace</div>
            <div className={isEnterprise ? "font-semibold text-slate-900" : "font-semibold text-white"}>{workspaceName}</div>
            <div className={workspaceMeta}>
              {roleLabel} · {user.plan || "free"} plan
            </div>
            <div className={workspaceSub}>{workspaceSlug || user.email}</div>
            <div className={creditsClass}>{user.ai_credits || 0} AI credits</div>
          </div>
        )}
        <nav className="flex flex-col gap-1 flex-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.path}
              type="button"
              onClick={() => handleNav(item.path)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition text-left ${
                location.pathname === item.path ? navActive : navInactive
              }`}
            >
              <span className={iconBox}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="space-y-3 mt-4">
          <ThemePicker />
          <button type="button" onClick={handleLogout} className={logoutBtn}>
            Log out
          </button>
        </div>
      </div>

      <div className={`hidden md:flex w-72 ${shellClass} p-6 flex-col min-h-screen`}>
        <div className="mb-8">
          <div className={brandTitle}>AI Sales OS</div>
          <div className={brandSub}>Sales workspace</div>
        </div>
        {user && (
          <div className={`${workspaceCard} mb-6`}>
            <div className={workspaceLabel}>Workspace</div>
            <div className={isEnterprise ? "font-semibold text-slate-900" : "font-semibold text-white"}>{workspaceName}</div>
            <div className={workspaceMeta}>
              {roleLabel} · {user.plan || "free"} plan
            </div>
            <div className={workspaceSub}>{workspaceSlug || user.email}</div>
            <div className={creditsClass}>{user.ai_credits || 0} AI credits</div>
          </div>
        )}
        <nav className="flex flex-col gap-1 flex-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.path}
              type="button"
              onClick={() => handleNav(item.path)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition text-left ${
                location.pathname === item.path ? navActive : navInactive
              }`}
            >
              <span className={iconBox}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="space-y-3 pt-4">
          <ThemePicker />
          <button type="button" onClick={handleLogout} className={logoutBtn}>
            Log out
          </button>
        </div>
      </div>
    </>
  );
}
