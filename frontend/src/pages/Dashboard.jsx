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
    label: "Leadership",
    eyebrow: "Dashboard",
    description: "A clear view of pipeline health, priorities, and risk—without the clutter.",
    sections: {
      stats: true,
      workspacePulse: false,
      savedViews: true,
      priorityPlays: true,
      todayFocus: true,
      executionQueue: false,
      riskRadar: true,
      pipelineOverview: true,
      utilities: false,
    },
    order: ["stats", "todayFocus", "priorityPlays", "riskRadar", "pipelineOverview", "savedViews", "workspacePulse", "executionQueue", "utilities"],
    heroPrimary: "/leads?view=decision_this_week",
    heroPrimaryLabel: "Decisions due this week",
    heroSecondary: "/pipeline",
    heroSecondaryLabel: "Open pipeline",
  },
  closer: {
    label: "Sales",
    eyebrow: "Dashboard",
    description: "Focus on what moves deals forward today—tasks, follow-ups, and hot opportunities.",
    sections: {
      stats: true,
      workspacePulse: false,
      savedViews: true,
      priorityPlays: true,
      todayFocus: true,
      executionQueue: true,
      riskRadar: true,
      pipelineOverview: false,
      utilities: false,
    },
    order: ["stats", "priorityPlays", "todayFocus", "executionQueue", "savedViews", "riskRadar", "workspacePulse", "utilities"],
    heroPrimary: "/leads?view=hot_deals",
    heroPrimaryLabel: "Hot opportunities",
    heroSecondary: "/followup",
    heroSecondaryLabel: "Draft follow-up",
  },
  csm: {
    label: "Customer success",
    eyebrow: "Dashboard",
    description: "Renewals, expansion, and account health in one calm view.",
    sections: {
      stats: true,
      workspacePulse: false,
      savedViews: true,
      priorityPlays: false,
      todayFocus: true,
      executionQueue: true,
      riskRadar: false,
      pipelineOverview: true,
      utilities: false,
    },
    order: ["stats", "todayFocus", "executionQueue", "pipelineOverview", "savedViews", "workspacePulse", "priorityPlays", "riskRadar", "utilities"],
    heroPrimary: "/leads?status=Converted",
    heroPrimaryLabel: "Won accounts",
    heroSecondary: "/coach",
    heroSecondaryLabel: "Account coach",
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

function DashboardPanel({ id, children, span = "half", onDragStart, onDrop }) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(id)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => onDrop(id)}
      className={`relative group border border-white/10 rounded-2xl p-5 bg-white/[0.02] ${span === "full" ? "xl:col-span-2" : ""}`}
    >
      <div
        className="absolute top-4 right-4 z-10 cursor-grab active:cursor-grabbing text-white/20 hover:text-white/45 transition text-[10px] tracking-tighter select-none"
        title="Drag to reorder"
      >
        ⋮⋮
      </div>
      <div className="relative pr-7">{children}</div>
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
            <StatCard label="Total leads" value={stats?.leads?.total || 0} sub={`${stats?.leads?.new || 0} new this period`} />
            <StatCard label="Active pipeline" value={stats?.leads?.interested || 0} sub="In late-stage conversations" />
            <StatCard label="Closed won" value={stats?.leads?.converted || 0} sub={`${stats?.leads?.conversion_rate || 0}% win rate`} />
            <StatCard label="AI credits" value={stats?.user?.ai_credits || 0} sub="Remaining" />
          </div>
        ),
      },
      workspacePulse: {
        span: "full",
        node: (
          <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_1fr_1fr_1fr] gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="text-xs uppercase tracking-[0.18em] text-white/35 mb-2">Workspace</div>
              <div className="text-xl font-semibold">{stats?.workspace?.name || "Personal workspace"}</div>
              <div className="text-sm text-white/45 mt-2">
                {stats?.workspace?.scope === "workspace" ? "Team workspace" : "Personal"} · {stats?.workspace?.role || "owner"}
              </div>
              <div className="text-xs text-white/30 mt-3 truncate">
                {stats?.workspace?.slug ? `/${stats.workspace.slug}` : stats?.user?.email}
              </div>
            </div>
            {[
              ["Segments", stats?.workspace?.segments_live || 0, "Active segments"],
              ["Tagged leads", stats?.workspace?.tagged_leads || 0, "With tags applied"],
              ["Open deals", stats?.workspace?.open_pipeline || 0, "Not yet closed"],
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
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-base font-semibold">Pipeline by stage</div>
                <div className="text-white/40 text-sm mt-1">Share of leads in each stage.</div>
              </div>
              <button
                onClick={() => navigate("/pipeline")}
                className="text-sm px-4 py-2 border border-white/10 rounded-xl text-white/60 hover:text-white transition shrink-0"
              >
                Full board
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
            <h2 className="text-base font-semibold mb-1">Shortcuts</h2>
            <p className="text-white/40 text-sm mb-4">Quick access—full navigation stays in the sidebar.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { title: "Coach", desc: "Strategy and talk tracks", path: "/coach" },
                { title: "Follow-up", desc: "Draft next touch", path: "/followup" },
                { title: "Leads", desc: "List and filters", path: "/leads" },
                { title: "Contacts", desc: "People and accounts", path: "/contacts" },
                { title: "Email", desc: "Templates and sends", path: "/emails" },
                { title: "Reports", desc: "Activity and segments", path: "/reports" },
                { title: "Team", desc: "Members and roles", path: "/team" },
                { title: "Plans & billing", desc: "Subscription", path: "/pricing" },
              ].map((action) => (
                <button
                  key={action.title}
                  onClick={() => navigate(action.path)}
                  className="text-left flex items-start justify-between gap-2 p-3 border border-white/10 rounded-xl hover:border-white/20 transition"
                >
                  <div>
                    <div className="text-sm font-medium">{action.title}</div>
                    <div className="text-white/35 text-xs mt-0.5">{action.desc}</div>
                  </div>
                  <span className="text-white/20 text-xs shrink-0 pt-0.5">→</span>
                </button>
              ))}
            </div>

            <div className="border border-white/10 rounded-xl p-4 mt-5">
              <h3 className="text-sm font-semibold mb-1">Public lead form</h3>
              <p className="text-white/40 text-sm mb-3">Share this link so new leads land in your workspace.</p>
              <div className="flex flex-col gap-3">
                <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/55 text-xs truncate">
                  {window.location.origin}/capture/{stats?.user?.email?.split("@")[0]}
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/capture/${stats?.user?.email?.split("@")[0]}`);
                    alert("Link copied to clipboard");
                  }}
                  className="px-4 py-2 bg-white text-black text-sm font-medium rounded-xl hover:bg-white/90 transition"
                >
                  Copy link
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
        <div className="text-white/40">Loading…</div>
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
        <div className={`rounded-[28px] border border-white/10 bg-gradient-to-br from-white/[0.05] via-white/[0.02] to-transparent ${spacing.heroPadding} ${spacing.sectionGap}`}>
          <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
            <div className="min-w-0 flex-1">
              <div className="text-xs uppercase tracking-[0.18em] text-white/35 mb-2">{themeConfig.eyebrow}</div>
              <h1 className="text-2xl md:text-3xl font-semibold mb-2 tracking-tight">{greeting}, {userName}</h1>
              <p className="text-white/45 text-sm max-w-xl leading-relaxed">{themeConfig.description}</p>
              <p className="text-white/30 text-xs mt-3">
                {stats?.workspace?.name || "Workspace"} · {stats?.workspace?.role || "owner"}
              </p>
            </div>

            <div className="flex flex-col gap-3 w-full xl:w-auto xl:min-w-[320px]">
              <div className="flex flex-col gap-1">
                <label htmlFor="dashboard-layout" className="text-[11px] uppercase tracking-[0.14em] text-white/35">
                  Layout
                </label>
                <select
                  id="dashboard-layout"
                  value={workspaceMode}
                  onChange={(e) => applyMode(e.target.value)}
                  className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20"
                >
                  <option value="founder" className="bg-neutral-900">
                    Leadership — pipeline & risk
                  </option>
                  <option value="closer" className="bg-neutral-900">
                    Sales — deals & follow-up
                  </option>
                  <option value="csm" className="bg-neutral-900">
                    Customer success — accounts
                  </option>
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => navigate(themeConfig.heroPrimary)}
                  className="px-4 py-3 bg-white text-black text-sm font-medium rounded-xl hover:bg-white/90 transition text-left"
                >
                  {themeConfig.heroPrimaryLabel}
                </button>
                <button
                  type="button"
                  onClick={() => navigate(themeConfig.heroSecondary)}
                  className="px-4 py-3 border border-white/10 rounded-xl text-sm text-white/75 hover:text-white hover:border-white/20 transition text-left"
                >
                  {themeConfig.heroSecondaryLabel}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setCustomizerOpen(true)}
                className="w-full px-4 py-2.5 border border-white/10 rounded-xl text-sm text-white/60 hover:text-white hover:border-white/18 transition"
              >
                Dashboard & appearance
              </button>
            </div>
          </div>
        </div>

        {stats?.user?.ai_credits <= 5 && (
          <div className="border border-amber-500/25 bg-amber-500/[0.06] rounded-2xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="font-medium text-amber-100/95">AI credits are low</div>
              <div className="text-white/45 text-sm mt-0.5">
                {stats?.user?.ai_credits} left. Add credits so AI features keep working.
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate("/pricing")}
              className="px-4 py-2 bg-white text-black text-sm font-medium rounded-xl hover:bg-white/90 transition whitespace-nowrap self-start sm:self-auto"
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
          <div className="border border-white/10 bg-white/[0.03] rounded-2xl p-5 mt-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="font-medium text-sm">Free plan</h3>
              <p className="text-white/40 text-sm mt-1">Upgrade for more AI credits and advanced workflows.</p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/pricing")}
              className="px-5 py-2 border border-white/15 bg-white/[0.06] text-white text-sm font-medium rounded-xl hover:bg-white/10 transition w-full md:w-auto"
            >
              View plans
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
