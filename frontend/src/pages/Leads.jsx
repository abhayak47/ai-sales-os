import { useState, useEffect } from "react";
import API from "../api/axios";
import Sidebar from "../components/Sidebar";

const STATUS_COLORS = {
  New: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Contacted: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  Interested: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  Converted: "bg-green-500/10 text-green-400 border-green-500/20",
  Lost: "bg-red-500/10 text-red-400 border-red-500/20",
};

const TEMP_COLORS = {
  Cold: "text-blue-400",
  Warm: "text-yellow-400",
  Hot: "text-red-400",
};

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editLead, setEditLead] = useState(null);
  const [analyzing, setAnalyzing] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", company: "", status: "New", notes: "",
  });

  useEffect(() => { fetchLeads(); }, []);

  const fetchLeads = async () => {
    try {
      const res = await API.get("/leads/");
      setLeads(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editLead) {
        await API.put(`/leads/${editLead.id}`, form);
      } else {
        await API.post("/leads/", form);
      }
      setForm({ name: "", email: "", phone: "", company: "", status: "New", notes: "" });
      setShowForm(false);
      setEditLead(null);
      fetchLeads();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (lead) => {
    setEditLead(lead);
    setForm({
      name: lead.name, email: lead.email || "",
      phone: lead.phone || "", company: lead.company || "",
      status: lead.status, notes: lead.notes || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this lead?")) return;
    await API.delete(`/leads/${id}`);
    fetchLeads();
  };

  const handleAnalyze = async (lead) => {
    setAnalyzing(lead.id);
    setSelectedLead(lead);
    setAnalysis(null);
    try {
      const res = await API.post("/ai/analyze-lead", { lead_id: lead.id });
      setAnalysis(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzing(null);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex">
      <Sidebar />

      <div className="flex-1 p-4 md:p-8 overflow-y-auto mt-16 md:mt-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">👥 Lead Manager</h1>
            <p className="text-white/40 text-sm mt-1">Track your sales pipeline</p>
          </div>
          <button
            onClick={() => { setShowForm(true); setEditLead(null); setForm({ name: "", email: "", phone: "", company: "", status: "New", notes: "" }); }}
            className="px-4 py-2 bg-white text-black text-sm font-semibold rounded-lg hover:bg-white/90 transition"
          >
            + Add Lead
          </button>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <div className="border border-white/10 rounded-xl p-5 mb-6">
            <h2 className="text-base font-semibold mb-4">{editLead ? "Edit Lead" : "Add New Lead"}</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: "Name *", name: "name", type: "text", placeholder: "John Doe", required: true },
                { label: "Company", name: "company", type: "text", placeholder: "Acme Corp" },
                { label: "Email", name: "email", type: "email", placeholder: "john@example.com" },
                { label: "Phone", name: "phone", type: "text", placeholder: "+91 98765 43210" },
              ].map((field) => (
                <div key={field.name}>
                  <label className="text-sm text-white/60 mb-1 block">{field.label}</label>
                  <input
                    type={field.type} name={field.name} value={form[field.name]}
                    onChange={handleChange} required={field.required}
                    placeholder={field.placeholder}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition"
                  />
                </div>
              ))}
              <div>
                <label className="text-sm text-white/60 mb-1 block">Status</label>
                <select name="status" value={form.status} onChange={handleChange}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-white/30 transition">
                  {["New", "Contacted", "Interested", "Converted", "Lost"].map(s => (
                    <option key={s} value={s} className="bg-black">{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-white/60 mb-1 block">Notes</label>
                <input type="text" name="notes" value={form.notes} onChange={handleChange}
                  placeholder="Any notes..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition"
                />
              </div>
              <div className="col-span-1 md:col-span-2 flex gap-3">
                <button type="submit"
                  className="px-6 py-2 bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition">
                  {editLead ? "Update Lead" : "Add Lead"}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditLead(null); }}
                  className="px-6 py-2 border border-white/10 rounded-lg text-white/50 hover:text-white transition">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* AI Brain Analysis */}
        {analysis && selectedLead && (
          <div className="border border-purple-500/30 bg-purple-500/5 rounded-xl p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold">🧠 AI Sales Brain</h2>
                <p className="text-white/40 text-sm">{selectedLead.name}</p>
              </div>
              <button onClick={() => setAnalysis(null)} className="text-white/30 hover:text-white transition">✕</button>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: "Deal Score", value: `${analysis.deal_score}/10` },
                { label: "Win Rate", value: `${analysis.win_probability}%` },
                { label: "Temperature", value: analysis.deal_temperature, className: TEMP_COLORS[analysis.deal_temperature] },
              ].map((item, i) => (
                <div key={i} className="border border-white/10 rounded-xl p-3 text-center">
                  <div className={`text-xl font-bold mb-1 ${item.className || ""}`}>{item.value}</div>
                  <div className="text-white/40 text-xs">{item.label}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              {[
                { label: "⚡ Next Action", value: `${analysis.next_action} (${analysis.next_action_timing})` },
                { label: "🎯 Opportunity", value: analysis.opportunity },
                { label: "⚠️ Risk", value: analysis.risk_factors },
                { label: "🏆 Coach Advice", value: analysis.coach_advice },
              ].map((item, i) => (
                <div key={i} className="border border-white/10 rounded-xl p-3">
                  <div className="text-xs text-white/40 mb-1">{item.label}</div>
                  <div className="text-white/70 text-sm">{item.value}</div>
                </div>
              ))}
            </div>

            <div className="border border-purple-500/20 rounded-xl p-3">
              <div className="text-xs text-purple-400/60 mb-2">💬 Suggested Message</div>
              <div className="text-white/80 text-sm mb-2">{analysis.suggested_message}</div>
              <button onClick={() => navigator.clipboard.writeText(analysis.suggested_message)}
                className="text-xs px-3 py-1 border border-purple-500/20 rounded-lg text-purple-400 hover:bg-purple-500/10 transition">
                Copy Message
              </button>
            </div>
          </div>
        )}

        {/* Leads List */}
        {loading ? (
          <div className="text-white/40 text-center py-20">Loading leads...</div>
        ) : leads.length === 0 ? (
          <div className="text-center py-20 border border-white/10 rounded-xl">
            <div className="text-4xl mb-4">👥</div>
            <div className="text-white/40">No leads yet. Add your first lead!</div>
          </div>
        ) : (
          <div className="space-y-3">
            {leads.map((lead) => (
              <div key={lead.id} className="border border-white/10 rounded-xl p-4 hover:border-white/20 transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="font-medium">{lead.name}</span>
                      <span className={`text-xs px-2 py-1 rounded-full border ${STATUS_COLORS[lead.status]}`}>
                        {lead.status}
                      </span>
                    </div>
                    <div className="text-white/40 text-sm space-y-1">
                      {lead.company && <div>🏢 {lead.company}</div>}
                      {lead.email && <div>📧 {lead.email}</div>}
                      {lead.phone && <div>📱 {lead.phone}</div>}
                      {lead.notes && <div className="truncate">📝 {lead.notes}</div>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleAnalyze(lead)}
                      disabled={analyzing === lead.id}
                      className="text-xs px-3 py-1 border border-purple-500/30 rounded-lg text-purple-400 hover:bg-purple-500/10 transition disabled:opacity-50"
                    >
                      {analyzing === lead.id ? "⚡..." : "🧠 AI"}
                    </button>
                    <button onClick={() => handleEdit(lead)}
                      className="text-xs px-3 py-1 border border-white/10 rounded-lg text-white/50 hover:text-white transition">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(lead.id)}
                      className="text-xs px-3 py-1 border border-red-500/20 rounded-lg text-red-400/50 hover:text-red-400 transition">
                      Del
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}