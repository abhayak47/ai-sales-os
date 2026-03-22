import { useEffect, useState } from "react";

import API from "../api/axios";

const CHANNEL_COLORS = {
  WhatsApp: "border-green-500/30 bg-green-500/5 text-green-400",
  Email: "border-blue-500/30 bg-blue-500/5 text-blue-400",
  Call: "border-red-500/30 bg-red-500/5 text-red-400",
  LinkedIn: "border-cyan-500/30 bg-cyan-500/5 text-cyan-400",
};

export default function SmartFollowUp({ leadId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    fetchRecommendations();
  }, [leadId]);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/dashboard/smart-followup/${leadId}`);
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const copyMessage = async (message, index) => {
    await navigator.clipboard.writeText(message);
    setCopied(index);
    setTimeout(() => setCopied(null), 2000);
  };

  const launchChannel = (recommendation) => {
    if (recommendation.channel === "WhatsApp") {
      window.open(`https://wa.me/?text=${encodeURIComponent(recommendation.message)}`, "_blank");
      return;
    }
    if (recommendation.channel === "Email") {
      window.open(
        `mailto:${data.lead_email || ""}?body=${encodeURIComponent(recommendation.message)}`,
        "_blank"
      );
      return;
    }
    if (recommendation.channel === "Call") {
      window.open(`tel:${data.lead_phone || ""}`, "_self");
      return;
    }
    navigator.clipboard.writeText(recommendation.message);
    alert("Message copied for LinkedIn or manual send.");
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-white/35">Loading smart follow-up...</div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="border border-white/10 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Smart Follow-Up Engine</h3>
            <p className="text-white/40 text-sm mt-1">
              Recommendations generated from this lead's stage, activity history, and last discussion.
            </p>
          </div>
          <button
            onClick={fetchRecommendations}
            className="text-xs px-3 py-1 border border-white/10 rounded-lg text-white/40 hover:text-white transition"
          >
            Refresh
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-xs text-white/40 mb-1">Last Activity</div>
            <div className="text-sm font-medium truncate">{data.last_activity}</div>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-xs text-white/40 mb-1">Total Activities</div>
            <div className="text-sm font-medium">{data.activity_count}</div>
          </div>
        </div>
      </div>

      {data.recommendations.length === 0 ? (
        <div className="text-center py-12 border border-white/10 rounded-xl">
          <div className="text-white/40 text-sm">No follow-up needed right now.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {data.recommendations.map((rec, index) => (
            <div key={`${rec.channel}-${index}`} className="border border-white/10 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-xs px-3 py-1 rounded-full border font-medium ${CHANNEL_COLORS[rec.channel] || "border-white/20 text-white/60"}`}
                  >
                    {rec.channel}
                  </span>
                  <span className="text-xs text-white/40 bg-white/5 px-3 py-1 rounded-full">
                    {rec.timing}
                  </span>
                </div>
              </div>

              <div className="text-xs text-white/40 italic">{rec.reason}</div>

              <div className="bg-white/5 rounded-lg p-3 text-sm text-white/70 whitespace-pre-wrap">
                {rec.message}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => copyMessage(rec.message, index)}
                  className="flex-1 py-2 border border-white/10 rounded-lg text-xs text-white/40 hover:text-white transition"
                >
                  {copied === index ? "Copied" : "Copy Message"}
                </button>
                <button
                  onClick={() => launchChannel(rec)}
                  className="flex-1 py-2 border border-emerald-500/20 rounded-lg text-xs text-emerald-300 hover:bg-emerald-500/10 transition"
                >
                  Send via {rec.channel}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
