import { useState } from "react";

import API from "../api/axios";

const TOOL_CONFIG = {
  dealStrategy: {
    title: "Deal Strategy",
    endpoint: "/ai/deal-strategy",
    button: "Generate (3 credits)",
    payload: (leadId) => ({ lead_id: Number(leadId) }),
    empty: "Generates the strategic story, leverage points, blind spots, and concrete moves to increase win rate.",
  },
  revivalCampaign: {
    title: "Revival Campaign",
    endpoint: "/ai/revival-campaign",
    button: "Generate (3 credits)",
    payload: (leadId) => ({ lead_id: Number(leadId) }),
    empty: "Designs a multi-touch rescue sequence to reopen silent or drifting deals without sounding needy.",
  },
  stakeholderMap: {
    title: "Stakeholder Map",
    endpoint: "/ai/stakeholder-map",
    button: "Generate (2 credits)",
    payload: (leadId) => ({ lead_id: Number(leadId) }),
    empty: "Infers hidden stakeholders, likely blockers, and how to earn access before the deal stalls politically.",
  },
  meetingPrep: {
    title: "Meeting Prep",
    endpoint: "/ai/meeting-prep",
    button: "Generate (2 credits)",
    payload: (leadId) => ({ lead_id: Number(leadId) }),
    empty: "Prepares the agenda, strategic questions, red flags, and close path for a make-or-break conversation.",
  },
};

function SectionCard({ title, action, children }) {
  return (
    <div className="border border-white/10 rounded-2xl p-5 bg-white/[0.02]">
      <div className="flex items-start justify-between gap-4 mb-4">
        <h3 className="text-sm font-semibold tracking-wide text-white">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function ListBlock({ title, items, ordered = false }) {
  const Tag = ordered ? "ol" : "ul";
  const listClass = ordered ? "list-decimal list-inside" : "";

  return (
    <div>
      <div className="text-white/40 mb-2">{title}</div>
      <Tag className={`space-y-2 text-white/75 ${listClass}`}>
        {items.map((item) => (
          <li key={item}>{ordered ? item : `- ${item}`}</li>
        ))}
      </Tag>
    </div>
  );
}

export default function StrategyLab({ leadId }) {
  const [loadingTool, setLoadingTool] = useState("");
  const [error, setError] = useState("");
  const [objection, setObjection] = useState("");
  const [outputs, setOutputs] = useState({
    dealStrategy: null,
    objectionPlaybook: null,
    revivalCampaign: null,
    stakeholderMap: null,
    meetingPrep: null,
  });

  const runTool = async (toolId) => {
    const tool = TOOL_CONFIG[toolId];
    setLoadingTool(toolId);
    setError("");

    try {
      const res = await API.post(tool.endpoint, tool.payload(leadId));
      setOutputs((current) => ({ ...current, [toolId]: res.data }));
    } catch (err) {
      setError(err.response?.data?.detail || "Could not generate AI strategy.");
    } finally {
      setLoadingTool("");
    }
  };

  const runObjectionPlaybook = async () => {
    if (!objection.trim()) {
      setError("Add the real objection you heard so the playbook can respond to it.");
      return;
    }

    setLoadingTool("objectionPlaybook");
    setError("");

    try {
      const res = await API.post("/ai/objection-playbook", {
        lead_id: Number(leadId),
        objection: objection.trim(),
      });
      setOutputs((current) => ({ ...current, objectionPlaybook: res.data }));
    } catch (err) {
      setError(err.response?.data?.detail || "Could not generate objection playbook.");
    } finally {
      setLoadingTool("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="border border-emerald-500/20 rounded-2xl p-6 bg-gradient-to-br from-emerald-500/10 via-cyan-500/5 to-transparent">
        <div className="text-xs uppercase tracking-[0.2em] text-emerald-300/70 mb-2">Strategy Lab</div>
        <h2 className="text-2xl font-bold mb-2">Revenue Intelligence Layer</h2>
        <p className="text-white/60 max-w-3xl text-sm leading-6">
          This turns each lead into a live war room: strategic plan, rescue campaign, stakeholder map,
          objection handling, and meeting prep generated from the real timeline of the deal.
        </p>
      </div>

      {error && (
        <div className="border border-red-500/20 bg-red-500/10 text-red-200 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <SectionCard
          title="Deal Strategy"
          action={
            <button
              onClick={() => runTool("dealStrategy")}
              disabled={loadingTool === "dealStrategy"}
              className="px-4 py-2 rounded-lg bg-white text-black text-sm font-semibold disabled:opacity-50"
            >
              {loadingTool === "dealStrategy" ? "Generating..." : TOOL_CONFIG.dealStrategy.button}
            </button>
          }
        >
          {outputs.dealStrategy ? (
            <div className="space-y-4 text-sm">
              <div>
                <div className="text-white/40 mb-1">Executive Summary</div>
                <p className="text-white/80">{outputs.dealStrategy.executive_summary}</p>
              </div>
              <div>
                <div className="text-white/40 mb-1">Deal Narrative</div>
                <p className="text-white/80">{outputs.dealStrategy.deal_narrative}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ListBlock title="Leverage Points" items={outputs.dealStrategy.leverage_points} />
                <ListBlock title="Blind Spots" items={outputs.dealStrategy.blind_spots} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ListBlock title="Likely Objections" items={outputs.dealStrategy.likely_objections} />
                <ListBlock title="Action Plan" items={outputs.dealStrategy.action_plan} ordered />
              </div>
            </div>
          ) : (
            <p className="text-white/45 text-sm">{TOOL_CONFIG.dealStrategy.empty}</p>
          )}
        </SectionCard>

        <SectionCard
          title="Objection Playbook"
          action={
            <button
              onClick={runObjectionPlaybook}
              disabled={loadingTool === "objectionPlaybook"}
              className="px-4 py-2 rounded-lg bg-white text-black text-sm font-semibold disabled:opacity-50"
            >
              {loadingTool === "objectionPlaybook" ? "Generating..." : "Generate (2 credits)"}
            </button>
          }
        >
          <textarea
            value={objection}
            onChange={(e) => setObjection(e.target.value)}
            rows={3}
            placeholder="Example: This looks good, but we may wait until next quarter because the team is already overloaded."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none resize-none mb-4"
          />

          {outputs.objectionPlaybook ? (
            <div className="space-y-4 text-sm">
              <div>
                <div className="text-white/40 mb-1">Diagnosis</div>
                <p className="text-white/80">{outputs.objectionPlaybook.objection_diagnosis}</p>
              </div>
              <div>
                <div className="text-white/40 mb-1">Root Issue</div>
                <p className="text-white/80">{outputs.objectionPlaybook.root_issue}</p>
              </div>
              <div>
                <div className="text-white/40 mb-1">Rebuttal Strategy</div>
                <p className="text-white/80">{outputs.objectionPlaybook.rebuttal_strategy}</p>
              </div>
              <ListBlock title="Proof Points" items={outputs.objectionPlaybook.proof_points} />
              <div className="border border-white/10 rounded-xl p-4">
                <div className="text-white/40 mb-2">Response Script</div>
                <p className="text-white/80 whitespace-pre-wrap">{outputs.objectionPlaybook.response_script}</p>
              </div>
              <div className="border border-white/10 rounded-xl p-4">
                <div className="text-white/40 mb-2">Follow-Up Message</div>
                <p className="text-white/80 whitespace-pre-wrap">{outputs.objectionPlaybook.follow_up_message}</p>
              </div>
            </div>
          ) : (
            <p className="text-white/45 text-sm">
              Converts a real buyer objection into diagnosis, proof points, rebuttal strategy, and a ready-to-send reply.
            </p>
          )}
        </SectionCard>

        <SectionCard
          title="Revival Campaign"
          action={
            <button
              onClick={() => runTool("revivalCampaign")}
              disabled={loadingTool === "revivalCampaign"}
              className="px-4 py-2 rounded-lg bg-white text-black text-sm font-semibold disabled:opacity-50"
            >
              {loadingTool === "revivalCampaign" ? "Generating..." : TOOL_CONFIG.revivalCampaign.button}
            </button>
          }
        >
          {outputs.revivalCampaign ? (
            <div className="space-y-4 text-sm">
              <div>
                <div className="text-white/40 mb-1">Stall Diagnosis</div>
                <p className="text-white/80">{outputs.revivalCampaign.diagnosis}</p>
              </div>
              <div>
                <div className="text-white/40 mb-1">Campaign Angle</div>
                <p className="text-white/80">{outputs.revivalCampaign.campaign_angle}</p>
              </div>
              <div className="space-y-3">
                {outputs.revivalCampaign.sequence.map((step) => (
                  <div key={`${step.step}-${step.channel}`} className="border border-white/10 rounded-xl p-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-white font-medium">Step {step.step}</span>
                      <span className="text-xs text-cyan-300">
                        {step.channel} | {step.timing}
                      </span>
                    </div>
                    <p className="text-white/75 mb-2 whitespace-pre-wrap">{step.message}</p>
                    <div className="text-xs text-white/40">Objective: {step.objective}</div>
                  </div>
                ))}
              </div>
              <ListBlock title="Avoid These Mistakes" items={outputs.revivalCampaign.do_not_do} />
            </div>
          ) : (
            <p className="text-white/45 text-sm">{TOOL_CONFIG.revivalCampaign.empty}</p>
          )}
        </SectionCard>

        <SectionCard
          title="Stakeholder Map"
          action={
            <button
              onClick={() => runTool("stakeholderMap")}
              disabled={loadingTool === "stakeholderMap"}
              className="px-4 py-2 rounded-lg bg-white text-black text-sm font-semibold disabled:opacity-50"
            >
              {loadingTool === "stakeholderMap" ? "Generating..." : TOOL_CONFIG.stakeholderMap.button}
            </button>
          }
        >
          {outputs.stakeholderMap ? (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  ["Champion", outputs.stakeholderMap.champion],
                  ["Decision Maker", outputs.stakeholderMap.decision_maker],
                  ["Economic Buyer", outputs.stakeholderMap.economic_buyer],
                ].map(([label, value]) => (
                  <div key={label} className="border border-white/10 rounded-xl p-4">
                    <div className="text-white/40 mb-1 text-xs">{label}</div>
                    <div className="text-white/85">{value}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ListBlock title="Blockers" items={outputs.stakeholderMap.blockers} />
                <ListBlock title="Missing People" items={outputs.stakeholderMap.missing_people} />
              </div>
              <ListBlock title="Access Strategy" items={outputs.stakeholderMap.access_strategy} ordered />
            </div>
          ) : (
            <p className="text-white/45 text-sm">{TOOL_CONFIG.stakeholderMap.empty}</p>
          )}
        </SectionCard>

        <SectionCard
          title="Meeting Prep"
          action={
            <button
              onClick={() => runTool("meetingPrep")}
              disabled={loadingTool === "meetingPrep"}
              className="px-4 py-2 rounded-lg bg-white text-black text-sm font-semibold disabled:opacity-50"
            >
              {loadingTool === "meetingPrep" ? "Generating..." : TOOL_CONFIG.meetingPrep.button}
            </button>
          }
        >
          {outputs.meetingPrep ? (
            <div className="space-y-4 text-sm">
              <div>
                <div className="text-white/40 mb-1">Meeting Goal</div>
                <p className="text-white/80">{outputs.meetingPrep.meeting_goal}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ListBlock title="Agenda" items={outputs.meetingPrep.agenda} ordered />
                <ListBlock title="Strategic Questions" items={outputs.meetingPrep.strategic_questions} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ListBlock title="Red Flags" items={outputs.meetingPrep.red_flags} />
                <ListBlock title="Close Plan" items={outputs.meetingPrep.close_plan} ordered />
              </div>
            </div>
          ) : (
            <p className="text-white/45 text-sm">{TOOL_CONFIG.meetingPrep.empty}</p>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
