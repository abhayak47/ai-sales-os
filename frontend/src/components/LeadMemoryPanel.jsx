import { useEffect, useMemo, useState } from "react";

import API from "../api/axios";

function ArtifactPreview({ artifact, onPin }) {
  const payload = artifact.payload;

  const previewText = useMemo(() => {
    if (!payload) return "";
    if (typeof payload === "string") return payload;
    if (payload.execution_summary) return payload.execution_summary;
    if (payload.executive_summary) return payload.executive_summary;
    if (payload.summary) return payload.summary;
    if (payload.meeting_goal) return payload.meeting_goal;
    if (payload.objection_diagnosis) return payload.objection_diagnosis;
    return JSON.stringify(payload, null, 2);
  }, [payload]);

  return (
    <div className="border border-white/10 rounded-xl p-4 bg-white/[0.02]">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="text-sm font-medium">{artifact.title}</div>
          <div className="text-xs text-white/35">
            {artifact.artifact_type.replaceAll("_", " ")} · {new Date(artifact.created_at).toLocaleString()}
          </div>
        </div>
        <button
          onClick={() => onPin(artifact)}
          className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white transition"
        >
          Pin Insight
        </button>
      </div>
      <div className="text-sm text-white/70 whitespace-pre-wrap line-clamp-5">{previewText}</div>
    </div>
  );
}

export default function LeadMemoryPanel({ leadId }) {
  const [memory, setMemory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: "", content: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMemory();
  }, [leadId]);

  const fetchMemory = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/memory/lead/${leadId}`);
      setMemory(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not load lead memory.");
    } finally {
      setLoading(false);
    }
  };

  const createPin = async (payload) => {
    if (!payload.title.trim() || !payload.content.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      await API.post("/memory/pins", {
        lead_id: Number(leadId),
        title: payload.title.trim(),
        content: payload.content.trim(),
      });
      setForm({ title: "", content: "" });
      fetchMemory();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not save pinned fact.");
    } finally {
      setSubmitting(false);
    }
  };

  const deletePin = async (pinId) => {
    try {
      await API.delete(`/memory/pins/${pinId}`);
      fetchMemory();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not remove pinned fact.");
    }
  };

  const pinArtifact = async (artifact) => {
    const payload = artifact.payload;
    let content = "";
    if (typeof payload === "string") content = payload;
    else if (payload.execution_summary) content = payload.execution_summary;
    else if (payload.executive_summary) content = payload.executive_summary;
    else if (payload.summary) content = payload.summary;
    else if (payload.meeting_goal) content = payload.meeting_goal;
    else if (payload.objection_diagnosis) content = payload.objection_diagnosis;
    else content = JSON.stringify(payload);

    await createPin({
      title: artifact.title,
      content,
    });
  };

  if (loading) {
    return <div className="text-white/35 text-sm">Loading lead memory...</div>;
  }

  if (!memory) return null;

  return (
    <div className="space-y-6">
      <div className="border border-cyan-500/20 rounded-2xl p-6 bg-gradient-to-br from-cyan-500/10 via-sky-500/5 to-transparent">
        <div className="text-xs uppercase tracking-[0.2em] text-cyan-300/70 mb-2">Lead Memory</div>
        <h2 className="text-2xl font-bold mb-2">What the AI knows about this deal</h2>
        <p className="text-sm text-white/65 max-w-3xl leading-6">{memory.overview}</p>
      </div>

      {error && (
        <div className="border border-red-500/20 bg-red-500/10 text-red-200 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-semibold">Pinned Facts</h3>
                <p className="text-white/40 text-sm">These facts get highest priority in future AI outputs.</p>
              </div>
            </div>

            {memory.pinned_facts.length === 0 ? (
              <div className="text-sm text-white/40">No pinned facts yet. Add decision criteria, promised next steps, budget reality, or stakeholder notes.</div>
            ) : (
              <div className="space-y-3">
                {memory.pinned_facts.map((pin) => (
                  <div key={pin.id} className="border border-white/10 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-sm">{pin.title}</div>
                        <div className="text-xs text-white/35 mt-1">{pin.source} · {new Date(pin.created_at).toLocaleString()}</div>
                      </div>
                      <button
                        onClick={() => deletePin(pin.id)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-red-500/20 text-red-300 hover:text-red-200 transition"
                      >
                        Remove
                      </button>
                    </div>
                    <p className="text-sm text-white/70 mt-3 whitespace-pre-wrap">{pin.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border border-white/10 rounded-2xl p-5">
            <h3 className="text-sm font-semibold mb-4">Saved AI Output History</h3>
            <div className="space-y-3">
              {memory.saved_outputs.length === 0 ? (
                <div className="text-sm text-white/40">No saved AI artifacts yet. The next generation will be stored automatically.</div>
              ) : (
                memory.saved_outputs.map((artifact) => (
                  <ArtifactPreview key={artifact.id} artifact={artifact} onPin={pinArtifact} />
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="border border-white/10 rounded-2xl p-5">
            <h3 className="text-sm font-semibold mb-4">Pin Critical Fact</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
                placeholder="Example: Budget reality"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none"
              />
              <textarea
                value={form.content}
                onChange={(e) => setForm((current) => ({ ...current, content: e.target.value }))}
                rows={5}
                placeholder="Example: They are open to INR 9L quarterly if exports expansion is proven with automotive sheet metal use cases."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none resize-none"
              />
              <button
                onClick={() => createPin(form)}
                disabled={submitting}
                className="w-full px-4 py-3 rounded-xl bg-white text-black text-sm font-semibold disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Save to Lead Memory"}
              </button>
            </div>
          </div>

          <div className="border border-white/10 rounded-2xl p-5">
            <h3 className="text-sm font-semibold mb-4">Inferred Memory</h3>
            <div className="space-y-3">
              {memory.inferred_memory.map((item) => (
                <div key={item} className="text-sm text-white/70 border border-white/10 rounded-xl p-3 bg-white/[0.02]">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
