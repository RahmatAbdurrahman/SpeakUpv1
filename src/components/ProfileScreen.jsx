import React, { useEffect, useState } from "react";
import "./ProfileScreen.css";
import iconNavHome from "../assets/pages_assets/bottom-nav-icons/Home.svg";
import iconNavMic from "../assets/pages_assets/bottom-nav-icons/Mic.svg";
import iconNavUser from "../assets/pages_assets/bottom-nav-icons/User.svg";
import iconGroup from "../assets/pages_assets/practice/icon_group.svg";
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

export default function ProfileScreen({ onNavigateHome, onNavigatePractice, onNavigateSosial, onOpenSettings }) {
  const { progressSummary, xp } = useUserProgress();
  const [loading, setLoading] = useState(!progressSummary);
  const [errorMessage, setErrorMessage] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [summary, setSummary] = useState(progressSummary);
  const [peerRating, setPeerRating] = useState(null);

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
  const dnaScore = summary?.dnaScore != null ? Math.round(summary.dnaScore) : null;
  const maxTrend = Math.max(1, ...(summary?.dnaTrend ?? []).map((p) => p.agregat_skor));
  const userLevel = Math.max(1, Math.floor((xp || 0) / 100) + 1);

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
        <button
          type="button"
          className="btn-profile-settings"
          onClick={onOpenSettings}
          aria-label="Pengaturan"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12 15a3 3 0 100-6 3 3 0 000 6z"
              stroke="#243238"
              strokeWidth="1.8"
            />
            <path
              d="M19.4 13a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V19a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H4a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H10a1.65 1.65 0 001-1.51V4a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V10a1.65 1.65 0 001.51 1H20a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"
              stroke="#243238"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <div className="profile-scroll-body">
        {loading && <p className="profile-hint-text">Memuat profil...</p>}
        {!loading && errorMessage && <p className="profile-error-banner">{errorMessage}</p>}

        {!loading && !errorMessage && summary && (
          <>
            {/* ── User Header Card ─────────────────────────────────── */}
            <div className="profile-header-card">
              <div className="profile-avatar-wrap">
                <div className="profile-avatar">{initial}</div>
                <div className="profile-level-badge">Lv. {userLevel}</div>
              </div>
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
                <div className="profile-metrics-grid">
                  {/* Fluency */}
                  <div className="profile-metric-card">
                    <div className="profile-metric-header">
                      <div className="profile-metric-title-group">
                        <span className="profile-metric-icon">⚡</span>
                        <span className="profile-metric-title">Kelancaran</span>
                      </div>
                      <span className="profile-metric-score">
                        {summary.avgSubScores.fluency != null ? Math.round(summary.avgSubScores.fluency) : "—"}
                      </span>
                    </div>
                    <div className="profile-metric-bar-bg">
                      <div
                        className="profile-metric-bar-fill profile-bar--fluency"
                        style={{ width: `${Math.min(100, summary.avgSubScores.fluency || 0)}%` }}
                      />
                    </div>
                  </div>

                  {/* Eye Contact */}
                  <div className="profile-metric-card">
                    <div className="profile-metric-header">
                      <div className="profile-metric-title-group">
                        <span className="profile-metric-icon">👁️</span>
                        <span className="profile-metric-title">Kontak Mata</span>
                      </div>
                      <span className="profile-metric-score">
                        {summary.avgSubScores.eye_contact != null ? Math.round(summary.avgSubScores.eye_contact) : "—"}
                      </span>
                    </div>
                    <div className="profile-metric-bar-bg">
                      <div
                        className="profile-metric-bar-fill profile-bar--eye"
                        style={{ width: `${Math.min(100, summary.avgSubScores.eye_contact || 0)}%` }}
                      />
                    </div>
                  </div>

                  {/* Intonasi */}
                  <div className="profile-metric-card">
                    <div className="profile-metric-header">
                      <div className="profile-metric-title-group">
                        <span className="profile-metric-icon">🎙️</span>
                        <span className="profile-metric-title">Intonasi</span>
                      </div>
                      <span className="profile-metric-score">
                        {summary.avgSubScores.intonasi != null ? Math.round(summary.avgSubScores.intonasi) : "—"}
                      </span>
                    </div>
                    <div className="profile-metric-bar-bg">
                      <div
                        className="profile-metric-bar-fill profile-bar--intonasi"
                        style={{ width: `${Math.min(100, summary.avgSubScores.intonasi || 0)}%` }}
                      />
                    </div>
                  </div>

                  {/* Struktur Materi */}
                  <div className="profile-metric-card">
                    <div className="profile-metric-header">
                      <div className="profile-metric-title-group">
                        <span className="profile-metric-icon">📑</span>
                        <span className="profile-metric-title">Struktur Materi</span>
                      </div>
                      <span className="profile-metric-score">
                        {summary.avgSubScores.kesesuaian_materi != null
                          ? Math.round(summary.avgSubScores.kesesuaian_materi)
                          : "—"}
                      </span>
                    </div>
                    <div className="profile-metric-bar-bg">
                      <div
                        className="profile-metric-bar-fill profile-bar--materi"
                        style={{ width: `${Math.min(100, summary.avgSubScores.kesesuaian_materi || 0)}%` }}
                      />
                    </div>
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
                  <span className="profile-section-badge">{summary.recentSessions.length} Terakhir</span>
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
                <div className="profile-history-list">
                  {summary.recentSessions.map((s) => {
                    const score = s.skor != null ? Math.round(s.skor) : null;
                    const catClass = KATEGORI_CLASS[s.kategori] || "profile-cat--presentasi";
                    const isHighScore = score != null && score >= 80;
                    const isMidScore = score != null && score >= 60 && score < 80;

                    return (
                      <div key={s.id} className="profile-history-card">
                        <div className="profile-history-left">
                          <div className="profile-history-tags">
                            <span className={`profile-cat-pill ${catClass}`}>
                              {KATEGORI_LABEL[s.kategori] || "Latihan"}
                            </span>
                            <span className="profile-history-date">{formatDate(s.date)}</span>
                          </div>
                          <span className="profile-history-desc">Sesi Latihan Simulasi</span>
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
