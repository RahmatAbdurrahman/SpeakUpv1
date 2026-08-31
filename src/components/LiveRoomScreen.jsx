import React, { useState, useEffect, useRef } from "react";
import "./LiveRoomScreen.css";
import {
  fetchLiveQuestions,
  postLiveQuestion,
  subscribeToLiveQuestions,
  requestLiveToken,
  endLiveRoom,
  fetchRoomViewerCount,
  bumpViewerCount,
  friendlySosialError,
} from "../lib/sosial";
import {
  fetchGeneratedQuestions,
  uploadSessionAudio,
  updateSessionAudio,
  runAnalysis,
  fetchSessionResults,
  markSimulationCompleted,
  getMaterialSignedUrl,
  friendlySimulasiError,
} from "../lib/simulasi";
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
import SessionLoadingScreen from "./SessionLoadingScreen";

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

// ─── Presenter-only cosmetic boost on top of the REAL viewer_count. Never
// shown to viewers themselves or on Sosial's "Live Sekarang" cards — those
// always read the real, unmodified count (see fetchLiveRooms/SosialScreen).
// Same irregular-cadence pattern as the old solo-Simulasi counter. ─────────
function useFakeViewerBoost(active) {
  const [boost, setBoost] = useState(() => 5 + Math.floor(Math.random() * 10));

  useEffect(() => {
    if (!active) return undefined;
    let timeoutId;
    const scheduleNext = () => {
      timeoutId = setTimeout(() => {
        setBoost((b) => Math.min(40, Math.max(2, b + Math.floor(Math.random() * 5) - 2)));
        scheduleNext();
      }, 2000 + Math.random() * 3000);
    };
    scheduleNext();
    return () => clearTimeout(timeoutId);
  }, [active]);

  return boost;
}

export default function LiveRoomScreen({ roomData, onLeaveRoom, onSessionEnded }) {
  const roomTitle = roomData?.title || "Sesi Live";
  const speakerName = roomData?.hostName || "Host";
  // Live Presentation always hands off simulationId (see LivePresentationScreen);
  // duet/legacy rooms never do. That alone is enough to gate the new
  // record-while-live + phase machinery to only the flow that needs it.
  const isLivePresentation = Boolean(roomData?.simulationId);

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

  // Live Presentation only: presenting -> qna, ended via "Selesaikan Sesi".
  // Recording is a SEPARATE local getUserMedia+MediaRecorder, independent of
  // the LiveKit publish — same reasoning as SimulasiScreen/LessonModul7Screen's
  // recorders: keeps "what we analyse" decoupled from "what we broadcast".
  const [livePhase, setLivePhase] = useState("presenting"); // "presenting" | "qna"
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState("");
  const [realViewerCount, setRealViewerCount] = useState(0);
  const recStreamRef = useRef(null);
  const recorderRef = useRef(null);
  const recChunksRef = useRef([]);
  const recStartRef = useRef(null);
  const viewerBoost = useFakeViewerBoost(isBroadcaster && isLivePresentation);

  // Presenter's split-screen Notes/Slide toggle — same shape as
  // SimulasiScreen's RecordingStep, driven off roomData.notes/materialPdfPath
  // that LivePresentationScreen hands off.
  const [materialView, setMaterialView] = useState("notes"); // "notes" | "slide"
  const [slideUrl, setSlideUrl] = useState(null);
  const [slideError, setSlideError] = useState("");

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

  // Stops the local recorder and returns { blob, durationSeconds } — or null
  // if nothing was ever captured (mic denied, or ended before it started).
  const stopLocalRecording = () =>
    new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        resolve(null);
        return;
      }
      const durationSeconds = Math.max(1, Math.round((Date.now() - recStartRef.current) / 1000));
      recorder.onstop = () => {
        const blob = new Blob(recChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        recStreamRef.current?.getTracks().forEach((t) => t.stop());
        resolve({ blob, durationSeconds });
      };
      recorder.stop();
    });

  // The one way a Live Presentation ends, whether the presenter taps
  // "Selesaikan Sesi" during Q&A or bails out early via the hang-up button —
  // same finalize pipeline either way, matching how SimulasiScreen's
  // handleRecordingFinished works: upload -> analyze-session ->
  // generate-feedback -> mark the simulation done -> hand off the results.
  const handleFinishLivePresentation = async () => {
    setFinishing(true);
    setFinishError("");
    try {
      if (roomData?.roomId) await endLiveRoom(roomData.roomId).catch(() => {});
      roomRef.current?.disconnect();
      roomRef.current = null;

      const recorded = await stopLocalRecording();
      if (!recorded) {
        throw new Error("Rekaman tidak ditemukan — mikrofon mungkin tidak pernah aktif. Coba live lagi.");
      }

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr || !user) throw new Error("Sesi login tidak ditemukan, coba masuk ulang.");

      const audioPath = await uploadSessionAudio(user.id, roomData.sessionId, recorded.blob);
      await updateSessionAudio(roomData.sessionId, audioPath);
      await runAnalysis({ sessionId: roomData.sessionId, audioPath, durationSeconds: recorded.durationSeconds });
      const results = await fetchSessionResults(roomData.sessionId);
      await markSimulationCompleted(roomData.simulationId);

      onSessionEnded?.({ sessionId: roomData.sessionId, results });
    } catch (err) {
      setFinishError(friendlySimulasiError(err));
      setFinishing(false);
    }
  };

  // Viewers get asked to rate the presenter on their way out; a Live
  // Presentation broadcaster goes through the finalize pipeline above
  // instead. Everything else (duet, legacy rooms with no simulationId)
  // keeps the old plain leave.
  const handleLeaveClick = () => {
    if (isBroadcaster && isLivePresentation) {
      handleFinishLivePresentation();
      return;
    }
    if (isBroadcaster && roomData?.roomId) {
      endLiveRoom(roomData.roomId).catch(() => {});
    }
    if (isBroadcaster || !roomData?.sessionId) {
      onLeaveRoom?.();
    } else {
      setShowRatingModal(true);
    }
  };

  const triggerToast = (msg) => {
    setShowToast(msg);
    setTimeout(() => {
      setShowToast((curr) => (curr === msg ? null : curr));
    }, 2500);
  };

  const handleSendReaction = (emoji, broadcast = true) => {
    const id = Date.now() + Math.random();
    const xOffset = Math.floor(Math.random() * 80) - 40;
    setReactions((prev) => [...prev, { id, emoji, xOffset }]);
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== id));
    }, 1800);

    if (broadcast && roomRef.current?.localParticipant) {
      try {
        const payload = JSON.stringify({ type: "reaction", emoji });
        const encoder = new TextEncoder();
        roomRef.current.localParticipant.publishData(encoder.encode(payload), { reliable: false });
      } catch {}
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

        // Instant P2P chat and reactions via LiveKit Data Channel
        room.on(RoomEvent.DataReceived, (payload) => {
          try {
            const str = new TextDecoder().decode(payload);
            const data = JSON.parse(str);
            if (data.type === "question" && data.question) {
              setQuestions((prev) => {
                if (prev.some((q) => q.id === data.question.id || (q.text === data.question.text && q.authorName === data.question.authorName))) {
                  return prev;
                }
                return [data.question, ...prev];
              });
              triggerToast(`💬 ${data.question.authorName}: ${data.question.text}`);
            } else if (data.type === "reaction") {
              handleSendReaction(data.emoji, false);
            }
          } catch (err) {
            console.warn("LiveKit data received parse error:", err);
          }
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

  // ── Local recording for the AI pipeline (Live Presentation, broadcaster
  // only) — deliberately independent of the LiveKit publish above. Starts
  // once we're actually connected as the broadcaster; stopped explicitly by
  // handleFinishLivePresentation, never by this effect's own cleanup, since
  // the recording must survive the presenting -> qna phase change without
  // interruption. ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isBroadcaster || !isLivePresentation || connecting || connectionError) return undefined;
    if (recorderRef.current) return undefined;
    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        recStreamRef.current = stream;
        const mimeType = window.MediaRecorder?.isTypeSupported?.("audio/webm") ? "audio/webm" : "";
        const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
        recChunksRef.current = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) recChunksRef.current.push(e.data);
        };
        recStartRef.current = Date.now();
        recorder.start();
        recorderRef.current = recorder;
      } catch {
        // Mic unavailable for the local recorder — handleFinishLivePresentation
        // surfaces this as "rekaman tidak ditemukan" rather than faking a
        // result. The broadcast itself (via LiveKit) is unaffected either way.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isBroadcaster, isLivePresentation, connecting, connectionError]);

  // Stop the local recorder if the presenter backs out some other way
  // (device back gesture, app close) without ever hitting "Selesaikan Sesi".
  useEffect(() => {
    return () => {
      if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
      recStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // ── Viewer count: real, unmodified count for everyone (including the
  // broadcaster's own blended badge below) — bumping only ever happens for
  // actual viewers, never the broadcaster watching their own room. ────────
  useEffect(() => {
    if (!roomData?.roomId) return undefined;

    if (!isBroadcaster) {
      bumpViewerCount(roomData.roomId, 1).catch(() => {});
      return () => {
        bumpViewerCount(roomData.roomId, -1).catch(() => {});
      };
    }

    if (!isLivePresentation) return undefined;
    let active = true;
    const poll = () => {
      fetchRoomViewerCount(roomData.roomId)
        .then((count) => {
          if (active) setRealViewerCount(count);
        })
        .catch(() => {});
    };
    poll();
    const intervalId = setInterval(poll, 5000);
    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [roomData?.roomId, isBroadcaster, isLivePresentation]);

  // Lazy — only fetched once the presenter taps the Slide toggle.
  useEffect(() => {
    if (materialView !== "slide" || !roomData?.materialPdfPath || slideUrl) return undefined;
    let active = true;
    setSlideError("");
    getMaterialSignedUrl(roomData.materialPdfPath)
      .then((url) => {
        if (active) setSlideUrl(url);
      })
      .catch(() => {
        if (active) setSlideError("Gagal memuat slide. Coba lagi.");
      });
    return () => {
      active = false;
    };
  }, [materialView, roomData?.materialPdfPath, slideUrl]);

  useEffect(() => {
    // Reset scroll on mount so parent doesn't hold previous scroll offset
    const screenContent = document.querySelector(".iphone-screen-content");
    if (screenContent) screenContent.scrollTop = 0;

    const timer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);

    mutedTimerRef.current = setTimeout(() => {
      setShowMutedSnackbar(false);
    }, 4000);

    return () => {
      clearInterval(timer);
      if (mutedTimerRef.current) clearTimeout(mutedTimerRef.current);
    };
  }, []);

  // ── Fetch and Subscribe to Realtime Questions / Chat ─────────────────
  useEffect(() => {
    if (!roomData?.roomId) return;
    let active = true;

    const reloadQuestions = async () => {
      try {
        const data = await fetchLiveQuestions(roomData.roomId);
        if (active) setQuestions(data);
      } catch (err) {
        if (active) setQaError(friendlySosialError(err));
      }
    };

    reloadQuestions();

    // Supabase Realtime subscription
    const unsubscribe = subscribeToLiveQuestions(roomData.roomId, () => {
      reloadQuestions();
    });

    // Reliable 2.5s polling fallback so no message is ever missed
    const pollInterval = setInterval(() => {
      reloadQuestions();
    }, 2500);

    return () => {
      active = false;
      unsubscribe?.();
      clearInterval(pollInterval);
    };
  }, [roomData?.roomId]);

  // No real questions yet — surface one AI-generated icebreaker
  useEffect(() => {
    if (!roomData?.sessionId || questions.length > 0 || aiQuestion) return;
    let active = true;
    fetchGeneratedQuestions(roomData.sessionId, "kelas")
      .then((qs) => {
        if (active && qs?.[0]) setAiQuestion(qs[0]);
      })
      .catch(() => {
        // Best-effort only
      });
    return () => {
      active = false;
    };
  }, [roomData?.sessionId, questions.length, aiQuestion]);

  const formatTimer = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleSubmitQuestion = async (e) => {
    e.preventDefault();
    const text = newQuestionText.trim();
    if (!text || !roomData?.roomId) return;

    setNewQuestionText("");
    try {
      const inserted = await postLiveQuestion(roomData.roomId, text);
      const fresh = await fetchLiveQuestions(roomData.roomId);
      setQuestions(fresh);
      triggerToast("Pertanyaan terkirim!");

      // Broadcast immediately to all participants via LiveKit Data Channel
      if (roomRef.current?.localParticipant) {
        const userProfile = fresh.find((q) => q.id === inserted?.id) || {
          id: inserted?.id || Date.now(),
          text,
          createdAt: new Date().toISOString(),
          authorName: "Kamu",
        };
        const payload = JSON.stringify({ type: "question", question: userProfile });
        const encoder = new TextEncoder();
        roomRef.current.localParticipant.publishData(encoder.encode(payload), { reliable: true });
      }
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

  if (finishing) {
    return <SessionLoadingScreen text="Menganalisis presentasimu..." />;
  }

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
          <span className="teams-call-duration">
            {formatTimer(secondsElapsed)}
            {isBroadcaster && isLivePresentation && (
              <span className="teams-viewer-badge" aria-hidden="true">
                {" "}
                · 👁 {realViewerCount + viewerBoost} menonton
              </span>
            )}
          </span>
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
      {isBroadcaster && isLivePresentation ? (
        // Presenter's own view: top = their camera (mainVideoRef already
        // gets the broadcaster's local track — see LocalTrackPublished
        // above), bottom = Notes/Slide toggle. Same split-screen as
        // SimulasiScreen's Presentasi RecordingStep, per the design decision
        // that this look applies "baik simulasi atau Live". The redundant
        // self-PiP tile other broadcasters used to also get is dropped here
        // since the camera pane already IS the presenter's own feed.
        <div className="teams-split-stage">
          <div className="teams-split-camera">
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
          </div>

          <div className="teams-split-material">
            <div className="teams-split-toggle-row">
              <button
                type="button"
                className={`teams-split-toggle ${materialView === "notes" ? "active" : ""}`}
                onClick={() => setMaterialView("notes")}
              >
                📝 Notes
              </button>
              <button
                type="button"
                className={`teams-split-toggle ${materialView === "slide" ? "active" : ""}`}
                onClick={() => setMaterialView("slide")}
                disabled={!roomData?.materialPdfPath}
              >
                🖼️ Slide
              </button>
            </div>
            <div className="teams-split-content">
              {materialView === "notes" ? (
                roomData?.notes ? (
                  <p className="teams-split-notes-text">{roomData.notes}</p>
                ) : (
                  <p className="teams-split-empty">Belum ada notes untuk sesi ini.</p>
                )
              ) : slideError ? (
                <p className="teams-split-empty">{slideError}</p>
              ) : slideUrl ? (
                <iframe src={slideUrl} title="Slide materi presentasi" className="teams-split-slide-frame" />
              ) : roomData?.materialPdfPath ? (
                <p className="teams-split-empty">Memuat slide...</p>
              ) : (
                <p className="teams-split-empty">Materi PDF tidak tersedia untuk sesi ini.</p>
              )}
            </div>
          </div>
        </div>
      ) : (
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
      )}

      {/* ── Quick Q&A Open Trigger Banner — Live Presentation's presenter
          gets the phase-transition CTA here instead; everyone else (viewers,
          duet) keeps the plain "open the Q&A drawer" trigger. ──────────── */}
      {isBroadcaster && isLivePresentation ? (
        livePhase === "presenting" ? (
          <button
            type="button"
            className="teams-qa-quick-trigger teams-phase-trigger"
            onClick={() => {
              setLivePhase("qna");
              setIsQaDrawerOpen(true);
            }}
          >
            <div className="teams-qa-trigger-left">
              <span className="teams-qa-icon-bubble">▶</span>
              <div className="teams-qa-trigger-text">
                <span className="teams-qa-trigger-title">Lanjut ke Sesi Tanya Jawab</span>
                <span className="teams-qa-trigger-sub">{questions.length} pertanyaan sudah menunggu</span>
              </div>
            </div>
          </button>
        ) : (
          <button
            type="button"
            className="teams-qa-quick-trigger teams-phase-trigger teams-phase-trigger--finish"
            onClick={handleFinishLivePresentation}
            disabled={finishing}
          >
            <div className="teams-qa-trigger-left">
              <span className="teams-qa-icon-bubble">✅</span>
              <div className="teams-qa-trigger-text">
                <span className="teams-qa-trigger-title">{finishing ? "Menyelesaikan sesi..." : "Selesaikan Sesi"}</span>
                <span className="teams-qa-trigger-sub">Analisis AI akan langsung diproses</span>
              </div>
            </div>
          </button>
        )
      ) : (
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
      )}

      {finishError && <p className="teams-finish-error">{finishError}</p>}

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
