import { useNavigate } from "react-router-dom";

const DIFFERENTIATORS = [
  {
    title: "Command, not admin",
    desc: "The system decides what deserves attention next, drafts the move, and keeps execution alive.",
  },
  {
    title: "Deal memory that compounds",
    desc: "Every meeting, note, AI output, and pinned fact sharpens future recommendations instead of disappearing.",
  },
  {
    title: "Built for modern revenue teams",
    desc: "Founders, closers, and expansion teams can run different workspaces from the same operating system.",
  },
];

const SIGNALS = [
  "Lead-aware AI decisioning",
  "Timeline-based meeting intelligence",
  "Execution queues and next-best action",
  "Custom workspaces and saved views",
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen app-shell text-white">
      <nav className="page-frame flex items-center justify-between py-6">
        <button onClick={() => navigate("/")} className="text-xl font-bold tracking-tight">
          AI Sales OS
        </button>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/login")} className="button-secondary text-sm">
            Login
          </button>
          <button onClick={() => navigate("/signup")} className="button-primary text-sm">
            Start free
          </button>
        </div>
      </nav>

      <section className="page-frame grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-10 py-14 md:py-20">
        <div className="flex flex-col justify-center">
          <div className="hero-chip mb-6">Revenue Operating System</div>
          <h1 className="headline-display text-5xl md:text-7xl font-semibold leading-[0.96] mb-6">
            The AI workspace that helps teams actually move deals forward.
          </h1>
          <p className="text-lg text-white/60 max-w-2xl leading-8 mb-8">
            AI Sales OS is not another CRM that just stores records. It understands the timeline, remembers the deal,
            prioritizes the next move, prepares the rep, and turns strategy into execution.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <button onClick={() => navigate("/signup")} className="button-primary text-base">
              Launch the workspace
            </button>
            <button onClick={() => navigate("/login")} className="button-secondary text-base">
              Open existing account
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
            {SIGNALS.map((item) => (
              <div key={item} className="premium-card px-4 py-4 text-sm text-white/70">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel rounded-[2rem] p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="section-title mb-2">Live Command Preview</div>
              <div className="text-2xl font-semibold">Today&apos;s operating pulse</div>
            </div>
            <div className="px-3 py-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 text-sm">
              Active
            </div>
          </div>

          <div className="space-y-4">
            <div className="premium-card p-5">
              <div className="text-sm text-white/40 mb-2">Priority deal</div>
              <div className="text-xl font-semibold mb-2">Krushnakant Kawade · CWW Ltd</div>
              <p className="text-white/65 text-sm leading-7">
                Buyer is interested, commercial framing has been discussed, and the next winning move is a market-fit
                recommendation tied to export growth opportunity.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="metric-card p-4">
                <div className="text-xs text-white/35 mb-1">Urgency</div>
                <div className="text-3xl font-semibold">Critical</div>
              </div>
              <div className="metric-card p-4">
                <div className="text-xs text-white/35 mb-1">Next move</div>
                <div className="text-base font-semibold">Meeting prep + tailored note</div>
              </div>
            </div>

            <div className="premium-card p-5">
              <div className="text-sm text-white/40 mb-3">Why teams switch</div>
              <div className="space-y-3">
                {DIFFERENTIATORS.map((item) => (
                  <div key={item.title}>
                    <div className="font-medium">{item.title}</div>
                    <div className="text-sm text-white/55 mt-1">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="page-frame py-10 md:py-16">
        <div className="hero-chip mb-5">Built to Win Global Buyers</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              title: "Founder mode",
              desc: "Revenue pulse, decision deals, and risk visibility for teams where every deal matters.",
            },
            {
              title: "Closer mode",
              desc: "High-pressure execution views for reps who want signal, not noise or CRM clutter.",
            },
            {
              title: "Expansion mode",
              desc: "Customer growth workflows that bring post-sale intelligence into the same operating layer.",
            },
          ].map((item) => (
            <div key={item.title} className="premium-card p-6">
              <div className="text-lg font-semibold mb-2">{item.title}</div>
              <div className="text-sm text-white/55 leading-7">{item.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="page-frame py-8 text-sm text-white/35 border-t border-white/10">
        AI Sales OS · Built for teams that want execution, context, and taste.
      </footer>
    </div>
  );
}
