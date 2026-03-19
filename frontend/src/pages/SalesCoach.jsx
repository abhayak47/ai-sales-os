import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";

const SUGGESTED_QUESTIONS = [
  "Which lead should I focus on today?",
  "My client said the price is too high, what do I say?",
  "Write me a cold email for a startup founder",
  "How do I follow up without being annoying?",
  "Analyze my pipeline and tell me what to do next",
  "My lead went cold after 2 meetings, how do I re-engage?",
];

export default function SalesCoach() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `Hey! 👋 I'm your AI Sales Coach. I know your entire pipeline and I'm here to help you close more deals.

Ask me anything:
- Which leads to prioritize today
- How to handle objections
- Write emails, WhatsApp messages, scripts
- Analyze your pipeline
- Get specific advice for any deal

What's on your mind?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text) => {
    const messageText = text || input.trim();
    if (!messageText) return;

    const userMessage = { role: "user", content: messageText };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const chatHistory = newMessages
        .slice(1)
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await API.post("/ai/coach", {
        message: messageText,
        chat_history: chatHistory.slice(0, -1),
      });

      setMessages([
        ...newMessages,
        { role: "assistant", content: res.data.response },
      ]);
    } catch (err) {
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content:
            err.response?.data?.detail ||
            err.message ||
            "Something went wrong. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Sidebar */}
      <div className="w-64 border-r border-white/10 p-6 flex flex-col">
        <div className="text-xl font-bold mb-10">⚡ AI Sales OS</div>
        <nav className="flex flex-col gap-1 flex-1">
          {[
            { icon: "🏠", label: "Dashboard", path: "/dashboard" },
            { icon: "🗣️", label: "Sales Coach", path: "/coach" },
            { icon: "🤖", label: "AI Follow-Up", path: "/followup" },
            { icon: "👥", label: "Leads", path: "/leads" },
            { icon: "💳", label: "Pricing", path: "/pricing" },
          ].map((item, i) => (
            <button
              key={i}
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition text-left
                ${i === 1
                  ? "bg-white/10 text-white"
                  : "text-white/50 hover:text-white hover:bg-white/5"
                }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <button
          onClick={() => {
            localStorage.removeItem("token");
            navigate("/");
          }}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-white/40 hover:text-white hover:bg-white/5 transition"
        >
          <span>🚪</span>
          <span>Logout</span>
        </button>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-white/10 px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">🗣️ AI Sales Coach</h1>
            <p className="text-white/40 text-sm">
              Your personal AI coach that knows your pipeline
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-white/40 text-sm">Online</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-4 ${
                msg.role === "user" ? "flex-row-reverse" : ""
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0
                  ${msg.role === "user"
                    ? "bg-white text-black"
                    : "bg-purple-600 text-white"
                  }`}
              >
                {msg.role === "user" ? "Y" : "🧠"}
              </div>

              {/* Message */}
              <div
                className={`max-w-2xl px-5 py-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
                  ${msg.role === "user"
                    ? "bg-white/10 text-white rounded-tr-sm"
                    : "bg-white/5 border border-white/10 text-white/80 rounded-tl-sm"
                  }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Loading */}
          {loading && (
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-sm">
                🧠
              </div>
              <div className="bg-white/5 border border-white/10 px-5 py-4 rounded-2xl rounded-tl-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Questions */}
        {messages.length === 1 && (
          <div className="px-8 pb-4">
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  className="text-xs px-3 py-2 border border-white/10 rounded-lg text-white/50 hover:text-white hover:border-white/30 transition"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-white/10 px-8 py-4">
          <div className="flex gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask your sales coach anything... (Press Enter to send)"
              rows={2}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition resize-none text-sm"
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="px-6 bg-white text-black font-semibold rounded-xl hover:bg-white/90 transition disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? "⚡" : "Send →"}
            </button>
          </div>
          <p className="text-white/20 text-xs mt-2">
            Each message uses 1 AI credit
          </p>
        </div>
      </div>
    </div>
  );
}