import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import API from "../api/axios";

const FREE_PLAN = {
  id: "free",
  name: "Free",
  price: 0,
  credits: 25,
  description: "For individuals getting started with CRM.",
  billing_type: "free",
  buttonLabel: "Get Started",
  features: [
    "Up to 250 contacts",
    "1 user",
    "Basic sales pipeline",
    "Email integration",
    "Standard reports",
  ],
};

const DEFAULT_SUBSCRIPTION_CARDS = [
  {
    id: "pro",
    name: "Pro",
    price: 2900,
    interval: "month",
    description: "For growing teams that need more power.",
    buttonLabel: "Start Free Trial",
    features: [
      "Up to 5,000 contacts",
      "5 users",
      "Advanced pipelines",
      "Workflow automations",
      "Third-party integrations",
      "REST API access",
      "Priority email support",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 9900,
    interval: "month",
    description: "For organizations that need full control.",
    buttonLabel: "Contact Sales",
    features: [
      "Unlimited contacts",
      "Unlimited users",
      "SSO / SAML",
      "Audit log",
      "Custom roles and permissions",
      "Dedicated account manager",
      "99.9% uptime SLA",
    ],
  },
];

function formatPrice(price) {
  if (!price) return "Free";
  return `$${Math.round(price / 100)}`;
}

function PricingNav({ navigate }) {
  return (
    <nav className="page-frame flex items-center justify-between py-6">
      <button type="button" onClick={() => navigate("/")} className="flex items-center gap-3 text-white">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-400 via-fuchsia-500 to-rose-700 text-xs font-bold text-white shadow-[0_14px_28px_rgba(207,17,69,0.26)]">
          S
        </div>
        <span className="text-lg font-semibold tracking-tight">Setu</span>
      </button>
      <div className="hidden items-center gap-8 text-sm text-white/60 md:flex">
        <button type="button" onClick={() => navigate("/pricing")} className="transition hover:text-white">Pricing</button>
        <button type="button" onClick={() => navigate("/")} className="transition hover:text-white">About</button>
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

function PricingCard({ plan, featured = false, actionLabel, onAction, loading }) {
  return (
    <div className={`premium-card relative flex h-full flex-col p-6 ${featured ? "accent-ring" : ""}`}>
      {featured && (
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[linear-gradient(180deg,#ff2f63,#cf1145)] px-3 py-1 text-[11px] font-semibold text-white">
          Most Popular
        </div>
      )}
      <div className="mb-6">
        <div className="text-2xl font-semibold text-white">{plan.name}</div>
        <div className="mt-2 text-sm text-white/50">{plan.description}</div>
      </div>

      <div className="mb-6 flex items-end gap-2">
        <div className="text-5xl font-extrabold tracking-tight text-white">{formatPrice(plan.price)}</div>
        <div className="pb-2 text-sm text-white/40">/mo</div>
      </div>

      <button
        type="button"
        onClick={onAction}
        disabled={loading}
        className={featured ? "button-primary mb-6 w-full" : "button-secondary mb-6 w-full"}
      >
        {loading ? "Processing..." : actionLabel}
      </button>

      <div className="space-y-3 text-sm text-white/62">
        {plan.features.map((feature) => (
          <div key={feature} className="flex items-start gap-3">
            <span className="mt-1 text-pink-500">✓</span>
            <span>{feature}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Pricing() {
  const navigate = useNavigate();
  const [packs, setPacks] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(null);
  const [plansLoading, setPlansLoading] = useState(true);
  const [annual, setAnnual] = useState(false);

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
        theme: { color: "#cf1145" },
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
        theme: { color: "#cf1145" },
      }).open();
    } catch {
      alert("Could not start the subscription flow.");
    } finally {
      setLoading(null);
    }
  };

  const visibleSubscriptions = subscriptions.length ? subscriptions : DEFAULT_SUBSCRIPTION_CARDS;
  const visiblePlans = [FREE_PLAN, ...visibleSubscriptions.slice(0, 2)];

  return (
    <div className="app-shell min-h-screen text-white">
      <PricingNav navigate={navigate} />

      <div className="page-frame py-10 md:py-16">
        <div className="mx-auto mb-16 max-w-4xl text-center">
          <h1 className="headline-display text-5xl font-extrabold leading-[0.95] md:text-6xl">
            Simple, transparent pricing
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/50">
            No hidden fees. No surprises. Start free and scale as your team adopts the workflow.
          </p>

          <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-white/8 bg-white/[0.02] px-4 py-2 text-sm text-white/70">
            <span className={!annual ? "text-white" : ""}>Monthly</span>
            <button
              type="button"
              onClick={() => setAnnual((value) => !value)}
              className={`relative h-6 w-11 rounded-full transition ${annual ? "bg-pink-600" : "bg-white/12"}`}
            >
              <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${annual ? "left-6" : "left-1"}`} />
            </button>
            <span className={annual ? "text-white" : ""}>Annual</span>
          </div>
        </div>

        {plansLoading ? (
          <div className="premium-card p-8 text-center text-white/45">Loading pricing...</div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {visiblePlans.map((plan) => {
              const isFeatured = plan.id.toLowerCase().includes("pro");
              const actionLabel =
                plan.id === "free"
                  ? plan.buttonLabel
                  : plan.id.toLowerCase().includes("enterprise")
                    ? "Contact Sales"
                    : "Start Free Trial";

              return (
                <PricingCard
                  key={plan.id}
                  plan={plan}
                  featured={isFeatured}
                  actionLabel={actionLabel}
                  loading={loading === plan.id}
                  onAction={() => {
                    if (plan.id === "free") {
                      navigate("/signup");
                      return;
                    }

                    if (subscriptions.some((item) => item.id === plan.id)) {
                      handleSubscriptionPurchase(plan.id);
                      return;
                    }

                    if (plan.id.toLowerCase().includes("enterprise") && !subscriptions.some((item) => item.id === plan.id)) {
                      navigate("/signup");
                      return;
                    }

                    if (packs.some((item) => item.id === plan.id)) {
                      handlePackPurchase(plan.id);
                      return;
                    }

                    handleSubscriptionPurchase(plan.id);
                  }}
                />
              );
            })}
          </div>
        )}

        <section className="mx-auto mt-20 max-w-4xl text-center">
          <h2 className="headline-display text-4xl font-extrabold">Frequently Asked Questions</h2>
          <div className="mt-8 grid gap-4 text-left md:grid-cols-2">
            {[
              ["Can I start free?", "Yes. The free tier is designed for individual evaluation and early workflow setup."],
              ["Is this built for AI features?", "Yes. The product structure supports insights, recommendations, and auto-generated summaries without overwhelming the main workflows."],
              ["Can teams scale later?", "Yes. The layout and pricing model both support individual use, growing teams, and enterprise rollout."],
              ["Do I need training to use it?", "No. The interface is intentionally clean, dense, and easy to scan so teams can adopt it quickly."],
            ].map(([question, answer]) => (
              <div key={question} className="premium-card p-5">
                <div className="text-lg font-semibold text-white">{question}</div>
                <div className="mt-2 text-sm leading-7 text-white/55">{answer}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
