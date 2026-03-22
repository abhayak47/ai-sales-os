import { useState } from "react";
import API from "../api/axios";

export default function MeetingIntel({ leadId }) {
  const [notes, setNotes] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAnalyze = async () => {
    if (!notes.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await API.post("/ai/meeting-analysis", {
        lead_id: Number(leadId),
        notes,
      });
      setAnalysis(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Meeting analysis failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-white/10 rounded-xl p-5">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="font-semibold">Meeting Intel</h3>
          <p className="text-white/40 text-sm mt-1">
            Turn raw meeting notes into action items, objections, and a follow-up email.
          </p>
        </div>
        <span className="text-xs text-purple-300 border border-purple-500/20 bg-purple-500/10 px-3 py-2 rounded-full">
          3 credits
        </span>
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={5}
        placeholder="Paste meeting notes, call notes, or a messy summary here..."
        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition resize-none"
      />

      {error && (
        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handleAnalyze}
        disabled={loading || !notes.trim()}
        className="mt-4 px-4 py-2 bg-white text-black text-sm font-semibold rounded-lg hover:bg-white/90 transition disabled:opacity-50"
      >
        {loading ? "Analyzing..." : "Analyze Meeting"}
      </button>

      {analysis && (
        <div className="mt-5 space-y-4">
          <div className="border border-white/10 rounded-lg p-4">
            <div className="text-xs text-white/40 mb-2">SUMMARY</div>
            <div className="text-sm text-white/70">{analysis.summary}</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-white/10 rounded-lg p-4">
              <div className="text-xs text-white/40 mb-3">KEY POINTS</div>
              <div className="space-y-2">
                {analysis.key_points.map((item) => (
                  <div key={item} className="text-sm text-white/70">{item}</div>
                ))}
              </div>
            </div>
            <div className="border border-white/10 rounded-lg p-4">
              <div className="text-xs text-white/40 mb-3">ACTION ITEMS</div>
              <div className="space-y-2">
                {analysis.action_items.map((item) => (
                  <div key={item} className="text-sm text-white/70">{item}</div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-white/10 rounded-lg p-4">
              <div className="text-xs text-white/40 mb-3">OBJECTIONS</div>
              <div className="space-y-2">
                {analysis.objections.map((item) => (
                  <div key={item} className="text-sm text-white/70">{item}</div>
                ))}
              </div>
            </div>
            <div className="border border-white/10 rounded-lg p-4">
              <div className="text-xs text-white/40 mb-3">NEXT STEPS</div>
              <div className="text-sm text-white/70 mb-3">{analysis.next_steps}</div>
              <div className="text-xs text-white/40 mb-1">DEAL STATUS</div>
              <div className="text-sm text-white/70">{analysis.deal_status}</div>
            </div>
          </div>

          <div className="border border-white/10 rounded-lg p-4">
            <div className="flex items-center justify-between gap-4 mb-3">
              <div className="text-xs text-white/40">FOLLOW-UP EMAIL</div>
              <button
                onClick={() => navigator.clipboard.writeText(analysis.follow_up_email)}
                className="text-xs px-3 py-1 border border-white/10 rounded-lg text-white/40 hover:text-white transition"
              >
                Copy
              </button>
            </div>
            <div className="text-sm text-white/70 whitespace-pre-wrap">{analysis.follow_up_email}</div>
          </div>
        </div>
      )}
    </div>
  );
}
