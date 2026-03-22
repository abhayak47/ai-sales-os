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

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
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

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-white/40">Loading lead room...</div>
      </div>
    );
  }

  if (!lead) return null;

  const tabs = [
    { id: "command_center", label: "Command Center" },
    { id: "execution", label: "Execution" },
    { id: "email_workspace", label: "Email Workspace" },
    { id: "collaboration", label: "Collaboration" },
    { id: "strategy_lab", label: "Strategy Lab" },
    { id: "memory", label: "Lead Memory" },
    { id: "timeline", label: "Timeline" },
    { id: "ai_brain", label: "AI Brain" },
    { id: "smart_followup", label: "Smart Follow-Up" },
  ];

  return (
    <div className="min-h-screen bg-black text-white flex">
      <Sidebar />

      <div className="flex-1 overflow-y-auto mt-16 md:mt-0">
        <div className="page-frame py-6 md:py-8">
          <div className="glass-panel rounded-[2rem] p-6 md:p-8 mb-6">
            <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6">
              <div>
                <button onClick={() => navigate("/leads")} className="text-sm text-white/40 hover:text-white transition mb-4">
                  Back to lead workspace
                </button>
                <div className="section-title mb-3">Deal Room</div>
                <h1 className="text-3xl md:text-4xl font-semibold mb-3">{lead.name}</h1>
                <div className="flex items-center gap-3 flex-wrap text-sm text-white/50">
                  {lead.company && <span>{lead.company}</span>}
                  {lead.email && <span>{lead.email}</span>}
                  {lead.phone && <span>{lead.phone}</span>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 min-w-full xl:min-w-[340px] xl:max-w-[360px]">
                <div className="metric-card p-4">
                  <div className="text-xs text-white/35 mb-1">Health</div>
                  <div className="text-2xl font-semibold">{Math.round(lead.health_score || 50)}</div>
                  <div className="text-xs text-white/40 mt-1">{lead.health_status || "Warm"}</div>
                </div>
                <div className="metric-card p-4">
                  <div className="text-xs text-white/35 mb-1">Score</div>
                  <div className="text-2xl font-semibold">{lead.score || 0}</div>
                  <div className="text-xs text-white/40 mt-1">out of 100</div>
                </div>
                <div className="metric-card p-4 col-span-2">
                  <div className="text-xs text-white/35 mb-2">Stage</div>
                  <select
                    value={lead.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className={`text-xs px-3 py-2 rounded-full border bg-transparent cursor-pointer ${STATUS_COLORS[lead.status]}`}
                  >
                    {["New", "Contacted", "Interested", "Converted", "Lost"].map((status) => (
                      <option key={status} value={status} className="bg-black text-white">
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 border-b border-white/10 pb-3 mb-6 flex-wrap">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                  activeTab === tab.id ? "bg-white/10 text-white" : "text-white/40 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "smart_followup" ? (
            <div className="max-w-4xl">
              <SmartFollowUp leadId={id} />
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
              <div className="space-y-4">
                {activeTab === "command_center" && <DealCommandCenter leadId={id} />}
                {activeTab === "execution" && <ReminderPlanner leadId={id} />}
                {activeTab === "email_workspace" && <EmailWorkspace leadId={id} />}
                {activeTab === "collaboration" && <TeamCommentsPanel leadId={id} />}
                {activeTab === "strategy_lab" && <StrategyLab leadId={id} />}
                {activeTab === "memory" && <LeadMemoryPanel leadId={id} />}

                {activeTab === "timeline" && (
                  <div className="premium-card p-5">
                    <button
                      onClick={() => setShowActivityForm(!showActivityForm)}
                      className="w-full py-3 border border-dashed border-white/20 rounded-xl text-white/45 hover:text-white hover:border-white/40 transition text-sm mb-4"
                    >
                      Log activity
                    </button>

                    {showActivityForm && (
                      <form onSubmit={handleAddActivity} className="border border-white/10 rounded-2xl p-5 mb-4 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-white/40 mb-2 block">Type</label>
                            <select
                              value={activityForm.type}
                              onChange={(e) => setActivityForm((current) => ({ ...current, type: e.target.value }))}
                              className="input-surface"
                            >
                              {["call", "email", "whatsapp", "note", "meeting"].map((type) => (
                                <option key={type} value={type} className="bg-black capitalize">
                                  {type}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-white/40 mb-2 block">Title</label>
                            <input
                              type="text"
                              value={activityForm.title}
                              onChange={(e) => setActivityForm((current) => ({ ...current, title: e.target.value }))}
                              required
                              placeholder="Discussed pricing and export fit"
                              className="input-surface"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs text-white/40 mb-2 block">Notes</label>
                          <textarea
                            value={activityForm.description}
                            onChange={(e) => setActivityForm((current) => ({ ...current, description: e.target.value }))}
                            rows={4}
                            placeholder="Capture what changed, what matters now, and what the next move should be."
                            className="input-surface resize-none"
                          />
                        </div>

                        <div className="flex gap-3">
                          <button type="submit" className="button-primary">
                            Save activity
                          </button>
                          <button type="button" onClick={() => setShowActivityForm(false)} className="button-secondary">
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}

                    {activities.length === 0 ? (
                      <div className="text-center py-12 border border-white/10 rounded-2xl">
                        <div className="text-white/40 text-sm">No timeline yet. Log the first meaningful interaction.</div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {activities.map((activity) => (
                          <div key={activity.id} className="border border-white/10 rounded-2xl p-4 hover:border-white/20 transition">
                            <div className="flex items-start gap-4">
                              <div className="px-3 py-2 rounded-xl border border-white/10 bg-white/[0.03] text-xs font-medium">
                                {ACTIVITY_ICONS[activity.type] || "Act"}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="font-medium text-sm">{activity.title}</div>
                                  <div className="text-xs text-white/35">{new Date(activity.created_at).toLocaleDateString()}</div>
                                </div>
                                {activity.description && <p className="text-sm text-white/60 mt-2 leading-7">{activity.description}</p>}
                                <div className="text-xs text-white/35 mt-2 capitalize">{activity.type}</div>
                              </div>
                              <button onClick={() => handleDeleteActivity(activity.id)} className="text-white/20 hover:text-red-300 transition text-sm">
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
                      <div className="premium-card p-8 text-center">
                        <h3 className="text-xl font-semibold mb-2">AI Brain Analysis</h3>
                        <p className="text-white/45 text-sm mb-6 max-w-xl mx-auto">
                          Get a fast read on deal quality, risk, and the highest-leverage next move based on the full lead timeline.
                        </p>
                        <button onClick={handleAnalyze} disabled={analyzing} className="button-primary disabled:opacity-50">
                          {analyzing ? "Analyzing..." : "Analyze this lead"}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {[
                            { label: "Deal Score", value: `${analysis.deal_score}/10` },
                            { label: "Win Rate", value: `${analysis.win_probability}%` },
                            { label: "Temperature", value: analysis.deal_temperature },
                          ].map((item) => (
                            <div key={item.label} className="metric-card p-4 text-center">
                              <div className="text-2xl font-semibold mb-1">{item.value}</div>
                              <div className="text-xs text-white/40">{item.label}</div>
                            </div>
                          ))}
                        </div>

                        {[
                          ["Next Action", `${analysis.next_action} · ${analysis.next_action_timing}`],
                          ["Opportunity", analysis.opportunity],
                          ["Risk", analysis.risk_factors],
                          ["Coach Advice", analysis.coach_advice],
                        ].map(([label, value]) => (
                          <div key={label} className="premium-card p-4">
                            <div className="text-xs text-white/40 mb-2">{label}</div>
                            <div className="text-sm text-white/75 leading-7">{value}</div>
                          </div>
                        ))}

                        <div className="premium-card p-4">
                          <div className="text-xs text-cyan-300 mb-2">Suggested Message</div>
                          <div className="text-sm text-white/80 leading-7 mb-3">{analysis.suggested_message}</div>
                          <button onClick={() => navigator.clipboard.writeText(analysis.suggested_message)} className="button-secondary text-sm px-3 py-2">
                            Copy
                          </button>
                        </div>

                        <button onClick={() => setAnalysis(null)} className="button-secondary w-full">
                          Re-analyze
                        </button>
                      </div>
                    )}

                    <MeetingIntel leadId={id} />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="premium-card p-5">
                  <div className="text-base font-semibold mb-4">Quick Actions</div>
                  <div className="space-y-2">
                    {[
                      { label: "Generate Follow-Up", path: "/followup" },
                      { label: "Ask Sales Coach", path: "/coach" },
                    ].map((action) => (
                      <button
                        key={action.label}
                        onClick={() => navigate(action.path)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 border border-white/10 rounded-xl hover:border-white/25 transition text-sm text-left"
                      >
                        <span>{action.label}</span>
                        <span className="text-white/25">Open</span>
                      </button>
                    ))}
                    <button
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
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 border border-white/10 rounded-xl hover:border-white/25 transition text-sm text-left"
                    >
                      <span>{convertingContact ? "Converting..." : "Convert to Contact"}</span>
                      <span className="text-white/25">Open</span>
                    </button>
                  </div>
                </div>

                <div className="premium-card p-5">
                  <div className="text-base font-semibold mb-3">Relationship Health</div>
                  <div className={`text-3xl font-semibold mb-2 ${
                    lead.health_status === "Hot" ? "text-red-300" :
                    lead.health_status === "Warm" ? "text-amber-300" : "text-blue-300"
                  }`}>
                    {lead.health_status || "Warm"}
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2 mb-3">
                    <div
                      className={`rounded-full h-2 ${
                        lead.health_status === "Hot" ? "bg-red-400" :
                        lead.health_status === "Warm" ? "bg-amber-400" : "bg-blue-400"
                      }`}
                      style={{ width: `${lead.health_score || 50}%` }}
                    />
                  </div>
                  <button
                    onClick={async () => {
                      await API.post(`/leads/${id}/calculate-health`);
                      fetchLead();
                    }}
                    className="button-secondary w-full"
                  >
                    Recalculate health
                  </button>
                </div>

                {(lead.score > 0 || lead.predicted_revenue > 0 || lead.follow_up_date) && (
                  <div className="premium-card p-5">
                    <div className="text-base font-semibold mb-3">Deal Signals</div>
                    <div className="space-y-3 text-sm text-white/65">
                      {lead.score > 0 && <div>Lead score: {lead.score}/100</div>}
                      {lead.predicted_revenue > 0 && <div>Estimated value: Rs {lead.predicted_revenue.toLocaleString()}</div>}
                      {lead.follow_up_date && <div>Suggested follow-up: {lead.follow_up_date}</div>}
                    </div>
                  </div>
                )}

                {lead.notes && (
                  <div className="premium-card p-5">
                    <div className="text-base font-semibold mb-3">Lead Notes</div>
                    <p className="text-sm text-white/65 leading-7">{lead.notes}</p>
                  </div>
                )}

                <div className="premium-card p-5">
                  <div className="text-base font-semibold mb-3">Contact Info</div>
                  <div className="space-y-2 text-sm text-white/65">
                    {lead.email && <a href={`mailto:${lead.email}`} className="block hover:underline">{lead.email}</a>}
                    {lead.phone && <a href={`tel:${lead.phone}`} className="block hover:underline">{lead.phone}</a>}
                    {lead.company && <div>{lead.company}</div>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
