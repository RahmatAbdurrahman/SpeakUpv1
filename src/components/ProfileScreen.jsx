import React, { useEffect, useState } from "react";
import "./ProfileScreen.css";
import iconNavHome from "../assets/pages_assets/bottom-nav-icons/Home.svg";
import iconNavMic from "../assets/pages_assets/bottom-nav-icons/Mic.svg";
import iconNavUser from "../assets/pages_assets/bottom-nav-icons/User.svg";
import iconGroup from "../assets/pages_assets/practice/icon_group.svg";
import iconFlash from "../assets/pages_assets/ai_analysis/Icons/Flash-Icon.svg";
import iconMouth from "../assets/pages_assets/ai_analysis/Icons/Mouth-Icon.svg";
import iconSpeed from "../assets/pages_assets/ai_analysis/Icons/Speed-Icon.svg";
import iconArgument from "../assets/pages_assets/ai_analysis/Icons/Argument-Icon.svg";
import iconSettings from "../assets/icons/Settings.svg";
import { supabase } from "../lib/supabaseClient";
import { fetchProfile } from "../lib/profile";
import { fetchProgressSummary } from "../lib/progress";
import { fetchMyPeerRatingSummary } from "../lib/peerFeedback";
import { useUserProgress } from "../context/UserProgressContext";
import { ProfileSkeleton } from "./SkeletonLoader";

const KATEGORI_LABEL = {
  spontan: "Spontaneous",
  kelas: "Presentasi",
  lomba: "Presentasi",
  interview: "Interview",
};

const KATEGORI_CLASS = {
  spontan: "profile-cat--spontan",
  kelas: "profile-cat--presentasi",
  lomba: "profile-cat--presentasi",
  interview: "profile-cat--interview",
};

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export default function ProfileScreen({ onNavigateHome, onNavigatePractice, onNavigateSosial, onOpenSettings, onOpenSessionDetail }) {
  const { progressSummary, xp } = useUserProgress();
  const [loading, setLoading] = useState(!progressSummary);
  const [errorMessage, setErrorMessage] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [summary, setSummary] = useState(progressSummary);
  const [peerRating, setPeerRating] = useState(null);
  const [showAllSessions, setShowAllSessions] = useState(false);

  useEffect(() => {
    if (progressSummary) {
      setSummary(progressSummary);
    }
  }, [progressSummary]);

  useEffect(() => {
    let active = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) {
        setErrorMessage("Sesi tidak ditemukan. Coba masuk lagi.");
        setLoading(false);
        return;
      }
      try {
        const [profile, progress, peer] = await Promise.all([
          fetchProfile(user.id),
          fetchProgressSummary(user.id),
          fetchMyPeerRatingSummary(user.id),
        ]);
        if (!active) return;
        setDisplayName(profile.nama_panggilan || profile.username || "Pengguna");
        setSummary(progress);
        setPeerRating(peer);
      } catch (err) {
        if (active) setErrorMessage(err?.message || "Terjadi kesalahan. Coba lagi.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const initial = displayName.trim().charAt(0).toUpperCase() || "?";
  const dnaScore = summary?.dnaScore != null 
    ? Math.round(summary.dnaScore) 
    : summary?.avgSkor != null 
    ? Math.round(summary.avgSkor) 
    : null;
  const maxTrend = Math.max(1, ...(summary?.dnaTrend ?? []).map((p) => p.agregat_skor));

  if (loading && !summary) {
    return (
      <ProfileSkeleton
        onNavigateHome={onNavigateHome}
        onNavigatePractice={onNavigatePractice}
        onNavigateSosial={onNavigateSosial}
        onNavigateProfile={() => {}}
      />
    );
  }

  return (
    <div className="profile-screen" data-name="Profile">
      {/* ── Top Bar ─────────────────────────────────────────────── */}
      <div className="profile-topbar">
        <h1 className="profile-topbar-title">Progress</h1>
        <div className="profile-topbar-actions">
          <button
            type="button"
            className="btn-profile-settings"
            onClick={onOpenSettings}
            aria-label="Pengaturan"
          >
            <img src={iconSettings} alt="" className="profile-settings-icon" />
          </button>
        </div>
      </div>

      <div className="profile-scroll-body">
        {loading && <p className="profile-hint-text">Memuat profil...</p>}
        {!loading && errorMessage && <p className="profile-error-banner">{errorMessage}</p>}

        {!loading && !errorMessage && summary && (
          <>
            {/* ── User Header Card ─────────────────────────────────── */}
            <div className="profile-header-card">
              <div className="profile-avatar">{initial}</div>
              <div className="profile-header-text">
                <span className="profile-header-name">{displayName}</span>
                <div className="profile-header-meta">
                  <span className="profile-meta-pill">
                    🎯 {summary.totalSesi} Sesi Latihan
                  </span>
                  <span className="profile-meta-pill profile-meta-pill--xp">
                    ⚡ {(xp || 0).toLocaleString("id-ID")} XP
                  </span>
                </div>
              </div>
            </div>

            {/* ── Speaking DNA Card ────────────────────────────────── */}
            <div className="profile-dna-card">
              <div className="profile-dna-badge">
                <span className="profile-dna-badge-dot" />
                <span>Speaking DNA</span>
              </div>

              {dnaScore != null ? (
                <>
                  <div className="profile-dna-score-wrap">
                    <span className="profile-dna-score">{dnaScore}</span>
                    <span className="profile-dna-max">/100</span>
                  </div>
                  <span className="profile-dna-status-pill">
                    {dnaScore >= 80 ? "✨ Pembicara Percaya Diri" : dnaScore >= 60 ? "🔥 Performa Solid" : "🌱 Sedang Berkembang"}
                  </span>
                  <p className="profile-dna-desc">
                    Indeks profil kemampuan public speaking kamu berdasarkan rata-rata 4 pilar utama.
                  </p>
                </>
              ) : (
                <div className="profile-dna-empty-box">
                  <span className="profile-dna-empty-icon">📊</span>
                  <span className="profile-dna-empty">Selesaikan sesi latihan pertamamu untuk membuka skor Speaking DNA</span>
                </div>
              )}

              {summary.dnaTrend.length > 1 && (
                <div className="profile-dna-trend-section">
                  <span className="profile-dna-trend-title">Tren Perkembangan Terakhir</span>
                  <div className="profile-dna-trend">
                    {summary.dnaTrend.map((point) => (
                      <div
                        key={point.tanggal_snapshot}
                        className="profile-dna-trend-col"
                      >
                        <div
                          className="profile-dna-trend-bar"
                          style={{ height: `${Math.max(12, (point.agregat_skor / maxTrend) * 44)}px` }}
                          title={`${formatDate(point.tanggal_snapshot)}: ${Math.round(point.agregat_skor)}`}
                        />
                        <span className="profile-dna-trend-label">
                          {new Date(point.tanggal_snapshot).toLocaleDateString("id-ID", { day: "numeric" })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Sub-Scores Breakdown ─────────────────────────────── */}
            <section className="profile-section">
              <div className="profile-section-header">
                <h2 className="profile-section-title">4 Pilar Kemampuan Bicara</h2>
                {summary.avgSkor != null && (
                  <span className="profile-avg-badge">Rata-rata: {Math.round(summary.avgSkor)}</span>
                )}
              </div>

              {summary.avgSkor == null ? (
                <div className="profile-empty-card">
                  <span className="profile-empty-icon">📈</span>
                  <p className="profile-empty-title">Belum ada analisis skor</p>
                  <p className="profile-empty-desc">Selesaikan minimal satu simulasi untuk melihat rincian 4 pilar kemampuan.</p>
                </div>
              ) : (
                <div className="profile-analysis-grid">
                  {/* Fluency */}
                  <div className="profile-analysis-card">
                    <img src={iconFlash} alt="" className="profile-analysis-icon" />
                    <p className="profile-analysis-card-label">Kelancaran</p>
                    <p
                      className={`profile-analysis-metric${
                        (summary.avgSubScores.fluency || 0) < 60 ? " profile-analysis-metric--warn" : ""
                      }`}
                    >
                      {summary.avgSubScores.fluency != null ? Math.round(summary.avgSubScores.fluency) : "—"}
                      <span className="profile-analysis-metric-unit">/ 100</span>
                    </p>
                    <span
                      className={`profile-analysis-chip profile-analysis-chip--${
                        (summary.avgSubScores.fluency || 0) >= 60 ? "good" : "warn"
                      }`}
                    >
                      {(summary.avgSubScores.fluency || 0) >= 75
                        ? "Lancar"
                        : (summary.avgSubScores.fluency || 0) >= 60
                        ? "Stabil"
                        : "Perlu Latihan"}
                    </span>
                  </div>

                  {/* Eye Contact */}
                  <div className="profile-analysis-card">
                    <img src={iconMouth} alt="" className="profile-analysis-icon" />
                    <p className="profile-analysis-card-label">Kontak Mata</p>
                    <p
                      className={`profile-analysis-metric${
                        (summary.avgSubScores.eye_contact || 0) < 60 ? " profile-analysis-metric--warn" : ""
                      }`}
                    >
                      {summary.avgSubScores.eye_contact != null ? Math.round(summary.avgSubScores.eye_contact) : "—"}
                      <span className="profile-analysis-metric-unit">/ 100</span>
                    </p>
                    <span
                      className={`profile-analysis-chip profile-analysis-chip--${
                        (summary.avgSubScores.eye_contact || 0) >= 60 ? "good" : "warn"
                      }`}
                    >
                      {(summary.avgSubScores.eye_contact || 0) >= 75
                        ? "Fokus"
                        : (summary.avgSubScores.eye_contact || 0) >= 60
                        ? "Stabil"
                        : "Perlu Latihan"}
                    </span>
                  </div>

                  {/* Intonasi */}
                  <div className="profile-analysis-card">
                    <img src={iconSpeed} alt="" className="profile-analysis-icon" />
                    <p className="profile-analysis-card-label">Intonasi</p>
                    <p
                      className={`profile-analysis-metric${
                        (summary.avgSubScores.intonasi || 0) < 60 ? " profile-analysis-metric--warn" : ""
                      }`}
                    >
                      {summary.avgSubScores.intonasi != null ? Math.round(summary.avgSubScores.intonasi) : "—"}
                      <span className="profile-analysis-metric-unit">/ 100</span>
                    </p>
                    <span
                      className={`profile-analysis-chip profile-analysis-chip--${
                        (summary.avgSubScores.intonasi || 0) >= 60 ? "good" : "warn"
                      }`}
                    >
                      {(summary.avgSubScores.intonasi || 0) >= 75
                        ? "Dinamis"
                        : (summary.avgSubScores.intonasi || 0) >= 60
                        ? "Stabil"
                        : "Perlu Latihan"}
                    </span>
                  </div>

                  {/* Struktur Materi */}
                  <div className="profile-analysis-card">
                    <img src={iconArgument} alt="" className="profile-analysis-icon" />
                    <p className="profile-analysis-card-label">Struktur Materi</p>
                    <p
                      className={`profile-analysis-metric${
                        (summary.avgSubScores.kesesuaian_materi || 0) < 60 ? " profile-analysis-metric--warn" : ""
                      }`}
                    >
                      {summary.avgSubScores.kesesuaian_materi != null
                        ? Math.round(summary.avgSubScores.kesesuaian_materi)
                        : "—"}
                      <span className="profile-analysis-metric-unit">/ 100</span>
                    </p>
                    <span
                      className={`profile-analysis-chip profile-analysis-chip--${
                        (summary.avgSubScores.kesesuaian_materi || 0) >= 60 ? "good" : "warn"
                      }`}
                    >
                      {(summary.avgSubScores.kesesuaian_materi || 0) >= 75
                        ? "Terstruktur"
                        : (summary.avgSubScores.kesesuaian_materi || 0) >= 60
                        ? "Cukup Jelas"
                        : "Perlu Latihan"}
                    </span>
                  </div>
                </div>
              )}
            </section>

            {/* ── Peer Feedback Rating ─────────────────────────────── */}
            {peerRating && peerRating.count > 0 && (
              <section className="profile-section">
                <div className="profile-section-header">
                  <h2 className="profile-section-title">Rating dari Penonton</h2>
                  <span className="profile-section-badge">{peerRating.count} Ulasan</span>
                </div>

                <div className="profile-peer-card">
                  <div className="profile-peer-header">
                    <div className="profile-peer-stars-wrap">
                      <span className="profile-peer-star-icon">⭐</span>
                      <span className="profile-peer-score-val">{peerRating.avgStars.toFixed(1)}</span>
                      <span className="profile-peer-score-max">/5.0</span>
                    </div>
                    <span className="profile-peer-rating-count">Berdasarkan {peerRating.count} rating latihan</span>
                  </div>

                  {peerRating.topTags.length > 0 && (
                    <div className="profile-peer-tags-wrap">
                      {peerRating.topTags.map((tag) => (
                        <span key={tag} className="profile-peer-tag">
                          ✨ {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* ── Riwayat Sesi ─────────────────────────────────────── */}
            <section className="profile-section">
              <div className="profile-section-header">
                <h2 className="profile-section-title">Riwayat Sesi Latihan</h2>
                {summary.recentSessions.length > 0 && (
                  <span className="profile-section-badge">
                    {showAllSessions ? `${summary.recentSessions.length} Sesi` : `5 dari ${summary.recentSessions.length}`}
                  </span>
                )}
              </div>

              {summary.recentSessions.length === 0 && (
                <div className="profile-empty-card">
                  <span className="profile-empty-icon">🎙️</span>
                  <p className="profile-empty-title">Belum ada riwayat sesi</p>
                  <p className="profile-empty-desc">Mulai latihan di tab Simulasi untuk merekam sesi latihan pertamamu!</p>
                </div>
              )}

              {summary.recentSessions.length > 0 && (
                <>
                  <div className="profile-history-list">
                    {(showAllSessions ? summary.recentSessions : summary.recentSessions.slice(0, 5)).map((s) => {
                      const score = s.skor != null ? Math.round(s.skor) : null;
                      const catClass = KATEGORI_CLASS[s.kategori] || "profile-cat--presentasi";
                      const isHighScore = score != null && score >= 80;
                      const isMidScore = score != null && score >= 60 && score < 80;

                      return (
                        <div
                          key={s.id}
                          className="profile-history-card profile-history-card--tappable"
                          role="button"
                          tabIndex={0}
                          onClick={() =>
                            onOpenSessionDetail?.({ sessionId: s.id, kategori: s.kategori, date: s.date, isLive: s.isLive })
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onOpenSessionDetail?.({ sessionId: s.id, kategori: s.kategori, date: s.date, isLive: s.isLive });
                            }
                          }}
                        >
                          <div className="profile-history-left">
                            <div className="profile-history-tags">
                              <span className={`profile-cat-pill ${catClass}`}>
                                {KATEGORI_LABEL[s.kategori] || "Latihan"}
                              </span>
                              {s.isLive && <span className="profile-live-pill">Live</span>}
                              <span className="profile-history-date">{formatDate(s.date)}</span>
                            </div>
                            <span className="profile-history-desc">
                              {s.isLive ? "Sesi Live Presentasi" : "Sesi Latihan Simulasi"}
                              {s.isLive && s.peerRatingCount > 0 && (
                                <> · ⭐ {s.peerAvgStars.toFixed(1)} ({s.peerRatingCount})</>
                              )}
                            </span>
                          </div>

                          <div
                            className={`profile-history-score-pill ${
                              isHighScore
                                ? "profile-score--high"
                                : isMidScore
                                ? "profile-score--mid"
                                : "profile-score--low"
                            }`}
                          >
                            <span className="profile-score-num">{score != null ? score : "—"}</span>
                            <span className="profile-score-label">Skor</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {summary.recentSessions.length > 5 && (
                    <button
                      type="button"
                      className="btn-profile-load-more"
                      onClick={() => setShowAllSessions((prev) => !prev)}
                    >
                      {showAllSessions
                        ? "Tampilkan Lebih Sedikit"
                        : `Lihat ${summary.recentSessions.length - 5} Sesi Lainnya`}
                    </button>
                  )}
                </>
              )}
            </section>
          </>
        )}
      </div>

      {/* ── Bottom Navigation Bar ───────────────────────────────── */}
      <div className="home-bottom-nav">
        <button type="button" className="home-nav-item" onClick={onNavigateHome} aria-label="Home">
          <img src={iconNavHome} alt="Home" className="home-nav-icon" />
        </button>
        <button type="button" className="home-nav-item" onClick={onNavigatePractice} aria-label="Simulasi">
          <img src={iconNavMic} alt="Simulasi" className="home-nav-icon" />
        </button>
        <button type="button" className="home-nav-item" onClick={onNavigateSosial} aria-label="Sosial">
          <img src={iconGroup} alt="Sosial" className="home-nav-icon" />
        </button>
        <button type="button" className="home-nav-item home-nav-item--active" aria-label="Profile">
          <img src={iconNavUser} alt="Profile" className="home-nav-icon home-nav-icon--active" />
        </button>
      </div>
    </div>
  );
}
