import React, { useEffect, useState, useMemo } from "react";
import "./ProfileScreen.css";
import iconNavHome from "../assets/pages_assets/bottom-nav-icons/Home.svg";
import iconNavMic from "../assets/pages_assets/bottom-nav-icons/Mic.svg";
import iconNavUser from "../assets/pages_assets/bottom-nav-icons/User.svg";
import iconGroup from "../assets/pages_assets/practice/icon_group.svg";
import iconFlash from "../assets/pages_assets/ai_analysis/Icons/Flash-Icon.svg";
import iconEye from "../assets/icons/Eye.svg";
import iconSpeed from "../assets/pages_assets/ai_analysis/Icons/Speed-Icon.svg";
import iconMouth from "../assets/pages_assets/ai_analysis/Icons/Mouth-Icon.svg";
import iconArgument from "../assets/pages_assets/ai_analysis/Icons/Argument-Icon.svg";
import iconSettings from "../assets/icons/Settings.svg";
import iconStar from "../assets/icons/Star.svg";
import fireTodayGif from "../assets/pages_assets/home/Fire-Streak-Active-Today.gif";
import fireActiveImg from "../assets/pages_assets/home/Fire-Image-Active-DayPast.png";
import circleInactiveImg from "../assets/pages_assets/home/Circle-StreakInactive.svg";
import imgMascottQuotes from "../assets/pages_assets/lessons/lesson-6-modul7/Image-Mascott-Quotes.png";
import { supabase } from "../lib/supabaseClient";
import { fetchProfile } from "../lib/profile";
import { fetchProgressSummary, fetchStreakSummary } from "../lib/progress";
import { fetchMyPeerRatingSummary } from "../lib/peerFeedback";
import { useUserProgress } from "../context/UserProgressContext";
import { ProfileSkeleton } from "./SkeletonLoader";

function getMetricBadge(score, type) {
  const val = score != null ? Math.round(score) : 0;
  if (val >= 75) {
    let label = "Lancar";
    if (type === "fluency") label = "Lancar";
    else if (type === "eye") label = "Fokus";
    else if (type === "intonasi") label = "Dinamis";
    else if (type === "argument") label = "Terstruktur";
    return { label, tone: "good" };
  }
  if (val >= 50) {
    let label = "Cukup";
    if (type === "fluency") label = "Cukup Lancar";
    else if (type === "eye") label = "Cukup Fokus";
    else if (type === "intonasi") label = "Cukup Dinamis";
    else if (type === "argument") label = "Cukup Terstruktur";
    return { label, tone: "medium" };
  }
  // val < 50
  let label = "Perlu Latihan";
  if (type === "fluency") label = "Perlu Latihan";
  else if (type === "eye") label = "Kurang Fokus";
  else if (type === "intonasi") label = "Monoton";
  else if (type === "argument") label = "Belum Terstruktur";
  return { label, tone: "warn" };
}

const KATEGORI_LABEL = {
  spontan: "Spontaneous",
  kelas: "Presentasi",
  lomba: "Presentasi",
  interview: "Interview",
};

const KATEGORI_BADGE_STYLE = {
  spontan: { bg: "rgba(232, 117, 61, 0.15)", text: "#E8753D", border: "rgba(232, 117, 61, 0.3)", icon: "⚡" },
  kelas: { bg: "rgba(36, 169, 129, 0.15)", text: "#24A981", border: "rgba(36, 169, 129, 0.3)", icon: "📊" },
  lomba: { bg: "rgba(36, 169, 129, 0.15)", text: "#24A981", border: "rgba(36, 169, 129, 0.3)", icon: "🏆" },
  interview: { bg: "rgba(232, 166, 61, 0.15)", text: "#E8A63D", border: "rgba(232, 166, 61, 0.3)", icon: "🎙️" },
};

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return "1m";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}d`;
  if (secs === 0) return `${mins}m`;
  return `${mins}m ${secs}d`;
}

function formatTotalTime(totalSeconds) {
  if (!totalSeconds || totalSeconds <= 0) return "0m";
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}j ${mins}m`;
  }
  return `${mins}m`;
}

/**
 * Eight Sleep Inspired Arc Speedometer Score Gauge
 */
function SpeedometerScoreGauge({ score, dateLabel }) {
  const clampedScore = Math.max(0, Math.min(100, score != null ? Math.round(score) : 78));
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const duration = 1200;
    const startTime = performance.now();
    let animId = null;

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(eased * clampedScore));
      if (progress < 1) {
        animId = requestAnimationFrame(animate);
      }
    };

    animId = requestAnimationFrame(animate);
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [clampedScore]);

  // Generate 45 tick lines along a 180° semi-circle arc
  const totalTicks = 45;
  const activeTicksCount = Math.round((clampedScore / 100) * totalTicks);
  const radius = 122;
  const centerX = 140;
  const centerY = 152;

  const ticks = useMemo(() => {
    const arr = [];
    for (let i = 0; i < totalTicks; i++) {
      const angle = Math.PI - (i / (totalTicks - 1)) * Math.PI;
      const x1 = centerX + (radius - 13) * Math.cos(angle);
      const y1 = centerY - (radius - 13) * Math.sin(angle);
      const x2 = centerX + radius * Math.cos(angle);
      const y2 = centerY - radius * Math.sin(angle);
      const isActive = i < activeTicksCount;
      arr.push({ x1, y1, x2, y2, isActive, index: i });
    }
    return arr;
  }, [totalTicks, activeTicksCount]);

  const scoreConfig = useMemo(() => {
    if (clampedScore >= 80) {
      return {
        label: "Kondisi Prima",
        dot: "#24A981",
        textColor: "#34D399",
        pillBg: "rgba(36, 169, 129, 0.16)",
        pillBorder: "rgba(36, 169, 129, 0.3)",
        stops: [
          { offset: "0%", color: "#24A981" },
          { offset: "50%", color: "#34D399" },
          { offset: "100%", color: "#6EE7B7" },
        ],
      };
    }
    if (clampedScore >= 60) {
      return {
        label: "Performa Solid",
        dot: "#E8A63D",
        textColor: "#FBBF24",
        pillBg: "rgba(232, 166, 61, 0.16)",
        pillBorder: "rgba(232, 166, 61, 0.3)",
        stops: [
          { offset: "0%", color: "#24A981" },
          { offset: "50%", color: "#E8A63D" },
          { offset: "100%", color: "#E8753D" },
        ],
      };
    }
    return {
      label: "Perlu Latihan",
      dot: "#E8753D",
      textColor: "#FFA767",
      pillBg: "rgba(232, 117, 61, 0.16)",
      pillBorder: "rgba(232, 117, 61, 0.35)",
      stops: [
        { offset: "0%", color: "#24A981" },
        { offset: "40%", color: "#E8A63D" },
        { offset: "100%", color: "#E8753D" },
      ],
    };
  }, [clampedScore]);

  return (
    <div className="speedometer-container">
      <svg className="speedometer-svg" viewBox="0 0 280 185" aria-hidden="true">
        <defs>
          <linearGradient id="activeTickGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            {scoreConfig.stops.map((s, idx) => (
              <stop key={idx} offset={s.offset} stopColor={s.color} />
            ))}
          </linearGradient>
        </defs>

        {/* Render Gauge Radial Ticks */}
        {ticks.map((t) => (
          <line
            key={t.index}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke={t.isActive ? "url(#activeTickGrad)" : "rgba(255, 255, 255, 0.12)"}
            strokeWidth={t.isActive ? "3" : "2"}
            strokeLinecap="round"
            className="speedometer-tick"
          />
        ))}
      </svg>

      {/* Center Digital Score Display */}
      <div className="speedometer-center-content">
        <span className="speedometer-score-digit">{animatedScore}</span>
        <div
          className="speedometer-status-pill"
          style={{
            backgroundColor: scoreConfig.pillBg,
            borderColor: scoreConfig.pillBorder,
          }}
        >
          <span className="speedometer-status-dot" style={{ backgroundColor: scoreConfig.dot }} />
          <span className="speedometer-status-text" style={{ color: scoreConfig.textColor }}>
            {scoreConfig.label}
          </span>
        </div>
        <span className="speedometer-label-sub">SPEAKING FITNESS SCORE</span>
        <span className="speedometer-date-sub">{dateLabel}</span>
      </div>
    </div>
  );
}

/**
 * FocusFlight Inspired Scenarios Donut Chart
 */
function ScenariosDonutChart({ counts = { interview: 0, kelas: 0, spontan: 0 }, totalSeconds = 0 }) {
  const totalSessions = (counts.interview || 0) + (counts.kelas || 0) + (counts.spontan || 0);

  const interviewPct = totalSessions > 0 ? Math.round((counts.interview / totalSessions) * 100) : 40;
  const presentasiPct = totalSessions > 0 ? Math.round((counts.kelas / totalSessions) * 100) : 35;
  const spontanPct = totalSessions > 0 ? Math.max(0, 100 - interviewPct - presentasiPct) : 25;

  const size = 180;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const interviewLen = (interviewPct / 100) * circumference;
  const presentasiLen = (presentasiPct / 100) * circumference;
  const spontanLen = (spontanPct / 100) * circumference;

  const interviewOffset = 0;
  const presentasiOffset = -interviewLen;
  const spontanOffset = -(interviewLen + presentasiLen);

  return (
    <div className="analytics-scenarios-card">
      <div className="analytics-card-header">
        <h3 className="analytics-card-title">Distribusi Skenario</h3>
        <span className="analytics-card-badge">{totalSessions} Total Sesi</span>
      </div>

      <div className="analytics-donut-wrap">
        <div className="analytics-donut-svg-box">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="analytics-donut-svg">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="rgba(255, 255, 255, 0.06)"
              strokeWidth={strokeWidth}
            />
            {/* Interview Arc (Gold) */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#E8A63D"
              strokeWidth={strokeWidth}
              strokeDasharray={`${interviewLen} ${circumference}`}
              strokeDashoffset={interviewOffset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              className="donut-segment"
            />
            {/* Presentasi Arc (Green) */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#24A981"
              strokeWidth={strokeWidth}
              strokeDasharray={`${presentasiLen} ${circumference}`}
              strokeDashoffset={presentasiOffset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              className="donut-segment"
            />
            {/* Spontan Arc (Orange) */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#E8753D"
              strokeWidth={strokeWidth}
              strokeDasharray={`${spontanLen} ${circumference}`}
              strokeDashoffset={spontanOffset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              className="donut-segment"
            />
          </svg>
          <div className="analytics-donut-center">
            <span className="analytics-donut-center-label">Total Waktu</span>
            <span className="analytics-donut-center-val">{formatTotalTime(totalSeconds || totalSessions * 120)}</span>
          </div>
        </div>

        {/* Legend List */}
        <div className="analytics-donut-legend">
          <div className="analytics-legend-item">
            <div className="analytics-legend-label-side">
              <span className="analytics-legend-dot" style={{ backgroundColor: "#E8A63D" }} />
              <span className="analytics-legend-name">Interview</span>
            </div>
            <span className="analytics-legend-val">{counts.interview || 0} sesi ({interviewPct}%)</span>
          </div>

          <div className="analytics-legend-item">
            <div className="analytics-legend-label-side">
              <span className="analytics-legend-dot" style={{ backgroundColor: "#24A981" }} />
              <span className="analytics-legend-name">Presentasi</span>
            </div>
            <span className="analytics-legend-val">{counts.kelas || 0} sesi ({presentasiPct}%)</span>
          </div>

          <div className="analytics-legend-item">
            <div className="analytics-legend-label-side">
              <span className="analytics-legend-dot" style={{ backgroundColor: "#E8753D" }} />
              <span className="analytics-legend-name">Spontaneous</span>
            </div>
            <span className="analytics-legend-val">{counts.spontan || 0} sesi ({spontanPct}%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Trends Activity Bar Chart
 */
function TrendsBarChart({ trendPoints = [] }) {
  const points = trendPoints.length > 0 ? trendPoints : [
    { tanggal_snapshot: "2026-08-27", agregat_skor: 65 },
    { tanggal_snapshot: "2026-08-28", agregat_skor: 72 },
    { tanggal_snapshot: "2026-08-29", agregat_skor: 70 },
    { tanggal_snapshot: "2026-08-30", agregat_skor: 78 },
    { tanggal_snapshot: "2026-08-31", agregat_skor: 82 },
    { tanggal_snapshot: "2026-09-01", agregat_skor: 85 },
  ];

  const maxScore = Math.max(100, ...points.map((p) => p.agregat_skor));

  return (
    <div className="analytics-trends-card">
      <div className="analytics-card-header">
        <div>
          <h3 className="analytics-card-title">Tren Skor Latihan</h3>
          <span className="analytics-card-subtitle">Performa konsisten 7 sesi terakhir</span>
        </div>
        <span className="analytics-trend-badge">📈 +12% Minggu Ini</span>
      </div>

      <div className="analytics-bars-wrapper">
        {points.map((p, idx) => {
          const heightPercent = Math.max(15, Math.min(100, (p.agregat_skor / maxScore) * 100));
          const dateStr = new Date(p.tanggal_snapshot).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
          const isLatest = idx === points.length - 1;

          return (
            <div key={p.tanggal_snapshot || idx} className="analytics-bar-column">
              <div className="analytics-bar-track">
                <div
                  className={`analytics-bar-fill ${isLatest ? "analytics-bar-fill--latest" : ""}`}
                  style={{ height: `${heightPercent}%` }}
                >
                  <span className="analytics-bar-tooltip">{Math.round(p.agregat_skor)}</span>
                </div>
              </div>
              <span className="analytics-bar-label">{dateStr}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ProfileScreen({
  onNavigateHome,
  onNavigatePractice,
  onNavigateSosial,
  onOpenSettings,
  onOpenSessionDetail,
}) {
  const { progressSummary, xp } = useUserProgress();
  const [loading, setLoading] = useState(!progressSummary);
  const [errorMessage, setErrorMessage] = useState("");
  const [profileData, setProfileData] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [summary, setSummary] = useState(progressSummary);
  const [streakData, setStreakData] = useState(null);
  const [peerRating, setPeerRating] = useState(null);
  const [sessionFilter, setSessionFilter] = useState("all");
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [showAiCoachModal, setShowAiCoachModal] = useState(false);

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
        const [profile, progress, streak, peer] = await Promise.all([
          fetchProfile(user.id),
          fetchProgressSummary(user.id),
          fetchStreakSummary(user.id),
          fetchMyPeerRatingSummary(user.id),
        ]);
        if (!active) return;
        setProfileData(profile);
        setDisplayName(profile.nama_panggilan || profile.username || "Pengguna");
        setSummary(progress);
        setStreakData(streak);
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

  const dnaScore = summary?.dnaScore != null ? Math.round(summary.dnaScore) : summary?.avgSkor != null ? Math.round(summary.avgSkor) : 78;

  const filteredSessions = useMemo(() => {
    const list = summary?.recentSessions || [];
    if (sessionFilter === "all") return list;
    if (sessionFilter === "kelas") return list.filter((s) => s.kategori === "kelas" || s.kategori === "lomba");
    return list.filter((s) => s.kategori === sessionFilter);
  }, [summary?.recentSessions, sessionFilter]);

  const displayedSessions = showAllSessions ? filteredSessions : filteredSessions.slice(0, 5);
  const todayStr = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short" });

  const rawFeedback = summary?.latestFeedbackText || "Latih pernapasan dalam sebelum menjawab pertanyaan agar pikiran lebih tenang dan terfokus. Siapkan poin-poin utama dengan metode STAR (Situation, Task, Action, Result) dan kendalikan kata pengisi saat berpikir.";
  
  // Format feedback sentences for modal view
  const feedbackItems = useMemo(() => {
    if (!rawFeedback) return [];
    return rawFeedback
      .split(/\.\s+|\.\.\s*/)
      .map((s) => s.trim())
      .filter((s) => s.length > 5);
  }, [rawFeedback]);

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
        <div className="profile-topbar-left">
          <h1 className="profile-topbar-title">Profil</h1>
        </div>
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
        {/* ── User Profile Card ─────────────────────────────────────── */}
        <div className="profile-user-card">
          <div className="profile-user-card-top">
            <div className="profile-user-avatar-wrap">
              {profileData?.avatar_url ? (
                <img src={profileData.avatar_url} alt={displayName} className="profile-user-avatar-img" />
              ) : (
                <div className="profile-user-avatar-placeholder">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="profile-user-avatar-badge">⚡</span>
            </div>

            <div className="profile-user-info">
              <h2 className="profile-user-name">{displayName}</h2>
              <p className="profile-user-handle">@{profileData?.username || displayName.toLowerCase().replace(/\s+/g, "")}</p>
              {profileData?.created_at && (
                <span className="profile-user-joined">
                  Bergabung {new Date(profileData.created_at).toLocaleDateString("id-ID", { month: "short", year: "numeric" })}
                </span>
              )}
            </div>

            <button
              type="button"
              className="profile-user-edit-btn"
              onClick={onOpenSettings}
              aria-label="Edit Profil"
              title="Edit Profil di Pengaturan"
            >
              Edit
            </button>
          </div>
        </div>

        {/* ── Streak Card (SpeakUp Design System) ─────────────────── */}
        <div className="home-streak-card">
          <div className="home-streak-badge">
            <span className="home-streak-fire-emoji">🔥</span>
            <span className="home-streak-label">{streakData?.count || 1} Hari streak</span>
          </div>
          <div className="home-streak-days">
            {(streakData?.days || [
              { label: "Sen", active: true, today: false },
              { label: "Sel", active: true, today: false },
              { label: "Rab", active: true, today: false },
              { label: "Kam", active: false, today: false },
              { label: "Jum", active: true, today: false },
              { label: "Sab", active: true, today: false },
              { label: "Min", active: true, today: true },
            ]).map((day, i) => (
              <div
                key={i}
                className={`home-streak-day ${day.active ? "home-streak-day--active" : ""} ${day.today ? "home-streak-day--today" : ""}`}
              >
                <div className="home-streak-day-icon">
                  {day.today && day.active ? (
                    <img src={fireTodayGif} alt="" className="home-streak-fire-img" />
                  ) : day.active ? (
                    <img src={fireActiveImg} alt="" className="home-streak-fire-img" />
                  ) : (
                    <img src={circleInactiveImg} alt="" className="home-streak-fire-img" />
                  )}
                </div>
                <span className="home-streak-day-label">{day.label}</span>
              </div>
            ))}
          </div>
        </div>

        {loading && <p className="profile-hint-text">Memuat profil & analitik...</p>}
        {!loading && errorMessage && <p className="profile-error-banner">{errorMessage}</p>}

        {!loading && !errorMessage && (
          <>
            {/* ── Eight Sleep Hero Gauge Card ──────────────────────── */}
            <div className="profile-hero-card">
              <SpeedometerScoreGauge score={dnaScore} dateLabel={todayStr} />

              {/* 3 Metric Breakdown Chips */}
              <div className="profile-hero-metrics-row">
                <div className="profile-hero-metric-box">
                  <span className="profile-hero-metric-label">Kelancaran</span>
                  <div className="profile-hero-metric-val-wrap">
                    <span className="profile-hero-metric-val">
                      {summary?.avgSubScores?.fluency != null ? Math.round(summary.avgSubScores.fluency) : 82}%
                    </span>
                    <span className="profile-metric-indicator-dot" style={{ backgroundColor: "#24A981" }} />
                  </div>
                </div>

                <div className="profile-hero-metric-divider" />

                <div className="profile-hero-metric-box">
                  <span className="profile-hero-metric-label">Konsistensi</span>
                  <div className="profile-hero-metric-val-wrap">
                    <span className="profile-hero-metric-val">
                      {summary?.avgSubScores?.eye_contact != null ? Math.round(summary.avgSubScores.eye_contact) : 74}%
                    </span>
                    <span className="profile-metric-indicator-dot" style={{ backgroundColor: "#E8753D" }} />
                  </div>
                </div>

                <div className="profile-hero-metric-divider" />

                <div className="profile-hero-metric-box">
                  <span className="profile-hero-metric-label">Total Waktu</span>
                  <div className="profile-hero-metric-val-wrap">
                    <span className="profile-hero-metric-val">
                      {formatTotalTime(summary?.totalDurationSeconds || (summary?.totalSesi || 5) * 120)}
                    </span>
                    <span className="profile-metric-indicator-dot" style={{ backgroundColor: "#E8A63D" }} />
                  </div>
                </div>
              </div>
            </div>

            {/* ── AI Coach Compact Action Card ─────────────────────── */}
            <div
              className="profile-ai-coach-banner"
              onClick={() => setShowAiCoachModal(true)}
              role="button"
              tabIndex={0}
            >
              <div className="profile-ai-coach-left">
                <div className="profile-ai-coach-text-box">
                  <div className="profile-ai-coach-title-row">
                    <span className="profile-ai-coach-title">AI Coach SpeakUp</span>
                    <span className="profile-ai-coach-tag">Insight Baru</span>
                  </div>
                  <span className="profile-ai-coach-desc">Lihat evaluasi & rekomendasi latihan personal ›</span>
                </div>
              </div>
              <div className="profile-ai-coach-action-btn">
                <span>Buka</span>
                <span className="profile-ai-coach-arrow">›</span>
              </div>
            </div>

            {/* ── Substack Style 4-Metric Grid ────────────────────── */}
            <section className="profile-stats-grid-section">
              <div className="profile-stats-grid">
                {/* Total Sesi */}
                <div className="profile-stat-card">
                  <span className="profile-stat-card-label">Total Sesi Latihan</span>
                  <div className="profile-stat-card-val-row">
                    <span className="profile-stat-card-num">{summary?.totalSesi || 0}</span>
                    <span className="profile-stat-card-pill">🎯 Aktif</span>
                  </div>
                </div>

                {/* Tempo WPM */}
                <div className="profile-stat-card">
                  <span className="profile-stat-card-label">Kecepatan Bicara</span>
                  <div className="profile-stat-card-val-row">
                    <div className="profile-stat-card-num-group">
                      <span className="profile-stat-card-num">{summary?.avgWpm || 128}</span>
                      <span className="profile-stat-card-unit">WPM</span>
                    </div>
                    <span className="profile-stat-card-pill profile-stat-card-pill--green">⚡ Optimal</span>
                  </div>
                </div>

                {/* Filler Words */}
                <div className="profile-stat-card">
                  <span className="profile-stat-card-label">Kata Pengisi</span>
                  <div className="profile-stat-card-val-row">
                    <span className="profile-stat-card-num">{summary?.totalFillers || 0}</span>
                    <span className="profile-stat-card-pill profile-stat-card-pill--orange">🗣️ Terkendali</span>
                  </div>
                </div>

                {/* Total XP */}
                <div className="profile-stat-card">
                  <span className="profile-stat-card-label">Total XP Terkumpul</span>
                  <div className="profile-stat-card-val-row">
                    <span className="profile-stat-card-num">{(xp || 0).toLocaleString("id-ID")}</span>
                    <span className="profile-stat-card-pill profile-stat-card-pill--xp">⭐ Level Up</span>
                  </div>
                </div>
              </div>
            </section>

            {/* ── FocusFlight Charts: Scenarios & Trends ─────────────── */}
            <section className="profile-charts-section">
              <ScenariosDonutChart
                counts={summary?.scenarioCounts}
                totalSeconds={summary?.totalDurationSeconds}
              />
              <TrendsBarChart trendPoints={summary?.dnaTrend} />
            </section>

            {/* ── 4 Pillars Speaking DNA Breakdown ─────────────────── */}
            <section className="profile-section">
              <div className="profile-section-header">
                <h2 className="profile-section-title">4 Pilar Kemampuan Bicara</h2>
                {summary?.avgSkor != null && (
                  <span className="profile-avg-badge">Rata-rata: {Math.round(summary.avgSkor)}</span>
                )}
              </div>

              <div className="profile-analysis-grid">
                {/* Fluency */}
                {(() => {
                  const score = summary?.avgSubScores?.fluency != null ? Math.round(summary.avgSubScores.fluency) : 84;
                  const badge = getMetricBadge(score, "fluency");
                  return (
                    <div className="profile-analysis-card">
                      <img src={iconFlash} alt="" className="profile-analysis-icon" />
                      <p className="profile-analysis-card-label">Kelancaran</p>
                      <p className="profile-analysis-metric">
                        {score}
                        <span className="profile-analysis-metric-unit">/ 100</span>
                      </p>
                      <span className={`profile-analysis-chip profile-analysis-chip--${badge.tone}`}>{badge.label}</span>
                    </div>
                  );
                })()}

                {/* Eye Contact */}
                {(() => {
                  const score = summary?.avgSubScores?.eye_contact != null ? Math.round(summary.avgSubScores.eye_contact) : 76;
                  const badge = getMetricBadge(score, "eye");
                  return (
                    <div className="profile-analysis-card">
                      <img src={iconEye} alt="" className="profile-analysis-icon" />
                      <p className="profile-analysis-card-label">Kontak Mata</p>
                      <p className="profile-analysis-metric">
                        {score}
                        <span className="profile-analysis-metric-unit">/ 100</span>
                      </p>
                      <span className={`profile-analysis-chip profile-analysis-chip--${badge.tone}`}>{badge.label}</span>
                    </div>
                  );
                })()}

                {/* Intonasi */}
                {(() => {
                  const score = summary?.avgSubScores?.intonasi != null ? Math.round(summary.avgSubScores.intonasi) : 80;
                  const badge = getMetricBadge(score, "intonasi");
                  return (
                    <div className="profile-analysis-card">
                      <img src={iconMouth} alt="" className="profile-analysis-icon" />
                      <p className="profile-analysis-card-label">Intonasi</p>
                      <p className="profile-analysis-metric">
                        {score}
                        <span className="profile-analysis-metric-unit">/ 100</span>
                      </p>
                      <span className={`profile-analysis-chip profile-analysis-chip--${badge.tone}`}>{badge.label}</span>
                    </div>
                  );
                })()}

                {/* Struktur Materi */}
                {(() => {
                  const score = summary?.avgSubScores?.kesesuaian_materi != null
                    ? Math.round(summary.avgSubScores.kesesuaian_materi)
                    : 78;
                  const badge = getMetricBadge(score, "argument");
                  return (
                    <div className="profile-analysis-card">
                      <img src={iconArgument} alt="" className="profile-analysis-icon" />
                      <p className="profile-analysis-card-label">Struktur Argumen</p>
                      <p className="profile-analysis-metric">
                        {score}
                        <span className="profile-analysis-metric-unit">/ 100</span>
                      </p>
                      <span className={`profile-analysis-chip profile-analysis-chip--${badge.tone}`}>{badge.label}</span>
                    </div>
                  );
                })()}
              </div>
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
                      <img src={iconStar} alt="Star" className="profile-peer-star-img" />
                      <span className="profile-peer-score-val">
                        {peerRating.avgStars != null ? peerRating.avgStars.toFixed(1) : "0.0"}
                      </span>
                      <span className="profile-peer-score-max">/5.0</span>
                    </div>
                    <span className="profile-peer-rating-count">Berdasarkan {peerRating.count} rating latihan</span>
                  </div>

                  {peerRating.topTags.length > 0 && (
                    <div className="profile-peer-tags-wrap">
                      {peerRating.topTags.map((tag) => (
                        <span key={tag} className="profile-peer-tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* ── Riwayat Sesi & Analytics Log (Substack Style) ─────── */}
            <section className="profile-section">
              <div className="profile-section-header">
                <div>
                  <h2 className="profile-section-title">Riwayat Sesi Latihan</h2>
                  <p className="profile-section-sub">Log detail dari setiap latihan bicaramu</p>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="profile-session-filter-row">
                <button
                  type="button"
                  className={`profile-filter-chip ${sessionFilter === "all" ? "active" : ""}`}
                  onClick={() => setSessionFilter("all")}
                >
                  Semua ({summary?.recentSessions?.length || 0})
                </button>
                <button
                  type="button"
                  className={`profile-filter-chip ${sessionFilter === "interview" ? "active" : ""}`}
                  onClick={() => setSessionFilter("interview")}
                >
                  🎙️ Interview
                </button>
                <button
                  type="button"
                  className={`profile-filter-chip ${sessionFilter === "kelas" ? "active" : ""}`}
                  onClick={() => setSessionFilter("kelas")}
                >
                  📊 Presentasi
                </button>
                <button
                  type="button"
                  className={`profile-filter-chip ${sessionFilter === "spontan" ? "active" : ""}`}
                  onClick={() => setSessionFilter("spontan")}
                >
                  ⚡ Spontaneous
                </button>
              </div>

              {displayedSessions.length === 0 ? (
                <div className="profile-empty-card">
                  <span className="profile-empty-icon">📂</span>
                  <p className="profile-empty-title">Belum ada riwayat sesi di kategori ini</p>
                  <p className="profile-empty-desc">Pilih skenario simulasi lain untuk memulai sesi latihan baru.</p>
                </div>
              ) : (
                <div className="profile-session-list">
                  {displayedSessions.map((session) => {
                    const badge = KATEGORI_BADGE_STYLE[session.kategori] || KATEGORI_BADGE_STYLE.spontan;
                    const label = KATEGORI_LABEL[session.kategori] || "Simulasi";

                    return (
                      <div
                        key={session.id}
                        className="profile-session-card"
                        onClick={() => onOpenSessionDetail?.(session)}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="profile-session-left">
                          <div className="profile-session-badge-row">
                            <span
                              className="profile-session-cat-pill"
                              style={{
                                backgroundColor: badge.bg,
                                color: badge.text,
                                borderColor: badge.border,
                              }}
                            >
                              {badge.icon} {label}
                            </span>
                            {session.isLive && <span className="profile-session-live-tag">🔴 Live</span>}
                          </div>
                          <span className="profile-session-date-text">
                            📅 {formatDate(session.date)} • ⏱️ {formatDuration(session.durationSeconds || 120)}
                          </span>
                        </div>

                        <div className="profile-session-right">
                          <div className="profile-session-score-box">
                            <span className="profile-session-score-num">{session.skor != null ? Math.round(session.skor) : 80}</span>
                            <span className="profile-session-score-unit">Skor</span>
                          </div>
                          <span className="profile-session-chevron">›</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {filteredSessions.length > 5 && (
                <button
                  type="button"
                  className="btn-profile-toggle-sessions"
                  onClick={() => setShowAllSessions((prev) => !prev)}
                >
                  {showAllSessions ? "Tampilkan Lebih Sedikit ↑" : `Lihat Semua (${filteredSessions.length} Sesi) ↓`}
                </button>
              )}
            </section>
          </>
        )}
      </div>

      {/* ── AI Coach Dedicated Modal / Page ───────────────────────── */}
      {showAiCoachModal && (
        <div className="aicoach-modal-overlay" onClick={() => setShowAiCoachModal(false)}>
          <div className="aicoach-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="aicoach-modal-header">
              <h2 className="aicoach-modal-title">AI Coach SpeakUp</h2>
              <button
                type="button"
                className="aicoach-modal-close-btn"
                onClick={() => setShowAiCoachModal(false)}
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>

            <div className="aicoach-modal-scroll">
              {/* Hero Text Card inside Modal */}
              <div className="aicoach-hero-card">
                <div className="aicoach-hero-text">
                  <span className="aicoach-hero-badge">💡 REKAP & DIAGNOSTIK PERSONAL</span>
                  <h3 className="aicoach-hero-heading">Evaluasi Terakhir & Action Plan</h3>
                  <p className="aicoach-hero-sub">
                    Berdasarkan catatan performa bicaramu, berikut tips taktis untuk meningkatkan skor bicaramu ke level berikutnya.
                  </p>
                </div>
              </div>

              {/* Actionable Insights List */}
              <div className="aicoach-insights-section">
                <h4 className="aicoach-section-title">📌 Temuan & Rekomendasi Utama</h4>
                <div className="aicoach-insights-list">
                  {feedbackItems.map((item, idx) => (
                    <div key={idx} className="aicoach-insight-card">
                      <div className="aicoach-insight-num">{idx + 1}</div>
                      <p className="aicoach-insight-text">{item}.</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommended Drills */}
              <div className="aicoach-drills-section">
                <h4 className="aicoach-section-title">🎯 Latihan Prioritas Selanjutnya</h4>
                <div className="aicoach-drills-grid">
                  <div className="aicoach-drill-card" onClick={() => { setShowAiCoachModal(false); onNavigatePractice?.(); }}>
                    <span className="aicoach-drill-icon">🎙️</span>
                    <div className="aicoach-drill-info">
                      <span className="aicoach-drill-name">Simulasi Interview</span>
                      <span className="aicoach-drill-desc">Latih jawaban terstruktur STAR</span>
                    </div>
                    <span className="aicoach-drill-arrow">›</span>
                  </div>

                  <div className="aicoach-drill-card" onClick={() => { setShowAiCoachModal(false); onNavigatePractice?.(); }}>
                    <span className="aicoach-drill-icon">⚡</span>
                    <div className="aicoach-drill-info">
                      <span className="aicoach-drill-name">Spontaneous Talk</span>
                      <span className="aicoach-drill-desc">Kurangi filler words saat berpikir cepat</span>
                    </div>
                    <span className="aicoach-drill-arrow">›</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Modal CTA */}
            <div className="aicoach-modal-footer">
              <button
                type="button"
                className="btn-aicoach-start"
                onClick={() => {
                  setShowAiCoachModal(false);
                  onNavigatePractice?.();
                }}
              >
                🚀 Mulai Latihan Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom Navigation ─────────────────────────────────────── */}
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
