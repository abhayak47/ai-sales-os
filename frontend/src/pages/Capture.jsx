import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import API from "../api/axios";

export default function Capture() {
  const { username } = useParams();
  const [ownerName, setOwnerName] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    notes: "",
  });

  useEffect(() => {
    fetchOwner();
  }, [username]);

  const fetchOwner = async () => {
    try {
      const res = await API.get(`/capture/user/${username}`);
      setOwnerName(res.data.name);
    } catch (err) {
      setNotFound(true);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await API.post(`/capture/user/${username}`, form);
      setSubmitted(true);
    } catch (err) {
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (notFound) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold mb-2">Page Not Found</h1>
          <p className="text-white/40">This capture page doesn't exist.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="text-6xl mb-6">🎉</div>
          <h1 className="text-3xl font-bold mb-4">Thank You!</h1>
          <p className="text-white/60 text-lg mb-2">
            Your details have been submitted successfully.
          </p>
          <p className="text-white/40">
            {ownerName} will be in touch with you soon.
          </p>
          <div className="mt-8 text-white/20 text-sm">
            Powered by ⚡ AI Sales OS
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-4">👋</div>
          <h1 className="text-2xl font-bold mb-2">
            Connect with {ownerName}
          </h1>
          <p className="text-white/40">
            Fill in your details and we'll be in touch soon.
          </p>
        </div>

        {/* Form */}
        <div className="border border-white/10 rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-white/60 mb-1 block">
                Full Name *
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="John Doe"
                required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition"
              />
            </div>

            <div>
              <label className="text-sm text-white/60 mb-1 block">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="john@example.com"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition"
              />
            </div>

            <div>
              <label className="text-sm text-white/60 mb-1 block">Phone</label>
              <input
                type="text"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="+91 98765 43210"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition"
              />
            </div>

            <div>
              <label className="text-sm text-white/60 mb-1 block">
                Company
              </label>
              <input
                type="text"
                name="company"
                value={form.company}
                onChange={handleChange}
                placeholder="Acme Corp"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition"
              />
            </div>

            <div>
              <label className="text-sm text-white/60 mb-1 block">
                Message / How can we help?
              </label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                placeholder="Tell us about your needs..."
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition disabled:opacity-50"
            >
              {loading ? "Submitting..." : "Submit →"}
            </button>
          </form>
        </div>

        <div className="text-center mt-6 text-white/20 text-sm">
          Powered by ⚡ AI Sales OS
        </div>
      </div>
    </div>
  );
}
