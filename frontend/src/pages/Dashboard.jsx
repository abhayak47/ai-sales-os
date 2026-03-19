import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import Sidebar from "../components/Sidebar";

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await API.get("/dashboard/stats");
      setStats(res.data);
    } catch (err) {
      if (err.response?.status === 401) navigate("/login");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⚡</div>
          <div className="text-white/40">Loading your dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex">
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 p-4 md:p-8 overflow-y-auto mt-16 md:mt-0">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">
              {greeting}, {stats?.user?.full_name?.split(" ")[0]} 👋
            </h1>
            <p className="text-white/40 text-sm mt-1">
              Here's your sales overview for today.
            </p>
          </div>
          <button
            onClick={() => navigate("/followup")}
            className="px-4 py-2 bg-white text-black text-sm font-semibold rounded-lg hover:bg-white/90 transition w-full md:w-auto"
          >
            + Generate Follow-Up
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total Leads", value: stats?.leads?.total || 0, icon: "👥", color: "text-blue-400", sub: `${stats?.leads?.new || 0} new` },
            { label: "Interested", value: stats?.leads?.interested || 0, icon: "🔥", color: "text-orange-400", sub: "hot leads" },
            { label: "Converted", value: stats?.leads?.converted || 0, icon: "✅", color: "text-green-400", sub: `${stats?.leads?.conversion_rate || 0}% rate` },
            { label: "AI Credits", value: stats?.user?.ai_credits || 0, icon: "⚡", color: "text-purple-400", sub: "remaining" },
          ].map((stat, i) => (
            <div key={i} className="border border-white/10 rounded-xl p-4 hover:border-white/20 transition">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">{stat.icon}</span>
                <span className={`text-xs ${stat.color} bg-white/5 px-2 py-1 rounded-full hidden md:block`}>
                  {stat.sub}
                </span>
              </div>
              <div className="text-2xl md:text-3xl font-bold mb-1">{stat.value}</div>
              <div className="text-white/40 text-xs md:text-sm">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Pipeline + Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="border border-white/10 rounded-xl p-5">
            <h2 className="text-base font-semibold mb-4">📊 Pipeline Overview</h2>
            <div className="space-y-3">
              {[
                { label: "New", value: stats?.leads?.new || 0, color: "bg-blue-500" },
                { label: "Contacted", value: stats?.leads?.contacted || 0, color: "bg-yellow-500" },
                { label: "Interested", value: stats?.leads?.interested || 0, color: "bg-purple-500" },
                { label: "Converted", value: stats?.leads?.converted || 0, color: "bg-green-500" },
                { label: "Lost", value: stats?.leads?.lost || 0, color: "bg-red-500" },
              ].map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/60">{item.label}</span>
                    <span className="text-white">{item.value}</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1.5">
                    <div
                      className={`${item.color} rounded-full h-1.5 transition-all`}
                      style={{ width: stats?.leads?.total > 0 ? `${(item.value / stats?.leads?.total) * 100}%` : "0%" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-white/10 rounded-xl p-5">
            <h2 className="text-base font-semibold mb-4">⚡ Quick Actions</h2>
            <div className="space-y-2">
              {[
                { icon: "🤖", title: "AI Follow-Up Generator", desc: "Write perfect follow-ups", path: "/followup", color: "hover:border-purple-500/30" },
                { icon: "👥", title: "Manage Leads", desc: "View your pipeline", path: "/leads", color: "hover:border-blue-500/30" },
                { icon: "🧠", title: "AI Sales Brain", desc: "Get AI deal insights", path: "/leads", color: "hover:border-orange-500/30" },
                { icon: "💳", title: "Upgrade Plan", desc: "Get more credits", path: "/pricing", color: "hover:border-green-500/30" },
              ].map((action, i) => (
                <div
                  key={i}
                  onClick={() => navigate(action.path)}
                  className={`flex items-center gap-3 p-3 border border-white/10 rounded-lg cursor-pointer transition ${action.color}`}
                >
                  <span className="text-xl">{action.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{action.title}</div>
                    <div className="text-white/40 text-xs">{action.desc}</div>
                  </div>
                  <span className="text-white/20 flex-shrink-0">→</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Capture Link */}
        <div className="border border-white/10 rounded-xl p-5 mb-4">
          <h2 className="text-base font-semibold mb-2">🔗 Your Lead Capture Link</h2>
          <p className="text-white/40 text-sm mb-3">Share this link to capture leads automatically.</p>
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <div className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white/60 text-sm truncate">
              {window.location.origin}/capture/{stats?.user?.email?.split("@")[0]}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/capture/${stats?.user?.email?.split("@")[0]}`);
                alert("Link copied!");
              }}
              className="px-4 py-2 bg-white text-black text-sm font-semibold rounded-lg hover:bg-white/90 transition whitespace-nowrap"
            >
              Copy Link
            </button>
          </div>
        </div>

        {/* Plan Banner */}
        {stats?.user?.plan === "free" && (
          <div className="border border-purple-500/30 bg-purple-500/5 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold mb-1">🚀 Upgrade to Pro</h3>
              <p className="text-white/40 text-sm">Get 100 AI credits and unlock all features.</p>
            </div>
            <button
              onClick={() => navigate("/pricing")}
              className="px-6 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-500 transition w-full md:w-auto"
            >
              Upgrade — ₹999/mo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}