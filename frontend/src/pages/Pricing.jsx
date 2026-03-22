import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import API from "../api/axios";

const FREE_PLAN = {
  id: "free",
  name: "Free",
  price: 0,
  credits: 25,
  description: "Start with 25 credits and test the command-center workflow.",
  billing_type: "free",
  buttonLabel: "Current Plan",
  features: [
    "25 launch credits",
    "Lead manager and pipeline board",
    "AI follow-up generation",
    "AI deal command center",
  ],
};

function formatPrice(price) {
  return price ? `Rs ${(price / 100).toLocaleString()}` : "Rs 0";
}

function buildPaidFeatureList(plan) {
  return [
    ...(plan.features || []),
    "Deal command center and meeting intel",
    "LinkedIn lead capture extension",
    "Full pipeline and activity tracking",
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

      const packSource = hasGroupedPlans
        ? res.data.packs || {}
        : Object.fromEntries(
            Object.entries(res.data || {}).filter(([, plan]) => plan?.billing_type !== "subscription")
          );

      const subscriptionSource = hasGroupedPlans
        ? res.data.subscriptions || {}
        : Object.fromEntries(
            Object.entries(res.data || {}).filter(([, plan]) => plan?.billing_type === "subscription")
          );

      const packList = Object.entries(packSource).map(([id, plan]) => ({
        id,
        ...plan,
      }));
      const subscriptionList = Object.entries(subscriptionSource).map(([id, plan]) => ({
        id,
        ...plan,
      }));
      setPacks(packList);
      setSubscriptions(subscriptionList);
    } catch (error) {
      setPacks([]);
      setSubscriptions([]);
    } finally {
      setPlansLoading(false);
    }
  };

  const handlePackPurchase = async (planId) => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/signup");
      return;
    }

    setLoading(planId);
    try {
      const res = await API.post("/payments/create-order", { plan: planId });
      const { order_id, amount, currency, key_id, plan_name } = res.data;

      const options = {
        key: key_id,
        amount,
        currency,
        name: "AI Sales OS",
        description: plan_name,
        order_id,
        handler: async function (response) {
          const verifyRes = await API.post("/payments/verify", {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            plan: planId,
          });
          alert(`${verifyRes.data.plan_name} unlocked. ${verifyRes.data.credits_added} credits added.`);
          navigate("/dashboard");
        },
        theme: { color: "#7c3aed" },
      };

      new window.Razorpay(options).open();
    } catch (error) {
      alert("Could not start the purchase flow.");
    } finally {
      setLoading(null);
    }
  };

  const handleSubscriptionPurchase = async (planId) => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/signup");
      return;
    }

    setLoading(planId);
    try {
      const res = await API.post("/payments/create-subscription", { plan: planId });
      const { subscription_id, amount, currency, key_id, plan_name } = res.data;

      const options = {
        key: key_id,
        subscription_id,
        name: "AI Sales OS",
        description: `${plan_name} subscription`,
        handler: async function (response) {
          const verifyRes = await API.post("/payments/verify-subscription", {
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_subscription_id: response.razorpay_subscription_id,
            razorpay_signature: response.razorpay_signature,
            plan: planId,
          });
          alert(`${verifyRes.data.plan_name} activated. ${verifyRes.data.credits_added} credits added for this cycle.`);
          navigate("/dashboard");
        },
        theme: { color: "#7c3aed" },
        amount,
        currency,
      };

      new window.Razorpay(options).open();
    } catch (error) {
      alert("Could not start the subscription flow.");
    } finally {
      setLoading(null);
    }
  };

  const renderCard = (plan, isSubscription = false) => (
    <div
      key={plan.id}
      className={`border rounded-2xl p-8 relative flex flex-col ${
        plan.id.includes("pro") ? "border-purple-500/50" : "border-white/10"
      }`}
    >
      {plan.id.includes("pro") && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs px-4 py-1 rounded-full">
          {isSubscription ? "Best Recurring Offer" : "Best Launch Offer"}
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2">{plan.name}</h2>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold">{formatPrice(plan.price)}</span>
          <span className="text-white/40 text-sm">
            {isSubscription ? `per ${plan.interval}` : plan.billing_type === "free" ? "free" : "one-time"}
          </span>
        </div>
        <div className="text-white/40 text-sm mt-1">{plan.credits} AI credits{isSubscription ? " per cycle" : ""}</div>
        <div className="text-white/50 text-sm mt-3">{plan.description}</div>
        {plan.cta && <div className="text-purple-300 text-sm mt-3">{plan.cta}</div>}
      </div>

      <div className="space-y-3 mb-8 flex-1">
        {(plan.id === "free" ? plan.features : buildPaidFeatureList(plan)).map((feature) => (
          <div key={feature} className="text-sm text-white/70">
            {feature}
          </div>
        ))}
      </div>

      <button
        onClick={() =>
          plan.id === "free"
            ? null
            : isSubscription
              ? handleSubscriptionPurchase(plan.id)
              : handlePackPurchase(plan.id)
        }
        disabled={loading === plan.id || plan.id === "free"}
        className={`w-full py-3 rounded-lg font-semibold transition disabled:opacity-50 ${
          plan.id.includes("pro")
            ? "bg-purple-600 text-white hover:bg-purple-500"
            : plan.id === "free"
              ? "border border-white/20 text-white"
              : "bg-white text-black hover:bg-white/90"
        }`}
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
    <div className="min-h-screen bg-black text-white">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <div className="text-xl font-bold cursor-pointer" onClick={() => navigate("/")}>
          AI Sales OS
        </div>
        <button
          onClick={() => navigate("/dashboard")}
          className="px-4 py-2 text-sm text-white/70 hover:text-white transition"
        >
          Dashboard
        </button>
      </nav>

      <div className="text-center py-16 px-6">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Pricing and Revenue Engine</h1>
        <p className="text-white/40 text-lg max-w-2xl mx-auto">
          Launch with one-time credit packs today, then grow into recurring AI revenue with monthly subscriptions.
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-6 pb-20 space-y-16">
        {plansLoading ? (
          <div className="text-white/40">Loading pricing...</div>
        ) : (
          <>
            <section>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold">Launch Packs</h2>
                  <p className="text-white/40 text-sm mt-1">
                    Simple one-time purchases for immediate monetization.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[FREE_PLAN, ...packs].map((plan) => renderCard(plan, false))}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold">Recurring Subscriptions</h2>
                  <p className="text-white/40 text-sm mt-1">
                    Monthly AI capacity for teams that want the platform running every day.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {subscriptions.map((plan) => renderCard(plan, true))}
              </div>
            </section>
          </>
        )}

        <section>
          <h2 className="text-2xl font-bold text-center mb-10">How to sell this</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                q: "What am I buying?",
                a: "You are buying a sales execution engine: AI credits for follow-ups, deal analysis, meeting intelligence, and coaching.",
              },
              {
                q: "What is recurring here?",
                a: "Subscriptions recharge AI capacity every billing cycle so reps can operate inside the platform continuously.",
              },
              {
                q: "Why is this different from classic CRMs?",
                a: "Because the product does not just store data. It prioritizes deals, drafts the move, and tells the rep exactly what to do next.",
              },
              {
                q: "What should I say on demos?",
                a: "Pitch it as an AI deal command center for reps and founders who want execution, not admin software.",
              },
            ].map((faq) => (
              <div key={faq.q} className="border border-white/10 rounded-xl p-6">
                <h3 className="font-semibold mb-2">{faq.q}</h3>
                <p className="text-white/40 text-sm">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
