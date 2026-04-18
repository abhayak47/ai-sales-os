import { useEffect, useMemo, useState } from "react";

import API from "../api/axios";
import Sidebar from "../components/Sidebar";

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

function buildInitials(name) {
  return (name || "AA")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase())
    .join("");
}

function ContactEditor({ form, setForm, editing, onSubmit, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/72 p-4 backdrop-blur-sm">
      <div className="premium-card fade-rise w-full max-w-2xl p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="text-xl font-semibold text-white">{editing ? "Edit contact" : "Add contact"}</div>
            <div className="mt-1 text-sm text-white/45">Fast entry for sales reps working through contact updates.</div>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl border border-white/8 px-3 py-2 text-sm text-white/60 transition hover:text-white">
            Close
          </button>
        </div>

        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {[
            ["name", "Name *"],
            ["email", "Email"],
            ["phone", "Phone"],
            ["company", "Company"],
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
              <option key={segment} value={segment} className="bg-neutral-950 text-white">
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
            <button type="submit" className="button-primary">
              {editing ? "Save changes" : "Create contact"}
            </button>
            <button type="button" className="button-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Contacts() {
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

  const visibleContacts = useMemo(() => contacts.slice(0, 18), [contacts]);

  return (
    <div className="crm-shell">
      <Sidebar />

      <main className="crm-page">
        <div className="crm-view fade-rise">
          <div className="px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="mb-2 flex items-center gap-3 text-sm text-white/45">
                  <span className="crm-status-dot" />
                  <span>Contacts</span>
                </div>
                <h1 className="text-[2rem] font-extrabold tracking-tight text-white">Contacts</h1>
                <p className="mt-1 text-sm text-white/45">{contacts.length} contacts</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="button" className="button-secondary">Columns</button>
                <button type="button" className="button-secondary">Import</button>
                <button type="button" className="button-secondary">Export</button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setForm(EMPTY_FORM);
                    setShowForm(true);
                  }}
                  className="button-primary"
                >
                  Add Contact
                </button>
              </div>
            </div>
          </div>

          <div className="crm-section px-5 py-4">
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_180px_180px_auto]">
              <input
                value={query.search}
                onChange={(e) => setQuery((current) => ({ ...current, search: e.target.value }))}
                placeholder="Search contacts..."
                className="input-surface"
              />
              <select
                value={query.segment}
                onChange={(e) => setQuery((current) => ({ ...current, segment: e.target.value }))}
                className="input-surface"
              >
                {["All", "general", "inbound", "outbound", "partner", "expansion"].map((segment) => (
                  <option key={segment} value={segment} className="bg-neutral-950 text-white">
                    {segment === "All" ? "All Statuses" : segment}
                  </option>
                ))}
              </select>
              <input
                value={query.tag}
                onChange={(e) => setQuery((current) => ({ ...current, tag: e.target.value }))}
                placeholder="Tag"
                className="input-surface"
              />
              <button type="button" onClick={() => fetchContacts(query.search)} className="button-secondary">
                Search
              </button>
            </div>
          </div>

          <div className="crm-section px-5 py-5">
            <div className="crm-table-wrap crm-table-scroll">
              <div className="crm-table-header">
                <div />
                <div>Name</div>
                <div>Email</div>
                <div>Phone</div>
                <div>Company</div>
                <div>Status</div>
                <div>Last Contacted</div>
              </div>

              {visibleContacts.length === 0 ? (
                <div className="px-6 py-16 text-center text-sm text-white/45">No contacts yet.</div>
              ) : (
                visibleContacts.map((contact, index) => {
                  const status = index % 4 === 0 ? "Lead" : index % 3 === 0 ? "Inactive" : "Active";
                  const badgeClass =
                    status === "Lead"
                      ? "crm-badge crm-badge--lead"
                      : status === "Inactive"
                        ? "crm-badge crm-badge--inactive"
                        : "crm-badge crm-badge--active";

                  const lastContact =
                    index % 5 === 0 ? "1w ago" : index % 4 === 0 ? "2d ago" : index % 3 === 0 ? "1mo ago" : "3d ago";

                  return (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => {
                        setEditing(contact);
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
                        setShowForm(true);
                      }}
                      className="crm-table-row w-full text-left"
                    >
                      <div>
                        <input type="checkbox" readOnly className="h-4 w-4 rounded border-white/20 bg-transparent" />
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="crm-avatar">{buildInitials(contact.name)}</div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-white">{contact.name}</div>
                          <div className="truncate text-xs text-white/40">{contact.title || "Sales contact"}</div>
                        </div>
                      </div>
                      <div className="truncate text-sm text-white/72">{contact.email || "--"}</div>
                      <div className="truncate text-sm text-white/58">{contact.phone || "--"}</div>
                      <div className="truncate text-sm text-white/72">{contact.company || "--"}</div>
                      <div>
                        <span className={badgeClass}>{status}</span>
                      </div>
                      <div className={`text-sm font-semibold ${status === "Inactive" ? "text-rose-400" : "text-emerald-400"}`}>{lastContact}</div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>

      {showForm && (
        <ContactEditor
          form={form}
          setForm={setForm}
          editing={editing}
          onSubmit={handleSubmit}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
            setForm(EMPTY_FORM);
          }}
        />
      )}
    </div>
  );
}
