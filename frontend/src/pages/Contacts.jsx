import { useEffect, useState } from "react";

import API from "../api/axios";
import Sidebar from "../components/Sidebar";
import { useTheme } from "../context/ThemeContext";

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  company: "",
  title: "",
  segment: "general",
  tagsText: "",
  notes: "",
};

export default function Contacts() {
  const { theme } = useTheme();
  const isEnterprise = theme === "enterprise";
  const [contacts, setContacts] = useState([]);
  const [query, setQuery] = useState({ search: "", segment: "All", tag: "" });
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchContacts();
  }, [query.segment, query.tag]);

  const fetchContacts = async (searchOverride = query.search) => {
    try {
      const res = await API.get("/contacts/", {
        params: {
          search: searchOverride || undefined,
          segment: query.segment === "All" ? undefined : query.segment,
          tag: query.tag || undefined,
        },
      });
      setContacts(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      tags: form.tagsText.split(",").map((item) => item.trim()).filter(Boolean),
    };
    delete payload.tagsText;
    try {
      if (editing) await API.put(`/contacts/${editing.id}`, payload);
      else await API.post("/contacts/", payload);
      setForm(EMPTY_FORM);
      setEditing(null);
      setShowForm(false);
      fetchContacts();
    } catch (err) {
      console.error(err);
    }
  };

  const primaryBtn = isEnterprise
    ? "px-4 py-2.5 rounded-lg text-sm font-medium bg-[#0b57d0] text-white hover:bg-[#0948b0] shadow-sm"
    : "button-primary";

  return (
    <div className="min-h-screen bg-black text-white flex">
      <Sidebar />
      <div className="flex-1 overflow-y-auto mt-16 md:mt-0">
        <header
          className={`px-4 py-4 md:px-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b ${
            isEnterprise ? "border-slate-200 bg-white" : "border-white/10 bg-[var(--app-panel-solid)]"
          }`}
        >
          <div>
            <div className={`text-xs uppercase tracking-[0.12em] ${isEnterprise ? "text-slate-500" : "text-white/35"}`}>Module</div>
            <h1 className={`text-xl font-semibold ${isEnterprise ? "text-slate-900" : ""}`}>Contacts</h1>
            <p className={`text-sm mt-1 max-w-xl ${isEnterprise ? "text-slate-600" : "text-white/45"}`}>
              People and accounts linked to your pipeline.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowForm(true);
              setEditing(null);
              setForm(EMPTY_FORM);
            }}
            className={primaryBtn}
          >
            Create contact
          </button>
        </header>

        <div className="p-4 md:p-8">

        <div className="premium-card p-5 mb-6">
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_200px_200px_auto] gap-3">
            <input
              value={query.search}
              onChange={(e) => setQuery((current) => ({ ...current, search: e.target.value }))}
              placeholder="Search contacts"
              className="input-surface"
            />
            <select value={query.segment} onChange={(e) => setQuery((current) => ({ ...current, segment: e.target.value }))} className="input-surface">
              {["All", "general", "inbound", "outbound", "partner", "expansion"].map((segment) => (
                <option key={segment} value={segment} className="bg-black">
                  {segment}
                </option>
              ))}
            </select>
            <input
              value={query.tag}
              onChange={(e) => setQuery((current) => ({ ...current, tag: e.target.value }))}
              placeholder="Tag filter"
              className="input-surface"
            />
            <button onClick={() => fetchContacts(query.search)} className="button-secondary">Search</button>
          </div>
        </div>

        {showForm && (
          <div className="premium-card p-5 mb-6">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                ["name", "Name *"],
                ["company", "Company"],
                ["email", "Email"],
                ["phone", "Phone"],
                ["title", "Title"],
              ].map(([name, label]) => (
                <input
                  key={name}
                  value={form[name]}
                  onChange={(e) => setForm((current) => ({ ...current, [name]: e.target.value }))}
                  placeholder={label}
                  className="input-surface"
                  required={name === "name"}
                />
              ))}
              <select value={form.segment} onChange={(e) => setForm((current) => ({ ...current, segment: e.target.value }))} className="input-surface">
                {["general", "inbound", "outbound", "partner", "expansion"].map((segment) => (
                  <option key={segment} value={segment} className="bg-black">
                    {segment}
                  </option>
                ))}
              </select>
              <input
                value={form.tagsText}
                onChange={(e) => setForm((current) => ({ ...current, tagsText: e.target.value }))}
                placeholder="Tags"
                className="input-surface"
              />
              <textarea
                value={form.notes}
                onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))}
                rows={4}
                className="input-surface resize-none md:col-span-2"
                placeholder="Notes"
              />
              <div className="md:col-span-2 flex gap-3">
                <button className="button-primary">{editing ? "Update contact" : "Save contact"}</button>
                <button type="button" className="button-secondary" onClick={() => { setShowForm(false); setEditing(null); setForm(EMPTY_FORM); }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-3">
          {contacts.map((contact) => (
            <div key={contact.id} className="premium-card p-5">
              <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
                <div>
                  <div className="font-semibold text-lg">{contact.name}</div>
                  <div className="text-sm text-white/45 mt-1">
                    {[contact.title, contact.company, contact.email, contact.phone].filter(Boolean).join(" · ")}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="px-2.5 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/10 text-cyan-200 text-xs">
                      {contact.segment || "general"}
                    </span>
                    {(contact.tags || []).map((tag) => (
                      <span key={`${contact.id}-${tag}`} className="px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.04] text-white/55 text-xs">
                        #{tag}
                      </span>
                    ))}
                  </div>
                  {contact.notes && <div className="text-sm text-white/60 mt-3 leading-7">{contact.notes}</div>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditing(contact);
                      setShowForm(true);
                      setForm({
                        name: contact.name,
                        email: contact.email || "",
                        phone: contact.phone || "",
                        company: contact.company || "",
                        title: contact.title || "",
                        segment: contact.segment || "general",
                        tagsText: (contact.tags || []).join(", "),
                        notes: contact.notes || "",
                      });
                    }}
                    className="button-secondary"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
          {contacts.length === 0 && (
          <div className={`p-12 text-center rounded-xl border ${isEnterprise ? "border-slate-200 bg-white text-slate-500" : "premium-card text-white/40"}`}>
            No contacts yet.
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
