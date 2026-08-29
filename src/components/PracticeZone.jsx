import React, { useState } from "react";
import "./PracticeZone.css";

// ─── Solo Assets ─────────────────────────────────────────────────────────────
import imgLiveSpeaker from "../assets/pages_assets/practice/img_live_speaker.png";
import bgLiveSunburst from "../assets/pages_assets/practice/bg_live_sunburst.svg";
import imgRapidTopic from "../assets/pages_assets/practice/img_rapid_topic.png";
import imgFillerWord from "../assets/pages_assets/practice/img_filler_word.png";
import imgPaceControl from "../assets/pages_assets/practice/img_pace_control.png";
import imgQaSimulator from "../assets/pages_assets/practice/img_qa_simulator.png";
import imgFreeTalk from "../assets/pages_assets/practice/img_free_talk.png";

// ─── Live Assets ─────────────────────────────────────────────────────────────
import iconGroup from "../assets/pages_assets/practice/icon_group.svg";
import iconEnterDoor from "../assets/pages_assets/practice/icon_enter_door.svg";
import iconTime from "../assets/pages_assets/practice/icon_time.svg";

// ─── Bottom Nav Icons ────────────────────────────────────────────────────────
import iconNavHome from "../assets/pages_assets/bottom-nav-icons/Home.svg";
import iconNavMic from "../assets/pages_assets/bottom-nav-icons/Mic.svg";
import iconNavUser from "../assets/pages_assets/bottom-nav-icons/User.svg";

// ─── Live Data ───────────────────────────────────────────────────────────────
const ACTIVE_LIVE_ROOMS = [
  {
    id: 1,
    type: "🎭 Theatre",
    title: "Latihan #3: Persiapan Lomba di UXToday",
    speaker: "Dibawakan oleh Rizki A.R",
    audience: 12,
    qnaActive: true,
    tag: null,
  },
  {
    id: 2,
    type: "💻 Video Conference",
    title: "Public Speaking Perdana Aku",
    speaker: "Dibawakan oleh Zaki A.",
    audience: 8,
    qnaActive: true,
    tag: "Testing Available",
  },
  {
    id: 3,
    type: "🎭 Theatre",
    title: "Latihan Presentasi Skripsi",
    speaker: "Dibawakan oleh Fauzan F.",
    audience: 5,
    qnaActive: false,
    tag: null,
  },
];

const UPCOMING_LIVE_ROOMS = [
  {
    id: 1,
    type: "💻 Video Conference",
    title: "Sesi Desain Prototipe",
    speaker: "Dibawakan oleh Siti M.",
    schedule: "Mulai 15 menit lagi",
    qnaActive: true,
  },
  {
    id: 2,
    type: "💻 Video Conference",
    title: "Strategi UX untuk Pemula",
    speaker: "Dibawakan oleh Andi S.",
    schedule: "Hari ini, 13:00",
    qnaActive: true,
  },
  {
    id: 3,
    type: "💻 Video Conference",
    title: "Meningkatkan UX dengan Data",
    speaker: "Dibawakan oleh Lina T.",
    schedule: "Hari ini, 13:45",
    qnaActive: false,
  },
];

export default function PracticeZone({ onNavigateHome, onNavigateProfile, onJoinLiveRoom }) {
  const [practiceMode, setPracticeMode] = useState("solo"); // "solo" | "live"
  const [selectedCard, setSelectedCard] = useState(null); // "rapid" | "filler" | "pace" | "qa" | "freetalk"
  const [activeLiveRooms, setActiveLiveRooms] = useState(ACTIVE_LIVE_ROOMS);
  const [remindedRooms, setRemindedRooms] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomTitle, setNewRoomTitle] = useState("");
  const [newRoomType, setNewRoomType] = useState("💻 Video Conference");
  const [newRoomQna, setNewRoomQna] = useState(true);

  const toggleReminder = (id) => {
    setRemindedRooms((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleCardSelect = (cardKey) => {
    setSelectedCard((prev) => (prev === cardKey ? null : cardKey));
  };

  const handleStartPractice = () => {
    if (!selectedCard) return;
    const cardNames = {
      rapid: "Rapid Topic Challenge",
      filler: "Filler Word Drill",
      pace: "Pace Control",
      qa: "Q&A Simulator",
      freetalk: "Free Talk",
    };
    alert(`Memulai latihan: ${cardNames[selectedCard] || selectedCard}`);
  };

  const handleCreateRoom = (e) => {
    e.preventDefault();
    if (!newRoomTitle.trim()) return;

    const newRoom = {
      id: Date.now(),
      type: newRoomType,
      title: newRoomTitle.trim(),
      speaker: "Dibawakan oleh Nadine (Kamu)",
      audience: 1,
      qnaActive: newRoomQna,
      tag: "Testing Available",
    };

    setActiveLiveRooms((prev) => [newRoom, ...prev]);
    setShowCreateModal(false);
    setNewRoomTitle("");
    if (onJoinLiveRoom) {
      onJoinLiveRoom(newRoom);
    }
  };

  return (
    <div className="practice-zone-screen" data-node-id={practiceMode === "live" ? "181:1826" : "146:1513"} data-name="Practice Area">
      {/* ── Fixed Top Bar ────────────────────────────────────────── */}
      <div className="practice-topbar" data-node-id="149:1514">
        <div className="practice-topbar-row" data-node-id="181:1805">
          <h1 className="practice-topbar-title" data-node-id="149:1515">
            Zona Latihan
          </h1>
          <div className="practice-xp-badge" data-node-id="149:1516">
            <span className="practice-xp-text" data-node-id="149:1517">
              16.364 XP
            </span>
          </div>
        </div>

        {/* Mode Toggle Switch (Solo vs Live) */}
        <div className="practice-mode-toggle" data-node-id="181:1806">
          <div
            className={`practice-mode-slider ${practiceMode === "live" ? "slider-live" : "slider-solo"}`}
            data-node-id="181:1807"
          />
          <button
            type="button"
            className={`practice-mode-btn ${practiceMode === "solo" ? "active" : ""}`}
            onClick={() => setPracticeMode("solo")}
            data-node-id="181:1808"
          >
            Solo
          </button>
          <button
            type="button"
            className={`practice-mode-btn ${practiceMode === "live" ? "active" : ""}`}
            onClick={() => setPracticeMode("live")}
            data-node-id="181:1810"
          >
            Live
          </button>
        </div>
      </div>

      {/* ── Scrollable Body ──────────────────────────────────────── */}
      <div className="practice-scroll-body">
        {practiceMode === "solo" ? (
          /* ════════════════ SOLO VIEW ════════════════ */
          <div className="practice-content-wrap" data-node-id="151:1533">
            <div className="practice-grid-container" data-node-id="151:1565">

              {/* 1. Rapid Topic Challenge Card (Full-width horizontal) */}
              <div
                className={`practice-rapid-card ${selectedCard === "rapid" ? "selected" : ""}`}
                onClick={() => handleCardSelect("rapid")}
                data-node-id="188:2673"
              >
                <div className="practice-rapid-illus-wrapper" data-node-id="188:2674">
                  <img
                    src={imgRapidTopic}
                    alt="Rapid Topic Challenge"
                    className="practice-rapid-illus"
                  />
                </div>
                <div className="practice-rapid-info" data-node-id="188:2675">
                  <span className="home-module-tag" style={{ marginBottom: "2px" }}>
                    Testing available
                  </span>
                  <h3 className="practice-card-title" data-node-id="188:2676">
                    Rapid Topic Challenge
                  </h3>
                  <p className="practice-card-desc" data-node-id="188:2677">
                    Topik dadakan, waktu mepet. Latih otakmu mikir cepat sambil tetap kalem
                  </p>
                </div>
              </div>

              {/* 2. Filler Word Drill Card */}
              <div
                className={`practice-drill-card ${selectedCard === "filler" ? "selected" : ""}`}
                onClick={() => handleCardSelect("filler")}
                data-node-id="151:1561"
              >
                <div className="practice-drill-thumb" data-node-id="151:1585">
                  <img
                    src={imgFillerWord}
                    alt="Filler Word Drill"
                    className="practice-drill-img"
                  />
                </div>
                <div className="practice-drill-info" data-node-id="151:1562">
                  <h3 className="practice-card-title" data-node-id="151:1563">
                    Filler Word Drill
                  </h3>
                  <p className="practice-card-desc" data-node-id="151:1564">
                    Bebas dari kata pengisi yang bikin belibet
                  </p>
                </div>
              </div>

              {/* 3. Pace Control Card */}
              <div
                className={`practice-drill-card ${selectedCard === "pace" ? "selected" : ""}`}
                onClick={() => handleCardSelect("pace")}
                data-node-id="164:1599"
              >
                <div className="practice-drill-thumb" data-node-id="164:1600">
                  <img
                    src={imgPaceControl}
                    alt="Pace Control"
                    className="practice-drill-img"
                  />
                </div>
                <div className="practice-drill-info" data-node-id="164:1601">
                  <h3 className="practice-card-title" data-node-id="164:1602">
                    Pace Control
                  </h3>
                  <p className="practice-card-desc" data-node-id="164:1603">
                    Latih kecepatan bicara biar tetap stabil
                  </p>
                </div>
              </div>

              {/* 4. Q&A Simulator Card */}
              <div
                className={`practice-drill-card ${selectedCard === "qa" ? "selected" : ""}`}
                onClick={() => handleCardSelect("qa")}
                data-node-id="164:1604"
              >
                <div className="practice-drill-thumb" data-node-id="164:1605">
                  <img
                    src={imgQaSimulator}
                    alt="Q&A Simulator"
                    className="practice-drill-img"
                  />
                </div>
                <div className="practice-drill-info" data-node-id="164:1606">
                  <h3 className="practice-card-title" data-node-id="164:1607">
                    Q&A Simulator
                  </h3>
                  <p className="practice-card-desc" data-node-id="164:1608">
                    Latihan jawab pertanyaan mendadak
                  </p>
                </div>
              </div>

              {/* 5. Free Talk Card */}
              <div
                className={`practice-drill-card ${selectedCard === "freetalk" ? "selected" : ""}`}
                onClick={() => handleCardSelect("freetalk")}
                data-node-id="164:1609"
              >
                <div className="practice-drill-thumb" data-node-id="171:1660">
                  <img
                    src={imgFreeTalk}
                    alt="Free Talk"
                    className="practice-drill-img"
                  />
                </div>
                <div className="practice-drill-info" data-node-id="164:1611">
                  <h3 className="practice-card-title" data-node-id="164:1612">
                    Free Talk
                  </h3>
                  <p className="practice-card-desc" data-node-id="164:1613">
                    Ngomong aja dulu, topik apapun boleh.
                  </p>
                </div>
              </div>

              {/* 6. Live Feature Promo Card (At the bottom of the grid) */}
              <div className="practice-live-card" data-node-id="188:2792">
                <div className="practice-live-bg" aria-hidden="true" data-node-id="188:2793">
                  <img src={bgLiveSunburst} alt="" className="practice-live-bg-img" />
                </div>
                <div className="practice-live-text-block" data-node-id="188:2814">
                  <div className="practice-live-title-block" data-node-id="188:2815">
                    <h3 className="practice-live-title" data-node-id="188:2816">
                      Berani Tampil di Depan Orang
                    </h3>
                    <p className="practice-live-desc" data-node-id="188:2817">
                      Rasain gugupnya beneran, biar makin siap saat momen sesungguhnya.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-practice-try"
                    onClick={() => setPracticeMode("live")}
                    data-node-id="188:2818"
                  >
                    Coba Sekarang
                  </button>
                </div>
                <div className="practice-live-image-wrapper" data-node-id="188:2820">
                  <img
                    src={imgLiveSpeaker}
                    alt="Berani Tampil"
                    className="practice-live-image"
                  />
                </div>
              </div>

            </div>
          </div>
        ) : (
          /* ════════════════ LIVE VIEW (node 181:1826) ════════════════ */
          <div className="live-content-wrap" data-node-id="181:1851">
            
            {/* ── Section 1: ROOM SEDANG LIVE ──────────────────────── */}
            <div className="live-section" data-node-id="185:1992">
              <div className="live-section-header" data-node-id="188:2507">
                <h2 className="live-section-title" data-node-id="185:1990">
                  ROOM SEDANG LIVE
                </h2>
                <button
                  type="button"
                  className="live-section-link"
                  onClick={() => alert("Membuka semua room live...")}
                  data-node-id="188:2500"
                >
                  Lihat Semua
                </button>
              </div>

              <div className="live-card-list" data-node-id="184:1892">
                {activeLiveRooms.map((room) => (
                  <div key={room.id} className="live-room-card" data-node-id="184:1894">
                    {/* Top Meta: Mode badge & Tag */}
                    <div className="live-card-meta">
                      <span className="live-room-type">{room.type}</span>
                      {room.tag && (
                        <span className="live-testing-tag">{room.tag}</span>
                      )}
                    </div>

                    {/* Title & Speaker */}
                    <div className="live-card-heading">
                      <h3 className="live-room-title">{room.title}</h3>
                      <p className="live-room-speaker">{room.speaker}</p>
                    </div>

                    {/* Audience & Q&A Status */}
                    <div className="live-card-stats-row">
                      <div className="live-stat-item">
                        <img src={iconGroup} alt="" className="live-stat-icon" />
                        <span className="live-stat-text">{room.audience} Penonton</span>
                      </div>
                      <span className={`live-qna-tag ${room.qnaActive ? "live-qna-tag--active" : "live-qna-tag--inactive"}`}>
                        {room.qnaActive ? "Q&A Aktif" : "Q&A Nonaktif"}
                      </span>
                    </div>

                    {/* Action Button */}
                    <button
                      type="button"
                      className={`btn-live-join ${!room.tag ? "btn-live-join--inactive" : ""}`}
                      onClick={() => {
                        if (room.tag && onJoinLiveRoom) {
                          onJoinLiveRoom(room);
                        } else {
                          alert("Room ini belum tersedia untuk sesi testing.");
                        }
                      }}
                      data-node-id="185:2098"
                    >
                      <img src={iconEnterDoor} alt="" className="btn-join-icon" />
                      <span>Gabung</span>
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="live-see-all-footer"
                onClick={() => alert("Membuka semua room live...")}
              >
                <span>Lihat Semua</span>
                <span className="live-see-all-arrow">→</span>
              </button>
            </div>

            {/* ── Section 2: LIVE MENDATANG ────────────────────────── */}
            <div className="live-section" data-node-id="185:2187">
              <div className="live-section-header" data-node-id="188:2508">
                <h2 className="live-section-title" data-node-id="188:2509">
                  LIVE MENDATANG
                </h2>
                <button
                  type="button"
                  className="live-section-link"
                  onClick={() => alert("Membuka semua jadwal live mendatang...")}
                  data-node-id="188:2510"
                >
                  Lihat Semua
                </button>
              </div>

              <div className="live-card-list" data-node-id="185:2189">
                {UPCOMING_LIVE_ROOMS.map((room) => {
                  const isReminded = remindedRooms[room.id];
                  return (
                    <div key={room.id} className="live-room-card live-upcoming-card" data-node-id="185:2240">
                      {/* Top Meta: Mode badge */}
                      <div className="live-card-meta">
                        <span className="live-room-type">{room.type}</span>
                      </div>

                      {/* Title & Speaker */}
                      <div className="live-card-heading">
                        <h3 className="live-room-title">{room.title}</h3>
                        <p className="live-room-speaker">{room.speaker}</p>
                      </div>

                      {/* Schedule & Q&A Status */}
                      <div className="live-card-stats-row">
                        <div className="live-stat-item">
                          <img src={iconTime} alt="" className="live-stat-icon" />
                          <span className="live-stat-text">{room.schedule}</span>
                        </div>
                        <span className={`live-qna-tag ${room.qnaActive ? "live-qna-tag--active" : "live-qna-tag--inactive"}`}>
                          {room.qnaActive ? "Q&A Aktif" : "Q&A Nonaktif"}
                        </span>
                      </div>

                      {/* Reminder Action Button */}
                      <button
                        type="button"
                        className={`btn-live-remind ${isReminded ? "btn-live-remind--active" : ""}`}
                        onClick={() => toggleReminder(room.id)}
                        data-node-id="185:2259"
                      >
                        {isReminded ? "✓ Pengingat Disetel" : "Ingatkan Saya"}
                      </button>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                className="live-see-all-footer"
                onClick={() => alert("Membuka semua jadwal live mendatang...")}
              >
                <span>Lihat Semua</span>
                <span className="live-see-all-arrow">→</span>
              </button>
            </div>

          </div>
        )}
      </div>

      {/* ── Center Floating Action Button (FAB) / Mulai Button ── */}
      <button
        type="button"
        className={`practice-create-room-fab ${practiceMode === "solo" && selectedCard ? "practice-fab-expanded" : ""}`}
        onClick={
          practiceMode === "solo" && selectedCard
            ? handleStartPractice
            : () => setShowCreateModal(true)
        }
        aria-label={practiceMode === "solo" && selectedCard ? "Mulai Latihan" : "Buat Room Baru"}
        title={practiceMode === "solo" && selectedCard ? "Mulai Latihan" : "Buat Room Baru"}
        data-node-id="181:1879"
      >
        {practiceMode === "solo" && selectedCard ? (
          <span className="fab-text-content">Mulai</span>
        ) : (
          <span className="fab-icon-content">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </span>
        )}
      </button>

      {/* ── Create Room Modal Bottom Sheet ────────────────────────── */}
      {showCreateModal && (
        <div className="create-room-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="create-room-modal" onClick={(e) => e.stopPropagation()}>
            <div className="create-room-drag-handle" />
            <div className="create-room-header">
              <h3 className="create-room-title">Buat Room Live Baru</h3>
              <button
                type="button"
                className="btn-close-create-modal"
                onClick={() => setShowCreateModal(false)}
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="create-room-form">
              <div className="create-form-group">
                <label className="create-form-label">Judul Sesi / Latihan</label>
                <input
                  type="text"
                  className="create-form-input"
                  placeholder="Misal: Public Speaking Perdana Aku"
                  value={newRoomTitle}
                  onChange={(e) => setNewRoomTitle(e.target.value)}
                  required
                />
              </div>

              <div className="create-form-group">
                <label className="create-form-label">Tipe Ruangan</label>
                <div className="create-room-type-picker">
                  <button
                    type="button"
                    className={`type-option-btn ${newRoomType === "💻 Video Conference" ? "active" : ""}`}
                    onClick={() => setNewRoomType("💻 Video Conference")}
                  >
                    💻 Video Conference
                  </button>
                  <button
                    type="button"
                    className={`type-option-btn ${newRoomType === "🎭 Theatre" ? "active" : ""}`}
                    onClick={() => setNewRoomType("🎭 Theatre")}
                  >
                    🎭 Theatre
                  </button>
                </div>
              </div>

              <div className="create-form-toggle-row">
                <div>
                  <span className="toggle-row-title">Fitur Q&A Langsung</span>
                  <p className="toggle-row-sub">Penonton dapat mengajukan pertanyaan interaktif</p>
                </div>
                <button
                  type="button"
                  className={`toggle-switch-pill ${newRoomQna ? "active" : ""}`}
                  onClick={() => setNewRoomQna(!newRoomQna)}
                >
                  <span className="toggle-switch-circle" />
                </button>
              </div>

              <button
                type="submit"
                className={`btn-create-submit ${newRoomTitle.trim() ? "ready" : ""}`}
                disabled={!newRoomTitle.trim()}
              >
                Mulai Sesi Live
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Fixed Bottom Navigation Pill (identical to Home) ──────────────── */}
      <div className="home-bottom-nav" data-node-id="149:1519">
        <button
          type="button"
          className="home-nav-item"
          onClick={onNavigateHome}
          aria-label="Home"
          data-node-id="149:1520"
        >
          <img src={iconNavHome} alt="Home" className="home-nav-icon" />
        </button>
        <button
          type="button"
          className="home-nav-item home-nav-item--active"
          aria-label="Practice"
          data-node-id="149:1524"
        >
          <img src={iconNavMic} alt="Practice" className="home-nav-icon home-nav-icon--active" />
        </button>
        <button
          type="button"
          className="home-nav-item"
          onClick={onNavigateProfile}
          aria-label="Profile"
          data-node-id="149:1528"
        >
          <img src={iconNavUser} alt="Profile" className="home-nav-icon" />
        </button>
      </div>
    </div>
  );
}
