import { useState } from "react";
import { useNavigate } from "react-router-dom";

import API from "../api/axios";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const loginData = new FormData();
      loginData.append("username", form.email);
      loginData.append("password", form.password);
      const res = await API.post("/auth/login", loginData);
      login(null, res.data.access_token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen app-shell text-white flex items-center">
      <div className="page-frame grid grid-cols-1 xl:grid-cols-[0.95fr_1.05fr] gap-10 py-10">
        <div className="hidden xl:flex flex-col justify-between">
          <div>
            <div className="hero-chip mb-6">Welcome Back</div>
            <h1 className="headline-display text-5xl font-semibold leading-tight mb-5">
              Step back into the revenue workspace.
            </h1>
            <p className="text-white/60 text-lg leading-8 max-w-xl">
              Open the command center, review what the AI knows about your deals, and continue executing without losing context.
            </p>
          </div>

          <div className="space-y-4">
            {[
              "Lead-aware AI that remembers the timeline",
              "Role-based workspace layouts for founders, closers, and expansion teams",
              "Execution-first workflows instead of passive CRM admin",
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
            <div className="section-title mb-3">Login</div>
            <h2 className="text-3xl font-semibold mb-2">Access your workspace</h2>
            <p className="text-white/50 text-sm">Continue where your last deal review, meeting intel, or action queue left off.</p>
          </div>

          {error && (
            <div className="mb-5 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-white/60 mb-2 block">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
                placeholder="you@company.com"
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
                placeholder="Enter your password"
                required
                className="input-surface"
              />
            </div>

            <button type="submit" disabled={loading} className="button-primary w-full disabled:opacity-50">
              {loading ? "Signing you in..." : "Enter workspace"}
            </button>
          </form>

          <div className="text-sm text-white/45 mt-6">
            New here?{" "}
            <button onClick={() => navigate("/signup")} className="text-white hover:underline">
              Create your account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
