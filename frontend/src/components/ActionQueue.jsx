import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";

const PRIORITY_STYLES = {
  critical: "border-red-500/30 bg-red-500/5 text-red-300",
  high: "border-orange-500/30 bg-orange-500/5 text-orange-300",
  medium: "border-blue-500/30 bg-blue-500/5 text-blue-300",
  low: "border-white/10 bg-white/5 text-white/70",
};

export default function ActionQueue({ limit = 4, compact = false }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    try {
      const res = await API.get("/dashboard/command-center");
      setData(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="border border-white/10 rounded-xl p-5">
        <div className="text-white/40 text-sm">Loading…</div>
      </div>
    );
  }

  if (!data) return null;

  const plays = data.plays.slice(0, limit);

  return (
    <div className="border border-white/10 rounded-2xl p-5 bg-white/[0.02]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-base font-semibold">Priority actions</h2>
          <p className="text-white/40 text-sm mt-1">Ranked by urgency and fit for your pipeline.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px]">
          <div className="border border-white/10 rounded-lg px-2.5 py-1.5 text-white/55">
            Open <span className="text-white font-medium">{data.summary.total_open_leads}</span>
          </div>
          <div className="border border-white/10 rounded-lg px-2.5 py-1.5 text-white/55">
            Urgent <span className="text-red-300/90 font-medium">{data.summary.critical_plays}</span>
          </div>
          <div className="border border-white/10 rounded-lg px-2.5 py-1.5 text-white/55">
            High <span className="text-amber-200/80 font-medium">{data.summary.high_priority_plays}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {plays.map((play) => (
          <div
            key={play.lead_id}
            className="border border-white/10 rounded-xl p-4 hover:border-white/20 transition"
          >
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="font-semibold">{play.lead_name}</span>
                  <span className="text-white/40 text-sm">{play.company || "No company"}</span>
                  <span className={`text-xs px-2 py-1 rounded-full border ${PRIORITY_STYLES[play.priority]}`}>
                    {play.priority.toUpperCase()}
                  </span>
                </div>
                <div className="text-sm text-white/70 mb-2">
                  {play.next_best_action} via {play.recommended_channel} {play.recommended_timing.toLowerCase()}.
                </div>
                <div className="text-sm text-white/50 mb-3">{play.why_now}</div>
                {!compact && (
                  <div className="bg-white/5 rounded-lg p-3 text-sm text-white/70">
                    {play.draft_message}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  {play.evidence.slice(0, 3).map((item) => (
                    <span key={item} className="text-xs text-white/40 border border-white/10 rounded-full px-2 py-1">
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="w-full md:w-40 flex flex-col gap-2">
                <div className="border border-white/10 rounded-lg p-3 bg-white/5">
                  <div className="text-xs text-white/40 mb-1">Momentum</div>
                  <div className="text-2xl font-bold">{play.momentum_score}</div>
                </div>
                <button
                  onClick={() => navigate(`/leads/${play.lead_id}`)}
                  className="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-white/90 transition"
                >
                  Open lead
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
