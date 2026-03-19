import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import Sidebar from "../components/Sidebar";

const STATUS_COLORS = {
  New: "text-blue-400",
  Contacted: "text-yellow-400",
  Interested: "text-purple-400",
  Converted: "text-green-400",
  Lost: "text-red-400",
};

const STATUS_BG = {
  New: "bg-blue-500/10 border-blue-500/20",
  Contacted: "bg-yellow-500/10 border-yellow-500/20",
  Interested: "bg-purple-500/10 border-purple-500/20",
  Converted: "bg-green-500/10 border-green-500/20",
  Lost: "bg-red-500/10 border-red-500/20",
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [briefing, setBriefing] = useState("");
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingBriefing, setLoadingBriefing] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await API.get("/dashboard/stats");
      setStats(res.data);
    } catch (err) {
      setError("Failed to load dashboard.");
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchBriefing = async () => {
    setLoadingBriefing(true);
    setBriefing("");
    try {
      const res = await API.get("/dashboard/ai-briefing");
      setBriefing(res.data.briefing);
      // Refresh stats to update credits count
      fetchStats();
    } catch (err) {
      setBriefing(
        err.response?.data?.detail || "Failed to generate briefing."
      );
    } finally {
      setLoadingBriefing(false);
    }
  };

  const formatRevenue = (amount) => {
    if (!amount) return "₹0";
    if (amount >= 100000)
      return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000)
      return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${amount}`;
  };

  // ── Funnel bar width calculator ──
  const getFunnelWidth = (count, total) => {
    if (!total) return "0%";
    return `${Math.max((count / total) * 100, 4)}%`;
  };

  if (loadingStats) {
    return (
      <div className="min-h-screen bg-black text-white flex">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center mt-16 md:mt-0">
          <div className="text-white/40 text-sm animate-pulse">
            Loading dashboard...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex">
      <Sidebar />

      <div className="flex-1 p-4 md:p-8 overflow-y-auto mt-16 md:mt-0">
        <div className="max-w-6xl mx-auto">

          {/* ── Header ── */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-3">
            <div>
              <h1 className="text-xl md:text-2xl font-bold">
                📊 Revenue Intelligence
              </h1>
              <p className="text-white/40 text-sm mt-1">
                {stats?.user_email || "Your pipeline at a glance"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 border border-white/10 rounded-lg text-sm text-white/50">
                ⚡ {stats?.ai_credits ?? "--"} credits
              </div>
              <div className={`px-3 py-1.5 rounded-lg text-sm font-medium border
                ${stats?.plan === "pro"
                  ? "bg-purple-500/10 border-purple-500/20 text-purple-400"
                  : "bg-white/5 border-white/10 text-white/50"}`}>
                {stats?.plan === "pro" ? "⭐ Pro" : "Free Plan"}
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm mb-6">
              {error}
            </div>
          )}

          {/* ── Top Metric Cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              {
                label: "Predicted Revenue",
                value: formatRevenue(stats?.predicted_revenue),
                sub: "from active pipeline",
                icon: "💰",
                color: "text-green-400",
              },
              {
                label: "Total Leads",
                value: stats?.total_leads ?? 0,
                sub: `${stats?.hot_leads_count ?? 0} hot leads`,
                icon: "👥",
                color: "text-blue-400",
              },
              {
                label: "Win Rate",
                value: `${stats?.win_rate ?? 0}%`,
                sub: `${stats?.converted_count ?? 0} converted`,
                icon: "🏆",
                color: "text-yellow-400",
              },
              {
                label: "Avg Lead Score",
                value: stats?.avg_score ?? 0,
                sub: "out of 100",
                icon: "🎯",
                color: "text-purple-400",
              },
            ].map((card, i) => (
              <div
                key={i}
                className="border border-white/10 rounded-xl p-4 hover:border-white/20 transition"
              >
                <div className="text-2xl mb-2">{card.icon}</div>
                <div className={`text-xl md:text-2xl font-bold ${card.color}`}>
                  {card.value}
                </div>
                <div className="text-xs text-white/40 mt-1">{card.label}</div>
                <div className="text-xs text-white/20 mt-0.5">{card.sub}</div>
              </div>
            ))}
          </div>

          {/* ── AI Daily Briefing ── */}
          <div className="border border-purple-500/20 bg-purple-500/5 rounded-xl p-5 mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
              <div>
                <h2 className="font-semibold text-base">
                  🧠 AI Daily Briefing
                </h2>
                <p className="text-white/40 text-xs mt-0.5">
                  Personalized action plan based on your pipeline
                </p>
              </div>
              <button
                onClick={fetchBriefing}
                disabled={loadingBriefing}
                className="px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-lg text-purple-400 text-sm hover:bg-purple-500/30 transition disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
              >
                {loadingBriefing ? (
                  <><span className="animate-spin">⚡</span> Generating...</>
                ) : (
                  "⚡ Get Today's Briefing (1 credit)"
                )}
              </button>
            </div>

            {briefing ? (
              <div className="text-white/70 text-sm leading-relaxed">
                {briefing}
              </div>
            ) : (
              <div className="text-white/20 text-sm italic">
                Click the button to get your personalized AI briefing for today...
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

            {/* ── Pipeline Funnel ── */}
            <div className="border border-white/10 rounded-xl p-5">
              <h2 className="font-semibold text-base mb-4">
                📈 Pipeline Funnel
              </h2>
              <div className="space-y-3">
                {Object.entries(stats?.pipeline_funnel || {}).map(
                  ([status, count]) => (
                    <div key={status}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className={STATUS_COLORS[status]}>
                          {status}
                        </span>
                        <span className="text-white/40">{count} leads</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            status === "New" ? "bg-blue-500" :
                            status === "Contacted" ? "bg-yellow-500" :
                            status === "Interested" ? "bg-purple-500" :
                            status === "Converted" ? "bg-green-500" :
                            "bg-red-500"
                          }`}
                          style={{
                            width: getFunnelWidth(
                              count,
                              stats?.total_leads
                            ),
                          }}
                        />
                      </div>
                    </div>
                  )
                )}
              </div>

              {/* Conversion rate */}
              <div className="mt-4 pt-4 border-t border-white/10 flex justify-between text-sm">
                <span className="text-white/40">Conversion Rate</span>
                <span className="text-green-400 font-semibold">
                  {stats?.conversion_rate ?? 0}%
                </span>
              </div>
            </div>

            {/* ── Follow-up Alerts ── */}
            <div className="border border-white/10 rounded-xl p-5">
              <h2 className="font-semibold text-base mb-4">
                📅 Follow-up Alerts
              </h2>

              {stats?.followup_today?.length > 0 ? (
                <div className="space-y-3">
                  {stats.followup_today.map((lead) => (
                    <div
                      key={lead.id}
                      onClick={() => navigate("/leads")}
                      className="flex items-center justify-between p-3 border border-white/10 rounded-lg hover:border-white/20 cursor-pointer transition"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {lead.name}
                        </div>
                        <div className="text-xs text-white/40 truncate">
                          {lead.company}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 ml-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_BG[lead.status]}`}
                        >
                          {lead.status}
                        </span>
                        <span className="text-xs text-orange-400">
                          {lead.follow_up_date}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-3xl mb-2">✅</div>
                  <div className="text-white/40 text-sm">
                    No urgent follow-ups!
                  </div>
                  <div className="text-white/20 text-xs mt-1">
                    Score your leads to get follow-up suggestions
                  </div>
                </div>
              )}

              <button
                onClick={() => navigate("/leads")}
                className="w-full mt-4 py-2 border border-white/10 rounded-lg text-white/40 hover:text-white hover:border-white/30 transition text-sm"
              >
                View All Leads →
              </button>
            </div>
          </div>

          {/* ── Top Leads by Score ── */}
          <div className="border border-white/10 rounded-xl p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-base">
                🏆 Top Leads to Close
              </h2>
              <span className="text-xs text-white/30">
                Ranked by AI score
              </span>
            </div>

            {stats?.top_leads?.length > 0 ? (
              <div className="space-y-3">
                {stats.top_leads.map((lead, index) => (
                  <div
                    key={lead.id}
                    onClick={() => navigate("/leads")}
                    className="flex items-center gap-4 p-3 border border-white/10 rounded-lg hover:border-white/20 cursor-pointer transition"
                  >
                    {/* Rank */}
                    <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-white/40 flex-shrink-0">
                      {index + 1}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">
                          {lead.name}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_BG[lead.status]}`}
                        >
                          {lead.status}
                        </span>
                      </div>
                      <div className="text-xs text-white/40 mt-0.5">
                        {lead.company} · Follow-up: {lead.follow_up_date}
                      </div>
                    </div>

                    {/* Score + Revenue */}
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <div className="flex items-center gap-1">
                        <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              lead.score >= 70
                                ? "bg-green-500"
                                : lead.score >= 40
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            }`}
                            style={{ width: `${lead.score}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-white/60">
                          {lead.score}
                        </span>
                      </div>
                      <span className="text-xs text-green-400 font-medium">
                        {formatRevenue(lead.predicted_revenue)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-3xl mb-2">🎯</div>
                <div className="text-white/40 text-sm">
                  No scored leads yet.
                </div>
                <div className="text-white/20 text-xs mt-1">
                  Go to Leads → click 🧠 AI on each lead to score them
                </div>
              </div>
            )}
          </div>

          {/* ── Quick Actions ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                icon: "👥",
                label: "Add Lead",
                sub: "Grow pipeline",
                path: "/leads",
              },
              {
                icon: "🤖",
                label: "Follow-Up",
                sub: "AI messages",
                path: "/followup",
              },
              {
                icon: "📧",
                label: "Email Sequence",
                sub: "7-day drip",
                path: "/sequence",
              },
              {
                icon: "🗣️",
                label: "Sales Coach",
                sub: "Get advice",
                path: "/coach",
              },
            ].map((action, i) => (
              <button
                key={i}
                onClick={() => navigate(action.path)}
                className="border border-white/10 rounded-xl p-4 hover:border-white/30 hover:bg-white/5 transition text-left"
              >
                <div className="text-2xl mb-2">{action.icon}</div>
                <div className="text-sm font-medium">{action.label}</div>
                <div className="text-xs text-white/30 mt-0.5">
                  {action.sub}
                </div>
              </button>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}