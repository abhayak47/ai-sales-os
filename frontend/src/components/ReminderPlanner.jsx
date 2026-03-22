import { useState } from "react";

import API from "../api/axios";
import ExecutionQueue from "./ExecutionQueue";

const EMPTY_TASK = {
  title: "",
  description: "",
  priority: "medium",
  channel: "email",
  dueAt: "",
};

export default function ReminderPlanner({ leadId }) {
  const [form, setForm] = useState(EMPTY_TASK);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post("/tasks/", {
        lead_id: Number(leadId),
        title: form.title,
        description: form.description,
        priority: form.priority,
        channel: form.channel,
        kind: "reminder",
        due_at: form.dueAt ? new Date(form.dueAt).toISOString() : undefined,
      });
      setForm(EMPTY_TASK);
      setRefreshKey((current) => current + 1);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="premium-card p-5">
        <div className="text-base font-semibold mb-2">Manual Tasks and Reminders</div>
        <div className="text-sm text-white/45 mb-4">Create follow-ups and deadlines even when the AI did not generate them yet.</div>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            value={form.title}
            onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
            placeholder="Reminder title"
            className="input-surface"
            required
          />
          <input
            value={form.dueAt}
            onChange={(e) => setForm((current) => ({ ...current, dueAt: e.target.value }))}
            type="datetime-local"
            className="input-surface"
          />
          <select
            value={form.priority}
            onChange={(e) => setForm((current) => ({ ...current, priority: e.target.value }))}
            className="input-surface"
          >
            {["low", "medium", "high", "critical"].map((priority) => (
              <option key={priority} value={priority} className="bg-black">
                {priority}
              </option>
            ))}
          </select>
          <select
            value={form.channel}
            onChange={(e) => setForm((current) => ({ ...current, channel: e.target.value }))}
            className="input-surface"
          >
            {["email", "whatsapp", "call", "note"].map((channel) => (
              <option key={channel} value={channel} className="bg-black">
                {channel}
              </option>
            ))}
          </select>
          <textarea
            value={form.description}
            onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
            rows={4}
            placeholder="What needs to happen?"
            className="input-surface resize-none md:col-span-2"
          />
          <button className="button-primary md:col-span-2">Create reminder</button>
        </form>
      </div>

      <ExecutionQueue leadId={leadId} refreshKey={refreshKey} />
    </div>
  );
}
