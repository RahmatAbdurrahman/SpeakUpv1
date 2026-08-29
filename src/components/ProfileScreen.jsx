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

const KATEGORI_LABEL = {
  spontan: "Spontaneous",
  kelas: "Presentasi",
  lomba: "Presentasi",
  interview: "Interview",
};

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export default function ProfileScreen({ onNavigateHome, onNavigatePractice, onNavigateSosial, onOpenSettings }) {
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [summary, setSummary] = useState(null);
  const [peerRating, setPeerRating] = useState(null);

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

  return (
    <div className="profile-screen" data-name="Profile">
      <div className="profile-topbar">
        <h1 className="profile-topbar-title">Progress</h1>
        <button type="button" className="btn-profile-settings" onClick={onOpenSettings} aria-label="Pengaturan">
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
        {loading && <p className="profile-hint-text">Memuat...</p>}
        {!loading && errorMessage && <p className="profile-error-banner">{errorMessage}</p>}

        {!loading && !errorMessage && summary && (
          <>
            <div className="profile-header-card">
              <div className="profile-avatar">{initial}</div>
              <div className="profile-header-text">
                <span className="profile-header-name">{displayName}</span>
                <span className="profile-header-email">{summary.totalSesi} sesi latihan selesai</span>
              </div>
            </div>

            <div className="profile-dna-card">
              <span className="profile-dna-label">Speaking DNA</span>
              {dnaScore != null ? (
                <span className="profile-dna-score">{dnaScore}</span>
              ) : (
                <span className="profile-dna-empty">Selesaikan sesi pertamamu buat lihat skor ini</span>
              )}
              {summary.dnaTrend.length > 1 && (
                <div className="profile-dna-trend">
                  {summary.dnaTrend.map((point) => (
                    <div
                      key={point.tanggal_snapshot}
                      className="profile-dna-trend-bar"
                      style={{ height: `${Math.max(10, (point.agregat_skor / maxTrend) * 40)}px` }}
                      title={`${formatDate(point.tanggal_snapshot)}: ${Math.round(point.agregat_skor)}`}
                    />
                  ))}
                </div>
              )}
            </div>

            <section className="profile-section">
              <h2 className="profile-section-title">Rata-rata Skor</h2>
              {summary.avgSkor == null ? (
                <p className="profile-hint-text">Belum ada sesi dengan feedback.</p>
              ) : (
                <div className="profile-subscore-list">
                  <div className="profile-subscore-row profile-subscore-row--total">
                    <span>Keseluruhan</span>
                    <span>{Math.round(summary.avgSkor)}</span>
                  </div>
                  <div className="profile-subscore-row">
                    <span>Kelancaran (Fluency)</span>
                    <span>{summary.avgSubScores.fluency != null ? Math.round(summary.avgSubScores.fluency) : "—"}</span>
                  </div>
                  <div className="profile-subscore-row">
                    <span>Kontak Mata</span>
                    <span>{summary.avgSubScores.eye_contact != null ? Math.round(summary.avgSubScores.eye_contact) : "—"}</span>
                  </div>
                  <div className="profile-subscore-row">
                    <span>Kesesuaian Materi</span>
                    <span>
                      {summary.avgSubScores.kesesuaian_materi != null ? Math.round(summary.avgSubScores.kesesuaian_materi) : "—"}
                    </span>
                  </div>
                  <div className="profile-subscore-row">
                    <span>Intonasi</span>
                    <span>{summary.avgSubScores.intonasi != null ? Math.round(summary.avgSubScores.intonasi) : "—"}</span>
                  </div>
                </div>
              )}
            </section>

            {peerRating && peerRating.count > 0 && (
              <section className="profile-section">
                <h2 className="profile-section-title">Rating dari Penonton</h2>
                <div className="profile-peer-rating-card">
                  <div className="profile-peer-rating-score">
                    <span className="profile-peer-rating-star">⭐</span>
                    <span>{peerRating.avgStars.toFixed(1)}</span>
                  </div>
                  <span className="profile-peer-rating-count">{peerRating.count} rating</span>
                  {peerRating.topTags.length > 0 && (
                    <div className="profile-peer-rating-tags">
                      {peerRating.topTags.map((tag) => (
                        <span key={tag} className="profile-peer-rating-tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            <section className="profile-section">
              <h2 className="profile-section-title">Riwayat Sesi</h2>
              {summary.recentSessions.length === 0 && (
                <p className="profile-hint-text">Belum ada sesi latihan. Yuk mulai dari tab Simulasi.</p>
              )}
              <div className="profile-history-list">
                {summary.recentSessions.map((s) => (
                  <div key={s.id} className="profile-history-row">
                    <div className="profile-history-meta">
                      <span className="profile-history-kategori">{KATEGORI_LABEL[s.kategori] || "Latihan"}</span>
                      <span className="profile-history-date">{formatDate(s.date)}</span>
                    </div>
                    <span className="profile-history-skor">{s.skor != null ? s.skor : "—"}</span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>

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
