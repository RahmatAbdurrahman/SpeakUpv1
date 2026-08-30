import React, { useEffect, useState } from "react";
import "./ViewerFeedbackScreen.css";
import arrowLeftIcon from "../assets/pages_assets/questionnaires/arrow_left.svg";
import { fetchPeerFeedbackSummary, fetchPeerFeedbackEntries, friendlyPeerFeedbackError } from "../lib/peerFeedback";

function initialsFor(name) {
  const parts = (name || "?").trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
}

function timeAgo(iso) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "Baru saja";
  if (mins < 60) return `${mins} mnt lalu`;
  return `${Math.round(mins / 60)} jam lalu`;
}

function Stars({ count }) {
  return (
    <span className="viewerfb-stars" aria-label={`${count} dari 5 bintang`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={`viewerfb-star ${n <= count ? "filled" : ""}`}>
          ★
        </span>
      ))}
    </span>
  );
}

export default function ViewerFeedbackScreen({ sessionId, onBack }) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [entries, setEntries] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [summaryData, entriesData] = await Promise.all([
          fetchPeerFeedbackSummary(sessionId),
          fetchPeerFeedbackEntries(sessionId),
        ]);
        if (!active) return;
        setSummary(summaryData);
        setEntries(entriesData);
      } catch (err) {
        if (active) setErrorMessage(friendlyPeerFeedbackError(err));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [sessionId]);

  return (
    <div className="viewerfb-screen" data-name="ViewerFeedback">
      <header className="viewerfb-topbar">
        <button type="button" className="viewerfb-back-btn" onClick={onBack} aria-label="Kembali">
          <img src={arrowLeftIcon} alt="" className="viewerfb-back-icon" />
        </button>
        <h1 className="viewerfb-title">Feedback dari Viewer</h1>
      </header>

      <div className="viewerfb-scroll-body">
        {loading && <p className="viewerfb-hint">Memuat feedback...</p>}
        {errorMessage && <p className="viewerfb-error">{errorMessage}</p>}

        {!loading && !errorMessage && summary && (
          <div className="viewerfb-summary-card">
            <div className="viewerfb-summary-score">
              <span className="viewerfb-summary-num">{summary.avgStars != null ? summary.avgStars.toFixed(1) : "–"}</span>
              <span className="viewerfb-summary-max">/5.0</span>
            </div>
            <p className="viewerfb-summary-count">Berdasarkan {summary.count} rating dari penonton</p>
            {summary.topTags.length > 0 && (
              <div className="viewerfb-summary-tags">
                {summary.topTags.map((tag) => (
                  <span key={tag} className="viewerfb-tag-chip">
                    ✨ {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {!loading && !errorMessage && entries.length === 0 && (
          <div className="viewerfb-empty-card">
            <span className="viewerfb-empty-icon">👀</span>
            <p className="viewerfb-empty-title">Belum ada penonton yang kasih rating</p>
            <p className="viewerfb-empty-desc">
              Feedback dari penonton bakal muncul di sini begitu ada yang menilai sesi live-mu.
            </p>
          </div>
        )}

        {!loading && entries.length > 0 && (
          <div className="viewerfb-list">
            {entries.map((entry) => (
              <div key={entry.id} className="viewerfb-entry-card">
                <div className="viewerfb-entry-head">
                  <div className="viewerfb-entry-who">
                    <span className="viewerfb-avatar">{initialsFor(entry.raterName)}</span>
                    <div className="viewerfb-entry-who-text">
                      <span className="viewerfb-entry-name">{entry.raterName}</span>
                      <span className="viewerfb-entry-time">{timeAgo(entry.createdAt)}</span>
                    </div>
                  </div>
                  <Stars count={entry.stars} />
                </div>

                {entry.tags.length > 0 && (
                  <div className="viewerfb-entry-tags">
                    {entry.tags.map((tag) => (
                      <span key={tag} className="viewerfb-tag-chip">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {entry.comment && <p className="viewerfb-entry-comment">“{entry.comment}”</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
