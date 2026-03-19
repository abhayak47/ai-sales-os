import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Sidebar */}
      <div className="w-64 border-r border-white/10 p-6 flex flex-col">
        <div className="text-xl font-bold mb-10">⚡ AI Sales OS</div>
        <nav className="flex flex-col gap-1 flex-1">
          {[
            { icon: "🏠", label: "Dashboard" },
            { icon: "🤖", label: "AI Follow-Up" },
            { icon: "👥", label: "Leads" },
            { icon: "📊", label: "Analytics" },
            { icon: "⚙️", label: "Settings" },
          ].map((item, i) => (
            <button
              key={i}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition text-left
                ${i === 0
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

      {/* Main Content */}
      <div className="flex-1 p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Good morning 👋</h1>
          <p className="text-white/40 text-sm mt-1">
            Here's what's happening with your sales today.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total Leads", value: "0", icon: "👥" },
            { label: "Follow-ups Sent", value: "0", icon: "📨" },
            { label: "AI Credits Left", value: "10", icon: "⚡" },
          ].map((stat, i) => (
            <div
              key={i}
              className="border border-white/10 rounded-xl p-6 hover:border-white/20 transition"
            >
              <div className="text-2xl mb-2">{stat.icon}</div>
              <div className="text-3xl font-bold mb-1">{stat.value}</div>
              <div className="text-white/40 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="border border-white/10 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                icon: "🤖",
                title: "Generate Follow-Up",
                desc: "Use AI to write the perfect follow-up message", path: "/followup",
              },
              {
                icon: "➕",
                title: "Add New Lead",
                desc: "Add a new lead to your pipeline", path: "/leads",
              },
            ].map((action, i) => (
              <div
                key={i}
                onClick={() => navigate(action.path)}
                className="border border-white/10 rounded-lg p-4 hover:border-white/30 cursor-pointer transition"
              >
                <div className="text-2xl mb-2">{action.icon}</div>
                <div className="font-medium mb-1">{action.title}</div>
                <div className="text-white/40 text-sm">{action.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}