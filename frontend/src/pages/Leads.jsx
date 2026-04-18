import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

import API from "../api/axios";
import SavedViewsPanel from "../components/SavedViewsPanel";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../context/useAuth";
import { useTheme } from "../context/useTheme";

const STATUS_OPTIONS = ["All", "New", "Contacted", "Interested", "Converted", "Lost"];
const SEGMENT_OPTIONS = ["All", "general", "inbound", "outbound", "partner", "expansion"];

const SORT_OPTIONS = [
  { value: "updated_at:desc", label: "Modified time (newest)" },
  { value: "created_at:desc", label: "Created time (newest)" },
  { value: "last_activity_at:desc", label: "Last activity" },
  { value: "score:desc", label: "Highest score" },
  { value: "revenue:desc", label: "Annual revenue" },
  { value: "name:asc", label: "Name A–Z" },
];

function fmtDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
}

function statusBadgeClass(status, isEnterprise) {
  const map = isEnterprise
    ? {
        New: "bg-blue-50 text-blue-800 border-blue-200",
        Contacted: "bg-amber-50 text-amber-900 border-amber-200",
        Interested: "bg-violet-50 text-violet-800 border-violet-200",
        Converted: "bg-emerald-50 text-emerald-800 border-emerald-200",
        Lost: "bg-red-50 text-red-800 border-red-200",
      }
    : {
        New: "bg-blue-500/10 text-blue-300 border-blue-500/20",
        Contacted: "bg-amber-500/10 text-amber-300 border-amber-500/20",
        Interested: "bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/20",
        Converted: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
        Lost: "bg-red-500/10 text-red-300 border-red-500/20",
      };
  return map[status] || map.New;
}

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  company: "",
  billing_city: "",
  billing_country: "",
  status: "New",
  segment: "general",
  tagsText: "",
  notes: "",
};

export default function Leads() {
  const navigate = useNavigate();
  const location = useLocation();
  const isCompanies = location.pathname.startsWith("/companies");

  const { user } = useAuth();
  const { theme } = useTheme();
  const isEnterprise = theme === "enterprise";
  const [searchParams, setSearchParams] = useSearchParams();
  const [leads, setLeads] = useState([]);
  const [summary, setSummary] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editLead, setEditLead] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [listView, setListView] = useState("list");

  const [query, setQuery] = useState({
    search: "",
    status: "All",
    segment: "All",
    tag: "",
    view: "",
    billing_city: "",
    billing_country: "",
    untouched_only: false,
    sort: "updated_at:desc",
    page: 1,
    pageSize: 25,
  });

  useEffect(() => {
    fetchLeads();
  }, [
    query.page,
    query.pageSize,
    query.status,
    query.segment,
    query.tag,
    query.view,
    query.billing_city,
    query.billing_country,
    query.untouched_only,
    query.sort,
  ]);

  useEffect(() => {
    const view = searchParams.get("view") || "";
    const status = searchParams.get("status") || "All";
    const segment = searchParams.get("segment") || "All";
    const tag = searchParams.get("tag") || "";
    setQuery((current) => {
      if (view === current.view && status === current.status && segment === current.segment && tag === current.tag) {
        return current;
      }
      return { ...current, view, status, segment, tag, page: 1 };
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
          segment: query.segment === "All" ? undefined : query.segment,
          tag: query.tag || undefined,
          billing_city: query.billing_city?.trim() || undefined,
          billing_country: query.billing_country?.trim() || undefined,
          untouched_only: query.untouched_only || undefined,
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
    const payload = {
      ...form,
      segment: form.segment || "general",
      tags: form.tagsText
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    };
    delete payload.tagsText;

    try {
      if (editLead) {
        await API.put(`/leads/${editLead.id}`, payload);
      } else {
        await API.post("/leads/", payload);
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
      billing_city: lead.billing_city || "",
      billing_country: lead.billing_country || "",
      status: lead.status,
      segment: lead.segment || "general",
      tagsText: (lead.tags || []).join(", "),
      notes: lead.notes || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Delete this record?")) return;
    await API.delete(`/leads/${id}`);
    fetchLeads();
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setQuery((current) => ({ ...current, page: 1 }));
    fetchLeads(query.search);
  };

  const totalPages = meta?.total_pages || 1;
  const pageNum = meta?.page || 1;
  const totalRec = meta?.total ?? 0;

  const muted = isEnterprise ? "text-slate-500" : "text-white/40";
  const sub = isEnterprise ? "text-slate-600" : "text-white/60";
  const rowHover = isEnterprise ? "hover:bg-slate-50/90" : "hover:bg-white/[0.03]";
  const border = isEnterprise ? "border-slate-200" : "border-white/10";
  const cardBg = isEnterprise ? "bg-white border border-slate-200" : "border border-white/10 bg-white/[0.02]";

  const primaryBtn = isEnterprise
    ? "px-4 py-2.5 rounded-lg text-sm font-medium bg-[#0b57d0] text-white hover:bg-[#0948b0] transition shadow-sm"
    : "px-4 py-2.5 bg-white text-black text-sm font-semibold rounded-xl hover:bg-white/90 transition";

  const secondaryBtn = isEnterprise
    ? "px-4 py-2.5 rounded-lg text-sm font-medium border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
    : "px-4 py-2.5 border border-white/10 rounded-xl text-sm text-white/70 hover:text-white transition";

  const moduleTitle = isCompanies ? "Companies" : "Leads";
  const createLabel = isCompanies ? "Create company" : "Create lead";
  const recordLabel = isCompanies ? "Company / account" : "Lead";

  const rowPrimary = (lead) => (isCompanies ? lead.company || lead.name : lead.name);
  const rowSecondary = (lead) => {
    if (isCompanies) {
      if (lead.company) return lead.name || lead.email || "—";
      return lead.email || lead.phone || "—";
    }
    return lead.company || lead.email || "—";
  };

  return (
    <div className="min-h-screen bg-black text-white flex">
      <Sidebar />

      <div className="flex-1 flex flex-col mt-16 md:mt-0 min-h-screen md:min-h-0 md:h-screen overflow-hidden">
        <header
          className={`shrink-0 px-4 py-3 md:px-6 border-b ${
            isEnterprise ? "border-slate-200 bg-white" : "border-white/10 bg-[var(--app-panel-solid)]"
          }`}
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className={`text-xs uppercase tracking-[0.12em] ${muted}`}>Module</div>
              <h1 className={`text-lg font-semibold ${isEnterprise ? "text-slate-900" : ""}`}>{moduleTitle}</h1>
              <p className={`text-sm mt-0.5 ${muted}`}>
                {isCompanies
                  ? "Accounts and organizations (same records as leads, company-first columns)."
                  : "People and opportunities in your pipeline."}{" "}
                · {user?.organization_name || "Workspace"}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-xs ${muted} hidden sm:inline`}>View:</span>
              <div className="flex rounded-lg border overflow-hidden shrink-0">
                <button
                  type="button"
                  onClick={() => setListView("list")}
                  className={`px-3 py-1.5 text-xs font-medium ${
                    listView === "list"
                      ? isEnterprise
                        ? "bg-blue-600 text-white"
                        : "bg-white/15 text-white"
                      : isEnterprise
                        ? "bg-white text-slate-600"
                        : "text-white/50"
                  }`}
                >
                  List
                </button>
                <button
                  type="button"
                  disabled
                  title="Coming soon"
                  className={`px-3 py-1.5 text-xs border-l opacity-50 cursor-not-allowed ${
                    isEnterprise ? "border-slate-200 text-slate-400" : "border-white/10 text-white/30"
                  }`}
                >
                  Kanban
                </button>
              </div>
              <button type="button" onClick={() => navigate("/pipeline")} className={secondaryBtn}>
                Pipeline
              </button>
              <button type="button" onClick={openCreateForm} className={primaryBtn}>
                {createLabel}
              </button>
            </div>
          </div>

          <form onSubmit={handleSearchSubmit} className="mt-4 flex flex-col sm:flex-row gap-2">
            <input
              value={query.search}
              onChange={(e) => setQuery((current) => ({ ...current, search: e.target.value }))}
              placeholder="Search records (name, company, email, phone, city, country, notes)…"
              className="input-surface flex-1 text-sm py-2.5"
            />
            <button type="submit" className={`${primaryBtn} whitespace-nowrap`}>
              Search
            </button>
          </form>
        </header>

        <div
          className={`shrink-0 px-4 py-2 md:px-6 flex flex-wrap gap-x-6 gap-y-1 text-sm border-b ${
            isEnterprise ? "border-slate-200 bg-slate-50 text-slate-700" : "border-white/10 text-white/55"
          }`}
        >
          {[
            ["Total", summary?.total ?? 0],
            ["Attention", summary?.needs_attention ?? 0],
            ["New", summary?.new ?? 0],
            ["Interested", summary?.interested ?? 0],
            ["Won", summary?.converted ?? 0],
            ["Lost", summary?.lost ?? 0],
          ].map(([label, value]) => (
            <span key={label}>
              <span className={muted}>{label}:</span>{" "}
              <span className={isEnterprise ? "font-semibold text-slate-900" : "font-medium text-white"}>{value}</span>
            </span>
          ))}
        </div>

        <div className="flex flex-1 flex-col lg:flex-row min-h-0 overflow-hidden">
          <aside
            className={`w-full lg:w-64 xl:w-72 shrink-0 overflow-y-auto border-b lg:border-b-0 lg:border-r p-4 space-y-4 ${
              isEnterprise ? "border-slate-200 bg-slate-50/80" : "border-white/10 bg-black/20"
            }`}
          >
            <SavedViewsPanel compact />

            <details open className={`crm-filter-panel p-4 space-y-3 ${!isEnterprise ? "bg-white/[0.02] border-white/10" : ""}`}>
              <summary className={`text-xs font-semibold uppercase tracking-wide cursor-pointer ${muted}`}>System filters</summary>
              <label className={`flex items-center gap-2 text-sm ${isEnterprise ? "text-slate-700" : ""}`}>
                <input
                  type="checkbox"
                  checked={query.untouched_only}
                  onChange={(e) => setQuery((c) => ({ ...c, untouched_only: e.target.checked, page: 1 }))}
                  className="rounded border-slate-300"
                />
                Untouched (no last activity)
              </label>
            </details>

            <div className={`crm-filter-panel p-4 space-y-4 ${!isEnterprise ? "bg-white/[0.02] border-white/10" : ""}`}>
              <div className={`text-xs font-semibold uppercase tracking-wide ${muted}`}>Filter by</div>

              <div>
                <label className={`block text-xs mb-1 ${muted}`}>Stage</label>
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
                  className="input-surface text-sm py-2"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status === "All" ? "All stages" : status}
                    </option>
                  ))}
                </select>
              </div>

              <details open className="space-y-3">
                <summary className={`text-xs font-medium cursor-pointer ${muted}`}>Fields (like Zoho)</summary>
                <div>
                  <label className={`block text-xs mb-1 ${muted}`}>Billing city</label>
                  <input
                    value={query.billing_city}
                    onChange={(e) => setQuery((c) => ({ ...c, billing_city: e.target.value, page: 1 }))}
                    placeholder="Contains…"
                    className="input-surface text-sm py-2"
                  />
                </div>
                <div>
                  <label className={`block text-xs mb-1 ${muted}`}>Billing country</label>
                  <input
                    value={query.billing_country}
                    onChange={(e) => setQuery((c) => ({ ...c, billing_country: e.target.value, page: 1 }))}
                    placeholder="Contains…"
                    className="input-surface text-sm py-2"
                  />
                </div>
              </details>

              <div>
                <label className={`block text-xs mb-1 ${muted}`}>Segment</label>
                <select
                  value={query.segment}
                  onChange={(e) =>
                    setQuery((current) => ({
                      ...current,
                      segment: e.target.value,
                      page: 1,
                      view: "",
                    }))
                  }
                  className="input-surface text-sm py-2"
                >
                  {SEGMENT_OPTIONS.map((segment) => (
                    <option key={segment} value={segment}>
                      {segment === "All" ? "All segments" : `${segment.charAt(0).toUpperCase()}${segment.slice(1)}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-xs mb-1 ${muted}`}>Tag contains</label>
                <input
                  value={query.tag}
                  onChange={(e) => setQuery((current) => ({ ...current, tag: e.target.value, page: 1, view: "" }))}
                  placeholder="e.g. enterprise"
                  className="input-surface text-sm py-2"
                />
              </div>

              <div>
                <label className={`block text-xs mb-1 ${muted}`}>Sort by</label>
                <select
                  value={query.sort}
                  onChange={(e) => setQuery((current) => ({ ...current, sort: e.target.value, page: 1 }))}
                  className="input-surface text-sm py-2"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-xs mb-1 ${muted}`}>Rows per page</label>
                <select
                  value={query.pageSize}
                  onChange={(e) => setQuery((current) => ({ ...current, pageSize: Number(e.target.value), page: 1 }))}
                  className="input-surface text-sm py-2"
                >
                  {[25, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>

              {query.view && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery((current) => ({ ...current, view: "", page: 1 }));
                    setSearchParams({});
                  }}
                  className={`w-full py-2 text-sm rounded-lg border ${isEnterprise ? "border-slate-300 text-slate-700 hover:bg-white" : "border-white/15 text-white/70 hover:bg-white/5"}`}
                >
                  Clear saved view
                </button>
              )}
            </div>
          </aside>

          <main className="flex-1 overflow-y-auto p-4 md:p-6 min-h-0">
            {listView !== "list" ? (
              <div className={`text-center py-16 text-sm ${muted}`}>Kanban view coming soon.</div>
            ) : (
              <>
                {showForm && (
                  <div className={`rounded-xl p-5 mb-6 ${cardBg}`}>
                    <h2 className={`text-base font-semibold mb-4 ${isEnterprise ? "text-slate-900" : ""}`}>
                      {editLead ? `Edit ${isCompanies ? "company" : "lead"}` : `New ${isCompanies ? "company" : "lead"}`}
                    </h2>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { label: isCompanies ? "Company / account name *" : "Name *", name: "name", type: "text", placeholder: "Required", required: true },
                        { label: "Company", name: "company", type: "text", placeholder: "Legal name" },
                        { label: "Billing city", name: "billing_city", type: "text", placeholder: "City" },
                        { label: "Billing country", name: "billing_country", type: "text", placeholder: "Country" },
                        { label: "Email", name: "email", type: "email", placeholder: "email@company.com" },
                        { label: "Phone", name: "phone", type: "text", placeholder: "+1 …" },
                      ].map((field) => (
                        <div key={field.name}>
                          <label className={`text-sm mb-1 block ${muted}`}>{field.label}</label>
                          <input
                            type={field.type}
                            name={field.name}
                            value={form[field.name]}
                            onChange={(e) => setForm((current) => ({ ...current, [field.name]: e.target.value }))}
                            required={field.required}
                            placeholder={field.placeholder}
                            className="input-surface"
                          />
                        </div>
                      ))}
                      <div>
                        <label className={`text-sm mb-1 block ${muted}`}>Stage</label>
                        <select
                          name="status"
                          value={form.status}
                          onChange={(e) => setForm((current) => ({ ...current, status: e.target.value }))}
                          className="input-surface"
                        >
                          {STATUS_OPTIONS.filter((item) => item !== "All").map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={`text-sm mb-1 block ${muted}`}>Segment</label>
                        <select
                          name="segment"
                          value={form.segment}
                          onChange={(e) => setForm((current) => ({ ...current, segment: e.target.value }))}
                          className="input-surface"
                        >
                          {SEGMENT_OPTIONS.filter((item) => item !== "All").map((segment) => (
                            <option key={segment} value={segment}>
                              {segment.charAt(0).toUpperCase()}
                              {segment.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className={`text-sm mb-1 block ${muted}`}>Notes</label>
                        <input
                          type="text"
                          name="notes"
                          value={form.notes}
                          onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))}
                          placeholder="Internal notes"
                          className="input-surface"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className={`text-sm mb-1 block ${muted}`}>Tags</label>
                        <input
                          type="text"
                          name="tagsText"
                          value={form.tagsText}
                          onChange={(e) => setForm((current) => ({ ...current, tagsText: e.target.value }))}
                          placeholder="Comma-separated"
                          className="input-surface"
                        />
                      </div>
                      <div className="md:col-span-2 flex gap-3">
                        <button type="submit" className="button-primary">
                          {editLead ? "Save changes" : "Create"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowForm(false);
                            setEditLead(null);
                            setForm(EMPTY_FORM);
                          }}
                          className="button-secondary"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="crm-table-wrap crm-table-scroll">
                  <div className="crm-table-header">
                    <div>{recordLabel}</div>
                    <div>Created</div>
                    <div>Modified</div>
                    <div>City</div>
                    <div>Country</div>
                    <div>Annual revenue</div>
                    <div>Last activity</div>
                    <div>Rating</div>
                    <div>Owner</div>
                    <div className="text-right">Actions</div>
                  </div>

                  {loading ? (
                    <div className={`text-center py-16 text-sm ${muted}`}>Loading records…</div>
                  ) : leads.length === 0 ? (
                    <div className="text-center py-16 px-6 min-w-[320px]">
                      <div className={`font-medium mb-1 ${isEnterprise ? "text-slate-800" : ""}`}>No records in this view</div>
                      <div className={`text-sm ${muted}`}>Adjust filters or create a record. Set billing city/country in the form.</div>
                    </div>
                  ) : (
                    <div>
                      {leads.map((lead) => (
                        <div
                          key={lead.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => navigate(`/leads/${lead.id}`)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              navigate(`/leads/${lead.id}`);
                            }
                          }}
                          className={`crm-table-row border-b ${border} ${rowHover} transition cursor-pointer text-left`}
                        >
                          <div>
                            <div className={`font-medium ${isEnterprise ? "text-slate-900" : ""}`}>{rowPrimary(lead)}</div>
                            <div className={`text-xs mt-0.5 ${muted}`}>{rowSecondary(lead)}</div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded border ${
                                  isEnterprise ? "border-slate-200 text-slate-600" : "border-white/10 text-white/45"
                                }`}
                              >
                                {lead.segment || "general"}
                              </span>
                            </div>
                          </div>
                          <div className={`text-xs ${sub}`}>{fmtDate(lead.created_at)}</div>
                          <div className={`text-xs ${sub}`}>{fmtDate(lead.updated_at)}</div>
                          <div className={`text-xs ${sub}`}>{lead.billing_city || "—"}</div>
                          <div className={`text-xs ${sub}`}>{lead.billing_country || "—"}</div>
                          <div className={`text-xs font-medium ${isEnterprise ? "text-slate-800" : ""}`}>
                            {lead.predicted_revenue ? `₹ ${Number(lead.predicted_revenue).toLocaleString()}` : "—"}
                          </div>
                          <div className={`text-xs ${sub}`}>{fmtDate(lead.last_activity_at)}</div>
                          <div>
                            <span className={`text-[10px] px-2 py-0.5 rounded border inline-block ${statusBadgeClass(lead.status, isEnterprise)}`}>
                              {lead.health_status || "Warm"}
                            </span>
                          </div>
                          <div className={`text-xs ${sub} truncate`} title={lead.owner_name}>
                            {lead.owner_name || "—"}
                          </div>
                          <div className="flex flex-col gap-1 justify-end items-end" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={(e) => handleEdit(e, lead)}
                              className={`text-[10px] px-2 py-1 rounded border ${
                                isEnterprise ? "border-slate-300 text-slate-700 hover:bg-slate-50" : "border-white/10 text-white/55 hover:text-white"
                              }`}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDelete(e, lead.id)}
                              className={`text-[10px] px-2 py-1 rounded border ${
                                isEnterprise ? "border-red-200 text-red-700 hover:bg-red-50" : "border-red-500/20 text-red-300/80"
                              }`}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 text-sm ${muted}`}>
                  <div>
                    Total records: <span className={isEnterprise ? "text-slate-800 font-medium" : "text-white/70"}>{totalRec}</span>
                    {leads.length > 0 && totalRec > 0 && (
                      <span className="ml-2">
                        Showing {(pageNum - 1) * query.pageSize + 1}–{Math.min(pageNum * query.pageSize, totalRec)} of {totalRec}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={(meta?.page || 1) <= 1}
                      onClick={() => setQuery((current) => ({ ...current, page: current.page - 1 }))}
                      className={`px-3 py-1.5 rounded-lg text-sm border disabled:opacity-40 ${
                        isEnterprise ? "border-slate-300 text-slate-700" : "border-white/10 text-white/60"
                      }`}
                    >
                      Previous
                    </button>
                    <span className="px-2">
                      Page {meta?.page || 1} / {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={(meta?.page || 1) >= totalPages}
                      onClick={() => setQuery((current) => ({ ...current, page: current.page + 1 }))}
                      className={`px-3 py-1.5 rounded-lg text-sm border disabled:opacity-40 ${
                        isEnterprise ? "border-slate-300 text-slate-700" : "border-white/10 text-white/60"
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
