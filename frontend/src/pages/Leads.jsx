import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import API from "../api/axios";
import SavedViewsPanel from "../components/SavedViewsPanel";
import Sidebar from "../components/Sidebar";

const STATUS_OPTIONS = ["All", "New", "Contacted", "Interested", "Converted", "Lost"];

const SORT_OPTIONS = [
  { value: "updated_at:desc", label: "Recently updated" },
  { value: "score:desc", label: "Highest score" },
  { value: "revenue:desc", label: "Highest revenue" },
  { value: "last_activity_at:desc", label: "Most recent activity" },
  { value: "name:asc", label: "Name A-Z" },
];

const STATUS_COLORS = {
  New: "bg-blue-500/10 text-blue-300 border-blue-500/20",
  Contacted: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  Interested: "bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/20",
  Converted: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  Lost: "bg-red-500/10 text-red-300 border-red-500/20",
};

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  company: "",
  status: "New",
  notes: "",
};

export default function Leads() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [leads, setLeads] = useState([]);
  const [summary, setSummary] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editLead, setEditLead] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [query, setQuery] = useState({
    search: "",
    status: "All",
    view: "",
    sort: "updated_at:desc",
    page: 1,
    pageSize: 25,
  });

  useEffect(() => {
    fetchLeads();
  }, [query.page, query.pageSize, query.status, query.sort, query.view]);

  useEffect(() => {
    const view = searchParams.get("view") || "";
    const status = searchParams.get("status") || "All";
    setQuery((current) => {
      if (view === current.view && status === current.status) return current;
      return { ...current, view, status, page: 1 };
    });
  }, [searchParams]);

  const fetchLeads = async (searchOverride = query.search) => {
    setLoading(true);
    try {
      const [sortBy, sortDir] = query.sort.split(":");
      const res = await API.get("/leads/", {
        params: {
          search: searchOverride || undefined,
          status: query.status === "All" ? undefined : query.status,
          view: query.view || undefined,
          sort_by: sortBy,
          sort_dir: sortDir,
          page: query.page,
          page_size: query.pageSize,
        },
      });
      setLeads(res.data.items);
      setSummary(res.data.summary);
      setMeta(res.data.meta);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateForm = () => {
    setEditLead(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editLead) {
        await API.put(`/leads/${editLead.id}`, form);
      } else {
        await API.post("/leads/", form);
      }
      setForm(EMPTY_FORM);
      setShowForm(false);
      setEditLead(null);
      fetchLeads();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (e, lead) => {
    e.stopPropagation();
    setEditLead(lead);
    setForm({
      name: lead.name,
      email: lead.email || "",
      phone: lead.phone || "",
      company: lead.company || "",
      status: lead.status,
      notes: lead.notes || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Delete this lead?")) return;
    await API.delete(`/leads/${id}`);
    fetchLeads();
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setQuery((current) => ({ ...current, page: 1 }));
    fetchLeads(query.search);
  };

  const totalPages = meta?.total_pages || 1;

  return (
    <div className="min-h-screen bg-black text-white flex">
      <Sidebar />

      <div className="flex-1 p-4 md:p-8 overflow-y-auto mt-16 md:mt-0">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-5 mb-6">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-white/35 mb-2">Lead Workspace</div>
            <h1 className="text-2xl md:text-3xl font-bold">Built for thousands of leads, not a crowded spreadsheet</h1>
            <p className="text-white/45 text-sm mt-2 max-w-3xl">
              Search fast, filter by stage, and stay focused on the leads that actually need action now.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate("/pipeline")}
              className="px-4 py-3 border border-white/10 rounded-xl text-sm text-white/70 hover:text-white transition"
            >
              Open pipeline
            </button>
            <button
              onClick={openCreateForm}
              className="px-4 py-3 bg-white text-black text-sm font-semibold rounded-xl hover:bg-white/90 transition"
            >
              Add lead
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-6 gap-3 mb-6">
          {[
            ["Total", summary?.total || 0],
            ["Needs attention", summary?.needs_attention || 0],
            ["New", summary?.new || 0],
            ["Interested", summary?.interested || 0],
            ["Converted", summary?.converted || 0],
            ["Lost", summary?.lost || 0],
          ].map(([label, value]) => (
            <div key={label} className="border border-white/10 rounded-2xl p-4 bg-white/[0.02]">
              <div className="text-xs text-white/35 mb-2">{label}</div>
              <div className="text-2xl font-bold">{value}</div>
            </div>
          ))}
        </div>

        <div className="mb-6">
          <SavedViewsPanel compact />
        </div>

        <div className="border border-white/10 rounded-2xl p-4 md:p-5 mb-6 bg-white/[0.02]">
          <div className="flex flex-col xl:flex-row gap-3">
            <form onSubmit={handleSearchSubmit} className="flex-1">
              <input
                value={query.search}
                onChange={(e) => setQuery((current) => ({ ...current, search: e.target.value }))}
                placeholder="Search by name, company, notes, email, or phone"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none"
              />
            </form>
            <select
              value={query.status}
              onChange={(e) =>
                setQuery((current) => ({
                  ...current,
                  status: e.target.value,
                  page: 1,
                  view: "",
                }))
              }
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status} className="bg-black">
                  {status === "All" ? "All stages" : status}
                </option>
              ))}
            </select>
            <select
              value={query.sort}
              onChange={(e) => setQuery((current) => ({ ...current, sort: e.target.value, page: 1 }))}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} className="bg-black">
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={query.pageSize}
              onChange={(e) => setQuery((current) => ({ ...current, pageSize: Number(e.target.value), page: 1 }))}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
            >
              {[25, 50, 100].map((size) => (
                <option key={size} value={size} className="bg-black">
                  {size} per page
                </option>
              ))}
            </select>
            {query.view && (
              <button
                onClick={() => {
                  setQuery((current) => ({ ...current, view: "", page: 1 }));
                  setSearchParams({});
                }}
                className="px-4 py-3 border border-white/10 rounded-xl text-sm text-white/60 hover:text-white transition"
              >
                Clear saved view
              </button>
            )}
          </div>
        </div>

        {showForm && (
          <div className="border border-white/10 rounded-2xl p-5 mb-6">
            <h2 className="text-base font-semibold mb-4">{editLead ? "Edit lead" : "Add new lead"}</h2>
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
                    type={field.type}
                    name={field.name}
                    value={form[field.name]}
                    onChange={(e) => setForm((current) => ({ ...current, [field.name]: e.target.value }))}
                    required={field.required}
                    placeholder={field.placeholder}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none"
                  />
                </div>
              ))}
              <div>
                <label className="text-sm text-white/60 mb-1 block">Status</label>
                <select
                  name="status"
                  value={form.status}
                  onChange={(e) => setForm((current) => ({ ...current, status: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
                >
                  {STATUS_OPTIONS.filter((item) => item !== "All").map((status) => (
                    <option key={status} value={status} className="bg-black">
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-white/60 mb-1 block">Notes</label>
                <input
                  type="text"
                  name="notes"
                  value={form.notes}
                  onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))}
                  placeholder="Any notes..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none"
                />
              </div>
              <div className="md:col-span-2 flex gap-3">
                <button type="submit" className="px-6 py-3 bg-white text-black font-semibold rounded-xl hover:bg-white/90 transition">
                  {editLead ? "Update lead" : "Add lead"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditLead(null);
                    setForm(EMPTY_FORM);
                  }}
                  className="px-6 py-3 border border-white/10 rounded-xl text-white/50 hover:text-white transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="border border-white/10 rounded-2xl overflow-hidden">
          <div className="hidden lg:grid lg:grid-cols-[2fr_1.4fr_1fr_1fr_1fr_auto] gap-4 px-5 py-4 text-xs uppercase tracking-[0.15em] text-white/35 border-b border-white/10">
            <div>Lead</div>
            <div>Company and contact</div>
            <div>Stage</div>
            <div>Health</div>
            <div>Revenue</div>
            <div>Actions</div>
          </div>

          {loading ? (
            <div className="text-white/35 text-sm text-center py-16">Loading lead workspace...</div>
          ) : leads.length === 0 ? (
            <div className="text-center py-16 px-6">
              <div className="text-lg font-semibold mb-2">No leads match this view</div>
              <div className="text-white/40 text-sm">Try a broader search or switch to another stage filter.</div>
            </div>
          ) : (
            <div>
              {leads.map((lead) => (
                <div
                  key={lead.id}
                  onClick={() => navigate(`/leads/${lead.id}`)}
                  className="grid grid-cols-1 lg:grid-cols-[2fr_1.4fr_1fr_1fr_1fr_auto] gap-4 px-5 py-4 border-b border-white/10 hover:bg-white/[0.03] transition cursor-pointer"
                >
                  <div>
                    <div className="font-medium">{lead.name}</div>
                    <div className="text-sm text-white/40 mt-1 line-clamp-2">{lead.notes || "No notes yet"}</div>
                  </div>
                  <div className="text-sm text-white/60 space-y-1">
                    <div>{lead.company || "No company"}</div>
                    <div>{lead.email || "No email"}</div>
                    <div>{lead.phone || "No phone"}</div>
                  </div>
                  <div>
                    <span className={`text-xs px-3 py-1.5 rounded-full border ${STATUS_COLORS[lead.status] || STATUS_COLORS.New}`}>
                      {lead.status}
                    </span>
                    {lead.follow_up_date && (
                      <div className="text-xs text-white/35 mt-2">Next touch: {lead.follow_up_date}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{lead.health_status || "Warm"}</div>
                    <div className="text-xs text-white/40 mt-1">
                      Health {Math.round(lead.health_score || 50)} · Relationship {lead.relationship_score || 50}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">
                      {lead.predicted_revenue ? `Rs ${Number(lead.predicted_revenue).toLocaleString()}` : "Not scored"}
                    </div>
                    <div className="text-xs text-white/40 mt-1">
                      {lead.score ? `Score ${lead.score}/100` : "AI score pending"}
                    </div>
                  </div>
                  <div className="flex lg:flex-col gap-2 justify-start">
                    <button
                      onClick={(e) => handleEdit(e, lead)}
                      className="text-xs px-3 py-2 border border-white/10 rounded-lg text-white/55 hover:text-white transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, lead.id)}
                      className="text-xs px-3 py-2 border border-red-500/20 rounded-lg text-red-300/80 hover:text-red-200 transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mt-5">
          <div className="text-sm text-white/40">
            Showing {leads.length} of {meta?.total || 0} leads
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={(meta?.page || 1) <= 1}
              onClick={() => setQuery((current) => ({ ...current, page: current.page - 1 }))}
              className="px-4 py-2 border border-white/10 rounded-xl text-sm text-white/60 disabled:opacity-30"
            >
              Previous
            </button>
            <div className="text-sm text-white/55 px-2">
              Page {meta?.page || 1} of {totalPages}
            </div>
            <button
              disabled={(meta?.page || 1) >= totalPages}
              onClick={() => setQuery((current) => ({ ...current, page: current.page + 1 }))}
              className="px-4 py-2 border border-white/10 rounded-xl text-sm text-white/60 disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
