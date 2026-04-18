import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import API from "../api/axios";
import DealCommandCenter from "../components/DealCommandCenter";
import EmailWorkspace from "../components/EmailWorkspace";
import LeadMemoryPanel from "../components/LeadMemoryPanel";
import MeetingIntel from "../components/MeetingIntel";
import ReminderPlanner from "../components/ReminderPlanner";
import Sidebar from "../components/Sidebar";
import SmartFollowUp from "../components/SmartFollowUp";
import StrategyLab from "../components/StrategyLab";
import TeamCommentsPanel from "../components/TeamCommentsPanel";
import { useTheme } from "../context/useTheme";

const ACTIVITY_ICONS = {
  call: "Call",
  email: "Email",
  whatsapp: "WA",
  note: "Note",
  meeting: "Meet",
  stage_change: "Stage",
};

const STATUS_COLORS = {
  New: "bg-blue-500/10 text-blue-300 border-blue-500/20",
  Contacted: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  Interested: "bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/20",
  Converted: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  Lost: "bg-red-500/10 text-red-300 border-red-500/20",
};

const STATUS_COLORS_ENT = {
  New: "bg-blue-50 text-blue-900 border-blue-200",
  Contacted: "bg-amber-50 text-amber-900 border-amber-200",
  Interested: "bg-violet-50 text-violet-900 border-violet-200",
  Converted: "bg-emerald-50 text-emerald-900 border-emerald-200",
  Lost: "bg-red-50 text-red-900 border-red-200",
};

const RECORD_SECTIONS = [
  { id: "command_center", label: "Overview" },
  { id: "execution", label: "Tasks & reminders" },
  { id: "email_workspace", label: "Email" },
  { id: "collaboration", label: "Team" },
  { id: "strategy_lab", label: "Strategy" },
  { id: "memory", label: "Memory" },
  { id: "ai_brain", label: "Insights" },
  { id: "smart_followup", label: "Follow-up" },
  { id: "timeline", label: "Timeline" },
];

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isEnterprise = theme === "enterprise";

  const [lead, setLead] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [activityForm, setActivityForm] = useState({ type: "note", title: "", description: "" });
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState("command_center");
  const [convertingContact, setConvertingContact] = useState(false);

  useEffect(() => {
    fetchLead();
    fetchActivities();
    hydrateSavedAnalysis();
  }, [id]);

  const fetchLead = async () => {
    try {
      const res = await API.get(`/leads/${id}`);
      setLead(res.data);
    } catch (err) {
      if (err.response?.status === 404) navigate("/leads");
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async () => {
    try {
      const res = await API.get(`/activities/lead/${id}`);
      setActivities(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const hydrateSavedAnalysis = async () => {
    try {
      const res = await API.get(`/memory/artifacts/${id}`, {
        params: { artifact_type: "lead_analysis", limit: 1 },
      });
      if (res.data?.[0]?.payload) setAnalysis(res.data[0].payload);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddActivity = async (e) => {
    e.preventDefault();
    try {
      await API.post("/activities/", { ...activityForm, lead_id: Number(id) });
      setActivityForm({ type: "note", title: "", description: "" });
      setShowActivityForm(false);
      fetchActivities();
      fetchLead();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteActivity = async (activityId) => {
    if (!window.confirm("Delete this activity?")) return;
    await API.delete(`/activities/${activityId}`);
    fetchActivities();
    fetchLead();
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await API.post("/ai/analyze-lead", { lead_id: Number(id) });
      setAnalysis(res.data);
    } catch (err) {
      alert(err.response?.data?.detail || "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await API.put(`/leads/${id}`, { status: newStatus });
      await API.post("/activities/", {
        lead_id: Number(id),
        type: "stage_change",
        title: `Status changed to ${newStatus}`,
        description: `Lead moved from ${lead.status} to ${newStatus}`,
      });
      fetchLead();
      fetchActivities();
    } catch (err) {
      console.error(err);
    }
  };

  const statusStyle = (s) => (isEnterprise ? STATUS_COLORS_ENT[s] || STATUS_COLORS_ENT.New : STATUS_COLORS[s] || STATUS_COLORS.New);

  const muted = isEnterprise ? "text-slate-500" : "text-white/40";
  const sub = isEnterprise ? "text-slate-600" : "text-white/60";
  const card = isEnterprise ? "border border-slate-200 bg-white rounded-xl shadow-sm" : "premium-card";
  const borderLight = isEnterprise ? "border-slate-200" : "border-white/10";

  const primaryHeaderBtn = isEnterprise
    ? "px-4 py-2 rounded-lg text-sm font-medium bg-[#0b57d0] text-white hover:bg-[#0948b0] shadow-sm"
    : "button-primary text-sm px-4 py-2";

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className={muted}>Loading…</div>
      </div>
    );
  }

  if (!lead) return null;

  const mainContent = (
    <>
      {activeTab === "command_center" && <DealCommandCenter leadId={id} />}
      {activeTab === "execution" && <ReminderPlanner leadId={id} />}
      {activeTab === "email_workspace" && <EmailWorkspace leadId={id} />}
      {activeTab === "collaboration" && <TeamCommentsPanel leadId={id} />}
      {activeTab === "strategy_lab" && <StrategyLab leadId={id} />}
      {activeTab === "memory" && <LeadMemoryPanel leadId={id} />}

      {activeTab === "timeline" && (
        <div className={`${card} p-5`}>
          <button
            type="button"
            onClick={() => setShowActivityForm(!showActivityForm)}
            className={`w-full py-3 border border-dashed rounded-xl text-sm mb-4 transition ${
              isEnterprise ? "border-slate-300 text-slate-500 hover:border-slate-400 hover:text-slate-800" : "border-white/20 text-white/45 hover:text-white hover:border-white/40"
            }`}
          >
            Log activity
          </button>

          {showActivityForm && (
            <form onSubmit={handleAddActivity} className={`border rounded-xl p-5 mb-4 space-y-3 ${borderLight}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs mb-2 block ${muted}`}>Type</label>
                  <select
                    value={activityForm.type}
                    onChange={(e) => setActivityForm((current) => ({ ...current, type: e.target.value }))}
                    className="input-surface"
                  >
                    {["call", "email", "whatsapp", "note", "meeting"].map((type) => (
                      <option key={type} value={type} className="capitalize">
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`text-xs mb-2 block ${muted}`}>Title</label>
                  <input
                    type="text"
                    value={activityForm.title}
                    onChange={(e) => setActivityForm((current) => ({ ...current, title: e.target.value }))}
                    required
                    placeholder="Call summary"
                    className="input-surface"
                  />
                </div>
              </div>

              <div>
                <label className={`text-xs mb-2 block ${muted}`}>Notes</label>
                <textarea
                  value={activityForm.description}
                  onChange={(e) => setActivityForm((current) => ({ ...current, description: e.target.value }))}
                  rows={4}
                  placeholder="What happened and what’s next?"
                  className="input-surface resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button type="submit" className="button-primary">
                  Save
                </button>
                <button type="button" onClick={() => setShowActivityForm(false)} className="button-secondary">
                  Cancel
                </button>
              </div>
            </form>
          )}

          {activities.length === 0 ? (
            <div className={`text-center py-12 border rounded-xl ${borderLight}`}>
              <div className={`text-sm ${muted}`}>No activity yet.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => (
                <div key={activity.id} className={`border rounded-xl p-4 transition ${borderLight} ${isEnterprise ? "hover:bg-slate-50" : "hover:border-white/20"}`}>
                  <div className="flex items-start gap-4">
                    <div className={`px-3 py-2 rounded-lg border text-xs font-medium ${isEnterprise ? "border-slate-200 bg-slate-50 text-slate-700" : "border-white/10 bg-white/[0.03]"}`}>
                      {ACTIVITY_ICONS[activity.type] || "Act"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <div className={`font-medium text-sm ${isEnterprise ? "text-slate-900" : ""}`}>{activity.title}</div>
                        <div className={`text-xs ${muted}`}>{new Date(activity.created_at).toLocaleDateString()}</div>
                      </div>
                      {activity.description && <p className={`text-sm mt-2 leading-7 ${sub}`}>{activity.description}</p>}
                      <div className={`text-xs mt-2 capitalize ${muted}`}>{activity.type}</div>
                    </div>
                    <button type="button" onClick={() => handleDeleteActivity(activity.id)} className={`text-sm ${muted} hover:text-red-600`}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "ai_brain" && (
        <div className="space-y-4">
          {!analysis ? (
            <div className={`${card} p-8 text-center`}>
              <h3 className={`text-xl font-semibold mb-2 ${isEnterprise ? "text-slate-900" : ""}`}>Deal insights</h3>
              <p className={`text-sm mb-6 max-w-xl mx-auto ${muted}`}>AI summary of fit, risk, and suggested next steps.</p>
              <button type="button" onClick={handleAnalyze} disabled={analyzing} className="button-primary disabled:opacity-50">
                {analyzing ? "Analyzing…" : "Run analysis"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { label: "Deal score", value: `${analysis.deal_score}/10` },
                  { label: "Win probability", value: `${analysis.win_probability}%` },
                  { label: "Temperature", value: analysis.deal_temperature },
                ].map((item) => (
                  <div key={item.label} className={`metric-card p-4 text-center ${isEnterprise ? "bg-white border border-slate-200" : ""}`}>
                    <div className={`text-2xl font-semibold mb-1 ${isEnterprise ? "text-slate-900" : ""}`}>{item.value}</div>
                    <div className={`text-xs ${muted}`}>{item.label}</div>
                  </div>
                ))}
              </div>

              {[
                ["Next action", `${analysis.next_action} · ${analysis.next_action_timing}`],
                ["Opportunity", analysis.opportunity],
                ["Risk", analysis.risk_factors],
                ["Coaching", analysis.coach_advice],
              ].map(([label, value]) => (
                <div key={label} className={`${card} p-4`}>
                  <div className={`text-xs mb-2 ${muted}`}>{label}</div>
                  <div className={`text-sm leading-7 ${isEnterprise ? "text-slate-700" : "text-white/75"}`}>{value}</div>
                </div>
              ))}

              <div className={`${card} p-4`}>
                <div className={`text-xs mb-2 ${isEnterprise ? "text-blue-700" : "text-cyan-300"}`}>Suggested message</div>
                <div className={`text-sm leading-7 mb-3 ${isEnterprise ? "text-slate-800" : "text-white/80"}`}>{analysis.suggested_message}</div>
                <button type="button" onClick={() => navigator.clipboard.writeText(analysis.suggested_message)} className="button-secondary text-sm px-3 py-2">
                  Copy
                </button>
              </div>

              <button type="button" onClick={() => setAnalysis(null)} className="button-secondary w-full">
                Clear & re-run
              </button>
            </div>
          )}

          <MeetingIntel leadId={id} />
        </div>
      )}
    </>
  );

  const sidebarWidgets = (
    <div className="space-y-4">
      <div className={`${card} p-5`}>
        <div className={`text-base font-semibold mb-4 ${isEnterprise ? "text-slate-900" : ""}`}>Quick actions</div>
        <div className="space-y-2">
          {lead.email && (
            <a href={`mailto:${lead.email}`} className={`${primaryHeaderBtn} w-full text-center block`}>
              Send email
            </a>
          )}
          {[
            { label: "Open follow-up", path: "/followup" },
            { label: "Sales coach", path: "/coach" },
          ].map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => navigate(action.path)}
              className={`w-full flex items-center justify-between gap-3 px-4 py-3 border rounded-xl transition text-sm text-left ${
                isEnterprise ? "border-slate-200 hover:bg-slate-50 text-slate-800" : "border-white/10 hover:border-white/25"
              }`}
            >
              <span>{action.label}</span>
              <span className={muted}>→</span>
            </button>
          ))}
          <button
            type="button"
            onClick={async () => {
              setConvertingContact(true);
              try {
                await API.post(`/contacts/from-lead/${id}`);
                navigate("/contacts");
              } catch (err) {
                alert(err.response?.data?.detail || "Could not convert to contact");
              } finally {
                setConvertingContact(false);
              }
            }}
            className={`w-full flex items-center justify-between gap-3 px-4 py-3 border rounded-xl transition text-sm text-left ${
              isEnterprise ? "border-slate-200 hover:bg-slate-50 text-slate-800" : "border-white/10 hover:border-white/25"
            }`}
          >
            <span>{convertingContact ? "Saving…" : "Save as contact"}</span>
            <span className={muted}>→</span>
          </button>
        </div>
      </div>

      <div className={`${card} p-5`}>
        <div className={`text-base font-semibold mb-3 ${isEnterprise ? "text-slate-900" : ""}`}>Health</div>
        <div
          className={`text-3xl font-semibold mb-2 ${
            lead.health_status === "Hot" ? "text-red-600" : lead.health_status === "Warm" ? "text-amber-600" : isEnterprise ? "text-blue-700" : "text-blue-300"
          }`}
        >
          {lead.health_status || "Warm"}
        </div>
        <div className={`w-full rounded-full h-2 mb-3 ${isEnterprise ? "bg-slate-200" : "bg-white/10"}`}>
          <div
            className={`rounded-full h-2 ${lead.health_status === "Hot" ? "bg-red-500" : lead.health_status === "Warm" ? "bg-amber-500" : "bg-blue-500"}`}
            style={{ width: `${lead.health_score || 50}%` }}
          />
        </div>
        <button
          type="button"
          onClick={async () => {
            await API.post(`/leads/${id}/calculate-health`);
            fetchLead();
          }}
          className="button-secondary w-full"
        >
          Recalculate
        </button>
      </div>

      {(lead.score > 0 || lead.predicted_revenue > 0 || lead.follow_up_date) && (
        <div className={`${card} p-5`}>
          <div className={`text-base font-semibold mb-3 ${isEnterprise ? "text-slate-900" : ""}`}>Signals</div>
          <div className={`space-y-3 text-sm ${sub}`}>
            {lead.score > 0 && <div>Score: {lead.score}/100</div>}
            {lead.predicted_revenue > 0 && <div>Est. value: ₹ {lead.predicted_revenue.toLocaleString()}</div>}
            {lead.follow_up_date && <div>Follow-up: {lead.follow_up_date}</div>}
          </div>
        </div>
      )}

      {lead.notes && (
        <div className={`${card} p-5`}>
          <div className={`text-base font-semibold mb-3 ${isEnterprise ? "text-slate-900" : ""}`}>Notes</div>
          <p className={`text-sm leading-7 ${sub}`}>{lead.notes}</p>
        </div>
      )}

      <div className={`${card} p-5`}>
        <div className={`text-base font-semibold mb-3 ${isEnterprise ? "text-slate-900" : ""}`}>Contact</div>
        <div className={`space-y-2 text-sm ${sub}`}>
          {lead.email && (
            <a href={`mailto:${lead.email}`} className={`block hover:underline ${isEnterprise ? "text-blue-700" : ""}`}>
              {lead.email}
            </a>
          )}
          {lead.phone && (
            <a href={`tel:${lead.phone}`} className="block hover:underline">
              {lead.phone}
            </a>
          )}
          {lead.company && <div>{lead.company}</div>}
          {(lead.billing_city || lead.billing_country) && (
            <div>
              {[lead.billing_city, lead.billing_country].filter(Boolean).join(", ")}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white flex">
      <Sidebar />

      <div className="flex-1 flex flex-col mt-16 md:mt-0 min-h-screen md:min-h-0 md:h-screen overflow-hidden">
        <header className={`shrink-0 border-b px-4 py-4 md:px-6 ${isEnterprise ? "border-slate-200 bg-white" : "border-white/10 bg-[var(--app-panel-solid)]"}`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => navigate("/leads")}
                className={`text-sm mb-2 hover:underline ${isEnterprise ? "text-blue-700" : "text-white/40 hover:text-white"}`}
              >
                Leads
              </button>
              <span className={`text-sm mx-2 ${muted}`}>/</span>
              <span className={`text-sm ${muted}`}>Record</span>
              <h1 className={`text-2xl md:text-3xl font-semibold mt-2 truncate ${isEnterprise ? "text-slate-900" : ""}`}>{lead.name}</h1>
              <div className={`flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm ${sub}`}>
                {lead.company && <span>{lead.company}</span>}
                {lead.email && <span>{lead.email}</span>}
                {lead.phone && <span>{lead.phone}</span>}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {lead.email && (
                <a href={`mailto:${lead.email}`} className={primaryHeaderBtn}>
                  Send email
                </a>
              )}
              <div className="flex items-center gap-2">
                <span className={`text-xs uppercase tracking-wide ${muted}`}>Stage</span>
                <select
                  value={lead.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className={`text-sm px-3 py-2 rounded-lg border cursor-pointer ${statusStyle(lead.status)} ${isEnterprise ? "bg-white" : "bg-transparent"}`}
                >
                  {["New", "Contacted", "Interested", "Converted", "Lost"].map((status) => (
                    <option key={status} value={status} className={isEnterprise ? "bg-white text-slate-900" : "bg-black text-white"}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              <div className={`flex gap-4 text-sm ${muted}`}>
                <div>
                  <div className="text-[10px] uppercase tracking-wide">Health</div>
                  <div className={isEnterprise ? "font-semibold text-slate-900" : "font-medium text-white"}>{Math.round(lead.health_score || 50)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wide">Score</div>
                  <div className={isEnterprise ? "font-semibold text-slate-900" : "font-medium text-white"}>{lead.score || 0}</div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="lg:hidden shrink-0 px-4 py-2 border-b border-[var(--app-border)] bg-[var(--app-bg-alt)]">
          <label className={`text-xs ${muted} block mb-1`}>Section</label>
          <select value={activeTab} onChange={(e) => setActiveTab(e.target.value)} className="input-surface text-sm py-2 w-full">
            {RECORD_SECTIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          <aside
            className={`crm-record-nav hidden lg:flex w-56 xl:w-60 shrink-0 flex-col border-r overflow-y-auto py-4 ${
              isEnterprise ? "border-slate-200 bg-slate-50" : "border-white/10 bg-black/20"
            }`}
          >
            <div className={`px-4 pb-2 text-[11px] font-semibold uppercase tracking-wide ${muted}`}>Related</div>
            <nav className="flex flex-col gap-0.5 px-2">
              {RECORD_SECTIONS.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveTab(section.id)}
                  className={`text-left px-3 py-2.5 rounded-lg text-sm transition border-l-[3px] border-transparent ${
                    activeTab === section.id
                      ? isEnterprise
                        ? "bg-blue-50 text-blue-800 font-semibold border-l-blue-600"
                        : "bg-white/10 text-white border-l-white/40"
                      : isEnterprise
                        ? "text-slate-700 hover:bg-white"
                        : "text-white/55 hover:bg-white/5"
                  }`}
                >
                  {section.label}
                </button>
              ))}
            </nav>
          </aside>

          <div className="flex-1 overflow-y-auto min-w-0">
            <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
              {activeTab === "smart_followup" ? (
                <div className="max-w-4xl">
                  <SmartFollowUp leadId={id} />
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6">
                  <div className="space-y-4 min-w-0">{mainContent}</div>
                  <div className="space-y-4 xl:sticky xl:top-4 xl:self-start">{sidebarWidgets}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
