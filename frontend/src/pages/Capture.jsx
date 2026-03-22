import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import API from "../api/axios";

export default function Capture() {
  const { username } = useParams();
  const [ownerName, setOwnerName] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    notes: "",
  });

  useEffect(() => {
    fetchOwner();
  }, [username]);

  const fetchOwner = async () => {
    try {
      const res = await API.get(`/capture/user/${username}`);
      setOwnerName(res.data.name);
    } catch {
      setNotFound(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await API.post(`/capture/user/${username}`, form);
      setSubmitted(true);
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (notFound) {
    return (
      <div className="min-h-screen app-shell text-white flex items-center justify-center">
        <div className="glass-panel rounded-[2rem] p-10 text-center max-w-lg mx-4">
          <div className="section-title mb-3">Capture Page</div>
          <h1 className="text-3xl font-semibold mb-3">This intake page is unavailable.</h1>
          <p className="text-white/50 leading-7">The link may be invalid or no longer active.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen app-shell text-white flex items-center justify-center">
        <div className="glass-panel rounded-[2rem] p-10 text-center max-w-xl mx-4">
          <div className="hero-chip mb-6">Submitted</div>
          <h1 className="text-4xl font-semibold mb-4">Thanks, you’re in.</h1>
          <p className="text-white/60 text-lg mb-2">Your details were submitted successfully.</p>
          <p className="text-white/45 leading-7">{ownerName} will review this and reach out soon.</p>
          <div className="text-sm text-white/25 mt-8">Powered by AI Sales OS</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-shell text-white flex items-center">
      <div className="page-frame grid grid-cols-1 xl:grid-cols-[0.95fr_1.05fr] gap-10 py-10">
        <div className="hidden xl:flex flex-col justify-center">
          <div className="hero-chip mb-6">Lead Capture</div>
          <h1 className="headline-display text-5xl font-semibold leading-tight mb-5">
            Start the conversation with {ownerName || "the team"}.
          </h1>
          <p className="text-white/60 text-lg leading-8 max-w-xl">
            This intake flow routes new opportunities straight into the revenue workspace so follow-up can start with context, not chaos.
          </p>
        </div>

        <div className="glass-panel rounded-[2rem] p-6 md:p-8 max-w-xl xl:ml-auto">
          <div className="section-title mb-3">Tell us about your need</div>
          <h2 className="text-3xl font-semibold mb-3">Connect with {ownerName || "the team"}</h2>
          <p className="text-white/50 text-sm leading-7 mb-8">
            Share a little context and we’ll route your request into the right conversation quickly.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-white/60 mb-2 block">Full name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                required
                placeholder="Alex Morgan"
                className="input-surface"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-white/60 mb-2 block">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
                  placeholder="alex@company.com"
                  className="input-surface"
                />
              </div>
              <div>
                <label className="text-sm text-white/60 mb-2 block">Phone</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm((current) => ({ ...current, phone: e.target.value }))}
                  placeholder="+91 98765 43210"
                  className="input-surface"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-white/60 mb-2 block">Company</label>
              <input
                type="text"
                value={form.company}
                onChange={(e) => setForm((current) => ({ ...current, company: e.target.value }))}
                placeholder="Acme Corp"
                className="input-surface"
              />
            </div>

            <div>
              <label className="text-sm text-white/60 mb-2 block">What are you trying to solve?</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))}
                rows={4}
                placeholder="Tell us about your use case, timeline, or what you need help with."
                className="input-surface resize-none"
              />
            </div>

            <button type="submit" disabled={loading} className="button-primary w-full disabled:opacity-50">
              {loading ? "Submitting..." : "Submit details"}
            </button>
          </form>

          <div className="text-sm text-white/25 mt-6">Powered by AI Sales OS</div>
        </div>
      </div>
    </div>
  );
}
