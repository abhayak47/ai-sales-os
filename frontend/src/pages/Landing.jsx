import { useNavigate } from "react-router-dom";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <div className="text-xl font-bold text-white">⚡ AI Sales OS</div>
        <div className="flex gap-4">
          <button
            onClick={() => navigate("/login")}
            className="px-4 py-2 text-sm text-white/70 hover:text-white transition"
          >
            Login
          </button>
          <button
            onClick={() => navigate("/signup")}
            className="px-4 py-2 text-sm bg-white text-black rounded-lg font-medium hover:bg-white/90 transition"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="flex flex-col items-center justify-center text-center px-6 py-32">
        <div className="text-sm text-white/50 mb-4 uppercase tracking-widest">
          AI-Powered Sales System
        </div>
        <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
          Close More Deals. <br />
          <span className="text-white/40">With AI.</span>
        </h1>
        <p className="text-lg text-white/50 max-w-xl mb-10">
          AI Sales OS helps freelancers, agencies and founders automate
          follow-ups, manage leads and win more clients — faster.
        </p>
        <div className="flex gap-4">
          <button
            onClick={() => navigate("/signup")}
            className="px-6 py-3 bg-white text-black rounded-lg font-semibold hover:bg-white/90 transition"
          >
            Start for Free
          </button>
          <button
            onClick={() => navigate("/login")}
            className="px-6 py-3 border border-white/20 rounded-lg text-white/70 hover:text-white hover:border-white/40 transition"
          >
            Login →
          </button>
        </div>
      </div>

      {/* Features */}
      <div className="px-8 py-20 border-t border-white/10">
        <h2 className="text-center text-3xl font-bold mb-16">
          Everything you need to close deals
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {[
            {
              icon: "🤖",
              title: "AI Follow-Up Generator",
              desc: "Generate personalized follow-up emails and messages in seconds.",
            },
            {
              icon: "📊",
              title: "Lead Manager",
              desc: "Track your leads, status and notes in one clean place.",
            },
            {
              icon: "⚡",
              title: "Sales Insights",
              desc: "Get AI-driven insights to close deals faster.",
            },
          ].map((f, i) => (
            <div
              key={i}
              className="p-6 border border-white/10 rounded-xl hover:border-white/30 transition"
            >
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-white/50 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-8 border-t border-white/10 text-white/30 text-sm">
        © 2026 AI Sales OS. Built for closers.
      </div>
    </div>
  );
}