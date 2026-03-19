import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";

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
      if (err.response?.status === 401) {
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
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
      {/* Sidebar */}
      <div className="w-64 border-r border-white/10 p-6 flex flex-col">
        <div className="text-xl font-bold mb-2">⚡ AI Sales OS</div>
        <div className="text-xs text-white/30 mb-8 capitalize">
          {stats?.user?.plan || "free"} plan
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          {[
            { icon: "🏠", label: "Dashboard", path: "/dashboard" },
            { icon: "🤖", label: "AI Follow-Up", path: "/followup" },
            { icon: "👥", label: "Leads", path: "/leads" },
            { icon: "💳", label: "Pricing", path: "/pricing" },
            { icon: "⚙️", label: "Settings", path: "/dashboard" },
          ].map((item, i) => (
            <button
              key={i}
              onClick={() => navigate(item.path)}
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

        {/* Credits Bar */}
        <div className="border border-white/10 rounded-xl p-4 mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-white/40">AI Credits</span>
            <span className="text-white font-medium">
              {stats?.user?.ai_credits || 0}
            </span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-1.5">
            <div
              className="bg-white rounded-full h-1.5 transition-all"
              style={{
                width: `${Math.min((stats?.user?.ai_credits / 100) * 100, 100)}%`
              }}
            />
          </div>
          {stats?.user?.ai_credits < 3 && (
            <button
              onClick={() => navigate("/pricing")}
              className="mt-2 w-full text-xs text-purple-400 hover:text-purple-300 transition"
            >
              ⚡ Get more credits →
            </button>
          )}
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-white/40 hover:text-white hover:bg-white/5 transition"
        >
          <span>🚪</span>
          <span>Logout</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">
              {greeting}, {stats?.user?.full_name?.split(" ")[0]} 👋
            </h1>
            <p className="text-white/40 text-sm mt-1">
              Here's your sales overview for today.
            </p>
          </div>
          <button
            onClick={() => navigate("/followup")}
            className="px-4 py-2 bg-white text-black text-sm font-semibold rounded-lg hover:bg-white/90 transition"
          >
            + Generate Follow-Up
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: "Total Leads",
              value: stats?.leads?.total || 0,
              icon: "👥",
              color: "text-blue-400",
              sub: `${stats?.leads?.new || 0} new`
            },
            {
              label: "Interested",
              value: stats?.leads?.interested || 0,
              icon: "🔥",
              color: "text-orange-400",
              sub: "hot leads"
            },
            {
              label: "Converted",
              value: stats?.leads?.converted || 0,
              icon: "✅",
              color: "text-green-400",
              sub: `${stats?.leads?.conversion_rate || 0}% rate`
            },
            {
              label: "AI Credits",
              value: stats?.user?.ai_credits || 0,
              icon: "⚡",
              color: "text-purple-400",
              sub: "remaining"
            },
          ].map((stat, i) => (
            <div
              key={i}
              className="border border-white/10 rounded-xl p-5 hover:border-white/20 transition"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{stat.icon}</span>
                <span className={`text-xs ${stat.color} bg-white/5 px-2 py-1 rounded-full`}>
                  {stat.sub}
                </span>
              </div>
              <div className="text-3xl font-bold mb-1">{stat.value}</div>
              <div className="text-white/40 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Pipeline Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="border border-white/10 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">📊 Pipeline Overview</h2>
            <div className="space-y-3">
              {[
                { label: "New", value: stats?.leads?.new || 0, color: "bg-blue-500", total: stats?.leads?.total },
                { label: "Contacted", value: stats?.leads?.contacted || 0, color: "bg-yellow-500", total: stats?.leads?.total },
                { label: "Interested", value: stats?.leads?.interested || 0, color: "bg-purple-500", total: stats?.leads?.total },
                { label: "Converted", value: stats?.leads?.converted || 0, color: "bg-green-500", total: stats?.leads?.total },
                { label: "Lost", value: stats?.leads?.lost || 0, color: "bg-red-500", total: stats?.leads?.total },
              ].map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/60">{item.label}</span>
                    <span className="text-white">{item.value}</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1.5">
                    <div
                      className={`${item.color} rounded-full h-1.5 transition-all`}
                      style={{
                        width: item.total > 0
                          ? `${(item.value / item.total) * 100}%`
                          : "0%"
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="border border-white/10 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">⚡ Quick Actions</h2>
            <div className="space-y-3">
              {[
                {
                  icon: "🤖",
                  title: "AI Follow-Up Generator",
                  desc: "Write perfect follow-ups in seconds",
                  path: "/followup",
                  color: "hover:border-purple-500/30",
                },
                {
                  icon: "👥",
                  title: "Manage Leads",
                  desc: "View and update your pipeline",
                  path: "/leads",
                  color: "hover:border-blue-500/30",
                },
                {
                  icon: "🧠",
                  title: "AI Sales Brain",
                  desc: "Get AI insights on your deals",
                  path: "/leads",
                  color: "hover:border-orange-500/30",
                },
                {
                  icon: "💳",
                  title: "Upgrade Plan",
                  desc: "Get more credits & features",
                  path: "/pricing",
                  color: "hover:border-green-500/30",
                },
              ].map((action, i) => (
                <div
                  key={i}
                  onClick={() => navigate(action.path)}
                  className={`flex items-center gap-4 p-3 border border-white/10 rounded-lg cursor-pointer transition ${action.color}`}
                >
                  <span className="text-2xl">{action.icon}</span>
                  <div>
                    <div className="text-sm font-medium">{action.title}</div>
                    <div className="text-white/40 text-xs">{action.desc}</div>
                  </div>
                  <span className="ml-auto text-white/20">→</span>
                </div>
              ))}
            </div>
          </div>
        </div>
         {/* My Capture Link */}
         <div className="border border-white/10 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-2">🔗 Your Lead Capture Link</h2>
             <p className="text-white/40 text-sm mb-3">
              Share this link to automatically capture leads into your CRM.
            </p>
          <div className="flex items-center gap-3">
          <div className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white/60 text-sm truncate">
             {window.location.origin}/capture/{stats?.user?.email?.split("@")[0]}
          </div>
          <button
            onClick={() => {
            navigator.clipboard.writeText(
            `${window.location.origin}/capture/${stats?.user?.email?.split("@")[0]}`
            );
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
          <div className="border border-purple-500/30 bg-purple-500/5 rounded-xl p-6 flex items-center justify-between">
            <div>
              <h3 className="font-semibold mb-1">🚀 Upgrade to Pro</h3>
              <p className="text-white/40 text-sm">
                Get 100 AI credits, unlimited leads and AI Sales Brain analysis.
              </p>
            </div>
            <button
              onClick={() => navigate("/pricing")}
              className="px-6 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-500 transition whitespace-nowrap ml-4"
            >
              Upgrade — ₹999/mo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}