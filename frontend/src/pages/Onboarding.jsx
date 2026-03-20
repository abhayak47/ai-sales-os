import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";

const STEPS = [
  {
    id: 1,
    title: "Welcome to AI Sales OS! 🎉",
    subtitle: "Your AI-powered sales partner",
    description: "You have 25 free credits to get started. Let's take a quick tour so you can start closing deals faster.",
    action: "Get Started →",
    icon: "⚡",
  },
  {
    id: 2,
    title: "Add Your First Lead 👥",
    subtitle: "Step 1 of 3",
    description: "Add a real prospect you're currently working with. The AI will help you close them faster.",
    action: "Add a Lead →",
    icon: "👥",
    path: "/leads",
  },
  {
    id: 3,
    title: "Generate a Follow-Up 🤖",
    subtitle: "Step 2 of 3",
    description: "Use AI to write the perfect follow-up message for your lead. Takes 10 seconds and uses 1 credit.",
    action: "Generate Follow-Up →",
    icon: "🤖",
    path: "/followup",
  },
  {
    id: 4,
    title: "Meet Your AI Sales Coach 🗣️",
    subtitle: "Step 3 of 3",
    description: "Ask your AI coach anything about your deals. It knows your pipeline and gives personalized advice.",
    action: "Talk to Coach →",
    icon: "🗣️",
    path: "/coach",
  },
  {
    id: 5,
    title: "You're All Set! 🚀",
    subtitle: "Start closing deals",
    description: "Your AI Sales OS is ready. You have 25 credits — each AI action costs 1-5 credits. Upgrade anytime for more.",
    action: "Go to Dashboard →",
    icon: "🏆",
    path: "/dashboard",
  },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const step = STEPS[currentStep];

  const handleAction = async () => {
    if (currentStep === STEPS.length - 1) {
      // Last step — mark onboarded
      setLoading(true);
      try {
        await API.post("/auth/complete-onboarding");
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
      navigate("/dashboard");
      return;
    }
    
    setCurrentStep(currentStep + 1);
  };

  const skipOnboarding = async () => {
    try {
      await API.post("/auth/complete-onboarding");
    } catch (err) {
      console.error(err);
    }
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-2xl font-bold">⚡ AI Sales OS</div>
        </div>

        {/* Progress Bar */}
        <div className="flex gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`flex-1 h-1 rounded-full transition-all ${
                i <= currentStep ? "bg-white" : "bg-white/20"
              }`}
            />
          ))}
        </div>

        {/* Card */}
        <div className="border border-white/10 rounded-2xl p-8 text-center">
          <div className="text-6xl mb-6">{step.icon}</div>
          <div className="text-white/40 text-sm mb-2">{step.subtitle}</div>
          <h1 className="text-2xl font-bold mb-4">{step.title}</h1>
          <p className="text-white/60 mb-8 leading-relaxed">{step.description}</p>

          {/* Credits Info on Step 1 */}
          {currentStep === 0 && (
            <div className="grid grid-cols-3 gap-3 mb-8">
              {[
                { icon: "🤖", label: "Follow-Up", credits: "1 credit" },
                { icon: "🧠", label: "AI Brain", credits: "3 credits" },
                { icon: "📧", label: "Sequence", credits: "5 credits" },
              ].map((item, i) => (
                <div key={i} className="border border-white/10 rounded-xl p-3">
                  <div className="text-2xl mb-1">{item.icon}</div>
                  <div className="text-xs font-medium">{item.label}</div>
                  <div className="text-purple-400 text-xs">{item.credits}</div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleAction}
            disabled={loading}
            className="w-full py-3 bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition disabled:opacity-50"
          >
            {loading ? "Setting up..." : step.action}
          </button>

          {currentStep < STEPS.length - 1 && (
            <button
              onClick={skipOnboarding}
              className="mt-4 text-white/30 text-sm hover:text-white transition"
            >
              Skip onboarding
            </button>
          )}
        </div>

        {/* Step Counter */}
        <div className="text-center mt-4 text-white/20 text-sm">
          Step {currentStep + 1} of {STEPS.length}
        </div>
      </div>
    </div>
  );
}