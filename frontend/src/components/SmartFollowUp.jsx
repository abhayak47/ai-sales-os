import { useState, useEffect } from "react";
import API from "../api/axios";

const CHANNEL_ICONS = {
  WhatsApp: "💬",
  Email: "📧",
  Call: "📞",
  LinkedIn: "💼",
};

const CHANNEL_COLORS = {
  WhatsApp: "border-green-500/30 bg-green-500/5 text-green-400",
  Email: "border-blue-500/30 bg-blue-500/5 text-blue-400",
  Call: "border-red-500/30 bg-red-500/5 text-red-400",
  LinkedIn: "border-purple-500/30 bg-purple-500/5 text-purple-400",
};

export default function SmartFollowUp({ leadId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    fetchRecommendations();
  }, [leadId]);

  const fetchRecommendations = async () => {
    try {
      const res = await API.get(`/dashboard/smart-followup/${leadId}`);
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const copyMessage = (message, index) => {
    navigator.clipboard.writeText(message);
    setCopied(index);
    setTimeout(() => setCopied(null), 2000);
  };

  const sendWhatsApp = (message) => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-3xl animate-pulse">⚡</div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="border border-white/10 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">⚡ Smart Follow-Up Engine</h3>
            <p className="text-white/40 text-sm mt-1">
              AI recommendations — no credits needed
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
            <div className="text-sm font-medium truncate">
              {data.last_activity}
            </div>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-xs text-white/40 mb-1">Total Activities</div>
            <div className="text-sm font-medium">{data.activity_count}</div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {data.recommendations.length === 0 ? (
        <div className="text-center py-12 border border-white/10 rounded-xl">
          <div className="text-3xl mb-3">✅</div>
          <div className="text-white/40 text-sm">
            No follow-up needed right now!
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {data.recommendations.map((rec, i) => (
            <div
              key={i}
              className="border border-white/10 rounded-xl p-5 space-y-3"
            >
              {/* Channel + Timing */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-3 py-1 rounded-full border font-medium ${
                      CHANNEL_COLORS[rec.channel] ||
                      "border-white/20 text-white/60"
                    }`}
                  >
                    {CHANNEL_ICONS[rec.channel]} {rec.channel}
                  </span>
                  <span className="text-xs text-white/40 bg-white/5 px-3 py-1 rounded-full">
                    📅 {rec.timing}
                  </span>
                </div>
              </div>

              {/* Reason */}
              <div className="text-xs text-white/40 italic">
                💡 {rec.reason}
              </div>

              {/* Message */}
              <div className="bg-white/5 rounded-lg p-3 text-sm text-white/70">
                {rec.message}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => copyMessage(rec.message, i)}
                  className="flex-1 py-2 border border-white/10 rounded-lg text-xs text-white/40 hover:text-white transition"
                >
                  {copied === i ? "✅ Copied!" : "Copy Message"}
                </button>
                {rec.channel === "WhatsApp" && (
                  <button
                    onClick={() => sendWhatsApp(rec.message)}
                    className="flex-1 py-2 border border-green-500/20 rounded-lg text-xs text-green-400 hover:bg-green-500/10 transition"
                  >
                    📱 Send WhatsApp
                  </button>
                )}
                {rec.channel === "Email" && (
                  <button
                    onClick={() =>
                      window.open(`mailto:${data.lead_email || ""}?body=${encodeURIComponent(rec.message)}`)
                    }
                    className="flex-1 py-2 border border-blue-500/20 rounded-lg text-xs text-blue-400 hover:bg-blue-500/10 transition"
                  >
                    📧 Open Email
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}