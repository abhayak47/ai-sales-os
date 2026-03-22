import { useEffect, useRef, useState } from "react";

import API from "../api/axios";
import Sidebar from "../components/Sidebar";

const SUGGESTED_QUESTIONS = [
  "Which lead deserves my attention first today?",
  "How should I handle a pricing objection on an active deal?",
  "What is the smartest next move for a buyer who went quiet after a strong meeting?",
  "How do I reframe our value without sounding repetitive?",
];

export default function SalesCoach() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "I’m your revenue coach. Ask for strategy, objection handling, pipeline prioritization, or a sharper message for any live deal.",
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
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const chatHistory = nextMessages.slice(1).slice(-10).map((item) => ({ role: item.role, content: item.content }));
      const res = await API.post("/ai/coach", {
        message: messageText,
        chat_history: chatHistory.slice(0, -1),
      });
      setMessages([...nextMessages, { role: "assistant", content: res.data.response }]);
    } catch (err) {
      setMessages([
        ...nextMessages,
        { role: "assistant", content: err.response?.data?.detail || "Something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex">
      <Sidebar />

      <div className="flex-1 mt-16 md:mt-0 p-4 md:p-8 overflow-y-auto">
        <div className="page-frame">
          <div className="glass-panel rounded-[2rem] p-6 md:p-8 mb-6">
            <div className="section-title mb-3">AI Sales Coach</div>
            <h1 className="text-3xl md:text-4xl font-semibold mb-3">A sharper strategy room for live deals.</h1>
            <p className="text-white/55 text-sm md:text-base max-w-3xl leading-7">
              Ask about active deals, objections, next steps, or messaging. The coach uses pipeline context so the advice is tied to your real opportunities.
            </p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[0.34fr_0.66fr] gap-6">
            <div className="premium-card p-6 h-fit">
              <div className="text-base font-semibold mb-4">Suggested prompts</div>
              <div className="space-y-3">
                {SUGGESTED_QUESTIONS.map((question) => (
                  <button
                    key={question}
                    onClick={() => sendMessage(question)}
                    className="w-full text-left border border-white/10 rounded-2xl px-4 py-4 text-sm text-white/70 hover:border-white/25 transition"
                  >
                    {question}
                  </button>
                ))}
              </div>
              <div className="border border-white/10 rounded-2xl p-4 mt-5 text-sm text-white/55 leading-7">
                Each message uses 1 AI credit and draws from the live pipeline context available to the coach.
              </div>
            </div>

            <div className="premium-card p-5 md:p-6 flex flex-col min-h-[72vh]">
              <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/10">
                <div>
                  <div className="text-base font-semibold">Conversation</div>
                  <div className="text-sm text-white/40 mt-1">Ask for message rewrites, strategy, or prioritization help.</div>
                </div>
                <div className="hero-chip normal-case tracking-normal text-[11px]">Context-aware</div>
              </div>

              <div className="flex-1 overflow-y-auto py-5 space-y-4">
                {messages.map((msg, index) => (
                  <div key={`${msg.role}-${index}`} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-3xl px-4 py-4 rounded-2xl text-sm leading-7 whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-white text-black rounded-br-md"
                        : "bg-white/5 border border-white/10 text-white/80 rounded-bl-md"
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-white/5 border border-white/10 px-4 py-4 rounded-2xl rounded-bl-md">
                      <div className="flex gap-2">
                        {[0, 120, 240].map((delay) => (
                          <div key={delay} className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="pt-4 border-t border-white/10">
                <div className="flex gap-3">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Ask the coach how to move a deal, handle an objection, or sharpen a message..."
                    rows={3}
                    className="input-surface resize-none"
                  />
                  <button onClick={() => sendMessage()} disabled={loading || !input.trim()} className="button-primary h-fit self-end disabled:opacity-50">
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
