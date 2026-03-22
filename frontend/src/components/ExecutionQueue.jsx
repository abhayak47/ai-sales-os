import { useEffect, useState } from "react";

import API from "../api/axios";

const PRIORITY_STYLES = {
  critical: "text-red-300 border-red-500/20 bg-red-500/10",
  high: "text-amber-300 border-amber-500/20 bg-amber-500/10",
  medium: "text-blue-300 border-blue-500/20 bg-blue-500/10",
  low: "text-white/60 border-white/10 bg-white/[0.03]",
};

export default function ExecutionQueue({ leadId = null, compact = false, refreshKey = 0 }) {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQueue();
  }, [leadId, refreshKey]);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = leadId ? await API.get(`/tasks/lead/${leadId}`) : await API.get("/tasks/queue");
      setQueue(leadId ? res.data : res.data.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markCompleted = async (taskId) => {
    try {
      await API.patch(`/tasks/${taskId}`, { status: "completed" });
      fetchQueue();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="border border-white/10 rounded-2xl p-5 bg-white/[0.02]">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-semibold">Execution Queue</h3>
          <p className="text-white/40 text-sm">
            {leadId ? "Saved AI tasks and touches for this deal." : "Your AI-generated tasks, follow-ups, and sequence touches."}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-white/35 text-sm">Loading execution queue...</div>
      ) : queue.length === 0 ? (
        <div className="text-white/35 text-sm">
          No execution items yet. Activate the workflow from Strategy Lab to generate them.
        </div>
      ) : (
        <div className="space-y-3">
          {queue.map((task) => (
            <div key={task.id} className="border border-white/10 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="font-medium text-sm">{task.title}</span>
                    <span className={`text-[11px] px-2 py-1 rounded-full border ${PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.low}`}>
                      {task.priority}
                    </span>
                    <span className="text-[11px] px-2 py-1 rounded-full border border-white/10 text-white/45">
                      {task.kind.replace("_", " ")}
                    </span>
                  </div>
                  {task.description && <p className="text-white/65 text-sm mb-2">{task.description}</p>}
                  {task.subject && <div className="text-xs text-cyan-300 mb-1">Subject: {task.subject}</div>}
                  {task.content && !compact && (
                    <div className="text-sm text-white/75 whitespace-pre-wrap border border-white/10 rounded-lg p-3 bg-black/20">
                      {task.content}
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-3 text-xs text-white/35 flex-wrap">
                    {task.channel && <span>{task.channel}</span>}
                    {task.sequence_step && <span>Step {task.sequence_step}</span>}
                    {task.due_at && <span>Due {new Date(task.due_at).toLocaleString()}</span>}
                  </div>
                </div>
                <button
                  onClick={() => markCompleted(task.id)}
                  className="px-3 py-2 text-xs rounded-lg bg-white text-black font-semibold whitespace-nowrap"
                >
                  Complete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
