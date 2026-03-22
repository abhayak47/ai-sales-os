import { useState, useEffect } from "react";
import API from "../api/axios";
import Sidebar from "../components/Sidebar";

export default function EmailSequence() {
  const [leads, setLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState("");
  const [form, setForm] = useState({ context: "", tone: "Professional" });
  const [sequence, setSequence] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeDay, setActiveDay] = useState(1);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const res = await API.get("/leads/");
      setLeads(res.data.items || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedLead) {
      setError("Please select a lead");
      return;
    }
    setLoading(true);
    setError("");
    setSequence(null);
    try {
      const res = await API.post("/ai/email-sequence", {
        lead_id: parseInt(selectedLead),
        context: form.context,
        tone: form.tone,
      });
      setSequence(res.data.sequence);
      setActiveDay(1);
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const copyEmail = (email) => {
    navigator.clipboard.writeText(`Subject: ${email.subject}\n\n${email.body}`);
    setCopied(email.day);
    setTimeout(() => setCopied(""), 2000);
  };

  const openInMail = (email) => {
    window.open(
      `mailto:?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`,
      "_blank"
    );
  };

  return (
    <div className="min-h-screen bg-black text-white flex">
      <Sidebar />

      <div className="flex-1 p-4 md:p-8 overflow-y-auto mt-16 md:mt-0">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl md:text-2xl font-bold mb-2">
            📧 AI Email Sequence Builder
          </h1>
          <p className="text-white/40 text-sm mb-6">
            Generate a complete 7-day follow-up sequence for any lead. Uses 5 AI credits.
          </p>

          {/* Form */}
          {!sequence && (
            <form onSubmit={handleSubmit} className="border border-white/10 rounded-xl p-6 space-y-4 mb-8">
              <div>
                <label className="text-sm text-white/60 mb-1 block">Select Lead *</label>
                <select
                  value={selectedLead}
                  onChange={(e) => setSelectedLead(e.target.value)}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-white/30 transition"
                >
                  <option value="" className="bg-black">Choose a lead...</option>
                  {leads.map((lead) => (
                    <option key={lead.id} value={lead.id} className="bg-black">
                      {lead.name} {lead.company ? `— ${lead.company}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-white/60 mb-1 block">Context / Goal *</label>
                <textarea
                  value={form.context}
                  onChange={(e) => setForm({ ...form, context: e.target.value })}
                  placeholder="E.g. We met at a startup event. They showed interest in our AI sales tool. Goal is to book a demo call."
                  required
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition resize-none"
                />
              </div>

              <div>
                <label className="text-sm text-white/60 mb-1 block">Tone</label>
                <select
                  value={form.tone}
                  onChange={(e) => setForm({ ...form, tone: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-white/30 transition"
                >
                  {["Professional", "Friendly", "Confident", "Casual", "Urgent"].map(t => (
                    <option key={t} value={t} className="bg-black">{t}</option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><span className="animate-spin">⚡</span> Generating 7-Day Sequence...</>
                ) : (
                  "Generate Email Sequence (5 credits)"
                )}
              </button>
            </form>
          )}

          {/* Sequence Result */}
          {sequence && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold">✅ Your 7-Day Email Sequence</h2>
                <button
                  onClick={() => setSequence(null)}
                  className="text-sm text-white/40 hover:text-white transition border border-white/10 px-4 py-2 rounded-lg"
                >
                  Generate New
                </button>
              </div>

              {/* Day Tabs */}
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {sequence.map((email) => (
                  <button
                    key={email.day}
                    onClick={() => setActiveDay(email.day)}
                    className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition ${
                      activeDay === email.day
                        ? "bg-white text-black"
                        : "border border-white/10 text-white/50 hover:text-white"
                    }`}
                  >
                    Day {email.day}
                  </button>
                ))}
              </div>

              {/* Active Email */}
              {sequence
                .filter((e) => e.day === activeDay)
                .map((email) => (
                  <div key={email.day} className="border border-white/10 rounded-xl p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-3">
                      <div>
                        <div className="text-xs text-white/40 mb-1">DAY {email.day} — SUBJECT</div>
                        <div className="font-semibold text-lg">{email.subject}</div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openInMail(email)}
                          className="text-xs px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400 hover:bg-blue-500/20 transition"
                        >
                          📧 Open in Mail
                        </button>
                        <button
                          onClick={() => copyEmail(email)}
                          className="text-xs px-3 py-2 border border-white/10 rounded-lg text-white/40 hover:text-white transition"
                        >
                          {copied === email.day ? "✅ Copied!" : "Copy"}
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-white/10 pt-4">
                      <div className="text-xs text-white/40 mb-3">EMAIL BODY</div>
                      <div className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap">
                        {email.body}
                      </div>
                    </div>

                    {/* Navigation */}
                    <div className="flex justify-between mt-6 pt-4 border-t border-white/10">
                      <button
                        onClick={() => setActiveDay(Math.max(1, activeDay - 1))}
                        disabled={activeDay === 1}
                        className="px-4 py-2 border border-white/10 rounded-lg text-white/40 hover:text-white transition disabled:opacity-30 text-sm"
                      >
                        ← Previous Day
                      </button>
                      <span className="text-white/30 text-sm self-center">
                        {activeDay} / 7
                      </span>
                      <button
                        onClick={() => setActiveDay(Math.min(7, activeDay + 1))}
                        disabled={activeDay === 7}
                        className="px-4 py-2 border border-white/10 rounded-lg text-white/40 hover:text-white transition disabled:opacity-30 text-sm"
                      >
                        Next Day →
                      </button>
                    </div>
                  </div>
                ))}

              {/* All Days Overview */}
              <div className="mt-6 border border-white/10 rounded-xl p-5">
                <h3 className="text-sm font-semibold mb-4 text-white/60">📋 ALL 7 EMAILS OVERVIEW</h3>
                <div className="space-y-2">
                  {sequence.map((email) => (
                    <div
                      key={email.day}
                      onClick={() => setActiveDay(email.day)}
                      className={`flex items-center gap-4 p-3 rounded-lg cursor-pointer transition ${
                        activeDay === email.day
                          ? "bg-white/10"
                          : "hover:bg-white/5"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {email.day}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{email.subject}</div>
                        <div className="text-white/40 text-xs truncate">{email.body.substring(0, 60)}...</div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); copyEmail(email); }}
                        className="text-xs px-2 py-1 border border-white/10 rounded text-white/30 hover:text-white transition flex-shrink-0"
                      >
                        Copy
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
