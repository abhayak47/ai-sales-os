import { useState } from "react";
import { useNavigate } from "react-router-dom";

import API from "../api/axios";
import { useAuth } from "../context/AuthContext";

export default function Signup() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await API.post("/auth/signup", form);
      const loginData = new FormData();
      loginData.append("username", form.email);
      loginData.append("password", form.password);
      const loginRes = await API.post("/auth/login", loginData);
      login(null, loginRes.data.access_token);
      navigate("/onboarding");
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen app-shell text-white flex items-center">
      <div className="page-frame grid grid-cols-1 xl:grid-cols-[1fr_0.9fr] gap-10 py-10">
        <div className="hidden xl:block">
          <div className="hero-chip mb-6">Start Free</div>
          <h1 className="headline-display text-5xl font-semibold leading-tight mb-5">
            Stand up a better revenue system in minutes.
          </h1>
          <p className="text-white/60 text-lg leading-8 max-w-xl mb-8">
            Create your workspace, bring in live opportunities, and let the AI start building context around every deal.
          </p>

          <div className="grid grid-cols-1 gap-4 max-w-xl">
            {[
              "Free launch credits to test real AI workflows",
              "Customizable workspaces for different revenue roles",
              "Lead memory, meeting intelligence, and execution queues out of the box",
            ].map((item) => (
              <div key={item} className="premium-card px-5 py-4 text-white/70">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel rounded-[2rem] p-6 md:p-8 max-w-xl xl:ml-auto w-full">
          <div className="mb-8">
            <button onClick={() => navigate("/")} className="text-sm text-white/40 hover:text-white transition mb-5">
              Back to home
            </button>
            <div className="section-title mb-3">Create Account</div>
            <h2 className="text-3xl font-semibold mb-2">Launch your workspace</h2>
            <p className="text-white/50 text-sm">Set up the operating system for your pipeline, deal memory, and next-best actions.</p>
          </div>

          {error && (
            <div className="mb-5 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-white/60 mb-2 block">Full name</label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => setForm((current) => ({ ...current, full_name: e.target.value }))}
                placeholder="Alex Morgan"
                required
                className="input-surface"
              />
            </div>

            <div>
              <label className="text-sm text-white/60 mb-2 block">Work email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
                placeholder="alex@company.com"
                required
                className="input-surface"
              />
            </div>

            <div>
              <label className="text-sm text-white/60 mb-2 block">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((current) => ({ ...current, password: e.target.value }))}
                placeholder="Create a strong password"
                required
                className="input-surface"
              />
            </div>

            <button type="submit" disabled={loading} className="button-primary w-full disabled:opacity-50">
              {loading ? "Creating workspace..." : "Create free account"}
            </button>
          </form>

          <div className="text-sm text-white/45 mt-6">
            Already have an account?{" "}
            <button onClick={() => navigate("/login")} className="text-white hover:underline">
              Sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
