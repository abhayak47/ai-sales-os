import { useState } from "react";
import { useNavigate } from "react-router-dom";

import API from "../api/axios";

const STEPS = [
  {
    title: "Welcome to AI Sales OS",
    subtitle: "Set the operating rhythm",
    description:
      "You already have launch credits. This short setup shows how the workspace thinks: context first, then execution.",
    action: "Start setup",
  },
  {
    title: "Add a live opportunity",
    subtitle: "Step 1 of 4",
    description:
      "Bring in one real deal. The rest of the experience becomes meaningfully smarter once the AI has an actual lead to reason about.",
    action: "Open lead workspace",
    path: "/leads",
  },
  {
    title: "Generate your first next move",
    subtitle: "Step 2 of 4",
    description:
      "Use AI Follow-Up to create a message with context and momentum, not a generic template.",
    action: "Generate follow-up",
    path: "/followup",
  },
  {
    title: "Ask the coach for judgment",
    subtitle: "Step 3 of 4",
    description:
      "Pressure-test a deal, objection, or stalled conversation with the AI Sales Coach and see how it prioritizes execution.",
    action: "Open sales coach",
    path: "/coach",
  },
  {
    title: "Run the command center",
    subtitle: "Step 4 of 4",
    description:
      "You are ready to use the dashboard, saved views, and lead memory as your daily revenue operating system.",
    action: "Enter dashboard",
    path: "/dashboard",
  },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const step = STEPS[currentStep];

  const completeOnboarding = async () => {
    setLoading(true);
    try {
      await API.post("/auth/complete-onboarding");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    const isLast = currentStep === STEPS.length - 1;
    if (isLast) {
      await completeOnboarding();
      navigate("/dashboard");
      return;
    }

    setCurrentStep((value) => value + 1);
    if (step.path) navigate(step.path);
  };

  const skipOnboarding = async () => {
    await completeOnboarding();
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen app-shell text-white flex items-center">
      <div className="page-frame grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr] gap-10 py-10">
        <div className="hidden xl:flex flex-col justify-between">
          <div>
            <div className="hero-chip mb-6">Onboarding</div>
            <h1 className="headline-display text-5xl font-semibold leading-tight mb-5">
              Get the team into execution mode quickly.
            </h1>
            <p className="text-white/60 text-lg leading-8 max-w-xl">
              The goal of setup is not to teach software. It is to help the user feel the product’s core advantage in the first few minutes.
            </p>
          </div>

          <div className="space-y-4">
            {[
              "Bring in one live lead to unlock meaningful context.",
              "Use follow-up generation to see immediate value.",
              "Use the coach and dashboard to understand the system’s operating model.",
            ].map((item) => (
              <div key={item} className="premium-card px-5 py-4 text-white/70">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel rounded-[2rem] p-6 md:p-8">
          <div className="flex gap-2 mb-8">
            {STEPS.map((_, index) => (
              <div key={index} className={`h-1.5 flex-1 rounded-full ${index <= currentStep ? "bg-white" : "bg-white/15"}`} />
            ))}
          </div>

          <div className="section-title mb-3">{step.subtitle}</div>
          <h2 className="text-3xl font-semibold mb-4">{step.title}</h2>
          <p className="text-white/55 text-base leading-8 mb-8">{step.description}</p>

          {currentStep === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
              {[
                ["Follow-Up", "1 credit", "Message generation with deal context"],
                ["AI Brain", "3 credits", "Fast deal scoring and risk read"],
                ["Meeting Intel", "3 credits", "MoM, objections, and next steps"],
              ].map(([title, credits, desc]) => (
                <div key={title} className="premium-card p-4">
                  <div className="font-medium mb-1">{title}</div>
                  <div className="text-sm text-cyan-300 mb-2">{credits}</div>
                  <div className="text-xs text-white/45">{desc}</div>
                </div>
              ))}
            </div>
          )}

          <button onClick={handleAction} disabled={loading} className="button-primary w-full disabled:opacity-50">
            {loading ? "Finishing setup..." : step.action}
          </button>

          {currentStep < STEPS.length - 1 && (
            <button onClick={skipOnboarding} className="w-full mt-4 text-sm text-white/35 hover:text-white transition">
              Skip and enter dashboard
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
