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
import { useTheme } from "../context/useTheme";

const WORKSPACE_MODES = {
  founder: {
    label: "Dashboard",
    description: "Your CRM at a glance",
    heroPrimary: "/leads?view=decision_this_week",
    heroPrimaryLabel: "Decision deals",
    heroSecondary: "/pipeline",
    heroSecondaryLabel: "Open pipeline",
  },
  closer: {
    label: "Dashboard",
    description: "High-priority opportunities and next actions",
    heroPrimary: "/leads?view=hot_deals",
    heroPrimaryLabel: "Hot deals",
    heroSecondary: "/followup",
    heroSecondaryLabel: "Draft follow-up",
  },
  csm: {
    label: "Dashboard",
    description: "Account health, renewals, and expansion opportunities",
    heroPrimary: "/leads?status=Converted",
    heroPrimaryLabel: "Won accounts",
    heroSecondary: "/coach",
    heroSecondaryLabel: "Open coach",
  },
};

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

function StatCard({ label, value, sub, tone = "neutral" }) {
  const toneClass =
    tone === "success"
      ? "text-emerald-400"
      : tone === "danger"
        ? "text-rose-400"
        : "text-white/45";

  return (
    <div className="crm-stat-card">
      <div className="mb-2 text-xs text-white/35">{label}</div>
      <div className="text-[2rem] font-extrabold leading-none text-white">{value}</div>
      <div className={`mt-3 text-xs font-semibold ${toneClass}`}>{sub}</div>
    </div>
  );
}

function MiniAreaChart({ points }) {
  const width = 460;
  const height = 220;
  const topPadding = 22;
  const bottomPadding = 18;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = Math.max(max - min, 1);

  const linePath = points
    .map((value, index) => {
      const x = (index / (points.length - 1 || 1)) * width;
      const y = topPadding + ((max - value) / range) * (height - topPadding - bottomPadding);
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-[220px] w-full">
      <defs>
        <linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,47,99,0.45)" />
          <stop offset="100%" stopColor="rgba(255,47,99,0.03)" />
        </linearGradient>
      </defs>
      {[0.2, 0.5, 0.8].map((fraction) => (
        <line
          key={fraction}
          x1="0"
          x2={width}
          y1={topPadding + fraction * (height - topPadding - bottomPadding)}
          y2={topPadding + fraction * (height - topPadding - bottomPadding)}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="1"
        />
      ))}
      <path d={areaPath} fill="url(#chart-fill)" />
      <path d={linePath} fill="none" stroke="rgba(255,122,150,0.9)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function PipelineOverview({ stats }) {
  const rows = [
    { label: "Lead", value: stats?.leads?.new || 0, amount: 225000, tone: "bg-rose-200" },
    { label: "Qualified", value: stats?.leads?.contacted || 0, amount: 180000, tone: "bg-pink-400" },
    { label: "Proposal", value: stats?.leads?.interested || 0, amount: 120000, tone: "bg-fuchsia-500" },
    { label: "Negotiation", value: stats?.workspace?.open_pipeline || 0, amount: 85000, tone: "bg-rose-600" },
    { label: "Won", value: stats?.leads?.converted || 0, amount: 62000, tone: "bg-rose-700" },
  ];

  const maxDeals = Math.max(...rows.map((item) => item.value), 1);

  return (
    <div className="premium-card h-full p-5">
      <div className="mb-5">
        <div className="text-xl font-semibold text-white">Pipeline Overview</div>
        <div className="mt-1 text-sm text-white/40">101 deals across 5 stages</div>
      </div>
      <div className="space-y-4">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-sm ${row.tone}`} />
                <span className="font-semibold text-white">{row.label}</span>
              </div>
              <div className="flex gap-4 text-white/45">
                <span>${row.amount.toLocaleString()}</span>
                <span className="font-semibold text-white/75">{row.value} deals</span>
              </div>
            </div>
            <div className="h-2 rounded-full bg-white/[0.05]">
              <div className={`h-2 rounded-full ${row.tone}`} style={{ width: `${Math.max((row.value / maxDeals) * 100, 6)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityPanel() {
  return (
    <div className="premium-card h-full p-5">
      <div className="mb-5">
        <div className="text-xl font-semibold text-white">Deal Activity</div>
        <div className="mt-1 text-sm text-white/40">New leads and deals won over the last 6 months</div>
      </div>
      <MiniAreaChart points={[32, 48, 26, 18, 42, 61, 38, 54]} />
      <div className="mt-3 flex justify-between text-xs text-white/35">
        {["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"].map((month) => (
          <span key={month}>{month}</span>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { theme, setTheme, themes } = useTheme();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [workspaceMode, setWorkspaceMode] = useState("founder");

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await API.get("/dashboard/stats");
      setStats(res.data);

      const stored = readStoredPreferences(res.data?.user?.email);
      if (stored?.workspaceMode && WORKSPACE_MODES[stored.workspaceMode]) {
        setWorkspaceMode(stored.workspaceMode);
      }
    } catch (err) {
      if (err.response?.status === 401) navigate("/login");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!stats?.user?.email || typeof window === "undefined") return;
    window.localStorage.setItem(getPreferenceKey(stats.user.email), JSON.stringify({ workspaceMode }));
  }, [workspaceMode, stats?.user?.email]);

  const modeConfig = useMemo(() => WORKSPACE_MODES[workspaceMode], [workspaceMode]);
  const customizerSections = {
    stats: true,
    workspacePulse: true,
    savedViews: true,
    priorityPlays: true,
    todayFocus: true,
    executionQueue: true,
    riskRadar: true,
    pipelineOverview: true,
    utilities: true,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="glass-panel rounded-2xl px-6 py-4 text-sm text-white/60">Loading workspace...</div>
      </div>
    );
  }

  return (
    <div className="crm-shell">
      <Sidebar />

      <DashboardCustomizer
        open={customizerOpen}
        mode={workspaceMode}
        density="comfortable"
        theme={theme}
        themes={themes}
        sections={customizerSections}
        onClose={() => setCustomizerOpen(false)}
        onModeChange={setWorkspaceMode}
        onDensityChange={() => {}}
        onThemeChange={setTheme}
        onSectionToggle={() => {}}
        onReset={() => setWorkspaceMode("founder")}
      />

      <main className="crm-page">
        <div className="crm-view fade-rise">
          <div className="px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="mb-2 flex items-center gap-3 text-sm text-white/45">
                  <span className="crm-status-dot" />
                  <span>{modeConfig.label}</span>
                </div>
                <h1 className="text-[2rem] font-extrabold tracking-tight text-white">Dashboard</h1>
                <p className="mt-1 text-sm text-white/45">{modeConfig.description}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  value={workspaceMode}
                  onChange={(e) => setWorkspaceMode(e.target.value)}
                  className="input-surface min-w-[180px] bg-white/[0.03] py-3"
                >
                  <option value="founder" className="bg-neutral-950 text-white">Leadership</option>
                  <option value="closer" className="bg-neutral-950 text-white">Sales</option>
                  <option value="csm" className="bg-neutral-950 text-white">Customer success</option>
                </select>
                <button type="button" onClick={() => navigate(modeConfig.heroPrimary)} className="button-secondary">
                  {modeConfig.heroPrimaryLabel}
                </button>
                <button type="button" onClick={() => setCustomizerOpen(true)} className="button-primary">
                  Customize
                </button>
              </div>
            </div>
          </div>

          <div className="crm-section px-5 py-5">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
              <StatCard label="Total Contacts" value={stats?.leads?.total || 0} sub={`+${stats?.leads?.new || 0} this week`} tone="success" />
              <StatCard label="Active Deals" value={stats?.workspace?.open_pipeline || 0} sub={`+${stats?.leads?.interested || 0} this week`} tone="success" />
              <StatCard label="Revenue Won" value={`$${((stats?.leads?.converted || 0) * 3900).toLocaleString()}`} sub="+18% this month" tone="success" />
              <StatCard label="Overdue Tasks" value={Math.max((stats?.leads?.needs_attention || 0) - 1, 0)} sub="2 from last week" tone="danger" />
            </div>
          </div>

          <div className="crm-section grid grid-cols-1 gap-5 px-5 py-5 xl:grid-cols-2">
            <PipelineOverview stats={stats} />
            <ActivityPanel />
          </div>

          <div className="crm-section grid grid-cols-1 gap-5 px-5 py-5 xl:grid-cols-2">
            <div className="space-y-5">
              <TodayFocus limit={4} />
              <SavedViewsPanel compact />
            </div>
            <div className="space-y-5">
              <ActionQueue compact limit={4} />
              <ExecutionQueue compact limit={4} />
              <DealRisks limit={4} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
