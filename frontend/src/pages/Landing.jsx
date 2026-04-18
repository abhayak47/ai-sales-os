import { useNavigate } from "react-router-dom";

const FEATURE_TILES = [
  "High-density dashboards for sales teams",
  "AI summaries, playbooks, and next actions",
  "Clean pipelines, activities, and account context",
  "Fast navigation built for daily repetition",
];

const HIGHLIGHTS = [
  {
    title: "Pipeline that stays readable",
    description: "Compact cards, strong hierarchy, and information density that feels calm instead of crowded.",
  },
  {
    title: "AI where it helps",
    description: "Recommendations, summaries, and follow-up generation live beside the workflow rather than interrupting it.",
  },
  {
    title: "Built for frequent updates",
    description: "Everything is optimized for quick scanning, small edits, and fast movement between contacts, deals, and tasks.",
  },
];

function MarketingNav({ navigate }) {
  return (
    <nav className="page-frame flex items-center justify-between py-6">
      <button type="button" onClick={() => navigate("/")} className="flex items-center gap-3 text-white">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-400 via-fuchsia-500 to-rose-700 text-xs font-bold shadow-[0_14px_28px_rgba(207,17,69,0.26)]">
          S
        </div>
        <span className="text-lg font-semibold tracking-tight">Setu</span>
      </button>
      <div className="hidden items-center gap-8 text-sm text-white/60 md:flex">
        <button type="button" onClick={() => navigate("/pricing")} className="transition hover:text-white">Pricing</button>
        <button type="button" onClick={() => navigate("/login")} className="transition hover:text-white">About</button>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => navigate("/login")} className="text-sm font-medium text-white/70 transition hover:text-white">
          Log In
        </button>
        <button type="button" onClick={() => navigate("/signup")} className="rounded-full bg-[linear-gradient(180deg,#ff2f63,#cf1145)] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(207,17,69,0.24)] transition hover:-translate-y-px">
          Sign Up
        </button>
      </div>
    </nav>
  );
}

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="app-shell overflow-hidden text-white">
      <MarketingNav navigate={navigate} />

      <section className="page-frame relative flex min-h-[72vh] flex-col items-center justify-center py-16 text-center">
        <div className="pointer-events-none absolute inset-x-[-14%] top-6 h-[34rem] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06),transparent_42%)] opacity-80" />
        <div className="pointer-events-none absolute inset-0 opacity-45" style={{ background: "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.12), transparent 18%), radial-gradient(circle at 78% 32%, rgba(255,255,255,0.08), transparent 16%), radial-gradient(circle at 50% 70%, rgba(255,47,99,0.1), transparent 22%)" }} />

        <div className="hero-chip fade-rise">Now in early access</div>
        <h1 className="headline-display fade-rise mt-7 max-w-4xl text-5xl font-extrabold leading-[0.92] text-white md:text-7xl">
          The CRM your team actually wants to use
        </h1>
        <p className="fade-rise mt-6 max-w-2xl text-lg leading-8 text-white/55">
          Setu CRM helps you manage leads, automate workflows, and close deals faster with an interface designed for speed, density, and clarity.
        </p>

        <div className="fade-rise mt-9 flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={() => navigate("/signup")} className="button-primary min-w-[144px]">
            Get Started
          </button>
          <button type="button" onClick={() => navigate("/pricing")} className="button-secondary min-w-[144px]">
            Learn More
          </button>
        </div>

        <div className="mt-14 grid w-full max-w-5xl grid-cols-1 gap-4 md:grid-cols-4">
          {FEATURE_TILES.map((item, index) => (
            <div key={item} className="premium-card fade-rise px-4 py-4 text-left text-sm text-white/68" style={{ animationDelay: `${index * 60}ms` }}>
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="page-frame pb-20">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {HIGHLIGHTS.map((item, index) => (
            <div key={item.title} className="premium-card fade-rise p-6" style={{ animationDelay: `${index * 70}ms` }}>
              <div className="mb-3 text-lg font-semibold">{item.title}</div>
              <div className="text-sm leading-7 text-white/55">{item.description}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
