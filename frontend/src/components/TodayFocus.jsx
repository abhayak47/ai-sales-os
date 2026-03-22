import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import API from "../api/axios";

const PRIORITY_COLORS = {
  high: "border-red-500/20 bg-red-500/[0.04]",
  medium: "border-amber-500/20 bg-amber-500/[0.04]",
  low: "border-sky-500/20 bg-sky-500/[0.04]",
};

export default function TodayFocus({ limit = 3 }) {
  const navigate = useNavigate();
  const [focus, setFocus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFocus();
  }, []);

  const fetchFocus = async () => {
    try {
      const res = await API.get("/dashboard/today-focus");
      setFocus(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="border border-white/10 rounded-2xl p-5 animate-pulse">
        <div className="h-4 bg-white/10 rounded w-1/3 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-white/5 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!focus) return null;

  return (
    <div className="border border-white/10 rounded-2xl p-5 bg-white/[0.02]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold">Today&apos;s Focus</h2>
          <p className="text-white/40 text-xs mt-1">{focus.date}</p>
        </div>
        <span className="text-xs text-white/30 bg-white/5 px-3 py-1 rounded-full">
          {focus.actions.length} actions
        </span>
      </div>

      <div className="space-y-3">
        {focus.actions.slice(0, limit).map((action, i) => (
          <button
            key={`${action.title}-${i}`}
            onClick={() => navigate(action.action_path)}
            className={`w-full text-left flex items-center gap-4 p-4 border rounded-xl transition hover:border-white/25 ${PRIORITY_COLORS[action.priority]}`}
          >
            <div className="w-10 h-10 rounded-xl border border-white/10 bg-black/30 flex items-center justify-center text-sm font-semibold text-white/70">
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{action.title}</div>
              <div className="text-white/40 text-xs mt-1">{action.desc}</div>
            </div>
            {action.credits > 0 && (
              <span className="text-xs text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-1 rounded-full">
                {action.credits} cr
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
