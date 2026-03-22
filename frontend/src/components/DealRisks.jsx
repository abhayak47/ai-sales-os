import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import API from "../api/axios";

export default function DealRisks({ limit = 3 }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    fetchRisks();
  }, []);

  const fetchRisks = async () => {
    try {
      const res = await API.get("/dashboard/deal-risks");
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data || data.total === 0) return null;

  const risks = data.risks.slice(0, limit);

  return (
    <div className="border border-red-500/20 bg-red-500/[0.04] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-red-300">
            Deal risk radar · {data.total} deal{data.total > 1 ? "s" : ""} at risk
          </h2>
          <p className="text-white/40 text-xs mt-1">The deals most likely to slip if nobody intervenes.</p>
        </div>
        <button onClick={fetchRisks} className="text-xs text-white/30 hover:text-white transition">
          Refresh
        </button>
      </div>

      <div className="space-y-3">
        {risks.map((risk, i) => (
          <div key={risk.lead_id} className="border border-white/10 bg-black rounded-xl overflow-hidden">
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition"
              onClick={() => setExpanded(expanded === i ? null : i)}
            >
              <div className="flex items-center gap-3">
                <span className="text-sm text-red-200">{risk.risk_level}</span>
                <div>
                  <div className="font-medium text-sm">{risk.lead_name}</div>
                  {risk.company && <div className="text-white/40 text-xs">{risk.company}</div>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-white/40 bg-white/5 px-2 py-1 rounded-full">
                  {risk.days_inactive}d inactive
                </span>
                <span className="text-white/30 text-xs">{expanded === i ? "Hide" : "Show"}</span>
              </div>
            </div>

            {expanded === i && (
              <div className="px-4 pb-4 space-y-3 border-t border-white/10 pt-3">
                <div className="text-sm text-red-200/90">{risk.risk_reason}</div>
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-xs text-white/40 mb-2">Rescue strategy</div>
                  <div className="text-sm text-white/70">{risk.rescue_strategy}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/leads/${risk.lead_id}`)}
                    className="flex-1 py-2 bg-white text-black text-xs font-semibold rounded-lg hover:bg-white/90 transition"
                  >
                    View Lead
                  </button>
                  <button
                    onClick={() => navigate("/followup")}
                    className="flex-1 py-2 border border-white/10 rounded-lg text-xs text-white/50 hover:text-white transition"
                  >
                    Generate Follow-Up
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
