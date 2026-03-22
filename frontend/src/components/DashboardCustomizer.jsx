const SECTION_OPTIONS = [
  { key: "stats", label: "KPI strip", description: "Top-line metrics and pipeline pulse." },
  { key: "savedViews", label: "Saved views", description: "Quick access to high-value lead segments." },
  { key: "priorityPlays", label: "Priority plays", description: "AI-ranked deal moves from command center." },
  { key: "todayFocus", label: "Today focus", description: "Daily operating shortlist." },
  { key: "executionQueue", label: "Execution queue", description: "Next tasks, follow-ups, and sequences." },
  { key: "riskRadar", label: "Risk radar", description: "Deals most likely to slip." },
  { key: "pipelineOverview", label: "Pipeline overview", description: "Stage distribution and movement." },
  { key: "utilities", label: "Revenue utilities", description: "Coach, follow-up, sequence, and capture tools." },
];

const DENSITY_OPTIONS = [
  { value: "comfortable", label: "Comfortable" },
  { value: "compact", label: "Compact" },
  { value: "focused", label: "Focused" },
];

export default function DashboardCustomizer({
  open,
  mode,
  density,
  sections,
  onClose,
  onModeChange,
  onDensityChange,
  onSectionToggle,
  onReset,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-xl h-full overflow-y-auto border-l border-white/10 bg-neutral-950 p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-white/35 mb-2">Customize Workspace</div>
            <h2 className="text-2xl font-bold mb-2">Shape the dashboard around your workflow</h2>
            <p className="text-sm text-white/45 leading-6">
              Choose a workspace mode, then hide or show the panels that actually help you close, expand, or operate.
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-2 border border-white/10 rounded-xl text-sm text-white/60 hover:text-white transition"
          >
            Close
          </button>
        </div>

        <div className="border border-white/10 rounded-2xl p-5 mb-5 bg-white/[0.02]">
          <div className="text-sm font-semibold mb-3">Workspace mode</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              ["founder", "Founder", "Pipeline pulse, risk, and growth visibility."],
              ["closer", "Closer", "High-urgency deals and execution first."],
              ["csm", "CSM Expansion", "Expansion, renewals, and customer motion."],
            ].map(([value, label, description]) => (
              <button
                key={value}
                onClick={() => onModeChange(value)}
                className={`text-left border rounded-2xl p-4 transition ${
                  mode === value ? "border-white/30 bg-white/[0.06]" : "border-white/10 hover:border-white/20"
                }`}
              >
                <div className="font-medium">{label}</div>
                <div className="text-xs text-white/45 mt-1">{description}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="border border-white/10 rounded-2xl p-5 mb-5 bg-white/[0.02]">
          <div className="text-sm font-semibold mb-3">Density</div>
          <div className="flex flex-wrap gap-2">
            {DENSITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => onDensityChange(option.value)}
                className={`px-4 py-2 rounded-xl text-sm border transition ${
                  density === option.value ? "border-white/30 bg-white/[0.08] text-white" : "border-white/10 text-white/55"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="border border-white/10 rounded-2xl p-5 bg-white/[0.02]">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <div className="text-sm font-semibold">Visible panels</div>
              <div className="text-xs text-white/45 mt-1">Turn sections on or off based on your role and working style.</div>
            </div>
            <button
              onClick={onReset}
              className="px-3 py-2 border border-white/10 rounded-xl text-xs text-white/60 hover:text-white transition"
            >
              Reset mode defaults
            </button>
          </div>

          <div className="space-y-3">
            {SECTION_OPTIONS.map((section) => (
              <button
                key={section.key}
                onClick={() => onSectionToggle(section.key)}
                className="w-full text-left border border-white/10 rounded-xl p-4 hover:border-white/20 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-sm">{section.label}</div>
                    <div className="text-xs text-white/45 mt-1">{section.description}</div>
                  </div>
                  <div
                    className={`w-11 h-6 rounded-full border transition relative ${
                      sections[section.key] ? "border-emerald-500/30 bg-emerald-500/20" : "border-white/10 bg-white/5"
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition ${
                        sections[section.key] ? "left-6" : "left-1"
                      }`}
                    />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
