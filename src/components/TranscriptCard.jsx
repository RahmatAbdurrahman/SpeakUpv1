import React, { useState, useMemo } from "react";
import "./TranscriptCard.css";
import iconQuote from "../assets/pages_assets/ai_analysis/Icons/Quote-Icon.svg";
import { analyzeTranscript } from "../lib/transcriptAnalysis";

export default function TranscriptCard({
  rawTranscript,
  title = "Transkrip & Analisis Kata",
  fallbackText = "Halo semuanya, pada kesempatan kali ini saya ingin menyampaikan beberapa argumen penting terkait topik ini. Pertama, komunikasi yang efektif adalah kunci dari kolaborasi tim. Kedua, dengan latihan yang rutin, kita bisa menyampaikan gagasan secara lebih terstruktur dan percaya diri.",
}) {
  const text = (() => {
    if (typeof rawTranscript === "string" && rawTranscript.trim()) return rawTranscript;
    if (rawTranscript && typeof rawTranscript === "object") {
      const extracted = rawTranscript.text || rawTranscript.transcript || rawTranscript.transkrip;
      if (typeof extracted === "string" && extracted.trim()) return extracted;
    }
    return fallbackText;
  })();

  const [selectedToken, setSelectedToken] = useState(null);
  const [copied, setCopied] = useState(false);

  const { tokens = [], stats = { fillerCount: 0, correctionCount: 0, strongCount: 0, totalWords: 0 } } =
    useMemo(() => analyzeTranscript(text) || {}, [text]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback ignore
    }
  };

  return (
    <div className="transcript-card">
      <div className="transcript-card-header">
        <div className="transcript-card-heading">
          <img src={iconQuote} alt="" className="transcript-card-icon" />
          <h3 className="transcript-card-title">{title}</h3>
        </div>
        <button
          type="button"
          className={`btn-transcript-copy ${copied ? "copied" : ""}`}
          onClick={handleCopy}
          aria-label="Salin Transkrip"
        >
          {copied ? "✓ Tersalin" : "📋 Salin"}
        </button>
      </div>

      {/* ── Summary & Legend Badges ── */}
      <div className="transcript-legend-row">
        <span className="transcript-legend-chip transcript-legend-chip--filler">
          <span className="transcript-legend-dot" />
          {stats.fillerCount} Kata Pengisi
        </span>
        {stats.correctionCount > 0 && (
          <span className="transcript-legend-chip transcript-legend-chip--correction">
            <span className="transcript-legend-dot" />
            {stats.correctionCount} Repetisi / Koreksi
          </span>
        )}
        {stats.strongCount > 0 && (
          <span className="transcript-legend-chip transcript-legend-chip--strong">
            <span className="transcript-legend-dot" />
            {stats.strongCount} Poin Kuat
          </span>
        )}
        <span className="transcript-legend-chip transcript-legend-chip--meta">
          {stats.totalWords} Kata
        </span>
      </div>

      {/* ── Highlighted Transcript Box ── */}
      <div className="transcript-content-box">
        {tokens.map((token, index) => {
          if (token.type === "text") {
            return <span key={index}>{token.text}</span>;
          }

          const markClass = `transcript-mark transcript-mark--${token.type}`;
          const isSelected = selectedToken === token;

          return (
            <mark
              key={index}
              className={markClass}
              onClick={() => setSelectedToken(isSelected ? null : token)}
              title={token.reason || "Koreksi kata"}
            >
              {token.text}
            </mark>
          );
        })}
      </div>

      {/* ── Interactive Drawer for Clicked Highlighted Token ── */}
      {selectedToken && (
        <div className="transcript-suggestion-drawer">
          <div className="transcript-suggestion-header">
            <span className={`transcript-suggestion-badge transcript-suggestion-badge--${selectedToken.type}`}>
              {selectedToken.type === "filler"
                ? "🟡 Kata Pengisi"
                : selectedToken.type === "correction"
                ? "🟧 Perlu Diperbaiki"
                : "🟢 Struktur Bagus"}
            </span>
            <button
              type="button"
              className="transcript-suggestion-close"
              onClick={() => setSelectedToken(null)}
              aria-label="Tutup saran"
            >
              ✕
            </button>
          </div>
          <p className="transcript-suggestion-reason">{selectedToken.reason}</p>
          {selectedToken.suggestion && (
            <p className="transcript-suggestion-tip">💡 Saran: {selectedToken.suggestion}</p>
          )}
        </div>
      )}
    </div>
  );
}
