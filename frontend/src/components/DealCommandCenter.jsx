import { useEffect, useState } from "react";
import API from "../api/axios";

const PRIORITY_CLASSES = {
  critical: "text-red-300 bg-red-500/10 border-red-500/20",
  high: "text-orange-300 bg-orange-500/10 border-orange-500/20",
  medium: "text-blue-300 bg-blue-500/10 border-blue-500/20",
  low: "text-white/70 bg-white/5 border-white/10",
};

export default function DealCommandCenter({ leadId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCommand();
  }, [leadId]);

  const fetchCommand = async () => {
    try {
      const res = await API.get(`/dashboard/deal-command/${leadId}`);
      setData(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-white/40">Loading deal command center...</div>;
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="border border-white/10 rounded-xl p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="font-semibold text-lg">Deal Command Center</h3>
            <p className="text-white/40 text-sm mt-1">
              This deal's best move, urgency, and execution plan.
            </p>
          </div>
          <span className={`text-xs px-3 py-2 rounded-full border ${PRIORITY_CLASSES[data.priority]}`}>
            {data.priority.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-xs text-white/40 mb-1">Momentum</div>
            <div className="text-2xl font-bold">{data.momentum_score}</div>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-xs text-white/40 mb-1">Inactivity</div>
            <div className="text-2xl font-bold">{data.days_inactive}d</div>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-xs text-white/40 mb-1">Health</div>
            <div className="text-2xl font-bold">{data.health_score}</div>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-xs text-white/40 mb-1">Relationship</div>
            <div className="text-2xl font-bold">{data.relationship_score}</div>
          </div>
        </div>

        <div className="border border-white/10 rounded-lg p-4 mb-4">
          <div className="text-xs text-white/40 mb-2">NEXT BEST ACTION</div>
          <div className="font-semibold mb-1">
            {data.next_best_action} via {data.recommended_channel}
          </div>
          <div className="text-white/50 text-sm mb-3">{data.why_now}</div>
          <div className="bg-white/5 rounded-lg p-3 text-sm text-white/70">
            {data.draft_message}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-white/10 rounded-lg p-4">
            <div className="text-xs text-white/40 mb-3">POWER MOVES</div>
            <div className="space-y-2">
              {data.power_moves.map((move) => (
                <div key={move} className="text-sm text-white/70">
                  {move}
                </div>
              ))}
            </div>
          </div>
          <div className="border border-white/10 rounded-lg p-4">
            <div className="text-xs text-white/40 mb-3">OBVIOUS RISKS</div>
            <div className="space-y-2">
              {data.obvious_risks.map((risk) => (
                <div key={risk} className="text-sm text-white/70">
                  {risk}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="border border-white/10 rounded-xl p-5">
        <div className="text-xs text-white/40 mb-3">EXECUTION CHECKLIST</div>
        <div className="space-y-2 mb-4">
          {data.recommended_sequence.map((step) => (
            <div key={step} className="text-sm text-white/70">
              {step}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {data.evidence.map((item) => (
            <span key={item} className="text-xs text-white/40 border border-white/10 rounded-full px-2 py-1">
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
