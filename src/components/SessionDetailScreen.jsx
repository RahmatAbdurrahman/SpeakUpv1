import React, { useEffect, useState } from "react";
import "./SimulasiScreen.css";
import "./ViewerFeedbackScreen.css";
import "./SessionDetailScreen.css";
import arrowLeftIcon from "../assets/pages_assets/questionnaires/arrow_left.svg";
import { AnalysisCards } from "./SimulasiScreen";
import { fetchSessionResults, friendlySimulasiError } from "../lib/simulasi";
import { fetchPeerFeedbackSummary, fetchPeerFeedbackEntries } from "../lib/peerFeedback";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import animaBotLottie from "../assets/lotties/AnimaBot.lottie";

const KATEGORI_LABEL = { spontan: "Spontaneous", kelas: "Presentasi", lomba: "Presentasi", interview: "Interview" };

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

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * Riwayat Sesi drill-down — tap a history card, land here. Reuses
 * AnalysisCards (exported from SimulasiScreen) for the AI feedback so this
 * never drifts out of sync with what the live results screens show, and
 * additionally surfaces peer feedback for sessions that had real viewers
 * (Live Presentation) — the whole reason this screen exists per the design
 * discussion: history shouldn't stop at "jenis latihan, waktu, skor".
 */
export default function SessionDetailScreen({ sessionId, kategori, date, isLive, onBack }) {
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [results, setResults] = useState(null);
  const [peerSummary, setPeerSummary] = useState(null);
  const [peerEntries, setPeerEntries] = useState([]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const tasks = [fetchSessionResults(sessionId)];
        if (isLive) tasks.push(fetchPeerFeedbackSummary(sessionId), fetchPeerFeedbackEntries(sessionId));
        const [resultsData, peerSummaryData, peerEntriesData] = await Promise.all(tasks);
        if (!active) return;
        setResults(resultsData);
        if (isLive) {
          setPeerSummary(peerSummaryData);
          setPeerEntries(peerEntriesData ?? []);
        }
      } catch (err) {
        if (active) setErrorMessage(friendlySimulasiError(err));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [sessionId, isLive]);

  const hasFeedback = Boolean(results?.feedback);

  return (
    <div className="sessiondetail-screen">
      <header className="viewerfb-topbar">
        <button type="button" className="viewerfb-back-btn" onClick={onBack} aria-label="Kembali">
          <img src={arrowLeftIcon} alt="" className="viewerfb-back-icon" />
        </button>
        <div className="sessiondetail-header-text">
          <h1 className="viewerfb-title">
            {KATEGORI_LABEL[kategori] || "Latihan"}
            {isLive && <span className="sessiondetail-live-badge">Live</span>}
          </h1>
          <span className="sessiondetail-date">{formatDate(date)}</span>
        </div>
      </header>

      <div className="viewerfb-scroll-body">
        {loading && <p className="viewerfb-hint">Memuat detail sesi...</p>}
        {errorMessage && <p className="viewerfb-error">{errorMessage}</p>}

        {!loading && hasFeedback && <AnalysisCards results={results} />}

        {!loading && !hasFeedback && !errorMessage && (
          <div className="viewerfb-empty-card">
            <div className="viewerfb-empty-lottie-wrap">
              <DotLottieReact
                src={animaBotLottie}
                loop
                autoplay
                className="viewerfb-empty-lottie"
              />
            </div>
            <p className="viewerfb-empty-title">Belum ada feedback AI untuk sesi ini</p>
            <p className="viewerfb-empty-desc">
              Sesi ini kemungkinan direkam sebelum analisis AI-nya sempat diproses.
            </p>
          </div>
        )}

        {isLive && !loading && (
          <>
            <h2 className="sessiondetail-section-title">Feedback dari Viewer</h2>
            {peerSummary && peerSummary.count > 0 ? (
              <>
                <div className="viewerfb-summary-card">
                  <div className="viewerfb-summary-score">
                    <span className="viewerfb-summary-num">{peerSummary.avgStars.toFixed(1)}</span>
                    <span className="viewerfb-summary-max">/5.0</span>
                  </div>
                  <p className="viewerfb-summary-count">Berdasarkan {peerSummary.count} rating dari penonton</p>
                </div>
                <div className="viewerfb-list">
                  {peerEntries.map((entry) => (
                    <div key={entry.id} className="viewerfb-entry-card">
                      <div className="viewerfb-entry-head">
                        <span className="viewerfb-entry-name">{entry.raterName}</span>
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
              </>
            ) : (
              <div className="viewerfb-empty-card">
                <span className="viewerfb-empty-icon">👀</span>
                <p className="viewerfb-empty-title">Belum ada penonton yang kasih rating</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
