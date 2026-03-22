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
import { useTheme } from "../context/ThemeContext";

const WORKSPACE_MODES = {
  founder: {
    label: "Founder",
    eyebrow: "Founder Workspace",
    description: "See pipeline health, risk, and the revenue levers that matter most right now.",
    sections: {
      stats: true,
      workspacePulse: true,
      savedViews: true,
      priorityPlays: true,
      todayFocus: true,
      executionQueue: false,
      riskRadar: true,
      pipelineOverview: true,
      utilities: true,
    },
    order: ["stats", "workspacePulse", "savedViews", "priorityPlays", "todayFocus", "riskRadar", "pipelineOverview", "utilities"],
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
      workspacePulse: true,
      savedViews: true,
      priorityPlays: true,
      todayFocus: true,
      executionQueue: true,
      riskRadar: true,
      pipelineOverview: false,
      utilities: true,
    },
    order: ["stats", "workspacePulse", "priorityPlays", "todayFocus", "executionQueue", "savedViews", "riskRadar", "utilities"],
    heroPrimary: "/leads?view=hot_deals",
    heroPrimaryLabel: "Open hot deals",
    heroSecondary: "/followup",
    heroSecondaryLabel: "Generate follow-up",
  },
  csm: {
    label: "CSM Expansion",
    eyebrow: "CSM Expansion Workspace",
    description: "Run expansions and customer growth from a clearer post-sale operating view.",
    sections: {
      stats: true,
      workspacePulse: true,
      savedViews: true,
      priorityPlays: false,
      todayFocus: true,
      executionQueue: true,
      riskRadar: false,
      pipelineOverview: true,
      utilities: true,
    },
    order: ["stats", "workspacePulse", "savedViews", "todayFocus", "executionQueue", "pipelineOverview", "utilities"],
    heroPrimary: "/leads?status=Converted",
    heroPrimaryLabel: "Open won accounts",
    heroSecondary: "/coach",
    heroSecondaryLabel: "Open customer strategy coach",
  },
};

const DEFAULT_DENSITY = {
  comfortable: {
    heroPadding: "p-6 md:p-8",
    sectionGap: "mb-6",
    gridGap: "gap-6",
  },
  compact: {
    heroPadding: "p-5 md:p-6",
    sectionGap: "mb-4",
    gridGap: "gap-4",
  },
  focused: {
    heroPadding: "p-5 md:p-6",
    sectionGap: "mb-5",
    gridGap: "gap-4",
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

function reorderPanels(order, draggedId, targetId) {
  if (!draggedId || !targetId || draggedId === targetId) return order;
  const next = [...order];
  const draggedIndex = next.indexOf(draggedId);
  const targetIndex = next.indexOf(targetId);
  if (draggedIndex === -1 || targetIndex === -1) return order;
  next.splice(draggedIndex, 1);
  next.splice(targetIndex, 0, draggedId);
  return next;
}

function DashboardPanel({ id, title, description, children, span = "half", onDragStart, onDrop }) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(id)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => onDrop(id)}
      className={`border border-white/10 rounded-2xl p-5 bg-white/[0.02] ${span === "full" ? "xl:col-span-2" : ""}`}
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          {description && <p className="text-white/40 text-sm mt-1">{description}</p>}
        </div>
        <div className="px-3 py-2 border border-white/10 rounded-xl text-xs text-white/45 cursor-grab">
          Drag
        </div>
      </div>
      {children}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { theme, setTheme, themes } = useTheme();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState("");
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [workspaceMode, setWorkspaceMode] = useState("founder");
  const [density, setDensity] = useState("comfortable");
  const [sections, setSections] = useState(WORKSPACE_MODES.founder.sections);
  const [panelOrder, setPanelOrder] = useState(WORKSPACE_MODES.founder.order);
  const [draggedPanel, setDraggedPanel] = useState(null);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
    fetchStats();
  }, []);

  useEffect(() => {
    if (!stats?.user?.email || typeof window === "undefined") return;
    const payload = { workspaceMode, density, sections, panelOrder };
    window.localStorage.setItem(getPreferenceKey(stats.user.email), JSON.stringify(payload));
  }, [workspaceMode, density, sections, panelOrder, stats?.user?.email]);

  const fetchStats = async () => {
    try {
      const res = await API.get("/dashboard/stats");
      setStats(res.data);

      const stored = readStoredPreferences(res.data?.user?.email);
      if (stored?.workspaceMode && WORKSPACE_MODES[stored.workspaceMode]) {
        setWorkspaceMode(stored.workspaceMode);
        setDensity(stored.density || "comfortable");
        setSections({ ...WORKSPACE_MODES[stored.workspaceMode].sections, ...(stored.sections || {}) });
        setPanelOrder(stored.panelOrder?.length ? stored.panelOrder : WORKSPACE_MODES[stored.workspaceMode].order);
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
    setPanelOrder(WORKSPACE_MODES[mode].order);
  };

  const resetModeDefaults = () => {
    setSections(WORKSPACE_MODES[workspaceMode].sections);
    setPanelOrder(WORKSPACE_MODES[workspaceMode].order);
  };

  const themeConfig = useMemo(() => WORKSPACE_MODES[workspaceMode], [workspaceMode]);
  const spacing = DEFAULT_DENSITY[density] || DEFAULT_DENSITY.comfortable;

  const panelMap = useMemo(() => {
    if (!stats) return {};

    return {
      stats: {
        span: "full",
        node: (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <StatCard label="Total Leads" value={stats?.leads?.total || 0} sub={`${stats?.leads?.new || 0} new this cycle`} />
            <StatCard label="Hot Pipeline" value={stats?.leads?.interested || 0} sub="decision-stage conversations" />
            <StatCard label="Won" value={stats?.leads?.converted || 0} sub={`${stats?.leads?.conversion_rate || 0}% conversion rate`} />
            <StatCard label="AI Credits" value={stats?.user?.ai_credits || 0} sub="available to deploy" />
          </div>
        ),
      },
      workspacePulse: {
        span: "full",
        node: (
          <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_1fr_1fr_1fr] gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="text-xs uppercase tracking-[0.2em] text-white/35 mb-2">Workspace Pulse</div>
              <div className="text-xl font-semibold">{stats?.workspace?.name || "Personal workspace"}</div>
              <div className="text-sm text-white/45 mt-2">
                {stats?.workspace?.scope === "workspace" ? "Shared workspace scope" : "Personal workspace scope"} · {stats?.workspace?.role || "owner"}
              </div>
              <div className="text-xs text-white/30 mt-3">
                {stats?.workspace?.slug ? `/${stats.workspace.slug}` : stats?.user?.email}
              </div>
            </div>
            {[
              ["Segments live", stats?.workspace?.segments_live || 0, "market slices active"],
              ["Tagged leads", stats?.workspace?.tagged_leads || 0, "pipeline records enriched"],
              ["Open pipeline", stats?.workspace?.open_pipeline || 0, "deals still in motion"],
            ].map(([label, value, sub]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="text-xs text-white/35 mb-2">{label}</div>
                <div className="text-3xl font-bold">{value}</div>
                <div className="text-xs text-white/35 mt-2">{sub}</div>
              </div>
            ))}
          </div>
        ),
      },
      savedViews: {
        span: "full",
        node: <SavedViewsPanel />,
      },
      priorityPlays: {
        span: "half",
        node: <ActionQueue compact={density !== "comfortable"} limit={workspaceMode === "closer" ? 4 : 3} />,
      },
      todayFocus: {
        span: "half",
        node: <TodayFocus limit={workspaceMode === "founder" ? 3 : 4} />,
      },
      executionQueue: {
        span: "half",
        node: <ExecutionQueue compact limit={workspaceMode === "csm" ? 5 : 4} />,
      },
      riskRadar: {
        span: "half",
        node: <DealRisks limit={workspaceMode === "founder" ? 4 : 3} />,
      },
      pipelineOverview: {
        span: "half",
        node: (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-base font-semibold">Pipeline Overview</div>
                <div className="text-white/40 text-sm mt-1">Stage distribution without opening every board.</div>
              </div>
              <button
                onClick={() => navigate("/pipeline")}
                className="text-sm px-4 py-2 border border-white/10 rounded-xl text-white/60 hover:text-white transition"
              >
                Open board
              </button>
            </div>
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
                    style={{ width: stats?.leads?.total > 0 ? `${(item.value / stats.leads.total) * 100}%` : "0%" }}
                  />
                </div>
              </div>
            ))}
          </div>
        ),
      },
      utilities: {
        span: "half",
        node: (
          <div>
            <h2 className="text-base font-semibold mb-4">Revenue Utilities</h2>
            <div className="space-y-3">
              {[
                { title: "AI Sales Coach", desc: "Ask for strategy, scripts, and objections", path: "/coach" },
                { title: "AI Follow-Up", desc: "Draft the next touch with context", path: "/followup" },
                { title: "Lead Workspace", desc: "Browse the pipeline with filters and views", path: "/leads" },
                { title: "Contacts", desc: "Manage customers, champions, and stakeholders", path: "/contacts" },
                { title: "Email Hub", desc: "Send tracked emails and reuse templates", path: "/emails" },
                { title: "Reports", desc: "Watch segment and activity analytics in real time", path: "/reports" },
                { title: "Team", desc: "Manage roles and workspace members", path: "/team" },
                { title: "Pricing", desc: "Manage plans and monetization settings", path: "/pricing" },
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
              <p className="text-white/40 text-sm mb-3">Share intake and route new prospects directly into your workspace.</p>
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
        ),
      },
    };
  }, [stats, density, workspaceMode, navigate]);

  const visiblePanels = panelOrder.filter((panelId) => sections[panelId] && panelMap[panelId]);

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
        theme={theme}
        themes={themes}
        sections={sections}
        onClose={() => setCustomizerOpen(false)}
        onModeChange={applyMode}
        onDensityChange={setDensity}
        onThemeChange={setTheme}
        onSectionToggle={(key) => setSections((current) => ({ ...current, [key]: !current[key] }))}
        onReset={resetModeDefaults}
      />

      <div className="flex-1 p-4 md:p-8 overflow-y-auto mt-16 md:mt-0">
        <div className={`rounded-[28px] border border-white/10 bg-gradient-to-br from-white/[0.06] via-white/[0.02] to-transparent ${spacing.heroPadding} ${spacing.sectionGap}`}>
          <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-white/35 mb-3">{themeConfig.eyebrow}</div>
              <h1 className="text-3xl md:text-4xl font-bold mb-3">{greeting}, {userName}</h1>
              <p className="text-white/50 text-sm max-w-3xl leading-6">{themeConfig.description}</p>
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="px-3 py-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/10 text-cyan-200 text-xs">
                  {stats?.workspace?.name || "Personal workspace"}
                </span>
                <span className="px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.04] text-white/60 text-xs">
                  Role: {stats?.workspace?.role || "owner"}
                </span>
                <span className="px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.04] text-white/60 text-xs">
                  {stats?.workspace?.segments_live || 0} segments active
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-full xl:min-w-[430px] xl:max-w-[460px]">
              <button
                onClick={() => navigate(themeConfig.heroPrimary)}
                className="px-4 py-4 bg-white text-black text-sm font-semibold rounded-2xl hover:bg-white/90 transition text-left"
              >
                {themeConfig.heroPrimaryLabel}
              </button>
              <button
                onClick={() => navigate(themeConfig.heroSecondary)}
                className="px-4 py-4 border border-white/10 rounded-2xl text-sm text-white/70 hover:text-white transition text-left"
              >
                {themeConfig.heroSecondaryLabel}
              </button>
              <button
                onClick={() => setCustomizerOpen(true)}
                className="sm:col-span-2 px-4 py-3 border border-white/10 rounded-2xl text-sm text-white/70 hover:text-white transition"
              >
                Customize workspace and theme
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
              <div className="text-white/40 text-sm">Only {stats?.user?.ai_credits} credits left. Top up before your AI workflows stall.</div>
            </div>
            <button
              onClick={() => navigate("/pricing")}
              className="px-4 py-2 bg-red-500 text-white text-sm font-semibold rounded-xl hover:bg-red-400 transition whitespace-nowrap"
            >
              Add credits
            </button>
          </div>
        )}

        <div className={`grid grid-cols-1 xl:grid-cols-2 ${spacing.gridGap}`}>
          {visiblePanels.map((panelId) => (
            <DashboardPanel
              key={panelId}
              id={panelId}
              span={panelMap[panelId].span}
              onDragStart={setDraggedPanel}
              onDrop={(targetId) => {
                setPanelOrder((current) => reorderPanels(current, draggedPanel, targetId));
                setDraggedPanel(null);
              }}
            >
              {panelMap[panelId].node}
            </DashboardPanel>
          ))}
        </div>

        {stats?.user?.plan === "free" && (
          <div className="border border-purple-500/20 bg-purple-500/[0.04] rounded-2xl p-5 mt-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold mb-1">Unlock paid workflows</h3>
              <p className="text-white/40 text-sm">Keep command center, meeting intelligence, and execution workflows active with a paid plan.</p>
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
