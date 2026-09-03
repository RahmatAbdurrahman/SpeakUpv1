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
  fetchLiveRoomDetails,
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
import AnalysisProgress from "./AnalysisProgress";
import SlideViewer from "./SlideViewer";
import LessonExitModal from "./LessonExitModal";

const AVATAR_COLORS = ["#E0F2FE:#0369A1", "#FEF3C7:#B45309", "#DCFCE7:#15803D", "#FCE7F3:#BE185D"];

// Disamakan persis dengan SimulasiScreen (RecordingStep) supaya Live Presentation
// dan Simulasi Presentasi memakai ambang anti-cheat yang sama. Kalau salah satu
// diubah, ubah keduanya.
const SILENCE_THRESHOLD = 12;
const MIN_LIVE_SECONDS = 15;

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

function useFakeViewerBoost(active) {
  const [boost, setBoost] = useState(() => 5 + Math.floor(Math.random() * 8));

  useEffect(() => {
    if (!active) return undefined;
    let timeoutId;
    const scheduleNext = () => {
      timeoutId = setTimeout(() => {
        setBoost((b) => Math.min(40, Math.max(2, b + Math.floor(Math.random() * 5) - 2)));
        scheduleNext();
      }, 2500 + Math.random() * 3000);
    };
    scheduleNext();
    return () => clearTimeout(timeoutId);
  }, [active]);

  return boost;
}

export default function LiveRoomScreen({ roomData, onLeaveRoom, onSessionEnded }) {
  const roomTitle = roomData?.title || "Live Presentasi";
  const speakerName = roomData?.hostName || "Host";

  // LiveKit connection & Participant state
  const roomRef = useRef(null);
  const currentVideoTrackRef = useRef(null);
  const [isBroadcaster, setIsBroadcaster] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState("");
  const mainVideoRef = useRef(null);
  const pipVideoRef = useRef(null);
  const containerRef = useRef(null);
  const pipRef = useRef(null);
  // Wadah tersembunyi untuk elemen <audio> milik track suara presenter.
  const audioSinkRef = useRef(null);
  // Cermin dari state mainView, supaya handler LiveKit (closure yang dibuat
  // sekali saat connect) tidak membaca nilai basi saat penonton menukar tampilan.
  const mainViewRef = useRef("slide");
  // Ref tidak memicu render, jadi status "ada video masuk" perlu state sendiri
  // agar placeholder kamera-mati hilang begitu track presenter tiba.
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [perluAktifkanSuara, setPerluAktifkanSuara] = useState(false);

  // Audio / Video / Call state
  const [isMicOn, setIsMicOn] = useState(false);
  const [isCamOn, setIsCamOn] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [showMutedSnackbar, setShowMutedSnackbar] = useState(false);
  const mutedTimerRef = useRef(null);

  // Interactive Video Conference Presentation States
  const [mainView, setMainView] = useState("slide"); // "slide" | "camera"
  const [slidePage, setSlidePage] = useState(1);
  const [totalSlidePages, setTotalSlidePages] = useState(1);
  const [slideUrl, setSlideUrl] = useState(null);
  const [slideLoading, setSlideLoading] = useState(false);
  const [slideError, setSlideError] = useState("");
  const [notes, setNotes] = useState(roomData?.notes || "");
  const [materialPdfPath, setMaterialPdfPath] = useState(roomData?.materialPdfPath || null);

  // Modals & Drawers
  const [showNotesSheet, setShowNotesSheet] = useState(false);
  const [isQaDrawerOpen, setIsQaDrawerOpen] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);

  // Recording & AI Analysis pipeline for Broadcaster
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState("");
  const [analysisStage, setAnalysisStage] = useState("uploading");
  const recStreamRef = useRef(null);
  const recorderRef = useRef(null);
  const recChunksRef = useRef([]);
  const recStartRef = useRef(null);
  // Anti-cheat sama seperti Simulasi Presentasi: dengarkan energi mikrofon
  // sepanjang sesi, lalu tolak menilai kalau presenter tidak pernah bersuara.
  const detectedSpeechRef = useRef(false);
  const audioCtxRef = useRef(null);
  const rafRef = useRef(null);
  // null | "silent" | "incomplete"
  const [gate, setGate] = useState(null);
  // Durasi dibekukan saat gerbang muncul — jangan hitung Date.now() saat render.
  const [gateSeconds, setGateSeconds] = useState(0);

  // Live Viewer Count & Timer
  const [realViewerCount, setRealViewerCount] = useState(0);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const viewerBoost = useFakeViewerBoost(isBroadcaster);

  // Q&A State
  const [questions, setQuestions] = useState([]);
  const [aiQuestion, setAiQuestion] = useState("");
  const [newQuestionText, setNewQuestionText] = useState("");
  const [qaError, setQaError] = useState("");

  // Floating Reactions & Toast
  const [reactions, setReactions] = useState([]);
  const [showToast, setShowToast] = useState(null);

  // ── Helper for PiP dimension bounds ──────────────────────────────────────
  const getContainerMetrics = () => {
    const container = containerRef.current;
    const pip = pipRef.current;
    const width = container ? container.clientWidth : window.innerWidth;
    const height = container ? container.clientHeight : window.innerHeight;
    const pipWidth = pip ? pip.offsetWidth : 110;
    const pipHeight = pip ? pip.offsetHeight : 150;
    const minX = 14;
    const maxX = Math.max(minX, width - pipWidth - 14);
    const minY = 68;
    const maxY = Math.max(minY, height - pipHeight - 130);
    return { width, height, pipWidth, pipHeight, minX, maxX, minY, maxY };
  };

  // Draggable PiP State with Magnetic Edge Snap
  const [pipPos, setPipPos] = useState({ x: 240, y: 72, side: "right" });
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ startX: 0, startY: 0, initPipX: 0, initPipY: 0 });
  const hasMovedRef = useRef(false);
  const pipPosRef = useRef({ x: 240, y: 72, side: "right" });

  useEffect(() => {
    pipPosRef.current = pipPos;
  }, [pipPos]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const { maxX, minY } = getContainerMetrics();
      setPipPos({ x: maxX, y: minY + 4, side: "right" });
    }, 40);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const { minX, maxX, minY, maxY } = getContainerMetrics();
      setPipPos((prev) => ({
        x: prev.side === "left" ? minX : maxX,
        y: Math.max(minY, Math.min(maxY, prev.y)),
        side: prev.side || "right",
      }));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ── Fetch Details (notes & material PDF) for Viewer / Broadcaster ─────────
  useEffect(() => {
    let active = true;
    if ((roomData?.roomId || roomData?.sessionId) && (!notes || !materialPdfPath)) {
      fetchLiveRoomDetails(roomData.roomId, roomData.sessionId).then((details) => {
        if (!active || !details) return;
        if (details.notes) setNotes((n) => n || details.notes);
        if (details.materialPdfPath) setMaterialPdfPath((p) => p || details.materialPdfPath);
      });
    }
    return () => {
      active = false;
    };
  }, [roomData?.roomId, roomData?.sessionId, notes, materialPdfPath]);

  // ── Load Signed URL for PDF Presentation ─────────────────────────────────
  useEffect(() => {
    if (!materialPdfPath) return undefined;
    let active = true;
    setSlideLoading(true);
    setSlideError("");
    getMaterialSignedUrl(materialPdfPath)
      .then((url) => {
        if (active) {
          setSlideUrl(url);
          setSlideLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setSlideError("Gagal memuat slide presentasi.");
          setSlideLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [materialPdfPath]);

  // ── Swap Main View & PiP View ────────────────────────────────────────────
  const handleSwapView = () => {
    setMainView((prev) => (prev === "slide" ? "camera" : "slide"));
  };

  // ── Re-attach video track on view swap ───────────────────────────────────
  useEffect(() => {
    mainViewRef.current = mainView;
    const track = currentVideoTrackRef.current;
    if (!track) return;
    const targetEl = mainView === "camera" ? mainVideoRef.current : pipVideoRef.current;
    if (targetEl) {
      attachTrack(track, targetEl);
    }
  }, [mainView, connecting]);

  // ── PiP Drag and Magnetic Snap Handlers ───────────────────────────────────
  const handlePointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    isDraggingRef.current = true;
    setIsDragging(true);
    hasMovedRef.current = false;
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initPipX: pipPos.x,
      initPipY: pipPos.y,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;

    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      hasMovedRef.current = true;
    }

    const { minX, maxX, minY, maxY } = getContainerMetrics();
    const nextX = Math.max(minX, Math.min(maxX, dragStartRef.current.initPipX + dx));
    const nextY = Math.max(minY, Math.min(maxY, dragStartRef.current.initPipY + dy));

    setPipPos((prev) => ({ ...prev, x: nextX, y: nextY }));
  };

  const handlePointerUp = (e) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}

    const { width, pipWidth, minX, maxX, minY, maxY } = getContainerMetrics();

    if (hasMovedRef.current) {
      const currentX = pipPosRef.current.x;
      const currentY = pipPosRef.current.y;
      const pipCenterX = currentX + pipWidth / 2;
      const screenCenterX = width / 2;

      const isRight = pipCenterX >= screenCenterX;
      const snapX = isRight ? maxX : minX;
      const snapY = Math.max(minY, Math.min(maxY, currentY));

      setPipPos({ x: snapX, y: snapY, side: isRight ? "right" : "left" });
    } else {
      handleSwapView();
    }
  };

  // ── Toast Trigger ────────────────────────────────────────────────────────
  const triggerToast = (msg) => {
    setShowToast(msg);
    setTimeout(() => {
      setShowToast((curr) => (curr === msg ? null : curr));
    }, 2500);
  };

  // ── Floating Reactions ───────────────────────────────────────────────────
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

  // ── Stop Local Recording Helper ──────────────────────────────────────────
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

  // ── Finish Presentation Pipeline ─────────────────────────────────────────
  // `lewatiGerbang` dipakai tombol "Akhiri Saja" di modal gerbang: presenter
  // tetap boleh menutup sesi, hanya saja tanpa dinilai.
  const handleFinishLivePresentation = async ({ lewatiGerbang = false } = {}) => {
    // GERBANG MUTU — sengaja dijalankan SEBELUM endLiveRoom(), supaya tombol
    // "Lanjutkan" benar-benar meneruskan siaran yang masih hidup. Ambangnya
    // sama persis dengan Simulasi Presentasi (lihat SILENCE_THRESHOLD /
    // MIN_LIVE_SECONDS di atas), jadi sesi kosong tidak pernah dinilai.
    if (!lewatiGerbang) {
      const durasi = recStartRef.current
        ? Math.round((Date.now() - recStartRef.current) / 1000)
        : 0;
      if (!detectedSpeechRef.current) {
        setGateSeconds(durasi);
        setGate("silent");
        return;
      }
      if (durasi < MIN_LIVE_SECONDS) {
        setGateSeconds(durasi);
        setGate("incomplete");
        return;
      }
    }

    setGate(null);
    setFinishing(true);
    setFinishError("");
    setAnalysisStage("uploading");

    let pesanAnalisis = "";
    try {
      if (roomData?.roomId) {
        await endLiveRoom(roomData.roomId).catch(() => {});
      }
      roomRef.current?.disconnect();
      roomRef.current = null;

      const recorded = await stopLocalRecording();

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      let results = null;

      // Blob palsu 100 byte yang dulu disisipkan di sini sudah DIHAPUS: itu
      // membuat sesi tanpa rekaman tetap masuk pipeline AI dan berpeluang
      // menghasilkan skor atas sesuatu yang tidak pernah terjadi.
      const adaRekaman = Boolean(recorded?.blob && recorded.blob.size > 0);

      if (adaRekaman && user && !userErr && roomData?.sessionId) {
        try {
          const audioPath = await uploadSessionAudio(user.id, roomData.sessionId, recorded.blob);
          await updateSessionAudio(roomData.sessionId, audioPath);
          await runAnalysis({
            sessionId: roomData.sessionId,
            audioPath,
            durationSeconds: recorded.durationSeconds,
            onStage: setAnalysisStage,
          });
        } catch (analysisErr) {
          // Termasuk 422 dari gerbang transkrip analyze-session (rekaman hening
          // / halusinasi Whisper). Pesannya ditahan supaya bisa ditampilkan,
          // bukan ditelan diam-diam seperti sebelumnya.
          pesanAnalisis = friendlySimulasiError(analysisErr);
        }

        try {
          results = await fetchSessionResults(roomData.sessionId);
        } catch {
          // biarkan results null — ditangani di bawah
        }

        if (roomData.simulationId) {
          await markSimulationCompleted(roomData.simulationId).catch(() => {});
        }
      } else if (!adaRekaman) {
        pesanAnalisis =
          "Rekaman presentasimu tidak tertangkap — mikrofon sepertinya tidak aktif. Sesi ditutup tanpa penilaian AI.";
      }

      setAnalysisStage("done");

      // fetchSessionResults SELALU mengembalikan objek ({metrics, feedback}),
      // jadi memeriksa `results` saja selalu truthy — dulu ini membuat layar
      // hasil terbuka dalam keadaan kosong. Yang menentukan adalah feedback-nya.
      if (results?.feedback) {
        onSessionEnded?.({ sessionId: roomData?.sessionId, results });
      } else {
        setFinishing(false);
        setFinishError(
          pesanAnalisis ||
            "Sesi sudah ditutup, tapi belum ada feedback AI yang bisa ditampilkan.",
        );
      }
    } catch (err) {
      console.error("handleFinishLivePresentation error:", err);
      setFinishing(false);
      setFinishError(friendlySimulasiError(err));
    }
  };

  // ── Leave confirmation modal trigger ─────────────────────────────────────
  const handleLeaveClick = () => {
    setShowExitModal(true);
  };

  const handleConfirmExit = () => {
    setShowExitModal(false);
    if (isBroadcaster) {
      handleFinishLivePresentation();
    } else {
      if (roomData?.sessionId) {
        setShowRatingModal(true);
      } else {
        onLeaveRoom?.();
      }
    }
  };

  // ── Connect to LiveKit Room ──────────────────────────────────────────────
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

        // Satu jalur pasang untuk video DAN audio.
        // BUG sebelumnya: hanya Track.Kind.Video yang ditangani, sehingga track
        // audio presenter tidak pernah di-attach ke elemen mana pun — dan track
        // LiveKit yang tidak di-attach tidak berbunyi sama sekali di penonton.
        const pasangTrack = (track) => {
          if (track.kind === Track.Kind.Video) {
            currentVideoTrackRef.current = track;
            const targetEl =
              mainViewRef.current === "camera" ? mainVideoRef.current : pipVideoRef.current;
            if (targetEl) attachTrack(track, targetEl);
            setHasRemoteVideo(true);
          } else if (track.kind === Track.Kind.Audio) {
            const sink = audioSinkRef.current;
            if (sink) {
              // Sengaja TIDAK memakai attachTrack di sini: helper itu
              // mengosongkan wadah sebelum menempel, sehingga pembicara kedua
              // (mode duet) akan membungkam yang pertama. Elemen audio tidak
              // terlihat, jadi aman ditumpuk. detachTrack tetap membersihkannya.
              sink.appendChild(track.attach());
            }
          }
        };

        room.on(RoomEvent.TrackSubscribed, pasangTrack);
        room.on(RoomEvent.TrackUnsubscribed, (track) => {
          if (currentVideoTrackRef.current === track) {
            currentVideoTrackRef.current = null;
            setHasRemoteVideo(false);
          }
          detachTrack(track);
        });

        // BUG sebelumnya: handler di atas baru dipasang SETELAH connectToRoom()
        // selesai, padahal LiveKit menembakkan TrackSubscribed untuk peserta
        // yang sudah lebih dulu siaran tepat saat proses connect. Penonton yang
        // masuk ke siaran berjalan (alur normal) jadi melewatkan kamera & suara
        // presenter selamanya. Sapuan ini memasang track yang sudah terlanjur
        // ter-subscribe sebelum kita sempat mendengarkan.
        room.remoteParticipants.forEach((peserta) => {
          peserta.trackPublications.forEach((pub) => {
            if (pub.isSubscribed && pub.track) pasangTrack(pub.track);
          });
        });

        // Browser memblokir autoplay bersuara sampai ada interaksi pengguna.
        // Penonton sudah menekan tombol untuk masuk room, jadi biasanya lolos;
        // kalau ditolak, tombol "Aktifkan suara" muncul di UI.
        try {
          await room.startAudio();
        } catch {
          if (active) setPerluAktifkanSuara(true);
        }
        room.on(RoomEvent.LocalTrackPublished, (publication) => {
          if (publication.track?.kind === Track.Kind.Video) {
            currentVideoTrackRef.current = publication.track;
            const targetEl =
              mainViewRef.current === "camera" ? mainVideoRef.current : pipVideoRef.current;
            if (targetEl) attachTrack(publication.track, targetEl);
            setHasRemoteVideo(true);
          }
        });
        room.on(RoomEvent.LocalTrackUnpublished, (publication) => {
          if (publication.track && currentVideoTrackRef.current === publication.track) {
            currentVideoTrackRef.current = null;
            setHasRemoteVideo(false);
            detachTrack(publication.track);
          }
        });

        // Instant P2P chat & reactions via LiveKit Data Channel
        room.on(RoomEvent.DataReceived, (payload) => {
          try {
            const str = new TextDecoder().decode(payload);
            const data = JSON.parse(str);
            if (data.type === "question" && data.question) {
              setQuestions((prev) => {
                if (
                  prev.some(
                    (q) =>
                      q.id === data.question.id ||
                      (q.text === data.question.text && q.authorName === data.question.authorName)
                  )
                ) {
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

        // Auto-publish camera & mic for broadcaster upon join
        if (broadcaster) {
          try {
            await setCameraEnabled(room, true);
            setIsCamOn(true);
            await setMicrophoneEnabled(room, true);
            setIsMicOn(true);
          } catch (camErr) {
            console.warn("Auto-enable camera/mic failed:", camErr);
          }
        }

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

  // ── Local recorder for AI Analysis (Broadcaster) ─────────────────────────
  useEffect(() => {
    if (!isBroadcaster || connecting || connectionError) return undefined;
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
        detectedSpeechRef.current = false;
        recorder.start();
        recorderRef.current = recorder;

        // Pantau energi mikrofon dari stream yang SAMA dengan perekam, jadi
        // tidak perlu izin getUserMedia kedua. Pola identik dengan
        // RecordingStep di SimulasiScreen.
        try {
          const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          audioCtxRef.current = audioCtx;
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 512;
          audioCtx.createMediaStreamSource(stream).connect(analyser);
          const data = new Uint8Array(analyser.frequencyBinCount);
          const tick = () => {
            analyser.getByteFrequencyData(data);
            let sum = 0;
            for (let i = 0; i < data.length; i++) sum += data[i];
            if (sum / data.length > SILENCE_THRESHOLD) detectedSpeechRef.current = true;
            rafRef.current = requestAnimationFrame(tick);
          };
          tick();
        } catch {
          // Browser tanpa AudioContext: jangan pernah memblokir sesi nyata —
          // gerbang transkrip di analyze-session tetap jadi jaring pengaman.
          detectedSpeechRef.current = true;
        }
      } catch {
        // Microphone unavailable
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isBroadcaster, connecting, connectionError]);

  useEffect(() => {
    return () => {
      if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
      recStreamRef.current?.getTracks().forEach((t) => t.stop());
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      audioCtxRef.current?.close?.().catch(() => {});
    };
  }, []);

  // ── Viewer count polling & active status ──────────────────────────────────
  useEffect(() => {
    if (!roomData?.roomId) return undefined;

    if (!isBroadcaster) {
      bumpViewerCount(roomData.roomId, 1).catch(() => {});
      return () => {
        bumpViewerCount(roomData.roomId, -1).catch(() => {});
      };
    }

    let active = true;
    const poll = () => {
      fetchRoomViewerCount(roomData.roomId)
        .then((count) => {
          if (active) setRealViewerCount(count);
        })
        .catch(() => {});
    };
    poll();
    const intervalId = setInterval(poll, 4000);
    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [roomData?.roomId, isBroadcaster]);

  // ── Live Questions Subscription & Polling ────────────────────────────────
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
    const unsubscribe = subscribeToLiveQuestions(roomData.roomId, () => {
      reloadQuestions();
    });
    const pollInterval = setInterval(reloadQuestions, 3000);

    return () => {
      active = false;
      unsubscribe?.();
      clearInterval(pollInterval);
    };
  }, [roomData?.roomId]);

  // Icebreaker Question
  useEffect(() => {
    if (!roomData?.sessionId || questions.length > 0 || aiQuestion) return;
    let active = true;
    fetchGeneratedQuestions(roomData.sessionId, "kelas")
      .then((qs) => {
        if (active && qs?.[0]) setAiQuestion(qs[0]);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [roomData?.sessionId, questions.length, aiQuestion]);

  // Live Timer Counter
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // ── Submit Question ──────────────────────────────────────────────────────
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

  // ── Toggle Media (Host) ──────────────────────────────────────────────────
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
    return <AnalysisProgress stage={analysisStage} title="Menganalisis presentasimu..." tone="dark" />;
  }

  const atFirst = slidePage <= 1;
  const atLast = slidePage >= totalSlidePages;
  const activeViewerDisplay = isBroadcaster ? realViewerCount + viewerBoost : Math.max(1, realViewerCount);

  return (
    <div className="live-conference-wrapper" ref={containerRef}>
      {/* Wadah elemen <audio> track presenter. Tanpa ini suara tidak berbunyi. */}
      <div ref={audioSinkRef} style={{ display: "none" }} aria-hidden="true" />

      {/* Gerbang mutu — sepadan dengan RecordingGateModal di Simulasi Presentasi.
          Muncul SEBELUM room ditutup, jadi "Lanjutkan" meneruskan siaran. */}
      {gate && (
        <div className="live-gate-backdrop">
          <div className="live-gate-sheet">
            <h2 className="live-gate-title">
              {gate === "silent" ? "Belum ada suara terdeteksi" : "Presentasimu baru sebentar"}
            </h2>
            <p className="live-gate-desc">
              {gate === "silent"
                ? "Selama siaran ini mikrofonmu tidak menangkap suara sama sekali, jadi belum ada yang bisa dinilai AI. Cek izin mikrofon, lalu lanjutkan presentasimu."
                : `Baru sekitar ${gateSeconds} detik berjalan — hasil analisisnya bisa kurang akurat kalau ditutup sekarang.`}
            </p>
            <div className="live-gate-actions">
              <button type="button" className="btn-live-gate-primary" onClick={() => setGate(null)}>
                Lanjutkan Presentasi
              </button>
              <button
                type="button"
                className="btn-live-gate-ghost"
                onClick={() => handleFinishLivePresentation({ lewatiGerbang: true })}
              >
                Akhiri Tanpa Dinilai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sesi sudah ditutup tapi tidak ada feedback (gerbang server menolak,
          mik mati, atau AI gagal). Dulu kasus ini melempar presenter keluar
          tanpa penjelasan apa pun. */}
      {!finishing && finishError && (
        <div className="live-gate-backdrop">
          <div className="live-gate-sheet">
            <h2 className="live-gate-title">Sesi selesai</h2>
            <p className="live-gate-desc">{finishError}</p>
            <div className="live-gate-actions">
              <button type="button" className="btn-live-gate-primary" onClick={() => onLeaveRoom?.()}>
                Kembali
              </button>
            </div>
          </div>
        </div>
      )}

      {perluAktifkanSuara && (
        <button
          type="button"
          className="live-conference-enable-audio"
          onClick={async () => {
            try {
              await roomRef.current?.startAudio();
              setPerluAktifkanSuara(false);
            } catch {
              triggerToast("Gagal mengaktifkan suara");
            }
          }}
        >
          🔊 Ketuk untuk mengaktifkan suara
        </button>
      )}
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

      {/* ── Top Bar Header (Interactive Video Conference Style) ───── */}
      <header className="live-conference-topbar">
        <div className="live-conference-topbar-left">
          <button
            type="button"
            className="live-conference-back-btn"
            onClick={handleLeaveClick}
            aria-label="Kembali"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div className="live-conference-title-group">
            <span className="live-conference-title">{roomTitle}</span>
            <span className="live-conference-sub">{speakerName} · Presentasi Live</span>
          </div>
        </div>

        <div className="live-conference-topbar-right">
          <div className="live-conference-viewer-badge">
            <span className="live-conference-viewer-dot" />
            <span className="live-conference-viewer-count">{activeViewerDisplay} Penonton</span>
          </div>

          <div className="live-conference-timer-badge">
            <span className="live-conference-timer-dot" />
            <span className="live-conference-timer-text">{formatTimer(secondsElapsed)}</span>
          </div>
        </div>
      </header>

      {/* ── Main Stage (Full-bleed borderless display) ──────────── */}
      <div className="live-conference-main-stage">
        {mainView === "slide" ? (
          <div className="live-conference-slide-wrapper">
            {slideError ? (
              <div className="live-conference-stage-msg">
                <p>{slideError}</p>
                {notes && <p className="live-conference-fallback-notes">{notes}</p>}
              </div>
            ) : slideUrl ? (
              <SlideViewer
                url={slideUrl}
                page={slidePage}
                onPageChange={setSlidePage}
                onNumPages={setTotalSlidePages}
                hideNav={true}
                tone="dark"
              />
            ) : slideLoading ? (
              <div className="live-conference-stage-msg">
                <div className="live-camera-spinner" />
                <p>Memuat slide pitchdeck...</p>
              </div>
            ) : notes ? (
              <div className="live-conference-text-slide">
                <div className="live-conference-text-slide-inner">
                  <span className="live-conference-text-badge">Materi Pitchdeck</span>
                  <p>{notes}</p>
                </div>
              </div>
            ) : (
              <div className="live-conference-stage-msg">
                <p>Slide siap dipresentasikan</p>
              </div>
            )}
          </div>
        ) : (
          <div className="live-conference-camera-wrapper">
            <div ref={mainVideoRef} className="live-conference-video-container" />
            {connecting && (
              <div className="live-conference-camera-overlay">
                <div className="live-camera-spinner" />
                <p>Menghubungkan ke siaran live...</p>
              </div>
            )}
            {!connecting && connectionError && (
              <div className="live-conference-camera-overlay">
                <p>{connectionError}</p>
              </div>
            )}
            {!connecting && !connectionError && !isBroadcaster && !hasRemoteVideo && (
              <div className="live-conference-cam-off-placeholder">
                <div className="live-conference-avatar-circle">
                  <span>{initialsFor(speakerName)}</span>
                </div>
                <p>{speakerName} (Presenter)</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Magnetic Draggable & Swappable PiP Box ───────────────── */}
      <div
        ref={pipRef}
        className={`live-conference-pip ${isDragging ? "is-dragging" : ""}`}
        style={{
          transform: `translate3d(${pipPos.x}px, ${pipPos.y}px, 0)`,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        title="Ketuk untuk tukar tampilan, geser untuk memindahkan"
      >
        {mainView === "slide" ? (
          // When Slide is in main view, PiP shows camera
          <div className="live-conference-pip-content">
            <div ref={pipVideoRef} className="live-conference-pip-video" />
            {!connecting && !hasRemoteVideo && (
              <div className="live-conference-pip-camoff">
                <span>{isBroadcaster ? "👤" : initialsFor(speakerName)}</span>
              </div>
            )}
          </div>
        ) : (
          // When Camera is in main view, PiP shows Slide pitchdeck
          <div className="live-conference-pip-content live-conference-pip-slide">
            {slideUrl ? (
              <SlideViewer url={slideUrl} page={slidePage} hideNav={true} tone="dark" />
            ) : (
              <div className="live-conference-pip-notes">
                <span>📄 Slide</span>
              </div>
            )}
          </div>
        )}

        {/* Swap indicator badge on PiP */}
        <div className="live-conference-pip-badge">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 16V4M7 4L3 8M7 4L11 8M17 8V20M17 20L21 16M17 20L13 16" />
          </svg>
        </div>
      </div>

      {/* ── Slide Navigation Controls Bar (Pitchdeck Reader) ─────── */}
      <div className="live-conference-slide-nav-bar">
        <button
          type="button"
          className="live-conference-nav-arrow"
          onClick={() => setSlidePage((p) => Math.max(1, p - 1))}
          disabled={atFirst || totalSlidePages <= 1}
          aria-label="Slide sebelumnya"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <span className="live-conference-nav-counter">
          Slide {slidePage} / {totalSlidePages || 1}
        </span>

        <button
          type="button"
          className="live-conference-nav-arrow"
          onClick={() => setSlidePage((p) => Math.min(totalSlidePages, p + 1))}
          disabled={atLast || totalSlidePages <= 1}
          aria-label="Slide berikutnya"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* ── Bottom Action Dock ───────────────────────────────────── */}
      <div className="live-conference-bottom-dock">
        {isBroadcaster ? (
          <>
            {/* Broadcaster Mic Toggle */}
            <button
              type="button"
              className={`live-conf-dock-btn ${!isMicOn ? "is-off" : ""}`}
              onClick={handleToggleMic}
              title={isMicOn ? "Matikan Mikrofon" : "Nyalakan Mikrofon"}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                {isMicOn ? (
                  <>
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                  </>
                ) : (
                  <>
                    <line x1="1" y1="1" x2="23" y2="23" />
                    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                  </>
                )}
              </svg>
              <span className="live-conf-dock-label">{isMicOn ? "Mute" : "Unmute"}</span>
            </button>

            {/* Broadcaster Cam Toggle */}
            <button
              type="button"
              className={`live-conf-dock-btn ${!isCamOn ? "is-off" : ""}`}
              onClick={handleToggleCamera}
              title={isCamOn ? "Matikan Kamera" : "Nyalakan Kamera"}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
              <span className="live-conf-dock-label">{isCamOn ? "Cam Off" : "Cam On"}</span>
            </button>

            {/* Notes / Contekan Drawer */}
            <button
              type="button"
              className={`live-conf-dock-btn ${showNotesSheet ? "is-active" : ""}`}
              onClick={() => setShowNotesSheet(true)}
              title="Buka Catatan & Contekan"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              <span className="live-conf-dock-label">Notes</span>
            </button>

            {/* Q&A Drawer Toggle Button */}
            <button
              type="button"
              className={`live-conf-dock-btn ${isQaDrawerOpen ? "is-active" : ""}`}
              onClick={() => setIsQaDrawerOpen(true)}
              title="Buka Sesi Tanya Jawab"
            >
              <div className="live-conf-qa-icon-wrap">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                {questions.length > 0 && <span className="live-conf-dock-badge">{questions.length}</span>}
              </div>
              <span className="live-conf-dock-label">Q&A</span>
            </button>

            {/* End Call / Finish Button */}
            <button
              type="button"
              className="live-conf-dock-btn live-conf-dock-btn--end"
              onClick={handleLeaveClick}
              title="Selesaikan Presentasi"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
                <line x1="23" y1="1" x2="1" y2="23" />
              </svg>
              <span className="live-conf-dock-label">Selesai</span>
            </button>
          </>
        ) : (
          <>
            {/* Viewer: Pitchdeck & Notes Sheet */}
            <button
              type="button"
              className={`live-conf-dock-btn ${showNotesSheet ? "is-active" : ""}`}
              onClick={() => setShowNotesSheet(true)}
              title="Baca Catatan & Poin Materi"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              <span className="live-conf-dock-label">Materi</span>
            </button>

            {/* Viewer: Q&A Drawer */}
            <button
              type="button"
              className={`live-conf-dock-btn ${isQaDrawerOpen ? "is-active" : ""}`}
              onClick={() => setIsQaDrawerOpen(true)}
              title="Tanya ke Presenter"
            >
              <div className="live-conf-qa-icon-wrap">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                {questions.length > 0 && <span className="live-conf-dock-badge">{questions.length}</span>}
              </div>
              <span className="live-conf-dock-label">Tanya</span>
            </button>

            {/* Quick Reactions */}
            <button
              type="button"
              className="live-conf-dock-btn live-conf-dock-btn--reaction"
              onClick={() => handleSendReaction("👏")}
              title="Kirim Tepuk Tangan"
            >
              <span className="live-conf-reaction-emoji">👏</span>
              <span className="live-conf-dock-label">Tepuk</span>
            </button>
            <button
              type="button"
              className="live-conf-dock-btn live-conf-dock-btn--reaction"
              onClick={() => handleSendReaction("🔥")}
              title="Kirim Api Semangat"
            >
              <span className="live-conf-reaction-emoji">🔥</span>
              <span className="live-conf-dock-label">Semangat</span>
            </button>

            {/* Viewer: Leave Session */}
            <button
              type="button"
              className="live-conf-dock-btn live-conf-dock-btn--leave"
              onClick={handleLeaveClick}
              title="Keluar dari Sesi"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span className="live-conf-dock-label">Keluar</span>
            </button>
          </>
        )}
      </div>

      {/* ── Slide-up Bottom Sheet: Catatan & Poin Materi Pitchdeck ── */}
      {showNotesSheet && (
        <div className="live-conference-notes-backdrop" onClick={() => setShowNotesSheet(false)}>
          <div className="live-conference-notes-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="live-conference-notes-header">
              <div className="live-conference-notes-handle" />
              <div className="live-conference-notes-title-row">
                <span className="live-conference-notes-title">📝 Catatan & Poin Pitchdeck</span>
                <button
                  type="button"
                  className="live-conference-notes-close"
                  onClick={() => setShowNotesSheet(false)}
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="live-conference-notes-body">
              {notes ? (
                <p className="live-conference-notes-text">{notes}</p>
              ) : (
                <p className="live-conference-notes-empty">Belum ada catatan materi untuk sesi ini.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Slide-up Bottom Sheet: Q&A Area ──────────────────────── */}
      <div className={`teams-drawer-backdrop ${isQaDrawerOpen ? "open" : ""}`} onClick={() => setIsQaDrawerOpen(false)}>
        <div className="teams-qa-drawer" onClick={(e) => e.stopPropagation()}>
          <div className="teams-drawer-drag-handle" />

          <div className="teams-drawer-header">
            <div className="teams-drawer-title-group">
              <h3 className="teams-drawer-title">Q&A Sesi Tanya Jawab</h3>
              <span className="teams-drawer-qna-tag">Live Q&A</span>
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

          {qaError && <p className="teams-qa-error">{qaError}</p>}
          <div className="teams-drawer-questions-list">
            {questions.length === 0 && aiQuestion && (
              <div className="teams-drawer-q-card teams-drawer-q-card--ai">
                <div className="teams-drawer-q-meta">
                  <div className="teams-q-author-wrap">
                    <span className="teams-q-avatar teams-q-avatar--ai">🤖</span>
                    <span className="teams-q-author-name">AI Icebreaker</span>
                  </div>
                </div>
                <p className="teams-q-content">{aiQuestion}</p>
              </div>
            )}
            {questions.length === 0 && !aiQuestion && !qaError && (
              <p className="teams-qa-empty">Belum ada pertanyaan. Kirimkan pertanyaan pertamamu ke presenter!</p>
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

      {/* ── Exit Confirmation Modal ──────────────────────────────── */}
      {showExitModal && (
        <LessonExitModal
          title={isBroadcaster ? "Selesaikan Sesi Presentasi?" : "Keluar dari Sesi Live?"}
          desc={
            isBroadcaster
              ? "Sesi live akan diakhiri dan rekaman audio kamu akan langsung dianalisis oleh AI."
              : "Kamu dapat bergabung kembali ke sesi ini selama host masih menyiarkan live."
          }
          stayText={isBroadcaster ? "Lanjutkan Presentasi" : "Tetap Menonton"}
          leaveText={isBroadcaster ? "Selesaikan Sesi" : "Keluar"}
          onCancel={() => setShowExitModal(false)}
          onConfirm={handleConfirmExit}
        />
      )}

      {/* ── Peer Rating Modal for Viewers ────────────────────────── */}
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
