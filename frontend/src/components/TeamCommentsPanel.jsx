import { useEffect, useState } from "react";

import API from "../api/axios";

export default function TeamCommentsPanel({ leadId }) {
  const [comments, setComments] = useState([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComments();
  }, [leadId]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/comments/lead/${leadId}`);
      setComments(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    try {
      await API.post(`/comments/lead/${leadId}`, { body });
      setBody("");
      fetchComments();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="premium-card p-5">
      <div className="text-base font-semibold mb-2">Team Collaboration</div>
      <div className="text-sm text-white/45 mb-4">Capture deal discussion, handoffs, and internal context without polluting customer-facing notes.</div>

      <form onSubmit={handleSubmit} className="space-y-3 mb-5">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          className="input-surface resize-none"
          placeholder="Add an internal note, handoff, or context for the next teammate..."
        />
        <button className="button-primary">Post internal note</button>
      </form>

      {loading ? (
        <div className="text-sm text-white/40">Loading collaboration feed...</div>
      ) : comments.length === 0 ? (
        <div className="text-sm text-white/40">No internal comments yet.</div>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="border border-white/10 rounded-2xl p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium text-sm">{comment.author_name}</div>
                <div className="text-xs text-white/35">{new Date(comment.created_at).toLocaleString()}</div>
              </div>
              <div className="text-sm text-white/65 leading-7 mt-2">{comment.body}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
