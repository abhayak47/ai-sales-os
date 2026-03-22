import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";

const PRIORITY_COLORS = {
  high: "border-red-500/30 bg-red-500/5",
  medium: "border-yellow-500/30 bg-yellow-500/5",
  low: "border-blue-500/30 bg-blue-500/5",
};

const ICON_MAP = {
  Fire: "!",
  Wave: "+",
  Chat: ">",
  Plus: "+",
  Brain: "*",
};

export default function TodayFocus() {
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
      <div className="border border-white/10 rounded-xl p-5 animate-pulse">
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
    <div className="border border-white/10 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold">🎯 Today's Focus</h2>
          <p className="text-white/40 text-xs mt-1">{focus.date}</p>
        </div>
        <span className="text-xs text-white/30 bg-white/5 px-3 py-1 rounded-full">
          {focus.actions.length} actions
        </span>
      </div>

      <div className="space-y-3">
        {focus.actions.map((action, i) => (
          <div
            key={i}
            onClick={() => navigate(action.action_path)}
            className={`flex items-center gap-4 p-3 border rounded-lg cursor-pointer hover:opacity-80 transition ${PRIORITY_COLORS[action.priority]}`}
          >
            <span className="text-2xl flex-shrink-0">{ICON_MAP[action.icon] || action.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{action.title}</div>
              <div className="text-white/40 text-xs truncate">{action.desc}</div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {action.credits > 0 && (
                <span className="text-xs text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-1 rounded-full">
                  {action.credits} cr
                </span>
              )}
              <span className="text-white/20 text-sm">→</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
