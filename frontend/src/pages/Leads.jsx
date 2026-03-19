import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";

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
  const navigate = useNavigate();
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
      {/* Sidebar */}
      <div className="w-64 border-r border-white/10 p-6 flex flex-col">
        <div className="text-xl font-bold mb-10">⚡ AI Sales OS</div>
        <nav className="flex flex-col gap-1 flex-1">
          {[
            { icon: "🏠", label: "Dashboard", path: "/dashboard" },
            { icon: "🤖", label: "AI Follow-Up", path: "/followup" },
            { icon: "👥", label: "Leads", path: "/leads" },
            { icon: "📊", label: "Analytics", path: "/dashboard" },
            { icon: "⚙️", label: "Settings", path: "/dashboard" },
          ].map((item, i) => (
            <button
              key={i}
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition text-left
                ${i === 2 ? "bg-white/10 text-white" : "text-white/50 hover:text-white hover:bg-white/5"}`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <button
          onClick={() => { localStorage.removeItem("token"); navigate("/"); }}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-white/40 hover:text-white hover:bg-white/5 transition"
        >
          <span>🚪</span><span>Logout</span>
        </button>
      </div>

      {/* Main */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">👥 Lead Manager</h1>
            <p className="text-white/40 text-sm mt-1">Track and manage your sales pipeline</p>
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
          <div className="border border-white/10 rounded-xl p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4">{editLead ? "Edit Lead" : "Add New Lead"}</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
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
              <div className="col-span-2 flex gap-3">
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

        {/* AI Brain Analysis Panel */}
        {analysis && selectedLead && (
          <div className="border border-purple-500/30 bg-purple-500/5 rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold">🧠 AI Sales Brain Analysis</h2>
                <p className="text-white/40 text-sm">Analysis for {selectedLead.name}</p>
              </div>
              <button onClick={() => setAnalysis(null)}
                className="text-white/30 hover:text-white transition text-xl">✕</button>
            </div>

            {/* Score Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="border border-white/10 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-white mb-1">
                  {analysis.deal_score}<span className="text-white/30 text-lg">/10</span>
                </div>
                <div className="text-white/40 text-sm">Deal Score</div>
              </div>
              <div className="border border-white/10 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-white mb-1">
                  {analysis.win_probability}<span className="text-white/30 text-lg">%</span>
                </div>
                <div className="text-white/40 text-sm">Win Probability</div>
              </div>
              <div className="border border-white/10 rounded-xl p-4 text-center">
                <div className={`text-3xl font-bold mb-1 ${TEMP_COLORS[analysis.deal_temperature]}`}>
                  {analysis.deal_temperature === "Hot" ? "🔥" : analysis.deal_temperature === "Warm" ? "⚡" : "❄️"}
                  {" "}{analysis.deal_temperature}
                </div>
                <div className="text-white/40 text-sm">Deal Temperature</div>
              </div>
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="border border-white/10 rounded-xl p-4">
                <div className="text-xs text-white/40 mb-2 uppercase tracking-wider">⚡ Next Action</div>
                <div className="text-white font-medium">{analysis.next_action}</div>
                <div className="text-white/40 text-sm mt-1">📅 {analysis.next_action_timing}</div>
              </div>
              <div className="border border-white/10 rounded-xl p-4">
                <div className="text-xs text-white/40 mb-2 uppercase tracking-wider">🎯 Opportunity</div>
                <div className="text-white/70 text-sm">{analysis.opportunity}</div>
              </div>
              <div className="border border-white/10 rounded-xl p-4">
                <div className="text-xs text-red-400/60 mb-2 uppercase tracking-wider">⚠️ Risk Factors</div>
                <div className="text-white/70 text-sm">{analysis.risk_factors}</div>
              </div>
              <div className="border border-white/10 rounded-xl p-4">
                <div className="text-xs text-green-400/60 mb-2 uppercase tracking-wider">🏆 Coach Advice</div>
                <div className="text-white/70 text-sm">{analysis.coach_advice}</div>
              </div>
            </div>

            {/* Suggested Message */}
            <div className="border border-purple-500/20 rounded-xl p-4">
              <div className="text-xs text-purple-400/60 mb-2 uppercase tracking-wider">💬 AI Suggested Message</div>
              <div className="text-white/80 text-sm">{analysis.suggested_message}</div>
              <button
                onClick={() => navigator.clipboard.writeText(analysis.suggested_message)}
                className="mt-3 text-xs px-3 py-1 border border-purple-500/20 rounded-lg text-purple-400 hover:bg-purple-500/10 transition"
              >
                Copy Message
              </button>
            </div>
          </div>
        )}

        {/* Leads Table */}
        {loading ? (
          <div className="text-white/40 text-center py-20">Loading leads...</div>
        ) : leads.length === 0 ? (
          <div className="text-center py-20 border border-white/10 rounded-xl">
            <div className="text-4xl mb-4">👥</div>
            <div className="text-white/40">No leads yet. Add your first lead!</div>
          </div>
        ) : (
          <div className="border border-white/10 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 text-white/40 text-sm">
                  <th className="text-left px-6 py-4">Name</th>
                  <th className="text-left px-6 py-4">Company</th>
                  <th className="text-left px-6 py-4">Contact</th>
                  <th className="text-left px-6 py-4">Status</th>
                  <th className="text-left px-6 py-4">Notes</th>
                  <th className="text-left px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead, i) => (
                  <tr key={lead.id}
                    className="border-b border-white/5 hover:bg-white/3 transition">
                    <td className="px-6 py-4 font-medium">{lead.name}</td>
                    <td className="px-6 py-4 text-white/50">{lead.company || "—"}</td>
                    <td className="px-6 py-4 text-white/50 text-sm">
                      <div>{lead.email || "—"}</div>
                      <div>{lead.phone || "—"}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-3 py-1 rounded-full border ${STATUS_COLORS[lead.status]}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-white/50 text-sm max-w-xs truncate">
                      {lead.notes || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAnalyze(lead)}
                          disabled={analyzing === lead.id}
                          className="text-xs px-3 py-1 border border-purple-500/30 rounded-lg text-purple-400 hover:bg-purple-500/10 transition disabled:opacity-50"
                        >
                          {analyzing === lead.id ? "⚡ Analyzing..." : "🧠 AI Brain"}
                        </button>
                        <button onClick={() => handleEdit(lead)}
                          className="text-xs px-3 py-1 border border-white/10 rounded-lg text-white/50 hover:text-white hover:border-white/30 transition">
                          Edit
                        </button>
                        <button onClick={() => handleDelete(lead.id)}
                          className="text-xs px-3 py-1 border border-red-500/20 rounded-lg text-red-400/50 hover:text-red-400 transition">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}