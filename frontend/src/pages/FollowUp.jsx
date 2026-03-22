import { useState } from "react";

import API from "../api/axios";
import Sidebar from "../components/Sidebar";

function ResultCard({ title, children, actions }) {
  return (
    <div className="premium-card p-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <div className="text-base font-semibold">{title}</div>
        <div className="flex gap-2">{actions}</div>
      </div>
      <div className="text-sm text-white/75 leading-7 whitespace-pre-wrap">{children}</div>
    </div>
  );
}

export default function FollowUp() {
  const [form, setForm] = useState({
    context: "",
    client_type: "",
    tone: "",
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await API.post("/ai/followup", form);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const copyText = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 1800);
  };

  return (
    <div className="min-h-screen bg-black text-white flex">
      <Sidebar />

      <div className="flex-1 p-4 md:p-8 overflow-y-auto mt-16 md:mt-0">
        <div className="page-frame">
          <div className="glass-panel rounded-[2rem] p-6 md:p-8 mb-8">
            <div className="section-title mb-3">AI Follow-Up</div>
            <h1 className="text-3xl md:text-4xl font-semibold mb-3">Generate outreach that sounds like it belongs to this deal.</h1>
            <p className="text-white/55 text-sm md:text-base max-w-3xl leading-7">
              Give the AI the real sales context and it will return polished email, WhatsApp, and short-form follow-ups
              that feel sharper and more decision-oriented.
            </p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[0.92fr_1.08fr] gap-6">
            <form onSubmit={handleSubmit} className="premium-card p-6 space-y-4 h-fit">
              <div>
                <label className="text-sm text-white/60 mb-2 block">Sales context</label>
                <textarea
                  value={form.context}
                  onChange={(e) => setForm((current) => ({ ...current, context: e.target.value }))}
                  placeholder="We spoke after a discovery call. They are interested, but need confidence around implementation speed and fit."
                  required
                  rows={6}
                  className="input-surface resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-white/60 mb-2 block">Client type</label>
                  <select
                    value={form.client_type}
                    onChange={(e) => setForm((current) => ({ ...current, client_type: e.target.value }))}
                    required
                    className="input-surface"
                  >
                    <option value="" className="bg-black">Select type</option>
                    <option value="Startup Founder" className="bg-black">Startup Founder</option>
                    <option value="Agency Owner" className="bg-black">Agency Owner</option>
                    <option value="Enterprise Buyer" className="bg-black">Enterprise Buyer</option>
                    <option value="SMB Owner" className="bg-black">SMB Owner</option>
                    <option value="Channel Partner" className="bg-black">Channel Partner</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm text-white/60 mb-2 block">Tone</label>
                  <select
                    value={form.tone}
                    onChange={(e) => setForm((current) => ({ ...current, tone: e.target.value }))}
                    required
                    className="input-surface"
                  >
                    <option value="" className="bg-black">Select tone</option>
                    <option value="Professional" className="bg-black">Professional</option>
                    <option value="Friendly" className="bg-black">Friendly</option>
                    <option value="Confident" className="bg-black">Confident</option>
                    <option value="Consultative" className="bg-black">Consultative</option>
                    <option value="Urgent" className="bg-black">Urgent</option>
                  </select>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-300 text-sm">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="button-primary w-full disabled:opacity-50">
                {loading ? "Generating follow-up..." : "Generate follow-up pack"}
              </button>
            </form>

            <div className="space-y-4">
              {!result ? (
                <div className="premium-card p-6">
                  <div className="text-base font-semibold mb-3">What you will get</div>
                  <div className="space-y-3 text-sm text-white/60 leading-7">
                    <div>A full email with subject and body.</div>
                    <div>A WhatsApp message built for faster reply rates.</div>
                    <div>A one-liner that creates urgency without sounding generic.</div>
                  </div>
                </div>
              ) : (
                <>
                  <ResultCard
                    title="Email"
                    actions={
                      <button onClick={() => copyText(result.email, "email")} className="button-secondary text-xs px-3 py-2">
                        {copied === "email" ? "Copied" : "Copy"}
                      </button>
                    }
                  >
                    {result.email}
                  </ResultCard>

                  <ResultCard
                    title="WhatsApp"
                    actions={
                      <button onClick={() => copyText(result.whatsapp, "whatsapp")} className="button-secondary text-xs px-3 py-2">
                        {copied === "whatsapp" ? "Copied" : "Copy"}
                      </button>
                    }
                  >
                    {result.whatsapp}
                  </ResultCard>

                  <ResultCard
                    title="One-Liner"
                    actions={
                      <button onClick={() => copyText(result.short, "short")} className="button-secondary text-xs px-3 py-2">
                        {copied === "short" ? "Copied" : "Copy"}
                      </button>
                    }
                  >
                    {result.short}
                  </ResultCard>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
