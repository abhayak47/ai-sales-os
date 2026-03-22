import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import API from "../api/axios";
import ActionQueue from "../components/ActionQueue";
import DashboardCustomizer from "../components/DashboardCustomizer";
import DealRisks from "../components/DealRisks";
import ExecutionQueue from "../components/ExecutionQueue";
import SavedViewsPanel from "../components/SavedViewsPanel";
import Sidebar from "../components/Sidebar";
import TodayFocus from "../components/TodayFocus";

const WORKSPACE_MODES = {
  founder: {
    label: "Founder",
    eyebrow: "Founder Workspace",
    description: "See pipeline health, risk, and the revenue levers that matter most right now.",
    sections: {
      stats: true,
      savedViews: true,
      priorityPlays: true,
      todayFocus: true,
      executionQueue: false,
      riskRadar: true,
      pipelineOverview: true,
      utilities: true,
    },
    heroPrimary: "/leads?view=decision_this_week",
    heroPrimaryLabel: "Open decision this week",
    heroSecondary: "/pipeline",
    heroSecondaryLabel: "Open pipeline board",
  },
  closer: {
    label: "Closer",
    eyebrow: "Closer Workspace",
    description: "Strip away the noise and surface only what helps you move deals forward today.",
    sections: {
      stats: true,
      savedViews: true,
      priorityPlays: true,
      todayFocus: true,
      executionQueue: true,
      riskRadar: true,
      pipelineOverview: false,
      utilities: true,
    },
    heroPrimary: "/leads?view=hot_deals",
    heroPrimaryLabel: "Open hot deals",
    heroSecondary: "/followup",
    heroSecondaryLabel: "Generate follow-up",
  },
  csm: {
    label: "CSM Expansion",
    eyebrow: "CSM Expansion Workspace",
    description: "Run expansions and renewals from a customer-growth lens without losing operational clarity.",
    sections: {
      stats: true,
      savedViews: true,
      priorityPlays: false,
      todayFocus: true,
      executionQueue: true,
      riskRadar: false,
      pipelineOverview: true,
      utilities: true,
    },
    heroPrimary: "/leads?status=Converted",
    heroPrimaryLabel: "Open won accounts",
    heroSecondary: "/sequence",
    heroSecondaryLabel: "Build expansion sequence",
  },
};

const DEFAULT_DENSITY = {
  comfortable: {
    statCols: "grid-cols-2 xl:grid-cols-4",
    heroPadding: "p-6 md:p-8",
    layoutGap: "gap-6",
    sectionGap: "mb-6",
  },
  compact: {
    statCols: "grid-cols-2 xl:grid-cols-4",
    heroPadding: "p-5 md:p-6",
    layoutGap: "gap-4",
    sectionGap: "mb-4",
  },
  focused: {
    statCols: "grid-cols-2 xl:grid-cols-4",
    heroPadding: "p-5 md:p-6",
    layoutGap: "gap-4",
    sectionGap: "mb-5",
  },
};

function StatCard({ label, value, sub }) {
  return (
    <div className="border border-white/10 rounded-2xl p-4 bg-white/[0.02]">
      <div className="text-xs text-white/35 mb-2">{label}</div>
      <div className="text-2xl md:text-3xl font-bold mb-1">{value}</div>
      <div className="text-white/30 text-xs">{sub}</div>
    </div>
  );
}

function getPreferenceKey(email) {
  return `ai-sales-os:dashboard:${email || "guest"}`;
}

function readStoredPreferences(email) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(getPreferenceKey(email));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState("");
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [workspaceMode, setWorkspaceMode] = useState("founder");
  const [density, setDensity] = useState("comfortable");
  const [sections, setSections] = useState(WORKSPACE_MODES.founder.sections);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
    fetchStats();
  }, []);

  useEffect(() => {
    if (!stats?.user?.email || typeof window === "undefined") return;
    const payload = { workspaceMode, density, sections };
    window.localStorage.setItem(getPreferenceKey(stats.user.email), JSON.stringify(payload));
  }, [workspaceMode, density, sections, stats?.user?.email]);

  const fetchStats = async () => {
    try {
      const res = await API.get("/dashboard/stats");
      setStats(res.data);

      const stored = readStoredPreferences(res.data?.user?.email);
      if (stored?.workspaceMode && WORKSPACE_MODES[stored.workspaceMode]) {
        setWorkspaceMode(stored.workspaceMode);
        setDensity(stored.density || "comfortable");
        setSections({ ...WORKSPACE_MODES[stored.workspaceMode].sections, ...(stored.sections || {}) });
      }
    } catch (err) {
      if (err.response?.status === 401) navigate("/login");
    } finally {
      setLoading(false);
    }
  };

  const applyMode = (mode) => {
    setWorkspaceMode(mode);
    setSections(WORKSPACE_MODES[mode].sections);
  };

  const resetModeDefaults = () => {
    setSections(WORKSPACE_MODES[workspaceMode].sections);
  };

  const theme = useMemo(() => WORKSPACE_MODES[workspaceMode], [workspaceMode]);
  const spacing = DEFAULT_DENSITY[density] || DEFAULT_DENSITY.comfortable;

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

      <DashboardCustomizer
        open={customizerOpen}
        mode={workspaceMode}
        density={density}
        sections={sections}
        onClose={() => setCustomizerOpen(false)}
        onModeChange={applyMode}
        onDensityChange={setDensity}
        onSectionToggle={(key) => setSections((current) => ({ ...current, [key]: !current[key] }))}
        onReset={resetModeDefaults}
      />

      <div className="flex-1 p-4 md:p-8 overflow-y-auto mt-16 md:mt-0">
        <div className={`rounded-[28px] border border-white/10 bg-gradient-to-br from-white/[0.06] via-white/[0.02] to-transparent ${spacing.heroPadding} ${spacing.sectionGap}`}>
          <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-white/35 mb-3">{theme.eyebrow}</div>
              <h1 className="text-3xl md:text-4xl font-bold mb-3">{greeting}, {userName}</h1>
              <p className="text-white/50 text-sm max-w-3xl leading-6">{theme.description}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-full xl:min-w-[430px] xl:max-w-[460px]">
              <button
                onClick={() => navigate(theme.heroPrimary)}
                className="px-4 py-4 bg-white text-black text-sm font-semibold rounded-2xl hover:bg-white/90 transition text-left"
              >
                {theme.heroPrimaryLabel}
              </button>
              <button
                onClick={() => navigate(theme.heroSecondary)}
                className="px-4 py-4 border border-white/10 rounded-2xl text-sm text-white/70 hover:text-white transition text-left"
              >
                {theme.heroSecondaryLabel}
              </button>
              <button
                onClick={() => setCustomizerOpen(true)}
                className="sm:col-span-2 px-4 py-3 border border-white/10 rounded-2xl text-sm text-white/70 hover:text-white transition"
              >
                Customize this workspace
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-6">
            {Object.entries(WORKSPACE_MODES).map(([key, mode]) => (
              <button
                key={key}
                onClick={() => applyMode(key)}
                className={`px-4 py-2 rounded-xl text-sm border transition ${
                  workspaceMode === key ? "border-white/30 bg-white/[0.08] text-white" : "border-white/10 text-white/55"
                }`}
              >
                {mode.label}
              </button>
            ))}
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

        {sections.stats && (
          <div className={`grid ${spacing.statCols} gap-3 ${spacing.sectionGap}`}>
            <StatCard label="Total Leads" value={stats?.leads?.total || 0} sub={`${stats?.leads?.new || 0} new this cycle`} />
            <StatCard label="Hot Pipeline" value={stats?.leads?.interested || 0} sub="decision-stage conversations" />
            <StatCard label="Won" value={stats?.leads?.converted || 0} sub={`${stats?.leads?.conversion_rate || 0}% conversion rate`} />
            <StatCard label="AI Credits" value={stats?.user?.ai_credits || 0} sub="available to deploy" />
          </div>
        )}

        {sections.savedViews && (
          <div className={spacing.sectionGap}>
            <SavedViewsPanel />
          </div>
        )}

        <div className={`grid grid-cols-1 xl:grid-cols-2 ${spacing.layoutGap} ${spacing.sectionGap}`}>
          {sections.priorityPlays && <ActionQueue compact={density !== "comfortable"} limit={workspaceMode === "closer" ? 4 : 3} />}
          {sections.todayFocus && <TodayFocus limit={workspaceMode === "founder" ? 3 : 4} />}
        </div>

        <div className={`grid grid-cols-1 xl:grid-cols-2 ${spacing.layoutGap} ${spacing.sectionGap}`}>
          {sections.executionQueue && <ExecutionQueue compact limit={workspaceMode === "csm" ? 5 : 4} />}
          {sections.riskRadar && <DealRisks limit={workspaceMode === "founder" ? 4 : 3} />}
        </div>

        <div className={`grid grid-cols-1 xl:grid-cols-2 ${spacing.layoutGap}`}>
          {sections.pipelineOverview && (
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
          )}

          {sections.utilities && (
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
          )}
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
