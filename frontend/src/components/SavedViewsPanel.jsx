import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import API from "../api/axios";

const ACCENTS = {
  fuchsia: "border-fuchsia-500/20 bg-fuchsia-500/8 text-fuchsia-200",
  amber: "border-amber-500/20 bg-amber-500/8 text-amber-200",
  emerald: "border-emerald-500/20 bg-emerald-500/8 text-emerald-200",
};

export default function SavedViewsPanel({ compact = false }) {
  const navigate = useNavigate();
  const [views, setViews] = useState([]);

  useEffect(() => {
    fetchViews();
  }, []);

  const fetchViews = async () => {
    try {
      const res = await API.get("/leads/views");
      setViews(res.data.views || []);
    } catch (err) {
      console.error(err);
    }
  };

  if (views.length === 0) return null;

  return (
    <div className="border border-white/10 rounded-2xl p-5 bg-white/[0.02]">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-semibold">Saved views</h3>
          <p className="text-white/40 text-sm">One-click access to your filtered lead lists.</p>
        </div>
      </div>

      <div className={`grid gap-3 ${compact ? "grid-cols-1" : "grid-cols-1 xl:grid-cols-3"}`}>
        {views.map((view) => (
          <button
            key={view.id}
            onClick={() => navigate(view.path)}
            className={`text-left border rounded-2xl p-4 transition hover:border-white/30 ${ACCENTS[view.accent] || ACCENTS.fuchsia}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium">{view.label}</div>
                <div className="text-sm text-white/55 mt-1">{view.description}</div>
              </div>
              <div className="text-2xl font-bold text-white">{view.count}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
