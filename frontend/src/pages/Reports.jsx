import { useEffect, useState } from "react";

import API from "../api/axios";
import Sidebar from "../components/Sidebar";

export default function Reports() {
  const [report, setReport] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      try {
        const res = await API.get("/dashboard/reporting");
        if (!cancelled) {
          setReport(res.data);
        }
      } catch (err) {
        console.error(err);
      }
    }

    loadReport();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white flex">
      <Sidebar />
      <div className="flex-1 overflow-y-auto mt-16 md:mt-0 p-4 md:p-8">
        <div className="mb-6">
          <div className="text-xs uppercase tracking-[0.2em] text-white/35 mb-2">Reporting</div>
          <h1 className="text-2xl md:text-3xl font-bold">Real-time revenue analytics with operational context</h1>
          <p className="text-white/45 text-sm mt-2 max-w-3xl">
            See stage movement, segment mix, activity volume, and the reminders most likely to affect next week’s pipeline.
          </p>
        </div>

        {!report ? (
          <div className="premium-card p-6 text-white/40">Loading reports...</div>
        ) : (
          <>
            <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 mb-6">
              {[
                ["Total leads", report.summary.total_leads],
                ["Open pipeline", report.summary.open_pipeline],
                ["Converted", report.summary.converted],
                ["At risk", report.summary.at_risk],
                ["Open tasks", report.summary.open_tasks],
              ].map(([label, value]) => (
                <div key={label} className="premium-card p-5">
                  <div className="text-xs text-white/35 mb-2">{label}</div>
                  <div className="text-3xl font-bold">{value}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              {[
                ["Segment Breakdown", report.segments],
                ["Stage Breakdown", report.statuses],
                ["Activity Mix", report.activities],
              ].map(([title, items]) => (
                <div key={title} className="premium-card p-5">
                  <div className="text-base font-semibold mb-4">{title}</div>
                  <div className="space-y-3">
                    {items.length === 0 ? (
                      <div className="text-sm text-white/40">No data yet.</div>
                    ) : (
                      items.map((item) => (
                        <div key={item.label} className="flex items-center justify-between gap-3">
                          <span className="text-white/60">{item.label}</span>
                          <span className="font-semibold">{item.count}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="premium-card p-5 mt-4">
              <div className="text-base font-semibold mb-4">Upcoming reminders</div>
              <div className="space-y-3">
                {report.reminders.length === 0 ? (
                  <div className="text-sm text-white/40">No reminders scheduled.</div>
                ) : (
                  report.reminders.map((reminder, index) => (
                    <div key={`${reminder.title}-${index}`} className="border border-white/10 rounded-2xl p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium">{reminder.title}</div>
                        <div className="text-xs text-white/35">{reminder.priority}</div>
                      </div>
                      <div className="text-sm text-white/45 mt-2">
                        {reminder.due_at ? new Date(reminder.due_at).toLocaleString() : "No due date"}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
