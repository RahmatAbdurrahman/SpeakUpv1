import React, { useState, useEffect, useRef } from "react";
import "./LiveRoomScreen.css";
import { fetchLiveQuestions, postLiveQuestion, requestLiveToken, friendlySosialError } from "../lib/sosial";
import { fetchGeneratedQuestions } from "../lib/simulasi";
import { supabase } from "../lib/supabaseClient";
import {
  connectToRoom,
  setCameraEnabled,
  setMicrophoneEnabled,
  attachTrack,
  detachTrack,
  isLivekitConfigured,
  RoomEvent,
  Track,
} from "../lib/livekit";
import PeerRatingModal from "./PeerRatingModal";

const AVATAR_COLORS = ["#E0F2FE:#0369A1", "#FEF3C7:#B45309", "#DCFCE7:#15803D", "#FCE7F3:#BE185D"];

function initialsFor(name) {
  const parts = (name || "?").trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
}

function colorFor(id) {
  let hash = 0;
  for (const ch of String(id)) hash = (hash * 31 + ch.charCodeAt(0)) % AVATAR_COLORS.length;
  const [bg, color] = AVATAR_COLORS[hash].split(":");
  return { bg, color };
}

function timeAgoShort(iso) {
  if (!iso) return "";
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "Baru saja";
  if (mins < 60) return `${mins} mnt lalu`;
  return `${Math.round(mins / 60)} jam lalu`;
}

export default function LiveRoomScreen({ roomData, onLeaveRoom }) {
  const roomTitle = roomData?.title || "Sesi Live";
  const speakerName = roomData?.hostName || "Host";

  // LiveKit connection
  const roomRef = useRef(null);
  const [isBroadcaster, setIsBroadcaster] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState("");
  const mainVideoRef = useRef(null);
  const selfVideoRef = useRef(null);

  // Audio / Video / Call state
  const [isMicOn, setIsMicOn] = useState(false);
  const [isCamOn, setIsCamOn] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [showMutedSnackbar, setShowMutedSnackbar] = useState(true);
  const mutedTimerRef = useRef(null);

  // Q&A Drawer Bottom Sheet state
  const [isQaDrawerOpen, setIsQaDrawerOpen] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [aiQuestion, setAiQuestion] = useState("");
  const [newQuestionText, setNewQuestionText] = useState("");
  const [qaError, setQaError] = useState("");

  // Floating Reactions
  const [reactions, setReactions] = useState([]);
  const [showToast, setShowToast] = useState(null);

  // Timer
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [showRatingModal, setShowRatingModal] = useState(false);

  // Viewers get asked to rate the presenter on their way out; broadcasters
  // (rating themselves would be meaningless) leave straight away.
  const handleLeaveClick = () => {
    if (isBroadcaster || !roomData?.sessionId) {
      onLeaveRoom?.();
    } else {
      setShowRatingModal(true);
    }
  };

  // ── Connect to the real LiveKit room ──────────────────────────────────
  useEffect(() => {
    let active = true;

    if (!roomData?.roomId) {
      setConnectionError("Room tidak ditemukan.");
      setConnecting(false);
      return;
    }
    if (!isLivekitConfigured()) {
      setConnectionError("Video call belum dikonfigurasi (VITE_LIVEKIT_URL kosong).");
      setConnecting(false);
      return;
    }

    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!active) return;
        const broadcaster = Boolean(user && roomData.hostId && user.id === roomData.hostId);
        setIsBroadcaster(broadcaster);

        const { token } = await requestLiveToken(roomData.roomId, broadcaster ? "broadcaster" : "viewer");
        if (!active) return;

        const room = await connectToRoom(token);
        if (!active) {
          room.disconnect();
          return;
        }
        roomRef.current = room;

        room.on(RoomEvent.TrackSubscribed, (track) => {
          if (track.kind === Track.Kind.Video && mainVideoRef.current) {
            attachTrack(track, mainVideoRef.current);
          }
        });
        room.on(RoomEvent.TrackUnsubscribed, (track) => detachTrack(track));
        room.on(RoomEvent.LocalTrackPublished, (publication) => {
          if (publication.track?.kind === Track.Kind.Video) {
            const container = broadcaster ? mainVideoRef.current : selfVideoRef.current;
            if (container) attachTrack(publication.track, container);
          }
        });
        room.on(RoomEvent.LocalTrackUnpublished, (publication) => {
          if (publication.track) detachTrack(publication.track);
        });

        setConnecting(false);
      } catch (err) {
        if (active) {
          setConnectionError(friendlySosialError(err));
          setConnecting(false);
        }
      }
    })();

    return () => {
      active = false;
      roomRef.current?.disconnect();
      roomRef.current = null;
    };
  }, [roomData?.roomId, roomData?.hostId]);

  useEffect(() => {
    // Reset scroll on mount so parent doesn't hold previous scroll offset
    const screenContent = document.querySelector(".iphone-screen-content");
    if (screenContent) {
      screenContent.scrollTop = 0;
    }

    // Auto hide "You are muted" snackbar after 3.5 seconds
    mutedTimerRef.current = setTimeout(() => {
      setShowMutedSnackbar(false);
    }, 3500);

    const timer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);
    return () => {
      clearInterval(timer);
      if (mutedTimerRef.current) clearTimeout(mutedTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!roomData?.roomId) return;
    let active = true;
    fetchLiveQuestions(roomData.roomId)
      .then((data) => {
        if (active) setQuestions(data);
      })
      .catch((err) => {
        if (active) setQaError(friendlySosialError(err));
      });
    return () => {
      active = false;
    };
  }, [roomData?.roomId]);

  // No real questions yet — surface one AI-generated icebreaker so the Q&A
  // never looks empty while waiting on an actual viewer. Only for
  // Presentasi-category rooms (the only category that can ever go live —
  // see SimulasiScreen's Go Live gate), so kategori is fixed to "kelas".
  useEffect(() => {
    if (!roomData?.roomId || questions.length > 0 || aiQuestion) return;
    let active = true;
    fetchGeneratedQuestions(roomData.roomId, "kelas")
      .then((qs) => {
        if (active && qs?.[0]) setAiQuestion(qs[0]);
      })
      .catch(() => {
        // Best-effort only — an empty Q&A list is a fine fallback.
      });
    return () => {
      active = false;
    };
  }, [roomData?.roomId, questions.length, aiQuestion]);

  const formatTimer = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const triggerToast = (msg) => {
    setShowToast(msg);
    setTimeout(() => {
      setShowToast((curr) => (curr === msg ? null : curr));
    }, 2500);
  };

  const handleSendReaction = (emoji) => {
    const id = Date.now() + Math.random();
    const xOffset = Math.floor(Math.random() * 80) - 40;
    setReactions((prev) => [...prev, { id, emoji, xOffset }]);
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== id));
    }, 1800);
  };

  const handleSubmitQuestion = async (e) => {
    e.preventDefault();
    const text = newQuestionText.trim();
    if (!text || !roomData?.roomId) return;

    setNewQuestionText("");
    try {
      await postLiveQuestion(roomData.roomId, text);
      const fresh = await fetchLiveQuestions(roomData.roomId);
      setQuestions(fresh);
      triggerToast("Pertanyaan terkirim!");
    } catch (err) {
      setQaError(friendlySosialError(err));
    }
  };

  const handleToggleCamera = async () => {
    if (!isBroadcaster || !roomRef.current) return;
    const next = !isCamOn;
    try {
      await setCameraEnabled(roomRef.current, next);
      setIsCamOn(next);
      triggerToast(next ? "Kamera diaktifkan" : "Kamera dimatikan");
    } catch {
      triggerToast("Gagal mengakses kamera");
    }
  };

  const handleToggleMic = async () => {
    if (!isBroadcaster || !roomRef.current) return;
    const next = !isMicOn;
    try {
      await setMicrophoneEnabled(roomRef.current, next);
      setIsMicOn(next);
      if (!next) {
        setShowMutedSnackbar(true);
        if (mutedTimerRef.current) clearTimeout(mutedTimerRef.current);
        mutedTimerRef.current = setTimeout(() => setShowMutedSnackbar(false), 3500);
      } else {
        setShowMutedSnackbar(false);
      }
      triggerToast(next ? "Mikrofon diaktifkan" : "Mikrofon dibisukan");
    } catch {
      triggerToast("Gagal mengakses mikrofon");
    }
  };

  return (
    <div className="teams-call-container">
      {/* ── Toast Alert ─────────────────────────────────────────── */}
      {showToast && (
        <div className="teams-toast">
          <span>{showToast}</span>
        </div>
      )}

      {/* ── Floating Reaction Emojis ─────────────────────────────── */}
      <div className="teams-floating-reactions" aria-hidden="true">
        {reactions.map((r) => (
          <span
            key={r.id}
            className="teams-flying-emoji"
            style={{ transform: `translateX(${r.xOffset}px)` }}
          >
            {r.emoji}
          </span>
        ))}
      </div>

      {/* ── Top Bar Header (Teams/Zoom Style) ─────────────────────── */}
      <div className="teams-topbar">
        <button
          type="button"
          className="teams-back-btn"
          onClick={handleLeaveClick}
          aria-label="Kembali"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="teams-header-info">
          <h1 className="teams-room-title">{roomTitle}</h1>
          <span className="teams-call-duration">{formatTimer(secondsElapsed)}</span>
        </div>

        <div className="teams-top-actions">
          {/* Q&A Drawer Button */}
          <button
            type="button"
            className={`teams-top-icon-btn teams-qa-badge-btn ${isQaDrawerOpen ? "active" : ""}`}
            onClick={() => setIsQaDrawerOpen(true)}
            aria-label="Buka Q&A"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="teams-unread-dot" />
          </button>
        </div>
      </div>

      {/* ── Main Conference Split Stage ─────────────────────────── */}
      <div className="teams-stage-grid">
        {/* Main Tile: the broadcast — local preview if I'm the broadcaster, remote track if I'm watching */}
        <div className="teams-video-tile teams-tile-host">
          <div ref={mainVideoRef} className="teams-video-el-container" />

          {connecting && (
            <div className="teams-connecting-overlay">
              <span className="teams-connecting-spinner" />
              <span>Menyambungkan...</span>
            </div>
          )}
          {!connecting && connectionError && (
            <div className="teams-connecting-overlay">
              <span>{connectionError}</span>
            </div>
          )}
          {!connecting && !connectionError && !isBroadcaster && (
            <>
              <div className="teams-avatar-circle teams-avatar-host">
                <span>{initialsFor(speakerName)}</span>
              </div>
              <div className="teams-tile-nameplate">
                <span>{speakerName}</span>
              </div>
            </>
          )}
        </div>

        {/* PiP self-preview — broadcaster only, so they can see their own framing while live */}
        {isBroadcaster && (
          <div className="teams-video-tile teams-tile-self">
            <div className="teams-tile-nameplate">
              <span>Kamu</span>
              {!isMicOn && <span className="teams-nameplate-muted-icon">🔇</span>}
            </div>

            {!isMicOn && showMutedSnackbar && (
              <div className="teams-muted-status-pill">
                <span className="muted-icon">🔇</span>
                <span>You are muted</span>
              </div>
            )}

            <div className="teams-pip-camera-box">
              <div className="teams-pip-content">
                {isCamOn ? (
                  <div ref={selfVideoRef} className="teams-video-el-container teams-pip-video" />
                ) : (
                  <div className="teams-pip-cam-off">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
                      <line x1="1" y1="1" x2="23" y2="23" />
                      <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34m-7.72-2.06a4 4 0 1 1-5.56-5.56" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Quick Q&A Open Trigger Banner ───────────────────────── */}
      <button
        type="button"
        className="teams-qa-quick-trigger"
        onClick={() => setIsQaDrawerOpen(true)}
      >
        <div className="teams-qa-trigger-left">
          <span className="teams-qa-icon-bubble">💬</span>
          <div className="teams-qa-trigger-text">
            <span className="teams-qa-trigger-title">Q&A Sesi Terbuka ({questions.length} Pertanyaan)</span>
            <span className="teams-qa-trigger-sub">Ketuk untuk bertanya ke {speakerName}</span>
          </div>
        </div>
        <span className="teams-qa-trigger-arrow">▲</span>
      </button>

      {/* ── Bottom Call Controls (Teams/Zoom Style) ─────────────── */}
      <div className="teams-bottom-controls">
        {/* Camera Button — broadcaster only, viewers just watch */}
        {isBroadcaster && (
          <button
            type="button"
            className={`teams-call-btn ${isCamOn ? "active" : ""}`}
            onClick={handleToggleCamera}
            aria-label="Kamera"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {isCamOn ? (
                <>
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </>
              ) : (
                <>
                  <line x1="1" y1="1" x2="23" y2="23" />
                  <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34" />
                </>
              )}
            </svg>
          </button>
        )}

        {/* Mic Button — broadcaster only */}
        {isBroadcaster && (
          <button
            type="button"
            className={`teams-call-btn ${isMicOn ? "active" : "muted"}`}
            onClick={handleToggleMic}
            aria-label="Mikrofon"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {isMicOn ? (
                <>
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </>
              ) : (
                <>
                  <line x1="1" y1="1" x2="23" y2="23" />
                  <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                  <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </>
              )}
            </svg>
          </button>
        )}

        {/* Speaker Button — viewers only, controls whether they hear the broadcast */}
        {!isBroadcaster && (
          <button
            type="button"
            className={`teams-call-btn ${isSpeakerOn ? "active" : ""}`}
            onClick={() => {
              setIsSpeakerOn(!isSpeakerOn);
              triggerToast(!isSpeakerOn ? "Speaker aktif" : "Speaker nonaktif");
            }}
            aria-label="Speaker"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          </button>
        )}

        {/* Q&A Drawer Toggle Button */}
        <button
          type="button"
          className={`teams-call-btn ${isQaDrawerOpen ? "active" : ""}`}
          onClick={() => setIsQaDrawerOpen(true)}
          aria-label="Tanya Jawab"
        >
          <span style={{ fontSize: "18px" }}>❓</span>
        </button>

        {/* Reaction Emoji */}
        <button
          type="button"
          className="teams-call-btn"
          onClick={() => handleSendReaction("👏")}
          aria-label="Tepuk Tangan"
        >
          <span style={{ fontSize: "18px" }}>👏</span>
        </button>

        {/* Red End Call Button */}
        <button
          type="button"
          className="teams-end-call-btn"
          onClick={handleLeaveClick}
          aria-label="Tutup Panggilan"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-6-6 19.8 19.8 0 0 1-3.12-8.68A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" transform="rotate(135 12 12)" />
          </svg>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          BOTTOM SHEET DRAWER: Q&A AREA
      ════════════════════════════════════════════════════════════ */}
      <div className={`teams-drawer-backdrop ${isQaDrawerOpen ? "open" : ""}`} onClick={() => setIsQaDrawerOpen(false)}>
        <div className="teams-qa-drawer" onClick={(e) => e.stopPropagation()}>
          {/* Drag Pill Handle */}
          <div className="teams-drawer-drag-handle" />

          {/* Drawer Header */}
          <div className="teams-drawer-header">
            <div className="teams-drawer-title-group">
              <h3 className="teams-drawer-title">Q&A Sesi Tanya Jawab</h3>
              <span className="teams-drawer-qna-tag">Q&A Aktif</span>
            </div>
            <button
              type="button"
              className="teams-drawer-close-btn"
              onClick={() => setIsQaDrawerOpen(false)}
              aria-label="Tutup"
            >
              ✕
            </button>
          </div>

          {/* Questions Scrollable List */}
          {qaError && <p className="teams-qa-error">{qaError}</p>}
          <div className="teams-drawer-questions-list">
            {questions.length === 0 && aiQuestion && (
              <div className="teams-drawer-q-card teams-drawer-q-card--ai">
                <div className="teams-drawer-q-meta">
                  <div className="teams-q-author-wrap">
                    <span className="teams-q-avatar teams-q-avatar--ai">🤖</span>
                    <span className="teams-q-author-name">AI</span>
                  </div>
                </div>
                <p className="teams-q-content">{aiQuestion}</p>
              </div>
            )}
            {questions.length === 0 && !aiQuestion && !qaError && (
              <p className="teams-qa-empty">Belum ada pertanyaan. Jadi yang pertama!</p>
            )}
            {questions.map((q) => {
              const avatar = colorFor(q.id);
              return (
                <div key={q.id} className="teams-drawer-q-card">
                  <div className="teams-drawer-q-meta">
                    <div className="teams-q-author-wrap">
                      <span className="teams-q-avatar" style={{ backgroundColor: avatar.bg, color: avatar.color }}>
                        {initialsFor(q.authorName)}
                      </span>
                      <span className="teams-q-author-name">{q.authorName}</span>
                    </div>
                    <span className="teams-q-time">{timeAgoShort(q.createdAt)}</span>
                  </div>
                  <p className="teams-q-content">{q.text}</p>
                </div>
              );
            })}
          </div>

          {/* Bottom Sticky Input Pertanyaan */}
          <form className="teams-drawer-input-row" onSubmit={handleSubmitQuestion}>
            <input
              type="text"
              className="teams-drawer-input"
              placeholder={`Tulis pertanyaan untuk ${speakerName}...`}
              value={newQuestionText}
              onChange={(e) => setNewQuestionText(e.target.value)}
            />
            <button
              type="submit"
              className={`btn-teams-send ${newQuestionText.trim() ? "ready" : ""}`}
              disabled={!newQuestionText.trim()}
            >
              Kirim
            </button>
          </form>
        </div>
      </div>

      {showRatingModal && (
        <PeerRatingModal
          sessionId={roomData.sessionId}
          hostName={speakerName}
          onDone={() => {
            setShowRatingModal(false);
            onLeaveRoom?.();
          }}
        />
      )}
    </div>
  );
}
