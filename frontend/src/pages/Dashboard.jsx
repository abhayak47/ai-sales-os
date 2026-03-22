import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import API from "../api/axios";
import ActionQueue from "../components/ActionQueue";
import DealRisks from "../components/DealRisks";
import Sidebar from "../components/Sidebar";
import TodayFocus from "../components/TodayFocus";

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
        <div className="text-white/40">Loading your dashboard...</div>
      </div>
    );
  }

  const userName =
    stats?.user?.full_name?.split(" ")[0] ||
    stats?.user?.email?.split("@")[0] ||
    "there";

  return (
    <div className="min-h-screen bg-black text-white flex">
      <Sidebar />

      <div className="flex-1 p-4 md:p-8 overflow-y-auto mt-16 md:mt-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">{greeting}, {userName}</h1>
            <p className="text-white/40 text-sm mt-1">
              Your launch-ready sales cockpit with prioritized next actions.
            </p>
          </div>
          <button
            onClick={() => navigate("/followup")}
            className="px-4 py-2 bg-white text-black text-sm font-semibold rounded-lg hover:bg-white/90 transition w-full md:w-auto"
          >
            Generate Follow-Up
          </button>
        </div>

        {stats?.user?.ai_credits <= 5 && (
          <div className="border border-red-500/30 bg-red-500/5 rounded-xl p-4 mb-6 flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-red-300">Low credits</div>
              <div className="text-white/40 text-sm">
                Only {stats?.user?.ai_credits} credits left. Add a credit pack to keep the AI workflows live.
              </div>
            </div>
            <button
              onClick={() => navigate("/pricing")}
              className="px-4 py-2 bg-red-500 text-white text-sm font-semibold rounded-lg hover:bg-red-400 transition whitespace-nowrap"
            >
              Add Credits
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total Leads", value: stats?.leads?.total || 0, sub: `${stats?.leads?.new || 0} new` },
            { label: "Interested", value: stats?.leads?.interested || 0, sub: "hot deals" },
            { label: "Converted", value: stats?.leads?.converted || 0, sub: `${stats?.leads?.conversion_rate || 0}% rate` },
            { label: "AI Credits", value: stats?.user?.ai_credits || 0, sub: "available now" },
          ].map((stat) => (
            <div key={stat.label} className="border border-white/10 rounded-xl p-4 hover:border-white/20 transition">
              <div className="text-xs text-white/40 mb-2">{stat.label}</div>
              <div className="text-2xl md:text-3xl font-bold mb-1">{stat.value}</div>
              <div className="text-white/30 text-xs">{stat.sub}</div>
            </div>
          ))}
        </div>

        <ActionQueue />
        <DealRisks />

        <div className="mb-4">
          <TodayFocus />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="border border-white/10 rounded-xl p-5">
            <h2 className="text-base font-semibold mb-4">Pipeline Overview</h2>
            <div className="space-y-3">
              {[
                { label: "New", value: stats?.leads?.new || 0, color: "bg-blue-500" },
                { label: "Contacted", value: stats?.leads?.contacted || 0, color: "bg-yellow-500" },
                { label: "Interested", value: stats?.leads?.interested || 0, color: "bg-purple-500" },
                { label: "Converted", value: stats?.leads?.converted || 0, color: "bg-green-500" },
                { label: "Lost", value: stats?.leads?.lost || 0, color: "bg-red-500" },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/60">{item.label}</span>
                    <span className="text-white">{item.value}</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1.5">
                    <div
                      className={`${item.color} rounded-full h-1.5 transition-all`}
                      style={{
                        width: stats?.leads?.total > 0 ? `${(item.value / stats.leads.total) * 100}%` : "0%",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-white/10 rounded-xl p-5">
            <h2 className="text-base font-semibold mb-4">Power Actions</h2>
            <div className="space-y-2">
              {[
                { title: "AI Sales Coach", desc: "Ask for strategy, scripts, and objection handling", path: "/coach", credits: 1 },
                { title: "AI Follow-Up", desc: "Write a polished next touch instantly", path: "/followup", credits: 1 },
                { title: "Email Sequence", desc: "Generate a 7-step outbound sequence", path: "/sequence", credits: 5 },
                { title: "Pipeline Board", desc: "Move deals, inspect stages, and keep momentum", path: "/pipeline", credits: 0 },
              ].map((action) => (
                <div
                  key={action.title}
                  onClick={() => navigate(action.path)}
                  className="flex items-center gap-3 p-3 border border-white/10 rounded-lg cursor-pointer hover:border-white/30 transition"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{action.title}</div>
                    <div className="text-white/40 text-xs">{action.desc}</div>
                  </div>
                  {action.credits > 0 && (
                    <span className="text-xs text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-1 rounded-full">
                      {action.credits} credits
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border border-white/10 rounded-xl p-5 mb-4">
          <h2 className="text-base font-semibold mb-2">Lead Capture Link</h2>
          <p className="text-white/40 text-sm mb-3">
            Share this page to collect inbound prospects directly into your pipeline.
          </p>
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <div className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white/60 text-sm truncate">
              {window.location.origin}/capture/{stats?.user?.email?.split("@")[0]}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/capture/${stats?.user?.email?.split("@")[0]}`);
                alert("Link copied");
              }}
              className="px-4 py-2 bg-white text-black text-sm font-semibold rounded-lg hover:bg-white/90 transition whitespace-nowrap"
            >
              Copy Link
            </button>
          </div>
        </div>

        {stats?.user?.plan === "free" && (
          <div className="border border-purple-500/30 bg-purple-500/5 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold mb-1">Unlock paid workflows</h3>
              <p className="text-white/40 text-sm">
                Add a Growth Pack to keep follow-ups, command center recommendations, and meeting analysis running.
              </p>
            </div>
            <button
              onClick={() => navigate("/pricing")}
              className="px-6 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-500 transition w-full md:w-auto"
            >
              View Pricing
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
