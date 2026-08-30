import React, { useState } from "react";
import "./HomeScreen.css";
import { useUserProgress } from "../context/UserProgressContext";

// ─── Assets ──────────────────────────────────────────────────────────────────
import todaysLessonImg from "../assets/pages_assets/modul_details/modul_7/Image-Lesson6.png";
import cardBgDecor from "../assets/pages_assets/home/Card-bg-decor.svg";
// Module illustrations
import imgModul1 from "../assets/pages_assets/home/modul/Image-Modul1.png";
import imgModul2 from "../assets/pages_assets/home/modul/Image-Modul2.png";
import imgModul3 from "../assets/pages_assets/home/modul/Image-Modul3.png";
import imgModul4 from "../assets/pages_assets/home/modul/Image-Modul4.png";
import imgModul5 from "../assets/pages_assets/home/modul/Image-Modul5.png";
import imgModul6 from "../assets/pages_assets/home/modul/Image-Modul6.png";
import imgModul7 from "../assets/pages_assets/home/modul/Image-Modul7.png";
import imgModul8 from "../assets/pages_assets/home/modul/Image-Modul8.png";

// Streak assets
import fireActiveImg from "../assets/pages_assets/home/Fire-Image-Active-DayPast.png";
import fireTodayGif from "../assets/pages_assets/home/Fire-Streak-Active-Today.gif";
import circleInactiveImg from "../assets/pages_assets/home/Circle-StreakInactive.svg";

// Icon assets
import iconPlay from "../assets/pages_assets/home/icons/Play-Icon.svg";
import iconBook from "../assets/pages_assets/home/icons/Book-Outline.svg";

// Bottom nav icons
import iconNavHome from "../assets/pages_assets/bottom-nav-icons/Home.svg";
import iconNavMic from "../assets/pages_assets/bottom-nav-icons/Mic.svg";
import iconNavUser from "../assets/pages_assets/bottom-nav-icons/User.svg";
import iconNavGroup from "../assets/pages_assets/practice/icon_group.svg";

// ─── Inline icon for progress (no asset provided) ────────────────────────────
const IconProgress = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8" cy="8" r="5.5" stroke="#DA5000" strokeWidth="1.5" strokeDasharray="4 2"/>
    <path d="M8 5V8L10 10" stroke="#DA5000" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

// ─── Data ─────────────────────────────────────────────────────────────────────
const EMPTY_STREAK_DAYS = [
  { date: "d0", label: "", active: false },
  { date: "d1", label: "", active: false },
  { date: "d2", label: "", active: false },
  { date: "d3", label: "", active: false },
  { date: "d4", label: "", active: false },
  { date: "d5", label: "", active: false },
  { date: "d6", label: "", active: false },
];

const MODULES = [
  { id: 1, module: "Modul 1", title: "Kenali Suaramu", lessons: 4, progress: "4/4", image: imgModul1, active: false, highlight: false, tag: null },
  { id: 2, module: "Modul 2", title: "Fondasi Suara dan Tubuh", lessons: 6, progress: "1/6", image: imgModul2, active: false, highlight: false, tag: "Testing available" },
  { id: 3, module: "Modul 3", title: "Berani di Ruang Kelas", lessons: 6, progress: "6/6", image: imgModul3, active: false, highlight: false, tag: null },
  { id: 4, module: "Modul 4", title: "Percaya Diri di Depan Kamera", lessons: 6, progress: "6/6", image: imgModul4, active: false, highlight: false, tag: null },
  { id: 5, module: "Modul 5", title: "Bicara dengan Wibawa", lessons: 6, progress: "6/6", image: imgModul5, active: false, highlight: false, tag: null },
  { id: 6, module: "Modul 6", title: "Kuasai Panggung", lessons: 5, progress: "5/5", image: imgModul6, active: false, highlight: false, tag: null },
  { id: 7, module: "Modul 7", title: "Keahlian Tanya Jawab", lessons: 6, progress: "1/6", image: imgModul7, active: true, highlight: true, tag: "Testing available" },
  { id: 8, module: "Modul 8", title: "Berani di Dunia Nyata", lessons: 5, progress: "0/5", image: imgModul8, active: false, highlight: false, tag: null, inactive: true },
];

// ─── Module illustration colors (alternating per Figma) ─────────────────────
const MODULE_COLORS = [
  "#F0FBF8", "#EFF8FF", "#FFF8F0", "#F4F0FF",
  "#F0FBF8", "#FFF0F5", "#F0FFF4", "#FFF5EE",
];

export default function HomeScreen({ userName, onSelectModule, onNavigatePractice, onNavigateSosial, onNavigateProfile }) {
  const displayName = userName?.trim() || "Nadine Euvania";
  const [activeTab, setActiveTab] = useState("home");
  const { xp, streakCount, streakDays: globalStreakDays } = useUserProgress();
  const streakDays = globalStreakDays?.length > 0 ? globalStreakDays : EMPTY_STREAK_DAYS;

  const handleModuleClick = (mod) => {
    const isAvailable = Boolean(mod?.active || (mod?.tag && mod.tag.toLowerCase().includes("testing")));
    if (isAvailable) {
      onSelectModule?.(mod);
    }
  };

  return (
    <div className="home-screen" data-node-id="29:7" data-name="Home">
      {/* ── Top Bar ─────────────────────────────────────────────── */}
      <div className="home-topbar" data-node-id="31:328">
        <h2 className="home-topbar-greeting">Hi, {displayName}</h2>
        <div className="home-xp-badge" data-node-id="136:1380">
          <span className="home-xp-text">{xp.toLocaleString("id-ID")} XP</span>
        </div>
      </div>

      {/* ── Scrollable Content ──────────────────────────────────── */}
      <div className="home-scroll-body">
        <div className="home-hero-section" data-node-id="75:939">

          {/* ── Streak Card ──────────────────────────────────────── */}
          <div className="home-streak-card" data-node-id="68:603">
            <div className="home-streak-badge" data-node-id="127:267">
              <span className="home-streak-fire-emoji">🔥</span>
              <span className="home-streak-label">{streakCount} Hari streak</span>
            </div>
            <div className="home-streak-days" data-node-id="127:266">
              {streakDays.map((day) => (
                <div
                  key={day.date}
                  className={`home-streak-day ${day.active ? "home-streak-day--active" : ""} ${day.today ? "home-streak-day--today" : ""}`}
                >
                  <div className="home-streak-day-icon">
                    {day.today ? (
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

          {/* ── Today's Lesson Section (Starts Module 7) ── */}
          <div className="home-todays-lesson-section" data-node-id="136:1421">
            <div
              className="home-todays-lesson-card"
              onClick={() => handleModuleClick(MODULES.find((m) => m.id === 7) || MODULES[6])}
              data-node-id="136:1386"
              style={{ cursor: "pointer" }}
            >
              {/* Full Card Background Decor */}
              <div className="home-lesson-card-bg-decor" aria-hidden="true">
                <img src={cardBgDecor} alt="" className="home-lesson-card-bg-img" />
              </div>

              {/* Content row */}
              <div className="home-lesson-card-content" data-node-id="136:1399">
                <div className="home-lesson-text" data-node-id="136:1389">
                  <p className="home-lesson-subtitle">Pelajaran Hari ini</p>
                  <p className="home-lesson-title">Hadapi Pertanyaan Menantang</p>
                  <p className="home-lesson-module">Modul 7 - Keahlian Tanya Jawab</p>
                </div>
                <div className="home-lesson-image-wrapper" data-node-id="136:1390">
                  <img src={todaysLessonImg} alt="Hadapi Pertanyaan Menantang" className="home-lesson-image" />
                </div>
              </div>
            </div>

            {/* Mulai Pelajaran Button */}
            <button
              type="button"
              className="btn-mulai-pelajaran"
              onClick={() => handleModuleClick(MODULES.find((m) => m.id === 7) || MODULES[6])}
              data-node-id="136:1414"
            >
              <img src={iconPlay} alt="" className="btn-play-icon" />
              <span>Mulai Pelajaran</span>
            </button>
          </div>

          {/* ── Course Section ────────────────────────────────── */}
          <div className="home-course-section" data-node-id="75:802">
            <h3 className="home-course-heading">Kursus</h3>
            <div className="home-course-list" data-node-id="75:851">
              {MODULES.map((mod, i) => {
                const isAvailable = Boolean(mod.active || (mod.tag && mod.tag.toLowerCase().includes("testing")));
                return (
                  <div
                    key={mod.id}
                    className={`home-module-item ${mod.active || mod.highlight ? "home-module-item--active home-module-item--highlight" : ""} ${mod.inactive ? "home-module-item--inactive" : ""} ${isAvailable ? "home-module-item--available" : "home-module-item--disabled"}`}
                    style={{ "--module-color": mod.inactive ? "#F3F4F6" : mod.active ? "rgba(232, 117, 61, 0.08)" : MODULE_COLORS[i] }}
                    onClick={() => handleModuleClick(mod)}
                    data-node-id={`module-${mod.id}`}
                  >
                    <div className="home-module-content">
                      <div className="home-module-text">
                        <span className="home-module-label">{mod.module}</span>
                        <span className="home-module-title">{mod.title}</span>
                        {mod.tag && (
                          <span className="home-module-tag">{mod.tag}</span>
                        )}
                      </div>
                      <div className="home-module-meta">
                        <div className="home-module-meta-item">
                          <img src={iconBook} alt="" className="home-module-meta-icon" />
                          <span>{mod.lessons} Pelajaran</span>
                        </div>
                        <div className="home-module-meta-item">
                          <IconProgress />
                          <span>{mod.progress} Selesai</span>
                        </div>
                      </div>
                    </div>
                    <div className="home-module-illus">
                      <img
                        src={mod.image}
                        alt={mod.title}
                        className="home-module-illus-img"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* ── Bottom Navigation Pill ───────────────────────────────── */}
      <div className="home-bottom-nav" data-node-id="31:314">
        <button
          type="button"
          className={`home-nav-item ${activeTab === "home" ? "home-nav-item--active" : ""}`}
          onClick={() => setActiveTab("home")}
          aria-label="Home"
        >
          <img src={iconNavHome} alt="Home" className={`home-nav-icon ${activeTab === "home" ? "home-nav-icon--active" : ""}`} />
        </button>
        <button
          type="button"
          className={`home-nav-item ${activeTab === "mic" ? "home-nav-item--active" : ""}`}
          onClick={() => {
            setActiveTab("mic");
            onNavigatePractice?.();
          }}
          aria-label="Practice"
        >
          <img src={iconNavMic} alt="Practice" className={`home-nav-icon ${activeTab === "mic" ? "home-nav-icon--active" : ""}`} />
        </button>
        <button
          type="button"
          className={`home-nav-item ${activeTab === "sosial" ? "home-nav-item--active" : ""}`}
          onClick={() => {
            setActiveTab("sosial");
            onNavigateSosial?.();
          }}
          aria-label="Sosial"
        >
          <img src={iconNavGroup} alt="Sosial" className={`home-nav-icon ${activeTab === "sosial" ? "home-nav-icon--active" : ""}`} />
        </button>
        <button
          type="button"
          className={`home-nav-item ${activeTab === "user" ? "home-nav-item--active" : ""}`}
          onClick={() => {
            setActiveTab("user");
            onNavigateProfile?.();
          }}
          aria-label="Profile"
        >
          <img src={iconNavUser} alt="Profile" className={`home-nav-icon ${activeTab === "user" ? "home-nav-icon--active" : ""}`} />
        </button>
      </div>
    </div>
  );
}
