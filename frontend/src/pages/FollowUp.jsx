import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";

export default function FollowUp() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    context: "",
    client_type: "",
    tone: "",
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await API.post("/ai/followup", form);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const copyText = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
  };

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Sidebar */}
      <div className="w-64 border-r border-white/10 p-6 flex flex-col">
        <div className="text-xl font-bold mb-10">⚡ AI Sales OS</div>
        <nav className="flex flex-col gap-1 flex-1">
          {[
            { icon: "🏠", label: "Dashboard", path: "/dashboard" },
            { icon: "🤖", label: "AI Follow-Up", path: "/followup" },
            { icon: "👥", label: "Leads", path: "/leads" },
            { icon: "📊", label: "Analytics", path: "/dashboard" },
            { icon: "⚙️", label: "Settings", path: "/dashboard" },
          ].map((item, i) => (
            <button
              key={i}
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition text-left
                ${i === 1
                  ? "bg-white/10 text-white"
                  : "text-white/50 hover:text-white hover:bg-white/5"
                }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <button
          onClick={() => { localStorage.removeItem("token"); navigate("/"); }}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-white/40 hover:text-white hover:bg-white/5 transition"
        >
          <span>🚪</span>
          <span>Logout</span>
        </button>
      </div>

      {/* Main */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold mb-2">🤖 AI Follow-Up Generator</h1>
          <p className="text-white/40 text-sm mb-8">
            Describe your sales situation and AI will generate the perfect follow-up.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 mb-8">
            <div>
              <label className="text-sm text-white/60 mb-1 block">
                Sales Context
              </label>
              <textarea
                name="context"
                value={form.context}
                onChange={handleChange}
                placeholder="E.g. I met John at a networking event. He runs a digital agency and was interested in our AI tool but said he needs to think about it..."
                required
                rows={4}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-white/60 mb-1 block">
                  Client Type
                </label>
                <select
                  name="client_type"
                  value={form.client_type}
                  onChange={handleChange}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-white/30 transition"
                >
                  <option value="" className="bg-black">Select type</option>
                  <option value="Startup Founder" className="bg-black">Startup Founder</option>
                  <option value="Agency Owner" className="bg-black">Agency Owner</option>
                  <option value="Enterprise" className="bg-black">Enterprise</option>
                  <option value="Freelancer" className="bg-black">Freelancer</option>
                  <option value="SMB Owner" className="bg-black">SMB Owner</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-white/60 mb-1 block">Tone</label>
                <select
                  name="tone"
                  value={form.tone}
                  onChange={handleChange}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-white/30 transition"
                >
                  <option value="" className="bg-black">Select tone</option>
                  <option value="Professional" className="bg-black">Professional</option>
                  <option value="Friendly" className="bg-black">Friendly</option>
                  <option value="Confident" className="bg-black">Confident</option>
                  <option value="Casual" className="bg-black">Casual</option>
                  <option value="Urgent" className="bg-black">Urgent</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin">⚡</span>
                  Generating...
                </>
              ) : (
                "Generate Follow-Up Messages"
              )}
            </button>
          </form>

          {/* Results */}
          {result && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">✅ Generated Messages</h2>

              {[
                { label: "📧 Email", key: "email", content: result.email },
                { label: "💬 WhatsApp", key: "whatsapp", content: result.whatsapp },
                { label: "⚡ One-Liner", key: "short", content: result.short },
              ].map((item) => (
                <div
                  key={item.key}
                  className="border border-white/10 rounded-xl p-5 hover:border-white/20 transition"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium">{item.label}</span>
                    <button
                      onClick={() => copyText(item.content, item.key)}
                      className="text-xs text-white/40 hover:text-white transition px-3 py-1 border border-white/10 rounded-lg hover:border-white/30"
                    >
                      {copied === item.key ? "✅ Copied!" : "Copy"}
                    </button>
                  </div>
                  <p className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap">
                    {item.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}