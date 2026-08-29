import React, { useState } from "react";
import "./PeerRatingModal.css";
import { submitPeerFeedback, friendlyPeerFeedbackError, PEER_FEEDBACK_TAGS } from "../lib/peerFeedback";

export default function PeerRatingModal({ sessionId, hostName, onDone }) {
  const [stars, setStars] = useState(0);
  const [tags, setTags] = useState([]);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const toggleTag = (tag) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const handleSubmit = async () => {
    if (stars === 0 || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await submitPeerFeedback(sessionId, { stars, tags, comment });
      onDone?.();
    } catch (err) {
      setError(friendlyPeerFeedbackError(err));
      setSubmitting(false);
    }
  };

  return (
    <div className="peer-rating-backdrop">
      <div className="peer-rating-sheet">
        <h2 className="peer-rating-title">Kasih rating buat {hostName || "presenter"}</h2>
        <p className="peer-rating-sub">Feedback kamu bantu mereka latihan lebih baik lagi.</p>

        <div className="peer-rating-stars">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className={`peer-rating-star ${n <= stars ? "filled" : ""}`}
              onClick={() => setStars(n)}
              aria-label={`${n} bintang`}
            >
              ★
            </button>
          ))}
        </div>

        <div className="peer-rating-tags">
          {PEER_FEEDBACK_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              className={`tag-chip ${tags.includes(tag) ? "active" : ""}`}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>

        <textarea
          className="peer-rating-comment"
          placeholder="Komentar tambahan (opsional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
        />

        {error && <p className="peer-rating-error">{error}</p>}

        <div className="peer-rating-actions">
          <button type="button" className="btn-peer-rating-skip" onClick={onDone} disabled={submitting}>
            Lewati
          </button>
          <button
            type="button"
            className="btn-peer-rating-submit"
            onClick={handleSubmit}
            disabled={stars === 0 || submitting}
          >
            {submitting ? "Mengirim..." : "Kirim Rating"}
          </button>
        </div>
      </div>
    </div>
  );
}
