import { useEffect, useState } from "react";

import API from "../api/axios";

const EMPTY_TEMPLATE = { name: "", subject: "", body: "" };

export default function EmailWorkspace({ leadId = null }) {
  const [leads, setLeads] = useState([]);
  const [selectedLeadId, setSelectedLeadId] = useState(leadId ? String(leadId) : "");
  const [templates, setTemplates] = useState([]);
  const [messages, setMessages] = useState([]);
  const [templateForm, setTemplateForm] = useState(EMPTY_TEMPLATE);
  const [emailForm, setEmailForm] = useState({ subject: "", body: "", templateId: "" });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    bootstrap();
  }, [leadId]);

  useEffect(() => {
    if (selectedLeadId) fetchMessages(selectedLeadId);
    else setMessages([]);
  }, [selectedLeadId]);

  const bootstrap = async () => {
    setLoading(true);
    try {
      const [templatesRes, leadsRes] = await Promise.all([
        API.get("/emails/templates"),
        API.get("/leads/", { params: { page: 1, page_size: 100, sort_by: "updated_at", sort_dir: "desc" } }),
      ]);
      setTemplates(templatesRes.data || []);
      setLeads(leadsRes.data.items || []);
      if (leadId) setSelectedLeadId(String(leadId));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (targetLeadId) => {
    try {
      const res = await API.get(`/emails/lead/${targetLeadId}`);
      setMessages(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleTemplateCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post("/emails/templates", templateForm);
      setTemplates((current) => [res.data, ...current]);
      setTemplateForm(EMPTY_TEMPLATE);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUseTemplate = (template) => {
    setEmailForm({
      templateId: String(template.id),
      subject: template.subject,
      body: template.body,
    });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!selectedLeadId) return;
    setSending(true);
    try {
      await API.post("/emails/send", {
        lead_id: Number(selectedLeadId),
        template_id: emailForm.templateId ? Number(emailForm.templateId) : undefined,
        subject: emailForm.subject,
        body: emailForm.body,
      });
      setEmailForm({ subject: "", body: "", templateId: "" });
      fetchMessages(selectedLeadId);
    } catch (err) {
      alert(err.response?.data?.detail || "Email send failed");
    } finally {
      setSending(false);
    }
  };

  const selectedLead = leads.find((lead) => String(lead.id) === String(selectedLeadId));

  if (loading) {
    return <div className="premium-card p-5 text-sm text-white/40">Loading email workspace...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="premium-card p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="text-base font-semibold">Email Workspace</div>
            <div className="text-sm text-white/45 mt-1">Send tracked emails, manage templates, and keep conversations tied to the lead record.</div>
          </div>
          {!leadId && (
            <select
              value={selectedLeadId}
              onChange={(e) => setSelectedLeadId(e.target.value)}
              className="input-surface max-w-xs"
            >
              <option value="">Select lead</option>
              {leads.map((lead) => (
                <option key={lead.id} value={lead.id} className="bg-black">
                  {lead.name} {lead.company ? `· ${lead.company}` : ""}
                </option>
              ))}
            </select>
          )}
        </div>

        {selectedLead && (
          <div className="border border-white/10 rounded-2xl p-4 mb-4 bg-white/[0.02]">
            <div className="text-xs uppercase tracking-[0.18em] text-white/35 mb-2">Recipient</div>
            <div className="font-medium">{selectedLead.name}</div>
            <div className="text-sm text-white/45 mt-1">{selectedLead.email || "No email on record"}</div>
          </div>
        )}

        <form onSubmit={handleSend} className="space-y-3">
          <input
            value={emailForm.subject}
            onChange={(e) => setEmailForm((current) => ({ ...current, subject: e.target.value }))}
            placeholder="Email subject"
            className="input-surface"
            required
          />
          <textarea
            value={emailForm.body}
            onChange={(e) => setEmailForm((current) => ({ ...current, body: e.target.value }))}
            rows={8}
            placeholder="Write a tailored email..."
            className="input-surface resize-none"
            required
          />
          <button disabled={!selectedLeadId || sending} className="button-primary disabled:opacity-50">
            {sending ? "Sending..." : "Send tracked email"}
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[0.95fr_1.05fr] gap-4">
        <div className="premium-card p-5">
          <div className="text-base font-semibold mb-3">Templates</div>
          <form onSubmit={handleTemplateCreate} className="space-y-3 mb-4">
            <input
              value={templateForm.name}
              onChange={(e) => setTemplateForm((current) => ({ ...current, name: e.target.value }))}
              placeholder="Template name"
              className="input-surface"
              required
            />
            <input
              value={templateForm.subject}
              onChange={(e) => setTemplateForm((current) => ({ ...current, subject: e.target.value }))}
              placeholder="Subject template"
              className="input-surface"
              required
            />
            <textarea
              value={templateForm.body}
              onChange={(e) => setTemplateForm((current) => ({ ...current, body: e.target.value }))}
              rows={5}
              placeholder="Template body"
              className="input-surface resize-none"
              required
            />
            <button className="button-secondary w-full">Save template</button>
          </form>

          <div className="space-y-3">
            {templates.length === 0 ? (
              <div className="text-sm text-white/40">No templates yet.</div>
            ) : (
              templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleUseTemplate(template)}
                  className="w-full text-left border border-white/10 rounded-2xl p-4 hover:border-white/20 transition"
                >
                  <div className="font-medium">{template.name}</div>
                  <div className="text-sm text-white/40 mt-1 line-clamp-2">{template.subject}</div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="premium-card p-5">
          <div className="text-base font-semibold mb-3">Email Timeline</div>
          <div className="space-y-3">
            {messages.length === 0 ? (
              <div className="text-sm text-white/40">No emails logged for this lead yet.</div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className="border border-white/10 rounded-2xl p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium text-sm">{message.subject}</div>
                    <div className="text-xs px-2 py-1 rounded-full border border-white/10 text-white/55">
                      {message.status}
                    </div>
                  </div>
                  <div className="text-sm text-white/60 mt-2 line-clamp-4 whitespace-pre-wrap">{message.body}</div>
                  <div className="text-xs text-white/35 mt-3">
                    {message.sent_at ? `Sent ${new Date(message.sent_at).toLocaleString()}` : `Created ${new Date(message.created_at).toLocaleString()}`}
                    {message.opened_at ? ` · Opened ${new Date(message.opened_at).toLocaleString()}` : ""}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
