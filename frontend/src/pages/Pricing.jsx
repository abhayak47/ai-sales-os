import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import API from "../api/axios";

const FREE_PLAN = {
  id: "free",
  name: "Explorer",
  price: 0,
  credits: 25,
  description: "For evaluating the workspace with real deals before you scale usage.",
  billing_type: "free",
  buttonLabel: "Current Plan",
  features: [
    "25 launch credits",
    "Lead workspace and pipeline board",
    "AI follow-up and sales coach",
    "Deal command center and meeting intel",
  ],
};

function formatPrice(price) {
  return price ? `Rs ${(price / 100).toLocaleString()}` : "Rs 0";
}

function buildPaidFeatureList(plan) {
  return [
    ...(plan.features || []),
    "Lead memory and saved output history",
    "Workspace customization and saved views",
    "Execution queues and meeting prep",
  ];
}

export default function Pricing() {
  const navigate = useNavigate();
  const [packs, setPacks] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(null);
  const [plansLoading, setPlansLoading] = useState(true);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await API.get("/payments/plans");
      const hasGroupedPlans = res.data?.packs || res.data?.subscriptions;
      const packSource = hasGroupedPlans ? res.data.packs || {} : {};
      const subscriptionSource = hasGroupedPlans ? res.data.subscriptions || {} : {};

      setPacks(Object.entries(packSource).map(([id, plan]) => ({ id, ...plan })));
      setSubscriptions(Object.entries(subscriptionSource).map(([id, plan]) => ({ id, ...plan })));
    } catch {
      setPacks([]);
      setSubscriptions([]);
    } finally {
      setPlansLoading(false);
    }
  };

  const handlePackPurchase = async (planId) => {
    if (!localStorage.getItem("token")) {
      navigate("/signup");
      return;
    }

    setLoading(planId);
    try {
      const res = await API.post("/payments/create-order", { plan: planId });
      const { order_id, amount, currency, key_id, plan_name } = res.data;
      new window.Razorpay({
        key: key_id,
        amount,
        currency,
        name: "AI Sales OS",
        description: plan_name,
        order_id,
        handler: async (response) => {
          const verifyRes = await API.post("/payments/verify", {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            plan: planId,
          });
          alert(`${verifyRes.data.plan_name} unlocked. ${verifyRes.data.credits_added} credits added.`);
          navigate("/dashboard");
        },
        theme: { color: "#0f172a" },
      }).open();
    } catch {
      alert("Could not start the purchase flow.");
    } finally {
      setLoading(null);
    }
  };

  const handleSubscriptionPurchase = async (planId) => {
    if (!localStorage.getItem("token")) {
      navigate("/signup");
      return;
    }

    setLoading(planId);
    try {
      const res = await API.post("/payments/create-subscription", { plan: planId });
      const { subscription_id, amount, currency, key_id, plan_name } = res.data;
      new window.Razorpay({
        key: key_id,
        subscription_id,
        amount,
        currency,
        name: "AI Sales OS",
        description: `${plan_name} subscription`,
        handler: async (response) => {
          const verifyRes = await API.post("/payments/verify-subscription", {
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_subscription_id: response.razorpay_subscription_id,
            razorpay_signature: response.razorpay_signature,
            plan: planId,
          });
          alert(`${verifyRes.data.plan_name} activated. ${verifyRes.data.credits_added} credits added for this cycle.`);
          navigate("/dashboard");
        },
        theme: { color: "#0f172a" },
      }).open();
    } catch {
      alert("Could not start the subscription flow.");
    } finally {
      setLoading(null);
    }
  };

  const renderCard = (plan, isSubscription = false) => (
    <div key={plan.id} className={`premium-card p-8 relative flex flex-col ${plan.id.includes("pro") ? "accent-ring" : ""}`}>
      {plan.id.includes("pro") && (
        <div className="absolute -top-3 left-6 hero-chip normal-case tracking-normal text-[11px]">
          {isSubscription ? "Best recurring option" : "Best launch option"}
        </div>
      )}

      <div className="mb-6">
        <div className="section-title mb-3">{isSubscription ? "Subscription" : "Credit Pack"}</div>
        <h2 className="text-2xl font-semibold mb-2">{plan.name}</h2>
        <div className="flex items-end gap-2 mb-2">
          <span className="text-4xl font-semibold">{formatPrice(plan.price)}</span>
          <span className="text-white/40 text-sm">{isSubscription ? `per ${plan.interval}` : plan.billing_type === "free" ? "free" : "one-time"}</span>
        </div>
        <div className="text-sm text-white/40">{plan.credits} AI credits{isSubscription ? " per cycle" : ""}</div>
        <div className="text-white/55 text-sm mt-4 leading-7">{plan.description}</div>
      </div>

      <div className="space-y-3 mb-8 flex-1">
        {(plan.id === "free" ? plan.features : buildPaidFeatureList(plan)).map((feature) => (
          <div key={feature} className="text-sm text-white/70">
            {feature}
          </div>
        ))}
      </div>

      <button
        onClick={() => {
          if (plan.id === "free") return;
          if (isSubscription) handleSubscriptionPurchase(plan.id);
          else handlePackPurchase(plan.id);
        }}
        disabled={loading === plan.id || plan.id === "free"}
        className={plan.id === "free" ? "button-secondary w-full" : "button-primary w-full disabled:opacity-50"}
      >
        {loading === plan.id
          ? "Processing..."
          : plan.id === "free"
            ? plan.buttonLabel
            : isSubscription
              ? `Start ${plan.name}`
              : `Buy ${plan.name}`}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen app-shell text-white">
      <nav className="page-frame flex items-center justify-between py-6">
        <button className="text-xl font-bold" onClick={() => navigate("/")}>
          AI Sales OS
        </button>
        <button onClick={() => navigate("/dashboard")} className="button-secondary text-sm">
          Open dashboard
        </button>
      </nav>

      <div className="page-frame py-10 md:py-16">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="hero-chip mb-5">Pricing</div>
          <h1 className="headline-display text-5xl md:text-6xl font-semibold mb-5">Buy execution capacity, not seat-count bloat.</h1>
          <p className="text-white/55 text-lg leading-8">
            The value proposition is simple: your team gets an operating system that prioritizes deals, prepares meetings,
            drafts follow-ups, and keeps execution moving.
          </p>
        </div>

        {plansLoading ? (
          <div className="text-white/40">Loading pricing...</div>
        ) : (
          <div className="space-y-16">
            <section>
              <div className="mb-8">
                <div className="section-title mb-3">Launch Packs</div>
                <h2 className="text-3xl font-semibold mb-2">For solo sellers and early teams moving fast</h2>
                <p className="text-white/45 text-sm">Start with credit packs while shaping your workflow and proving adoption.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[FREE_PLAN, ...packs].map((plan) => renderCard(plan))}
              </div>
            </section>

            <section>
              <div className="mb-8">
                <div className="section-title mb-3">Subscriptions</div>
                <h2 className="text-3xl font-semibold mb-2">For teams that want the AI layer running every day</h2>
                <p className="text-white/45 text-sm">Recurring plans keep the command center, meeting intelligence, and execution workflows always on.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {subscriptions.map((plan) => renderCard(plan, true))}
              </div>
            </section>

            <section className="premium-card p-8">
              <div className="section-title mb-3">How to Position It</div>
              <h2 className="text-3xl font-semibold mb-8">This product sells best as a revenue execution system.</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {[
                  ["What am I buying?", "An AI operating layer for pipeline execution, not just lead storage."],
                  ["Why is this different?", "It remembers the deal, prioritizes the next move, drafts the action, and keeps the rep in motion."],
                  ["Who is it for?", "Founders, closers, and expansion teams who want sharp execution without enterprise CRM heaviness."],
                  ["What should I say on demos?", "Pitch it as the AI workspace that helps revenue teams know what to do next and why."],
                ].map(([q, a]) => (
                  <div key={q} className="border border-white/10 rounded-2xl p-5">
                    <div className="font-medium mb-2">{q}</div>
                    <div className="text-sm text-white/55 leading-7">{a}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
