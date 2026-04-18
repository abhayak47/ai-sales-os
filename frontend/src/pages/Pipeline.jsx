import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";

import API from "../api/axios";
import Sidebar from "../components/Sidebar";

const STAGES = ["New", "Contacted", "Interested", "Converted", "Lost"];
const DEFAULT_VISIBLE = 8;

const STAGE_COLORS = {
  New: "border-blue-500/30 bg-blue-500/5 text-blue-300",
  Contacted: "border-amber-500/30 bg-amber-500/5 text-amber-300",
  Interested: "border-fuchsia-500/30 bg-fuchsia-500/5 text-fuchsia-300",
  Converted: "border-emerald-500/30 bg-emerald-500/5 text-emerald-300",
  Lost: "border-red-500/30 bg-red-500/5 text-red-300",
};

export default function Pipeline() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showClosed, setShowClosed] = useState(false);
  const [expandedStages, setExpandedStages] = useState({});

  useEffect(() => {
    fetchLeads();
  }, [showClosed]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await API.get("/leads/", {
        params: {
          search: search || undefined,
          sort_by: "score",
          sort_dir: "desc",
          page: 1,
          page_size: 100,
        },
      });
      setLeads(res.data.items);
      setSummary(res.data.summary);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (!showClosed && ["Converted", "Lost"].includes(lead.status)) {
        return false;
      }
      if (!search.trim()) return true;
      const haystack = [lead.name, lead.company, lead.email, lead.notes].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(search.trim().toLowerCase());
    });
  }, [leads, search, showClosed]);

  const getLeadsByStage = (stage) => filteredLeads.filter((lead) => lead.status === stage);

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination || destination.droppableId === source.droppableId) return;

    const leadId = Number(draggableId);
    const newStatus = destination.droppableId;

    setLeads((current) => current.map((lead) => (lead.id === leadId ? { ...lead, status: newStatus } : lead)));

    try {
      await API.put(`/leads/${leadId}`, { status: newStatus });
      await API.post("/activities/", {
        lead_id: leadId,
        type: "stage_change",
        title: `Moved to ${newStatus}`,
        description: `Status changed from ${source.droppableId} to ${newStatus}`,
      });
    } catch {
      fetchLeads();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-white/40">Loading focus pipeline...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex">
      <Sidebar />

      <div className="flex-1 flex flex-col mt-16 md:mt-0">
        <div className="border-b border-white/10 px-4 md:px-8 py-5">
          <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-white/35 mb-2">Focus Pipeline</div>
              <h1 className="text-2xl font-bold">A board that stays useful even when the pipeline gets big</h1>
              <p className="text-white/45 text-sm mt-2 max-w-3xl">
                High-signal cards, capped stage visibility, and search-first navigation keep the pipeline readable instead of overwhelming.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate("/leads")}
                className="px-4 py-3 border border-white/10 rounded-xl text-sm text-white/70 hover:text-white transition"
              >
                Open lead workspace
              </button>
              <button
                onClick={() => navigate("/leads")}
                className="px-4 py-3 bg-white text-black text-sm font-semibold rounded-xl hover:bg-white/90 transition"
              >
                Add lead
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 md:p-6">
          <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 mb-5">
            {[
              ["Total", summary?.total || 0],
              ["New", summary?.new || 0],
              ["Interested", summary?.interested || 0],
              ["Needs attention", summary?.needs_attention || 0],
              ["Converted", summary?.converted || 0],
            ].map(([label, value]) => (
              <div key={label} className="border border-white/10 rounded-2xl p-4 bg-white/[0.02]">
                <div className="text-xs text-white/35 mb-2">{label}</div>
                <div className="text-2xl font-bold">{value}</div>
              </div>
            ))}
          </div>

          <div className="border border-white/10 rounded-2xl p-4 mb-5 bg-white/[0.02]">
            <div className="flex flex-col lg:flex-row gap-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search pipeline by lead, company, or notes"
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none"
              />
              <button
                onClick={() => fetchLeads()}
                className="px-4 py-3 border border-white/10 rounded-xl text-sm text-white/70 hover:text-white transition"
              >
                Refresh
              </button>
              <button
                onClick={() => setShowClosed((current) => !current)}
                className={`px-4 py-3 rounded-xl text-sm border transition ${
                  showClosed ? "border-white/30 text-white" : "border-white/10 text-white/60"
                }`}
              >
                {showClosed ? "Hide closed stages" : "Show closed stages"}
              </button>
            </div>
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-4 min-w-max overflow-x-auto pb-2">
              {STAGES.filter((stage) => showClosed || !["Converted", "Lost"].includes(stage)).map((stage) => {
                const stageLeads = getLeadsByStage(stage);
                const expanded = expandedStages[stage];
                const visibleLeads = expanded ? stageLeads : stageLeads.slice(0, DEFAULT_VISIBLE);

                return (
                  <div key={stage} className="w-80 flex-shrink-0">
                    <div className={`rounded-2xl border px-4 py-3 mb-3 ${STAGE_COLORS[stage]}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold">{stage}</div>
                          <div className="text-xs text-white/45 mt-1">
                            {stageLeads.length > DEFAULT_VISIBLE && !expanded
                              ? `Showing ${DEFAULT_VISIBLE} of ${stageLeads.length}`
                              : `${stageLeads.length} visible`}
                          </div>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full border border-white/10 bg-black/20 text-white/70">
                          {stageLeads.length}
                        </span>
                      </div>
                    </div>

                    <Droppable droppableId={stage}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`rounded-2xl border p-3 min-h-[180px] transition ${
                            snapshot.isDraggingOver ? "border-white/30 bg-white/[0.03]" : "border-white/10 bg-white/[0.015]"
                          }`}
                        >
                          {visibleLeads.map((lead, index) => (
                            <Draggable key={lead.id} draggableId={String(lead.id)} index={index}>
                              {(dragProvided, dragSnapshot) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  {...dragProvided.dragHandleProps}
                                  onClick={() => navigate(`/leads/${lead.id}`)}
                                  className={`mb-3 p-4 rounded-xl border cursor-pointer transition ${
                                    dragSnapshot.isDragging
                                      ? "border-white/40 bg-white/10 shadow-lg"
                                      : "border-white/10 bg-black hover:border-white/25"
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="font-medium truncate">{lead.name}</div>
                                      <div className="text-sm text-white/40 truncate mt-1">{lead.company || "No company"}</div>
                                    </div>
                                    <div className="text-xs text-white/35 text-right">
                                      {lead.score ? `Score ${lead.score}` : "Unscored"}
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2 mt-4 text-xs text-white/45">
                                    <div>Health {Math.round(lead.health_score || 50)}</div>
                                    <div>Relationship {lead.relationship_score || 50}</div>
                                    <div className="truncate">{lead.follow_up_date || "No next touch"}</div>
                                    <div className="truncate">
                                      {lead.predicted_revenue ? `Rs ${Number(lead.predicted_revenue).toLocaleString()}` : "No value yet"}
                                    </div>
                                  </div>

                                  {lead.notes && (
                                    <div className="mt-3 text-sm text-white/65 line-clamp-3">
                                      {lead.notes}
                                    </div>
                                  )}
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}

                          {stageLeads.length === 0 && (
                            <div className="text-center py-10 text-sm text-white/25">No leads in this stage</div>
                          )}

                          {stageLeads.length > DEFAULT_VISIBLE && (
                            <button
                              onClick={() =>
                                setExpandedStages((current) => ({ ...current, [stage]: !current[stage] }))
                              }
                              className="w-full mt-2 px-3 py-2 text-sm border border-white/10 rounded-xl text-white/55 hover:text-white transition"
                            >
                              {expanded ? "Collapse stage" : `Show all ${stageLeads.length}`}
                            </button>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}
            </div>
          </DragDropContext>
        </div>
      </div>
    </div>
  );
}
