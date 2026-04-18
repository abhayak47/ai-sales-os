import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../context/useAuth";
import { useTheme } from "../context/useTheme";

const NAV_SECTIONS = [
  {
    label: "Main",
    items: [
      { id: "dashboard", icon: "grid", label: "Dashboard", path: "/dashboard" },
      { id: "contacts", icon: "users", label: "Contacts", path: "/contacts" },
      { id: "companies", icon: "briefcase", label: "Companies", path: "/companies" },
      { id: "pipeline", icon: "bars", label: "Deals", path: "/pipeline" },
      { id: "leads", icon: "check", label: "Tasks", path: "/leads?view=needs_attention" },
    ],
  },
  {
    label: "Engage",
    items: [
      { id: "email", icon: "mail", label: "Email", path: "/emails" },
      { id: "followup", icon: "phone", label: "Calls", path: "/followup" },
      { id: "coach", icon: "spark", label: "Chat", path: "/coach" },
    ],
  },
  {
    label: "Insights",
    items: [
      { id: "reports", icon: "chart", label: "Reports", path: "/reports" },
      { id: "pricing", icon: "pulse", label: "Analytics", path: "/pricing" },
    ],
  },
];

function Icon({ type, active = false }) {
  const stroke = active ? "#fff5f8" : "currentColor";

  const baseProps = {
    width: 15,
    height: 15,
    viewBox: "0 0 20 20",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    className: "shrink-0",
  };

  switch (type) {
    case "users":
      return (
        <svg {...baseProps}>
          <path d="M7 10.5A2.5 2.5 0 1 0 7 5.5a2.5 2.5 0 0 0 0 5ZM13.5 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM3.5 15c.7-2 2.2-3 4.5-3s3.8 1 4.5 3M12 13c1.4.1 2.5.8 3.2 2" stroke={stroke} strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      );
    case "briefcase":
      return (
        <svg {...baseProps}>
          <path d="M6.5 6V5.2c0-.9.7-1.7 1.7-1.7h3.6c.9 0 1.7.8 1.7 1.7V6M3.5 7.4h13v7.4c0 .8-.7 1.5-1.5 1.5H5c-.8 0-1.5-.7-1.5-1.5V7.4Z" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case "bars":
      return (
        <svg {...baseProps}>
          <path d="M4 15.5h12M4 10h9M4 4.5h6" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "check":
      return (
        <svg {...baseProps}>
          <path d="M5.2 5.2h9.6v9.6H5.2z" stroke={stroke} strokeWidth="1.5" />
          <path d="m7.2 10 1.8 1.8 3.8-4" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "mail":
      return (
        <svg {...baseProps}>
          <path d="M3.5 5.5h13v9h-13z" stroke={stroke} strokeWidth="1.5" />
          <path d="m4.5 6.5 5.5 4 5.5-4" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "phone":
      return (
        <svg {...baseProps}>
          <path d="M6.4 4.7c.4-.4 1-.5 1.5-.2l1.3.7c.5.3.7.9.5 1.4l-.5 1.4c.8 1.5 2 2.7 3.5 3.5l1.4-.5c.5-.2 1.1 0 1.4.5l.7 1.3c.3.5.2 1.1-.2 1.5l-.9.9c-.5.5-1.2.7-1.9.5-5-1.3-8.9-5.2-10.2-10.2-.2-.7 0-1.4.5-1.9l.9-.9Z" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "spark":
      return (
        <svg {...baseProps}>
          <path d="m10 2.8 1.2 3.5L14.8 7.5l-3 1.8-1 3.4-1.6-2.7L6 8.8l3-1.6L10 2.8Z" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "chart":
      return (
        <svg {...baseProps}>
          <path d="M4 15.5h12M6.5 13V9.5M10 13V6.5M13.5 13v-4" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "pulse":
      return (
        <svg {...baseProps}>
          <path d="M3.5 10h3l1.4-3.1 2.4 6.1 1.7-4 1.1 1h2.9" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg {...baseProps}>
          <path d="M4 4h5v5H4zM11 4h5v5h-5zM4 11h5v5H4zM11 11h5v5h-5z" stroke={stroke} strokeWidth="1.5" />
        </svg>
      );
  }
}

function ThemePicker() {
  const { theme, setTheme, themes } = useTheme();

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-3">
      <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-white/35">Theme</div>
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value)}
        className="w-full rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none transition focus:border-white/15"
      >
        {Object.entries(themes).map(([value, item]) => (
          <option key={value} value={value} className="bg-neutral-950 text-white">
            {item.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function UserPanel({ user, onNavigate }) {
  const initials = useMemo(() => {
    const seed = user?.full_name || user?.email || "AI";
    return seed
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  }, [user]);

  return (
    <div className="mt-4 space-y-3">
      <div className="rounded-2xl border border-white/8 bg-black/40 p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 to-amber-600 text-xs font-bold text-neutral-900">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white">{user?.full_name || "Workspace user"}</div>
            <div className="truncate text-xs text-white/45">{user?.email}</div>
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-2">
        {[
          { label: "Profile", path: "/team" },
          { label: "Settings", path: "/pricing" },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => onNavigate(item.path)}
            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm text-white/60 transition hover:bg-white/[0.04] hover:text-white"
          >
            <span>{item.label}</span>
            <span className="text-white/25">{">"}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const activePath = `${location.pathname}${location.search}`;

  const workspaceName = user?.organization_name || "Setu CRM";
  const planLabel = user?.plan ? `${user.plan} plan` : "Pro";

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleNav = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  const shell = (
    <div className="crm-sidebar flex h-full flex-col px-4 py-5 text-white">
      <div className="mb-6 flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-rose-700 text-sm font-bold text-white shadow-[0_12px_24px_rgba(207,17,69,0.25)]">
            S
          </div>
          <div>
            <div className="text-sm font-semibold text-white">{workspaceName}</div>
            <div className="text-xs text-white/45">{planLabel}</div>
          </div>
        </div>
        <div className="text-white/35">⌄</div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto pr-1">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <div className="mb-2 px-2 text-[10px] uppercase tracking-[0.16em] text-white/30">{section.label}</div>
            <div className="space-y-1">
              {section.items.map((item) => {
                const active = activePath === item.path || (item.path.includes("?") ? activePath.startsWith(item.path.split("?")[0]) : location.pathname === item.path);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNav(item.path)}
                    className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm transition ${
                      active
                        ? "bg-[linear-gradient(180deg,#ff2f63,#cf1145)] text-white shadow-[0_12px_24px_rgba(207,17,69,0.25)]"
                        : "text-white/62 hover:bg-white/[0.04] hover:text-white"
                    }`}
                  >
                    <span className={`flex h-8 w-8 items-center justify-center rounded-xl border ${active ? "border-white/15 bg-white/10" : "border-white/8 bg-white/[0.02]"}`}>
                      <Icon type={item.icon} active={active} />
                    </span>
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-white/8 pt-4">
        <ThemePicker />
        <UserPanel user={user} onNavigate={handleNav} />
        <button
          type="button"
          onClick={handleLogout}
          className="mt-3 flex w-full items-center justify-center rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3 text-sm font-medium text-white/70 transition hover:bg-white/[0.05] hover:text-white"
        >
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between border-b border-white/8 bg-black/80 px-4 py-4 backdrop-blur md:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-rose-700 text-xs font-bold text-white">S</div>
          <div>
            <div className="text-sm font-semibold text-white">{workspaceName}</div>
            <div className="text-[11px] text-white/35">Sales workspace</div>
          </div>
        </div>
        <button type="button" onClick={() => setMobileOpen((value) => !value)} className="rounded-xl border border-white/8 px-3 py-2 text-sm text-white/70">
          {mobileOpen ? "Close" : "Menu"}
        </button>
      </div>

      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)} role="presentation" />}

      <div className={`fixed left-0 top-0 z-50 h-full w-[248px] transition-transform duration-300 md:static md:block ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        {shell}
      </div>
    </>
  );
}
