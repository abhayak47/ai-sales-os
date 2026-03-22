import { useState } from "react";

import API from "../api/axios";

function Block({ title, children, action = null }) {
  return (
    <div className="border border-white/10 rounded-lg p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="text-xs text-white/40">{title}</div>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function MeetingIntel({ leadId }) {
  const [notes, setNotes] = useState("");
  const [momTemplate, setMomTemplate] = useState("");
  const [transcriptFile, setTranscriptFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAnalyze = async () => {
    if (!notes.trim() && !transcriptFile) return;

    setLoading(true);
    setError("");
    try {
      let res;
      if (transcriptFile) {
        const formData = new FormData();
        formData.append("lead_id", String(Number(leadId)));
        formData.append("notes", notes);
        formData.append("mom_template", momTemplate);
        formData.append("transcript_file", transcriptFile);
        res = await API.post("/ai/meeting-analysis/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        res = await API.post("/ai/meeting-analysis", {
          lead_id: Number(leadId),
          notes,
          mom_template: momTemplate,
        });
      }
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
            Analyze full notes or transcript files, generate MoM in your format, extract objections, and tailor follow-up plus solution ideas.
          </p>
        </div>
        <span className="text-xs text-purple-300 border border-purple-500/20 bg-purple-500/10 px-3 py-2 rounded-full">
          3 credits
        </span>
      </div>

      <div className="space-y-4">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={6}
          placeholder="Paste raw meeting notes, call notes, or a messy recap here..."
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition resize-none"
        />

        <textarea
          value={momTemplate}
          onChange={(e) => setMomTemplate(e.target.value)}
          rows={4}
          placeholder="Optional: paste your preferred Minutes of Meeting format. Example: Date | Attendees | Discussion Summary | Decisions | Action Items | Owners | Deadlines."
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition resize-none"
        />

        <div className="border border-dashed border-white/15 rounded-lg p-4">
          <label className="text-sm text-white/65 block mb-2">Upload transcript or meeting document</label>
          <input
            type="file"
            accept=".txt,.md,.csv,.docx,.pdf"
            onChange={(e) => setTranscriptFile(e.target.files?.[0] || null)}
            className="text-sm text-white/70 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-white file:text-black"
          />
          {transcriptFile && (
            <div className="text-xs text-cyan-300 mt-2">{transcriptFile.name}</div>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handleAnalyze}
        disabled={loading || (!notes.trim() && !transcriptFile)}
        className="mt-4 px-4 py-2 bg-white text-black text-sm font-semibold rounded-lg hover:bg-white/90 transition disabled:opacity-50"
      >
        {loading ? "Analyzing..." : "Analyze Meeting"}
      </button>

      {analysis && (
        <div className="mt-5 space-y-4">
          <Block title="SUMMARY">
            <div className="text-sm text-white/70">{analysis.summary}</div>
          </Block>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Block title="KEY POINTS">
              <div className="space-y-2">
                {analysis.key_points.map((item) => (
                  <div key={item} className="text-sm text-white/70">{item}</div>
                ))}
              </div>
            </Block>

            <Block title="ACTION ITEMS">
              <div className="space-y-2">
                {analysis.action_items.map((item) => (
                  <div key={item} className="text-sm text-white/70">{item}</div>
                ))}
              </div>
            </Block>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Block title="OBJECTIONS">
              <div className="space-y-2">
                {analysis.objections.map((item) => (
                  <div key={item} className="text-sm text-white/70">{item}</div>
                ))}
              </div>
            </Block>

            <Block title="NEXT STEPS AND STATUS">
              <div className="text-sm text-white/70 mb-3">{analysis.next_steps}</div>
              <div className="text-xs text-white/40 mb-1">DEAL STATUS</div>
              <div className="text-sm text-white/70">{analysis.deal_status}</div>
            </Block>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Block title="TAILORED SOLUTION IDEAS">
              <div className="space-y-2">
                {analysis.tailored_solution_ideas.map((item) => (
                  <div key={item} className="text-sm text-white/70">{item}</div>
                ))}
              </div>
            </Block>

            <Block title="DEAL MEMORY USED">
              <div className="space-y-2">
                {analysis.deal_memory.map((item) => (
                  <div key={item} className="text-sm text-white/70">{item}</div>
                ))}
              </div>
            </Block>
          </div>

          <Block
            title="MINUTES OF MEETING"
            action={
              <button
                onClick={() => navigator.clipboard.writeText(analysis.minutes_of_meeting)}
                className="text-xs px-3 py-1 border border-white/10 rounded-lg text-white/40 hover:text-white transition"
              >
                Copy
              </button>
            }
          >
            <div className="text-sm text-white/70 whitespace-pre-wrap">{analysis.minutes_of_meeting}</div>
          </Block>

          <Block
            title="FOLLOW-UP EMAIL"
            action={
              <button
                onClick={() => navigator.clipboard.writeText(analysis.follow_up_email)}
                className="text-xs px-3 py-1 border border-white/10 rounded-lg text-white/40 hover:text-white transition"
              >
                Copy
              </button>
            }
          >
            <div className="text-sm text-white/70 whitespace-pre-wrap">{analysis.follow_up_email}</div>
          </Block>
        </div>
      )}
    </div>
  );
}
