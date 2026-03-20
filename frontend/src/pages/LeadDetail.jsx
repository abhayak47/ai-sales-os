import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../api/axios";
import Sidebar from "../components/Sidebar";

const ACTIVITY_ICONS = {
  call: "📞",
  email: "📧",
  whatsapp: "💬",
  note: "📝",
  meeting: "🤝",
  stage_change: "🔄",
};

const STATUS_COLORS = {
  New: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Contacted: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  Interested: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  Converted: "bg-green-500/10 text-green-400 border-green-500/20",
  Lost: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [activityForm, setActivityForm] = useState({
    type: "note",
    title: "",
    description: "",
  });
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState("timeline");

  useEffect(() => {
    fetchLead();
    fetchActivities();
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

  const handleAddActivity = async (e) => {
    e.preventDefault();
    try {
      await API.post("/activities/", {
        ...activityForm,
        lead_id: parseInt(id),
      });
      setActivityForm({ type: "note", title: "", description: "" });
      setShowActivityForm(false);
      fetchActivities();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteActivity = async (activityId) => {
    if (!window.confirm("Delete this activity?")) return;
    await API.delete(`/activities/${activityId}`);
    fetchActivities();
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await API.post("/ai/analyze-lead", { lead_id: parseInt(id) });
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
        lead_id: parseInt(id),
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
        <div className="text-4xl animate-pulse">⚡</div>
      </div>
    );
  }

  if (!lead) return null;

  return (
    <div className="min-h-screen bg-black text-white flex">
      <Sidebar />

      <div className="flex-1 overflow-y-auto mt-16 md:mt-0">
        {/* Header */}
        <div className="border-b border-white/10 px-4 md:px-8 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <button
                onClick={() => navigate("/leads")}
                className="text-white/30 text-sm hover:text-white transition mb-2 flex items-center gap-1"
              >
                ← Back to Leads
              </button>
              <h1 className="text-xl md:text-2xl font-bold">{lead.name}</h1>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {lead.company && (
                  <span className="text-white/40 text-sm">🏢 {lead.company}</span>
                )}
                {lead.email && (
                  <span className="text-white/40 text-sm">📧 {lead.email}</span>
                )}
                {lead.phone && (
                  <span className="text-white/40 text-sm">📱 {lead.phone}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <select
                value={lead.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className={`text-xs px-3 py-2 rounded-full border bg-transparent cursor-pointer ${STATUS_COLORS[lead.status]}`}
              >
                {["New", "Contacted", "Interested", "Converted", "Lost"].map(s => (
                  <option key={s} value={s} className="bg-black text-white">{s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="p-4 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left — Timeline */}
            <div className="md:col-span-2 space-y-4">
              {/* Tabs */}
              <div className="flex gap-2 border-b border-white/10 pb-3">
                {["timeline", "ai_brain"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      activeTab === tab
                        ? "bg-white/10 text-white"
                        : "text-white/40 hover:text-white"
                    }`}
                  >
                    {tab === "timeline" ? "📋 Timeline" : "🧠 AI Brain"}
                  </button>
                ))}
              </div>

              {/* Timeline Tab */}
              {activeTab === "timeline" && (
                <div>
                  {/* Add Activity */}
                  <button
                    onClick={() => setShowActivityForm(!showActivityForm)}
                    className="w-full py-3 border border-dashed border-white/20 rounded-xl text-white/40 hover:text-white hover:border-white/40 transition text-sm mb-4"
                  >
                    + Log Activity (call, email, note, meeting...)
                  </button>

                  {showActivityForm && (
                    <form onSubmit={handleAddActivity} className="border border-white/10 rounded-xl p-5 mb-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-white/40 mb-1 block">Type</label>
                          <select
                            value={activityForm.type}
                            onChange={(e) => setActivityForm({ ...activityForm, type: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
                          >
                            {["call", "email", "whatsapp", "note", "meeting"].map(t => (
                              <option key={t} value={t} className="bg-black capitalize">{t}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-white/40 mb-1 block">Title *</label>
                          <input
                            type="text"
                            value={activityForm.title}
                            onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
                            placeholder="e.g. Called and discussed pricing"
                            required
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none placeholder-white/20"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-white/40 mb-1 block">Notes</label>
                        <textarea
                          value={activityForm.description}
                          onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
                          placeholder="What happened? What was discussed?"
                          rows={2}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none placeholder-white/20 resize-none"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" className="px-4 py-2 bg-white text-black text-sm font-semibold rounded-lg">
                          Log Activity
                        </button>
                        <button type="button" onClick={() => setShowActivityForm(false)}
                          className="px-4 py-2 border border-white/10 rounded-lg text-white/40 text-sm">
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Activities List */}
                  {activities.length === 0 ? (
                    <div className="text-center py-12 border border-white/10 rounded-xl">
                      <div className="text-3xl mb-3">📋</div>
                      <div className="text-white/40 text-sm">No activities yet. Log your first interaction!</div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activities.map((activity) => (
                        <div key={activity.id} className="flex gap-4 border border-white/10 rounded-xl p-4 hover:border-white/20 transition">
                          <div className="text-2xl flex-shrink-0">
                            {ACTIVITY_ICONS[activity.type] || "📌"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-sm">{activity.title}</span>
                              <span className="text-white/30 text-xs flex-shrink-0">
                                {new Date(activity.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            {activity.description && (
                              <p className="text-white/50 text-sm mt-1">{activity.description}</p>
                            )}
                            <span className="text-xs text-white/30 capitalize">{activity.type}</span>
                          </div>
                          <button
                            onClick={() => handleDeleteActivity(activity.id)}
                            className="text-white/20 hover:text-red-400 transition text-sm flex-shrink-0"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* AI Brain Tab */}
              {activeTab === "ai_brain" && (
                <div>
                  {!analysis ? (
                    <div className="text-center py-12 border border-white/10 rounded-xl">
                      <div className="text-4xl mb-4">🧠</div>
                      <h3 className="font-semibold mb-2">AI Sales Brain Analysis</h3>
                      <p className="text-white/40 text-sm mb-6">
                        Get deal score, win probability, risk factors and next best action.
                      </p>
                      <button
                        onClick={handleAnalyze}
                        disabled={analyzing}
                        className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-500 transition disabled:opacity-50"
                      >
                        {analyzing ? "⚡ Analyzing..." : "🧠 Analyze This Lead (3 credits)"}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: "Deal Score", value: `${analysis.deal_score}/10` },
                          { label: "Win Rate", value: `${analysis.win_probability}%` },
                          { label: "Temperature", value: analysis.deal_temperature },
                        ].map((item, i) => (
                          <div key={i} className="border border-white/10 rounded-xl p-4 text-center">
                            <div className="text-2xl font-bold mb-1">{item.value}</div>
                            <div className="text-white/40 text-xs">{item.label}</div>
                          </div>
                        ))}
                      </div>
                      {[
                        { label: "⚡ Next Action", value: `${analysis.next_action} — ${analysis.next_action_timing}` },
                        { label: "🎯 Opportunity", value: analysis.opportunity },
                        { label: "⚠️ Risk", value: analysis.risk_factors },
                        { label: "🏆 Coach Advice", value: analysis.coach_advice },
                      ].map((item, i) => (
                        <div key={i} className="border border-white/10 rounded-xl p-4">
                          <div className="text-xs text-white/40 mb-2">{item.label}</div>
                          <div className="text-white/70 text-sm">{item.value}</div>
                        </div>
                      ))}
                      <div className="border border-purple-500/20 rounded-xl p-4">
                        <div className="text-xs text-purple-400/60 mb-2">💬 Suggested Message</div>
                        <div className="text-white/80 text-sm mb-3">{analysis.suggested_message}</div>
                        <button
                          onClick={() => navigator.clipboard.writeText(analysis.suggested_message)}
                          className="text-xs px-3 py-1 border border-purple-500/20 rounded-lg text-purple-400 hover:bg-purple-500/10 transition"
                        >
                          Copy Message
                        </button>
                      </div>
                      <button
                        onClick={() => setAnalysis(null)}
                        className="w-full py-2 border border-white/10 rounded-lg text-white/30 hover:text-white transition text-sm"
                      >
                        Re-analyze
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right — Lead Info */}
            <div className="space-y-4">
              {/* Quick Actions */}
              <div className="border border-white/10 rounded-xl p-4">
                <h3 className="text-sm font-semibold mb-3">⚡ Quick Actions</h3>
                <div className="space-y-2">
                  {[
                    { icon: "🤖", label: "Generate Follow-Up", path: "/followup" },
                    { icon: "📧", label: "Email Sequence", path: "/sequence" },
                    { icon: "🗣️", label: "Ask Sales Coach", path: "/coach" },
                  ].map((action, i) => (
                    <button
                      key={i}
                      onClick={() => navigate(action.path)}
                      className="w-full flex items-center gap-3 px-3 py-2 border border-white/10 rounded-lg hover:border-white/30 transition text-sm text-left"
                    >
                      <span>{action.icon}</span>
                      <span className="text-white/70">{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              {/* Health Score */}
<div className="border border-white/10 rounded-xl p-4">
  <h3 className="text-sm font-semibold mb-3">💚 Relationship Health</h3>
  <div className="flex items-center gap-3 mb-2">
    <div className={`text-2xl font-bold ${
      lead.health_status === "Hot" ? "text-red-400" :
      lead.health_status === "Warm" ? "text-yellow-400" :
      "text-blue-400"
    }`}>
      {lead.health_status === "Hot" ? "🔥" :
       lead.health_status === "Warm" ? "⚡" : "❄️"} {lead.health_status}
    </div>
  </div>
  <div className="w-full bg-white/10 rounded-full h-2 mb-3">
    <div
      className={`rounded-full h-2 transition-all ${
        lead.health_status === "Hot" ? "bg-red-400" :
        lead.health_status === "Warm" ? "bg-yellow-400" :
        "bg-blue-400"
      }`}
      style={{ width: `${lead.health_score || 50}%` }}
    />
  </div>
  <button
    onClick={async () => {
      try {
        await API.post(`/leads/${id}/calculate-health`);
        fetchLead();
      } catch (err) {
        console.error(err);
      }
    }}
    className="w-full text-xs py-2 border border-white/10 rounded-lg text-white/40 hover:text-white transition"
  >
    Recalculate Health
  </button>
</div>
              {/* Lead Score */}
              {lead.score > 0 && (
                <div className="border border-white/10 rounded-xl p-4">
                  <h3 className="text-sm font-semibold mb-3">📊 Lead Score</h3>
                  <div className="text-3xl font-bold mb-1">{lead.score}<span className="text-white/30 text-lg">/100</span></div>
                  <div className="w-full bg-white/10 rounded-full h-2 mt-2">
                    <div
                      className="bg-purple-500 rounded-full h-2"
                      style={{ width: `${lead.score}%` }}
                    />
                  </div>
                  {lead.predicted_revenue > 0 && (
                    <div className="mt-3 text-white/40 text-sm">
                      💰 Est. value: ₹{lead.predicted_revenue.toLocaleString()}
                    </div>
                  )}
                  {lead.follow_up_date && (
                    <div className="mt-1 text-white/40 text-sm">
                      📅 Follow up: {lead.follow_up_date}
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              {lead.notes && (
                <div className="border border-white/10 rounded-xl p-4">
                  <h3 className="text-sm font-semibold mb-2">📝 Notes</h3>
                  <p className="text-white/60 text-sm">{lead.notes}</p>
                </div>
              )}

              {/* Contact Info */}
              <div className="border border-white/10 rounded-xl p-4">
                <h3 className="text-sm font-semibold mb-3">📋 Contact Info</h3>
                <div className="space-y-2 text-sm">
                  {lead.email && (
                    <div className="flex items-center gap-2">
                      <span className="text-white/40">📧</span>
                      <a href={`mailto:${lead.email}`} className="text-blue-400 hover:underline truncate">{lead.email}</a>
                    </div>
                  )}
                  {lead.phone && (
                    <div className="flex items-center gap-2">
                      <span className="text-white/40">📱</span>
                      <a href={`tel:${lead.phone}`} className="text-white/70">{lead.phone}</a>
                    </div>
                  )}
                  {lead.company && (
                    <div className="flex items-center gap-2">
                      <span className="text-white/40">🏢</span>
                      <span className="text-white/70">{lead.company}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}