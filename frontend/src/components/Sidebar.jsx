import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const NAV_ITEMS = [
  { icon: "🏠", label: "Dashboard", path: "/dashboard" },
  { icon: "🗣️", label: "Sales Coach", path: "/coach" },
  { icon: "🤖", label: "AI Follow-Up", path: "/followup" },
  { icon: "👥", label: "Leads", path: "/leads" },
  { icon: "💳", label: "Pricing", path: "/pricing" },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const handleNav = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-black border-b border-white/10 px-4 py-4 flex items-center justify-between">
        <div className="text-lg font-bold">⚡ AI Sales OS</div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-white/60 hover:text-white transition p-2"
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/80"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Slide Menu */}
      <div className={`md:hidden fixed top-0 left-0 h-full w-72 z-50 bg-black border-r border-white/10 p-6 flex flex-col transform transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="text-xl font-bold mb-8 mt-2">⚡ AI Sales OS</div>
        <nav className="flex flex-col gap-1 flex-1">
          {NAV_ITEMS.map((item, i) => (
            <button
              key={i}
              onClick={() => handleNav(item.path)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition text-left
                ${location.pathname === item.path
                  ? "bg-white/10 text-white"
                  : "text-white/50 hover:text-white hover:bg-white/5"
                }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-white/40 hover:text-white hover:bg-white/5 transition"
        >
          <span>🚪</span>
          <span>Logout</span>
        </button>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 border-r border-white/10 p-6 flex-col min-h-screen">
        <div className="text-xl font-bold mb-10">⚡ AI Sales OS</div>
        <nav className="flex flex-col gap-1 flex-1">
          {NAV_ITEMS.map((item, i) => (
            <button
              key={i}
              onClick={() => handleNav(item.path)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition text-left
                ${location.pathname === item.path
                  ? "bg-white/10 text-white"
                  : "text-white/50 hover:text-white hover:bg-white/5"
                }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-white/40 hover:text-white hover:bg-white/5 transition"
        >
          <span>🚪</span>
          <span>Logout</span>
        </button>
      </div>
    </>
  );
}