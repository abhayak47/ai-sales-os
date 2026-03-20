import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import API from "../api/axios";
import Sidebar from "../components/Sidebar";

const STAGES = ["New", "Contacted", "Interested", "Converted", "Lost"];

const STAGE_COLORS = {
  New: "border-blue-500/30 bg-blue-500/5",
  Contacted: "border-yellow-500/30 bg-yellow-500/5",
  Interested: "border-purple-500/30 bg-purple-500/5",
  Converted: "border-green-500/30 bg-green-500/5",
  Lost: "border-red-500/30 bg-red-500/5",
};

const STAGE_HEADER_COLORS = {
  New: "text-blue-400",
  Contacted: "text-yellow-400",
  Interested: "text-purple-400",
  Converted: "text-green-400",
  Lost: "text-red-400",
};

const STAGE_ICONS = {
  New: "🆕",
  Contacted: "📞",
  Interested: "🔥",
  Converted: "✅",
  Lost: "❌",
};

export default function Pipeline() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const res = await API.get("/leads/");
      setLeads(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getLeadsByStage = (stage) =>
    leads.filter((lead) => lead.status === stage);

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    const newStatus = destination.droppableId;
    const leadId = parseInt(draggableId);

    // Optimistic update
    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === leadId ? { ...lead, status: newStatus } : lead
      )
    );

    // Update backend
    try {
      await API.put(`/leads/${leadId}`, { status: newStatus });
      // Log activity
      await API.post("/activities/", {
        lead_id: leadId,
        type: "stage_change",
        title: `Moved to ${newStatus}`,
        description: `Status changed from ${source.droppableId} to ${newStatus}`,
      });
    } catch (err) {
      // Revert on error
      fetchLeads();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-4xl animate-pulse">⚡</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex">
      <Sidebar />

      <div className="flex-1 flex flex-col mt-16 md:mt-0">
        {/* Header */}
        <div className="border-b border-white/10 px-4 md:px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">📊 Pipeline View</h1>
            <p className="text-white/40 text-sm mt-1">
              Drag and drop leads between stages
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate("/leads")}
              className="px-4 py-2 border border-white/10 rounded-lg text-white/50 hover:text-white text-sm transition"
            >
              List View
            </button>
            <button
              onClick={() => navigate("/leads")}
              className="px-4 py-2 bg-white text-black text-sm font-semibold rounded-lg hover:bg-white/90 transition"
            >
              + Add Lead
            </button>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex-1 overflow-x-auto p-4 md:p-6">
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-4 min-w-max h-full">
              {STAGES.map((stage) => (
                <div key={stage} className="w-72 flex flex-col">
                  {/* Column Header */}
                  <div className={`flex items-center justify-between mb-3 px-3 py-2 rounded-lg border ${STAGE_COLORS[stage]}`}>
                    <div className="flex items-center gap-2">
                      <span>{STAGE_ICONS[stage]}</span>
                      <span className={`font-semibold text-sm ${STAGE_HEADER_COLORS[stage]}`}>
                        {stage}
                      </span>
                    </div>
                    <span className="text-xs text-white/40 bg-white/10 px-2 py-1 rounded-full">
                      {getLeadsByStage(stage).length}
                    </span>
                  </div>

                  {/* Droppable Area */}
                  <Droppable droppableId={stage}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 rounded-xl p-2 min-h-32 transition-colors ${
                          snapshot.isDraggingOver
                            ? "bg-white/5 border border-white/20"
                            : "border border-white/5"
                        }`}
                      >
                        {getLeadsByStage(stage).map((lead, index) => (
                          <Draggable
                            key={lead.id}
                            draggableId={String(lead.id)}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={() => navigate(`/leads/${lead.id}`)}
                                className={`mb-2 p-3 border rounded-xl cursor-pointer transition ${
                                  snapshot.isDragging
                                    ? "border-white/40 bg-white/10 shadow-lg"
                                    : "border-white/10 bg-black hover:border-white/30"
                                }`}
                              >
                                <div className="font-medium text-sm mb-1 truncate">
                                  {lead.name}
                                </div>
                                {lead.company && (
                                  <div className="text-white/40 text-xs mb-2 truncate">
                                    🏢 {lead.company}
                                  </div>
                                )}
                                <div className="flex items-center justify-between">
                                  {lead.score > 0 ? (
                                    <span className="text-xs text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">
                                      Score: {lead.score}
                                    </span>
                                  ) : (
                                    <span />
                                  )}
                                  {lead.follow_up_date && (
                                    <span className="text-xs text-white/30">
                                      📅 {lead.follow_up_date}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}

                        {/* Empty State */}
                        {getLeadsByStage(stage).length === 0 && (
                          <div className="text-center py-8 text-white/20 text-xs">
                            Drop leads here
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
            </div>
          </DragDropContext>
        </div>
      </div>
    </div>
  );
}