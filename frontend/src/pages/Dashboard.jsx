import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import API from "../api/axios";
import ActionQueue from "../components/ActionQueue";
import DealRisks from "../components/DealRisks";
import ExecutionQueue from "../components/ExecutionQueue";
import SavedViewsPanel from "../components/SavedViewsPanel";
import Sidebar from "../components/Sidebar";
import TodayFocus from "../components/TodayFocus";

function StatCard({ label, value, sub }) {
  return (
    <div className="border border-white/10 rounded-2xl p-4 bg-white/[0.02]">
      <div className="text-xs text-white/35 mb-2">{label}</div>
      <div className="text-2xl md:text-3xl font-bold mb-1">{value}</div>
      <div className="text-white/30 text-xs">{sub}</div>
    </div>
  );
}

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
        <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-white/[0.06] via-white/[0.02] to-transparent p-6 md:p-8 mb-6">
          <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-white/35 mb-3">Revenue Command</div>
              <h1 className="text-3xl md:text-4xl font-bold mb-3">{greeting}, {userName}</h1>
              <p className="text-white/50 text-sm max-w-3xl leading-6">
                A calmer operating view for the day ahead: the pipeline pulse, the few deals that actually need action,
                and saved views that let you jump straight into high-value work.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 min-w-full xl:min-w-[360px] xl:max-w-[420px]">
              <button
                onClick={() => navigate("/leads?view=hot_deals")}
                className="border border-white/10 rounded-2xl p-4 text-left bg-white/[0.02] hover:border-white/25 transition"
              >
                <div className="text-xs text-white/35 mb-2">Hot deals</div>
                <div className="text-lg font-semibold">{stats?.leads?.interested || 0}</div>
              </button>
              <button
                onClick={() => navigate("/pipeline")}
                className="border border-white/10 rounded-2xl p-4 text-left bg-white/[0.02] hover:border-white/25 transition"
              >
                <div className="text-xs text-white/35 mb-2">Pipeline board</div>
                <div className="text-lg font-semibold">Open board</div>
              </button>
              <button
                onClick={() => navigate("/followup")}
                className="col-span-2 px-4 py-3 bg-white text-black text-sm font-semibold rounded-2xl hover:bg-white/90 transition"
              >
                Generate follow-up
              </button>
            </div>
          </div>
        </div>

        {stats?.user?.ai_credits <= 5 && (
          <div className="border border-red-500/20 bg-red-500/[0.04] rounded-2xl p-4 mb-6 flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-red-200">Low credits</div>
              <div className="text-white/40 text-sm">
                Only {stats?.user?.ai_credits} credits left. Top up before your AI workflows stall.
              </div>
            </div>
            <button
              onClick={() => navigate("/pricing")}
              className="px-4 py-2 bg-red-500 text-white text-sm font-semibold rounded-xl hover:bg-red-400 transition whitespace-nowrap"
            >
              Add credits
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
          <StatCard label="Total Leads" value={stats?.leads?.total || 0} sub={`${stats?.leads?.new || 0} new this cycle`} />
          <StatCard label="Hot Pipeline" value={stats?.leads?.interested || 0} sub="decision-stage conversations" />
          <StatCard label="Won" value={stats?.leads?.converted || 0} sub={`${stats?.leads?.conversion_rate || 0}% conversion rate`} />
          <StatCard label="AI Credits" value={stats?.user?.ai_credits || 0} sub="available to deploy" />
        </div>

        <div className="mb-6">
          <SavedViewsPanel />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.9fr] gap-6 mb-6">
          <ActionQueue compact limit={3} />
          <TodayFocus limit={3} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6 mb-6">
          <ExecutionQueue compact limit={4} />
          <DealRisks limit={3} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_0.9fr] gap-6">
          <div className="border border-white/10 rounded-2xl p-5 bg-white/[0.02]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold">Pipeline Overview</h2>
                <p className="text-white/40 text-sm mt-1">A clean read on stage distribution without opening every board.</p>
              </div>
              <button
                onClick={() => navigate("/pipeline")}
                className="text-sm px-4 py-2 border border-white/10 rounded-xl text-white/60 hover:text-white transition"
              >
                Open board
              </button>
            </div>
            <div className="space-y-4">
              {[
                { label: "New", value: stats?.leads?.new || 0, color: "bg-blue-500" },
                { label: "Contacted", value: stats?.leads?.contacted || 0, color: "bg-amber-500" },
                { label: "Interested", value: stats?.leads?.interested || 0, color: "bg-fuchsia-500" },
                { label: "Converted", value: stats?.leads?.converted || 0, color: "bg-emerald-500" },
                { label: "Lost", value: stats?.leads?.lost || 0, color: "bg-red-500" },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-white/60">{item.label}</span>
                    <span className="text-white">{item.value}</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2">
                    <div
                      className={`${item.color} rounded-full h-2 transition-all`}
                      style={{
                        width: stats?.leads?.total > 0 ? `${(item.value / stats.leads.total) * 100}%` : "0%",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-white/10 rounded-2xl p-5 bg-white/[0.02]">
            <h2 className="text-base font-semibold mb-4">Revenue Utilities</h2>
            <div className="space-y-3">
              {[
                { title: "AI Sales Coach", desc: "Ask for strategy, scripts, and objections", path: "/coach" },
                { title: "AI Follow-Up", desc: "Draft the next touch with context", path: "/followup" },
                { title: "Email Sequence", desc: "Build a multi-step sequence", path: "/sequence" },
                { title: "Lead Workspace", desc: "Browse the pipeline with filters and views", path: "/leads" },
              ].map((action) => (
                <button
                  key={action.title}
                  onClick={() => navigate(action.path)}
                  className="w-full text-left flex items-center justify-between gap-3 p-4 border border-white/10 rounded-xl hover:border-white/25 transition"
                >
                  <div>
                    <div className="text-sm font-medium">{action.title}</div>
                    <div className="text-white/40 text-xs mt-1">{action.desc}</div>
                  </div>
                  <span className="text-white/25">Open</span>
                </button>
              ))}
            </div>

            <div className="border border-white/10 rounded-xl p-4 mt-5">
              <h3 className="text-sm font-semibold mb-2">Lead Capture Link</h3>
              <p className="text-white/40 text-sm mb-3">
                Share a clean intake page and route new prospects directly into your workspace.
              </p>
              <div className="flex flex-col gap-3">
                <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white/60 text-sm truncate">
                  {window.location.origin}/capture/{stats?.user?.email?.split("@")[0]}
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/capture/${stats?.user?.email?.split("@")[0]}`);
                    alert("Link copied");
                  }}
                  className="px-4 py-2 bg-white text-black text-sm font-semibold rounded-xl hover:bg-white/90 transition"
                >
                  Copy capture link
                </button>
              </div>
            </div>
          </div>
        </div>

        {stats?.user?.plan === "free" && (
          <div className="border border-purple-500/20 bg-purple-500/[0.04] rounded-2xl p-5 mt-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold mb-1">Unlock paid workflows</h3>
              <p className="text-white/40 text-sm">
                Keep command center, meeting intelligence, and execution workflows active with a paid plan.
              </p>
            </div>
            <button
              onClick={() => navigate("/pricing")}
              className="px-6 py-2 bg-purple-600 text-white text-sm font-semibold rounded-xl hover:bg-purple-500 transition w-full md:w-auto"
            >
              View pricing
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
