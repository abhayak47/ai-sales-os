import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "₹0",
    period: "forever",
    credits: 10,
    color: "border-white/10",
    buttonStyle: "border border-white/20 text-white hover:bg-white/5",
    features: [
      "10 AI Credits",
      "AI Follow-Up Generator",
      "Lead Manager (up to 10 leads)",
      "Basic Dashboard",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "₹999",
    period: "per month",
    credits: 100,
    color: "border-purple-500/50",
    badge: "Most Popular",
    buttonStyle: "bg-purple-600 text-white hover:bg-purple-500",
    features: [
      "100 AI Credits/month",
      "AI Follow-Up Generator",
      "AI Sales Brain Analysis",
      "Unlimited Leads",
      "Priority Support",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "₹2999",
    period: "per month",
    credits: 500,
    color: "border-white/20",
    buttonStyle: "bg-white text-black hover:bg-white/90",
    features: [
      "500 AI Credits/month",
      "Everything in Pro",
      "Team Access (coming soon)",
      "API Access (coming soon)",
      "Dedicated Support",
    ],
  },
];

export default function Pricing() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(null);

  const handleUpgrade = async (planId) => {
    if (planId === "free") return;

    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/signup");
      return;
    }

    setLoading(planId);
    try {
      const res = await API.post("/payments/create-order", { plan: planId });
      const { order_id, amount, currency, key_id } = res.data;

      const options = {
        key: key_id,
        amount: amount,
        currency: currency,
        name: "AI Sales OS",
        description: `${planId.charAt(0).toUpperCase() + planId.slice(1)} Plan`,
        order_id: order_id,
        handler: async function (response) {
          try {
            const verifyRes = await API.post("/payments/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan: planId,
            });
            alert(`🎉 Payment successful! ${verifyRes.data.credits_added} credits added!`);
            navigate("/dashboard");
          } catch (err) {
            alert("Payment verification failed. Contact support.");
          }
        },
        prefill: { name: "", email: "" },
        theme: { color: "#7c3aed" },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <div
          className="text-xl font-bold cursor-pointer"
          onClick={() => navigate("/")}
        >
          ⚡ AI Sales OS
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="px-4 py-2 text-sm text-white/70 hover:text-white transition"
          >
            Dashboard
          </button>
        </div>
      </nav>

      {/* Header */}
      <div className="text-center py-16 px-6">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Simple, Transparent Pricing
        </h1>
        <p className="text-white/40 text-lg max-w-xl mx-auto">
          Start free. Upgrade when you're ready to close more deals.
        </p>
      </div>

      {/* Plans */}
      <div className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`border ${plan.color} rounded-2xl p-8 relative flex flex-col`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs px-4 py-1 rounded-full">
                  {plan.badge}
                </div>
              )}

              <div className="mb-6">
                <h2 className="text-xl font-bold mb-2">{plan.name}</h2>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-white/40 text-sm">{plan.period}</span>
                </div>
                <div className="text-white/40 text-sm mt-1">
                  {plan.credits} AI Credits
                </div>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-white/70">
                    <span className="text-green-400">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleUpgrade(plan.id)}
                disabled={loading === plan.id || plan.id === "free"}
                className={`w-full py-3 rounded-lg font-semibold transition disabled:opacity-50 ${plan.buttonStyle}`}
              >
                {loading === plan.id
                  ? "Processing..."
                  : plan.id === "free"
                  ? "Current Plan"
                  : `Upgrade to ${plan.name}`}
              </button>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-20">
          <h2 className="text-2xl font-bold text-center mb-10">
            Frequently Asked Questions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                q: "What are AI Credits?",
                a: "Each AI action (follow-up generation, lead analysis) uses 1 credit.",
              },
              {
                q: "Can I cancel anytime?",
                a: "Yes! No contracts. Cancel anytime from your dashboard.",
              },
              {
                q: "Is my data safe?",
                a: "Yes. Your data is encrypted and never shared with third parties.",
              },
              {
                q: "Do unused credits roll over?",
                a: "Credits are valid for 30 days from purchase date.",
              },
            ].map((faq, i) => (
              <div key={i} className="border border-white/10 rounded-xl p-6">
                <h3 className="font-semibold mb-2">{faq.q}</h3>
                <p className="text-white/40 text-sm">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}