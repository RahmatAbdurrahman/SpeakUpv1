import React, { useEffect, useRef, useState } from "react";
import "./SimulasiScreen.css";
import arrowLeftIcon from "../assets/pages_assets/questionnaires/arrow_left.svg";
import iconNavHome from "../assets/pages_assets/bottom-nav-icons/Home.svg";
import iconNavMic from "../assets/pages_assets/bottom-nav-icons/Mic.svg";
import iconNavUser from "../assets/pages_assets/bottom-nav-icons/User.svg";
import iconNavGroup from "../assets/pages_assets/practice/icon_group.svg";
import imgAnalysisHero from "../assets/pages_assets/ai_analysis/analysis_hero.png";
import imgSpontan from "../assets/pages_assets/simulasi/Image-Spontan.png";
import imgPresentasi from "../assets/pages_assets/simulasi/Image-Presentasi.png";
import imgInterview from "../assets/pages_assets/simulasi/Image-Interview.png";
import videoBlinking from "../assets/pages_assets/simulasi/Blinking.webm";
import videoSpeaking from "../assets/pages_assets/simulasi/Speaking.webm";
import iconMic from "../assets/icons/Mic-Icon.svg";
import iconCam from "../assets/icons/Camcorder-Icon.svg";
import iconPhone from "../assets/icons/Phone-Icon.svg";
import iconRepeat from "../assets/icons/Repeat-Icon.svg";
import iconArgument from "../assets/pages_assets/ai_analysis/Icons/Argument-Icon.svg";
import iconRelevance from "../assets/pages_assets/ai_analysis/Icons/Relevance-Icon.svg";
import iconSpeed from "../assets/pages_assets/ai_analysis/Icons/Speed-Icon.svg";
import iconQuote from "../assets/pages_assets/ai_analysis/Icons/Quote-Icon.svg";
import iconMouth from "../assets/pages_assets/ai_analysis/Icons/Mouth-Icon.svg";
import iconFlash from "../assets/pages_assets/ai_analysis/Icons/Flash-Icon.svg";
import iconAI from "../assets/pages_assets/ai_analysis/Icons/AI.svg";
import iconDice from "../assets/icons/dice.svg";
import iconDownload from "../assets/icons/Download.svg";
import videoGainXP from "../assets/pages_assets/gain_xp/Video-Gain-XP.webm";
import { useGainXpPreloader, getPreloadedVideoSrc } from "../lib/assetPreloader";
import { playXpTickSound, playXpCompleteSound, playGainXpIntroSound, playScoreRevealSound } from "../lib/soundEffects";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import animaBotLottie from "../assets/lotties/AnimaBot.lottie";
import SessionLoadingScreen from "./SessionLoadingScreen";
import AnalysisProgress from "./AnalysisProgress";
import SlideViewer from "./SlideViewer";
import TranscriptCard from "./TranscriptCard";
import LessonExitModal from "./LessonExitModal";
import { exportAnalysisToPDF } from "../lib/pdfExport";
import { playQuestionTTS, stopQuestionTTS } from "../lib/interviewTTS";
import { supabase } from "../lib/supabaseClient";
import {
  SCENARIOS,
  createSimulation,
  markSimulationCompleted,
  validateMaterialFile,
  uploadMaterial,
  extractPdfTextClientSide,
  generateNotes,
  analyzeCv,
  getMaterialSignedUrl,
  saveManualMaterialText,
  getRandomSpontaneousTopic,
  generateSpontaneousTopicAI,
  createSessionRow,
  updateSessionAudio,
  uploadSessionAudio,
  runAnalysis,
  fetchSessionResults,
  fetchGeneratedQuestions,
  friendlySimulasiError,
  INTERVIEW_OBJECTIVES,
  INTERVIEW_QUESTIONS_BY_OBJECTIVE,
  generateInterviewQuestionsAI,
} from "../lib/simulasi";
import { useUserProgress } from "../context/UserProgressContext";
import { SimulasiSkeleton } from "./SkeletonLoader";

const DEFAULT_INTERVIEW_QUESTIONS = [
  "Can you tell about future goal?",
  "What is your greatest strength and how will it help in this role?",
  "Tell me about a challenging situation you faced and how you overcame it.",
  "Why are you interested in joining our team and this position?",
];

const SCENARIO_IMAGES = {
  spontan: imgSpontan,
  presentasi: imgPresentasi,
  interview: imgInterview,
};

function ScenarioIcon({ id }) {
  const imgSrc = SCENARIO_IMAGES[id] || imgSpontan;
  return (
    <img
      src={imgSrc}
      alt=""
      className="simulasi-scenario-img"
    />
  );
}

// ─── Back Arrow Icon ─────────────────────────────────────────────────────────
function IconArrowLeft() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M15 18L9 12L15 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Topic step (Spontan only — "Daily Spontaneous Speak") ────────────────
function TopicStep({ topics, loading, error, onBack, onStart, onShuffle, shuffling }) {
  return (
    <div className="simulasi-topic-screen">
      <header className="simulasi-recording-topbar">
        <button type="button" className="simulasi-back-btn" onClick={onBack} aria-label="Kembali">
          <img src={arrowLeftIcon} alt="" className="simulasi-back-icon" />
        </button>
        <span className="simulasi-recording-scenario">Spontaneous</span>
      </header>

      <div className="simulasi-topic-body">
        {loading && <p className="simulasi-hint-text">Menyiapkan topik...</p>}
        {error && <p className="simulasi-error-banner">{error}</p>}
        {!loading && topics.length > 0 && (
          <div className="simulasi-topic-content">
            <p className="simulasi-topic-label">Topik Kamu Hari Ini</p>
            {shuffling ? (
              <div className="simulasi-topic-lottie-wrap">
                <DotLottieReact
                  src={animaBotLottie}
                  loop
                  autoplay
                  className="simulasi-topic-lottie"
                />
              </div>
            ) : (
              topics.map((t, i) => (
                <p key={i} className="simulasi-topic-text">
                  “{t}”
                </p>
              ))
            )}
            <button
              type="button"
              className="simulasi-topic-shuffle-btn"
              onClick={onShuffle}
              disabled={shuffling}
            >
              <img src={iconDice} alt="" className="simulasi-topic-shuffle-icon" />
              <span>{shuffling ? "Mengacak..." : "Ganti Topik Lain"}</span>
            </button>
          </div>
        )}
      </div>

      <div className="simulasi-prep-cta">
        <button type="button" className="btn-simulasi-lanjut" onClick={onStart} disabled={loading || shuffling}>
          Mulai Bicara
        </button>
      </div>
    </div>
  );
}

// ─── Upload step (Presentasi / Interview — PDF or CV) ──────────────────────
// Exported: LivePresentationScreen reuses this verbatim for its own materi
// upload step, since "logic Presentasi" now also powers Live Presentation.
export function UploadStep({ scenario, uploading, error, onBack, onSubmit }) {
  const [file, setFile] = useState(null);
  const [interviewObjective, setInterviewObjective] = useState("kerja");
  const [localError, setLocalError] = useState("");

  const isInterview = scenario.kategori === "interview";

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const problem = validateMaterialFile(f);
    if (problem) {
      setLocalError(problem);
      setFile(null);
      return;
    }
    setLocalError("");
    setFile(f);
  };

  return (
    <div className="simulasi-upload-screen">
      <header className="simulasi-upload-topbar">
        <button type="button" className="simulasi-back-btn" onClick={onBack} aria-label="Kembali">
          <img src={arrowLeftIcon} alt="" className="simulasi-back-icon" />
        </button>
        <span className="simulasi-upload-topbar-title">{scenario.title}</span>
      </header>

      <div className="simulasi-upload-scroll-body">
        <p className="simulasi-upload-label">{scenario.uploadLabel}</p>
        <p className="simulasi-hint-text">Format PDF, maksimal 10MB.</p>

        <label className="simulasi-file-drop">
          <input type="file" accept="application/pdf" onChange={handleFileChange} hidden />
          {file ? `📄 ${file.name}` : "Pilih file PDF"}
        </label>

        {/* ── Interview Target Option Selector ── */}
        {isInterview && (
          <div className="simulasi-interview-objective-section">
            <label className="simulasi-interview-objective-label">
              🎯 Mau simulasi interview apa?
            </label>
            <p className="simulasi-interview-objective-hint">
              Pilih tujuan agar AI pewawancara menyesuaikan pertanyaan & evaluasi secara akurat:
            </p>

            <div className="simulasi-interview-objective-grid">
              {INTERVIEW_OBJECTIVES.map((obj) => {
                const isSelected = interviewObjective === obj.id;
                return (
                  <div
                    key={obj.id}
                    className={`simulasi-interview-objective-card ${isSelected ? "active" : ""}`}
                    onClick={() => setInterviewObjective(obj.id)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="simulasi-objective-card-header">
                      <span className="simulasi-objective-icon">{obj.icon}</span>
                      <span className="simulasi-objective-title">{obj.label}</span>
                      <span className={`simulasi-objective-circle ${isSelected ? "checked" : ""}`}>
                        {isSelected && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path
                              d="M2.5 6.2L4.8 8.5L9.5 3.8"
                              stroke="#FFFFFF"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </span>
                    </div>
                    <p className="simulasi-objective-desc">{obj.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {(localError || error) && <p className="simulasi-error-banner">{localError || error}</p>}
      </div>

      <div className="simulasi-upload-bottom-dock">
        <button
          type="button"
          className="btn-simulasi-lanjut"
          disabled={!file || uploading}
          onClick={() => onSubmit({ file, interviewObjective })}
        >
          {uploading ? "Mengunggah & Menganalisis..." : "Lanjut"}
        </button>
      </div>
    </div>
  );
}

// ─── Manual notes fallback (edge case 11.1 — PDF gagal diparse) ───────────
// Exported for the same reason as UploadStep above (edge case 11.1 fallback).
export function ManualNotesStep({ scenario, saving, onBack, onSubmit }) {
  const [text, setText] = useState("");
  const [interviewObjective, setInterviewObjective] = useState("kerja");
  const isInterview = scenario.kategori === "interview";

  return (
    <div className="simulasi-upload-screen">
      <header className="simulasi-upload-topbar">
        <button type="button" className="simulasi-back-btn" onClick={onBack} aria-label="Kembali">
          <img src={arrowLeftIcon} alt="" className="simulasi-back-icon" />
        </button>
        <span className="simulasi-upload-topbar-title">{scenario.title}</span>
      </header>

      <div className="simulasi-upload-scroll-body">
        <p className="simulasi-upload-label">
          File-nya gagal dibaca otomatis (mungkin hasil scan gambar). Tulis ringkasannya manual ya, biar sesi tetap
          bisa lanjut.
        </p>
        <textarea
          className="simulasi-manual-textarea"
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            isInterview
              ? "Ringkas pengalaman, skill utama, atau motivasi studi/karir kamu..."
              : "Ringkas poin-poin utama materi kamu..."
          }
        />

        {isInterview && (
          <div className="simulasi-interview-objective-section" style={{ marginTop: "16px" }}>
            <label className="simulasi-interview-objective-label">
              🎯 Mau simulasi interview apa?
            </label>
            <div className="simulasi-interview-objective-grid">
              {INTERVIEW_OBJECTIVES.map((obj) => {
                const isSelected = interviewObjective === obj.id;
                return (
                  <div
                    key={obj.id}
                    className={`simulasi-interview-objective-card ${isSelected ? "active" : ""}`}
                    onClick={() => setInterviewObjective(obj.id)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="simulasi-objective-card-header">
                      <span className="simulasi-objective-icon">{obj.icon}</span>
                      <span className="simulasi-objective-title">{obj.label}</span>
                      <span className={`simulasi-objective-circle ${isSelected ? "checked" : ""}`}>
                        {isSelected && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path
                              d="M2.5 6.2L4.8 8.5L9.5 3.8"
                              stroke="#FFFFFF"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </span>
                    </div>
                    <p className="simulasi-objective-desc">{obj.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="simulasi-upload-bottom-dock">
        <button
          type="button"
          className="btn-simulasi-lanjut"
          disabled={!text.trim() || saving}
          onClick={() => onSubmit({ text: text.trim(), interviewObjective })}
        >
          {saving ? "Menyimpan..." : "Lanjut"}
        </button>
      </div>
    </div>
  );
}

// ─── Prep step — front-camera self-preview + notes preview + mic/cam entry ─
// Was a downloadable 3D environment (.glb, ~30MB+) before — replaced with a
// live front-camera preview (same getUserMedia pattern as RecordingStep) so
// there's nothing heavy to wait for, and the user can check their framing
// before recording, same as the Spontan scenario already does.
// Exported for the same reason as UploadStep above.
export function PrepStep({ scenario, notes, error, questionsLoading = false, startLabel = "Mulai Simulasi", onBack, onStart }) {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [camError, setCamError] = useState(null);
  const [notesVisible, setNotesVisible] = useState(true);

  useEffect(() => {
    let active = true;
    let currentStream = null;

    if (navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true })
        .then((s) => {
          if (!active) {
            s.getTracks().forEach((t) => t.stop());
            return;
          }
          currentStream = s;
          setStream(s);
        })
        .catch((err) => setCamError(err));
    } else {
      setCamError(new Error("not_supported"));
    }

    return () => {
      active = false;
      if (currentStream) currentStream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream]);

  return (
    <div className="simulasi-prep-screen">
      <header className="simulasi-recording-topbar">
        <button type="button" className="simulasi-back-btn" onClick={onBack} aria-label="Kembali">
          <img src={arrowLeftIcon} alt="" className="simulasi-back-icon" />
        </button>
        <span className="simulasi-recording-scenario">{scenario.title}</span>
      </header>

      {error && <p className="simulasi-error-banner">{error}</p>}

      <div className="simulasi-camera-frame">
        <video ref={videoRef} autoPlay playsInline muted className="simulasi-camera-video" />
        {!stream && !camError && (
          <div className="simulasi-camera-overlay">
            <div className="simulasi-camera-spinner" />
            <p>Menghubungkan kamera...</p>
          </div>
        )}
        {camError && (
          <div className="simulasi-camera-overlay">
            <p>Kamera/mic belum bisa diakses. Izinkan akses lalu coba lagi.</p>
          </div>
        )}
      </div>

      {scenario.kategori !== "interview" && notes && (
        <div className="simulasi-notes-preview">
          <button
            type="button"
            className="simulasi-notes-toggle"
            onClick={() => setNotesVisible((v) => !v)}
            aria-expanded={notesVisible}
          >
            <span className="simulasi-notes-heading">Notes kamu</span>
            <span className="simulasi-notes-toggle-label">{notesVisible ? "Sembunyikan" : "Lihat"}</span>
          </button>
          {notesVisible && <p className="simulasi-notes-text">{notes}</p>}
        </div>
      )}

      <p className="simulasi-recording-hint">
        {questionsLoading
          ? "Pewawancara lagi menyiapkan pertanyaan dari CV kamu. Sambil nunggu, cek posisi kamera & pencahayaan."
          : "Cek posisi kamera & pencahayaan kamu, lalu mulai kalau sudah siap."}
      </p>

      <div className="simulasi-prep-cta">
        <button type="button" className="btn-simulasi-lanjut" onClick={onStart} disabled={questionsLoading}>
          {questionsLoading ? "Menyiapkan pertanyaan..." : startLabel}
        </button>
      </div>
    </div>
  );
}

// Below this, an ended recording is treated as "belum selesai" rather than a
// real finish — accidental/rushed stops shouldn't get scored the same as a
// deliberate one. Tune here if it turns out to be too strict/lenient.
const MIN_RECORDING_SECONDS = 15;
// Mic energy above this (0-255 byte-frequency average) counts as "someone
// said something" — same heuristic LessonModul7Screen's useSpeechCapture uses.
const SILENCE_THRESHOLD = 12;

// ─── Popup shown when a recording is stopped too early or in total silence.
// Pauses (never stops) the recorder underneath so "Lanjutkan"/"Ulangi" can
// pick back up without a fresh mic-permission prompt. ─────────────────────
function RecordingGateModal({ variant, secondsElapsed, onResume, onRestart, onAbandon }) {
  if (variant === "silent") {
    return (
      <div className="simulasi-gate-backdrop">
        <div className="simulasi-gate-sheet">
          <h2 className="simulasi-gate-title">Sepertinya kamu belum ngomong sama sekali</h2>
          <p className="simulasi-gate-desc">
            Mikrofon nggak mendeteksi suara selama rekaman ini, jadi belum bisa dianalisis. Coba ulangi dan pastikan mikrofon aktif.
          </p>
          <div className="simulasi-gate-actions">
            <button type="button" className="btn-simulasi-lanjut" onClick={onRestart}>
              Ulangi Rekaman
            </button>
            <button type="button" className="btn-simulasi-gate-ghost" onClick={onAbandon}>
              Batal, pilih latihan lain
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="simulasi-gate-backdrop">
      <div className="simulasi-gate-sheet">
        <h2 className="simulasi-gate-title">Sesi kamu belum selesai</h2>
        <p className="simulasi-gate-desc">
          Baru {secondsElapsed} detik terekam — hasil analisisnya bisa kurang akurat kalau dipotong sekarang. Mau gimana?
        </p>
        <div className="simulasi-gate-actions">
          <button type="button" className="btn-simulasi-lanjut" onClick={onResume}>
            Lanjutkan Rekaman
          </button>
          <button type="button" className="btn-simulasi-gate-secondary" onClick={onRestart}>
            Ulangi dari Awal
          </button>
          <button type="button" className="btn-simulasi-gate-ghost" onClick={onAbandon}>
            Keluar Sesi
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Real-time Audio-Reactive Voice Bars driven by Microphone ─────────────────
function InterviewVoiceWave({ levels = [0.18, 0.18, 0.18, 0.18, 0.18] }) {
  const baseHeights = [24, 38, 48, 38, 24];
  return (
    <div className="simulasi-interview-wave" aria-hidden="true">
      {levels.map((level, i) => (
        <span
          key={i}
          className="simulasi-interview-wave-bar"
          style={{
            height: `${Math.max(8, Math.round(baseHeights[i] * level))}px`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Interview Call View (Interactive Avatar & Audio Wave UI) ────────────────
function InterviewCallView({
  scenario,
  questions = [],
  qIndex,
  setQIndex,
  seconds,
  formatTime,
  isRecording,
  onFinish,
  onBack,
  stream,
  camError,
  analyserNode,
}) {
  const videoBlinkingRef = useRef(null);
  const videoSpeakingRef = useRef(null);
  const blinkTimeoutRef = useRef(null);
  const ttsTimeoutRef = useRef(null);
  const speakingDelayTimeoutRef = useRef(null);

  const [isInterviewerSpeaking, setIsInterviewerSpeaking] = useState(false);
  const [subtitle, setSubtitle] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [audioLevels, setAudioLevels] = useState([0.18, 0.18, 0.18, 0.18, 0.18]);
  const [videoAspect, setVideoAspect] = useState(null);
  const [showFullQuestion, setShowFullQuestion] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false);

  const activeQuestions = questions.length > 0 ? questions : DEFAULT_INTERVIEW_QUESTIONS;
  const currentQuestion = activeQuestions[qIndex] || activeQuestions[0] || "Can you tell about future goal?";
  const isLastQuestion = qIndex >= activeQuestions.length - 1;

  // Audio level & 5-band frequency monitoring for reactive VoiceWave
  useEffect(() => {
    if (!analyserNode) return undefined;
    let rafId;
    const data = new Uint8Array(analyserNode.frequencyBinCount);
    let lastUpdate = 0;

    const checkLevel = (now) => {
      analyserNode.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      const avg = sum / data.length;
      const normalized = Math.min(1, Math.max(0, (avg - 6) / 45));
      setMicLevel(normalized);

      // Smooth 30fps update for 5-band voice bars matching Lesson 6 Modul 7
      if (now - lastUpdate > 30) {
        lastUpdate = now;
        const b1 = (data[2] || 0) / 255;
        const b2 = (data[6] || 0) / 255;
        const b3 = (data[12] || 0) / 255;
        const b4 = (data[20] || 0) / 255;
        const b5 = (data[30] || 0) / 255;
        setAudioLevels([
          Math.max(0.18, Math.min(1.0, b1 * 2.0 + 0.1)),
          Math.max(0.18, Math.min(1.0, b2 * 2.2 + 0.1)),
          Math.max(0.18, Math.min(1.0, b3 * 2.4 + 0.1)),
          Math.max(0.18, Math.min(1.0, b4 * 2.2 + 0.1)),
          Math.max(0.18, Math.min(1.0, b5 * 2.0 + 0.1)),
        ]);
      }

      rafId = requestAnimationFrame(checkLevel);
    };

    rafId = requestAnimationFrame(checkLevel);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [analyserNode]);

  const handleLoadedMetadata = (e) => {
    if (e.target.videoWidth && e.target.videoHeight) {
      setVideoAspect(e.target.videoWidth / e.target.videoHeight);
    }
  };

  // Toggle mic mute
  const toggleMute = () => {
    if (!stream) return;
    const audioTracks = stream.getAudioTracks();
    const nextMuted = !isMuted;
    audioTracks.forEach((track) => {
      track.enabled = !nextMuted;
    });
    setIsMuted(nextMuted);
  };

  // Schedule natural random blinking
  const scheduleNextBlink = () => {
    if (blinkTimeoutRef.current) clearTimeout(blinkTimeoutRef.current);
    // Random delay between 2000ms (2s) and 5200ms (5.2s)
    const randomDelay = 2000 + Math.random() * 3200;
    blinkTimeoutRef.current = setTimeout(() => {
      const vid = videoBlinkingRef.current;
      if (vid) {
        vid.currentTime = 0;
        vid.play().catch(() => {});
      }
    }, randomDelay);
  };

  // Handle when 1 cycle of blinking video ends
  const handleBlinkEnded = () => {
    scheduleNextBlink();
  };

  const endSpeaking = () => {
    if (speakingDelayTimeoutRef.current) clearTimeout(speakingDelayTimeoutRef.current);
    if (ttsTimeoutRef.current) clearTimeout(ttsTimeoutRef.current);
    stopQuestionTTS();
    setIsInterviewerSpeaking(false);
    if (videoSpeakingRef.current) {
      videoSpeakingRef.current.pause();
    }
    if (videoBlinkingRef.current) {
      videoBlinkingRef.current.currentTime = 0;
      videoBlinkingRef.current.play().catch(() => {});
      scheduleNextBlink();
    }
  };

  // Trigger question speech (Speaking.webm + Real-Time Male Voice TTS + Subtitle)
  const speakQuestion = (text) => {
    if (blinkTimeoutRef.current) clearTimeout(blinkTimeoutRef.current);
    if (ttsTimeoutRef.current) clearTimeout(ttsTimeoutRef.current);
    if (speakingDelayTimeoutRef.current) clearTimeout(speakingDelayTimeoutRef.current);

    setIsAnswering(false);
    setSubtitle(text);

    const activateSpeakingVideo = () => {
      setIsInterviewerSpeaking(true);
      if (videoSpeakingRef.current) {
        videoSpeakingRef.current.currentTime = 0;
        videoSpeakingRef.current.play().catch(() => {});
      }
      if (videoBlinkingRef.current) {
        videoBlinkingRef.current.pause();
      }
    };

    const isFirstQuestion = qIndex === 0;
    const delayMs = isFirstQuestion ? 3000 : 0;

    if (delayMs > 0) {
      // 3-second delay only on the first question for avatar speaking state while TTS initializes
      setIsInterviewerSpeaking(false);
      if (videoBlinkingRef.current) {
        videoBlinkingRef.current.play().catch(() => {});
      }

      speakingDelayTimeoutRef.current = setTimeout(() => {
        activateSpeakingVideo();
      }, delayMs);
    } else {
      // Subsequent questions speak immediately without delay
      activateSpeakingVideo();
    }

    // Play real-time male voice TTS (ElevenLabs / Edge TTS fallback)
    playQuestionTTS(text, {
      onStart: () => {
        if (!isFirstQuestion || !speakingDelayTimeoutRef.current) {
          activateSpeakingVideo();
        }
      },
      onEnd: () => {
        endSpeaking();
      },
    });

    // Safety fallback duration based on sentence length
    const fallbackDuration = Math.min(24000, Math.max(9000, delayMs + text.length * 120));
    ttsTimeoutRef.current = setTimeout(() => {
      endSpeaking();
    }, fallbackDuration);
  };

  // Trigger speak whenever question index or question changes
  useEffect(() => {
    // Delay 250ms on mount to ensure media streams and browser audio context are stable
    const timer = setTimeout(() => {
      speakQuestion(currentQuestion);
    }, 250);

    return () => {
      clearTimeout(timer);
      if (speakingDelayTimeoutRef.current) clearTimeout(speakingDelayTimeoutRef.current);
      if (blinkTimeoutRef.current) clearTimeout(blinkTimeoutRef.current);
      if (ttsTimeoutRef.current) clearTimeout(ttsTimeoutRef.current);
      stopQuestionTTS();
    };
  }, [qIndex, currentQuestion]);

  // Ensure TTS audio is immediately destroyed when the interview component unmounts
  useEffect(() => {
    return () => {
      if (speakingDelayTimeoutRef.current) clearTimeout(speakingDelayTimeoutRef.current);
      stopQuestionTTS();
    };
  }, []);

  const handleStartAnswering = () => {
    endSpeaking();
    setIsAnswering(true);
    if (stream) {
      stream.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });
      setIsMuted(false);
    }
  };

  const handleFinishAnswering = () => {
    if (isLastQuestion) {
      onFinish();
    } else {
      setIsAnswering(false);
      setQIndex((prev) => prev + 1);
    }
  };

  return (
    <div className="simulasi-interview-screen">
      {/* Top Bar: Title + Call Timer */}
      <header className="simulasi-interview-topbar">
        <div className="simulasi-interview-topbar-left">
          <button
            type="button"
            className="simulasi-back-btn"
            onClick={() => setShowExitModal(true)}
            aria-label="Kembali"
          >
            <img src={arrowLeftIcon} alt="" className="simulasi-back-icon" />
          </button>
          <span className="simulasi-interview-title">Interview</span>
        </div>
        <span className="simulasi-interview-timer">{formatTime(seconds)}</span>
      </header>

      {/* Interviewer Video Card */}
      <div className="simulasi-interview-video-card">
        {/* Blinking video (idle / listening with natural random blink delay) */}
        <video
          ref={videoBlinkingRef}
          src={videoBlinking}
          playsInline
          muted
          className={`simulasi-avatar-video ${!isInterviewerSpeaking ? "is-active" : "is-hidden"}`}
          onEnded={handleBlinkEnded}
        />

        {/* Speaking video (loops continuously while TTS is active) */}
        <video
          ref={videoSpeakingRef}
          src={videoSpeaking}
          loop
          playsInline
          muted
          className={`simulasi-avatar-video ${isInterviewerSpeaking ? "is-active" : "is-hidden"}`}
          onEnded={() => {
            if (isInterviewerSpeaking && videoSpeakingRef.current) {
              videoSpeakingRef.current.currentTime = 0;
              videoSpeakingRef.current.play().catch(() => {});
            }
          }}
        />

        {/* Bottom Subtitle Badge with Expand Button */}
        <div className="simulasi-avatar-subtitle-pill">
          <span className="simulasi-avatar-subtitle-text">
            {isInterviewerSpeaking ? subtitle : currentQuestion}
          </span>
          <button
            type="button"
            className="simulasi-subtitle-expand-btn"
            onClick={() => setShowFullQuestion(true)}
            title="Lihat Pertanyaan Lengkap"
            aria-label="Lihat Pertanyaan Lengkap"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 3H21V9M21 3L14 10M9 21H3V15M3 21L10 14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Center Section: Reactive Voice Wave & Turn-Taking Answer Button */}
      <div className="simulasi-interview-center">
        <InterviewVoiceWave levels={isAnswering ? audioLevels : [0.18, 0.18, 0.18, 0.18, 0.18]} />

        {!isAnswering ? (
          <button
            type="button"
            className="simulasi-answer-action-btn btn--start-answering"
            onClick={handleStartAnswering}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C10.34 2 9 3.34 9 5V11C9 12.66 10.34 14 12 14C13.66 14 15 12.66 15 11V5C15 3.34 13.66 2 12 2Z" fill="currentColor" />
              <path d="M19 10V11C19 14.53 16.39 17.44 13 17.93V21H11V17.93C7.61 17.44 5 14.53 5 11V10H7V11C7 13.76 9.24 16 12 16C14.76 16 17 13.76 17 11V10H19Z" fill="currentColor" />
            </svg>
            <span>Jawab Pertanyaan</span>
          </button>
        ) : (
          <button
            type="button"
            className="simulasi-answer-action-btn btn--finish-answering"
            onClick={handleFinishAnswering}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 13L9 17L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>{isLastQuestion ? "Selesaikan Wawancara" : "Selesai Menjawab"}</span>
          </button>
        )}
      </div>

      {/* Full Question Container / Bottom Sheet Modal */}
      {showFullQuestion && (
        <div className="simulasi-question-modal-backdrop" onClick={() => setShowFullQuestion(false)}>
          <div className="simulasi-question-modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="simulasi-question-modal-header">
              <span className="simulasi-question-modal-badge">
                Pertanyaan {qIndex + 1} dari {activeQuestions.length}
              </span>
              <button
                type="button"
                className="simulasi-question-modal-close"
                onClick={() => setShowFullQuestion(false)}
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>
            <p className="simulasi-question-modal-text">{currentQuestion}</p>
            <button
              type="button"
              className="btn-simulasi-lanjut simulasi-question-modal-btn"
              onClick={() => setShowFullQuestion(false)}
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Exit Confirmation Modal */}
      {showExitModal && (
        <LessonExitModal
          title="Yakin ingin keluar?"
          desc="Kemajuanmu pada sesi simulasi wawancara ini tidak akan tersimpan jika kamu keluar sekarang."
          stayText="Lanjutkan Wawancara"
          leaveText="Keluar Simulasi"
          onCancel={() => setShowExitModal(false)}
          onConfirm={() => {
            setShowExitModal(false);
            endSpeaking();
            stopQuestionTTS();
            if (onBack) onBack();
          }}
        />
      )}

      {/* Bottom Floating Control Dock */}
      <div className="simulasi-call-dock">
        {/* Repeat Question button */}
        <button
          type="button"
          className="simulasi-call-btn simulasi-call-btn--repeat"
          onClick={() => speakQuestion(currentQuestion)}
          title="Ulangi Pertanyaan"
          aria-label="Ulangi Pertanyaan"
        >
          <img src={iconRepeat} alt="Ulangi Pertanyaan" className="simulasi-call-btn-icon" />
        </button>

        {/* End Call / Hangup button (Red) */}
        <button
          type="button"
          className="simulasi-call-btn simulasi-call-btn--hangup"
          onClick={() => {
            endSpeaking();
            stopQuestionTTS();
            onFinish();
          }}
          title="Tutup & Selesaikan Sesi"
          aria-label="Tutup & Selesaikan Sesi"
        >
          <img src={iconPhone} alt="Tutup Panggilan" className="simulasi-call-hangup-icon" />
        </button>
      </div>
    </div>
  );
}

// ─── Presentation Conference View (Video Conference UI with Draggable & Swappable PiP) ───
function PresentationConferenceView({
  scenario,
  cheatSheet,
  materialPdfPath,
  stream,
  camError,
  seconds,
  formatTime,
  isRecording,
  onFinish,
  onBack,
}) {
  const containerRef = useRef(null);
  const pipRef = useRef(null);
  const mainVideoRef = useRef(null);
  const pipVideoRef = useRef(null);

  const [mainView, setMainView] = useState("slide"); // "slide" | "camera"
  const [slidePage, setSlidePage] = useState(1);
  const [totalSlidePages, setTotalSlidePages] = useState(1);
  const [slideUrl, setSlideUrl] = useState(null);
  const [slideLoading, setSlideLoading] = useState(false);
  const [slideError, setSlideError] = useState("");

  const [showNotesSheet, setShowNotesSheet] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);

  // Helper to dynamically get container and PiP dimensions
  const getContainerMetrics = () => {
    const container = containerRef.current;
    const pip = pipRef.current;
    const width = container ? container.clientWidth : window.innerWidth;
    const height = container ? container.clientHeight : window.innerHeight;
    const pipWidth = pip ? pip.offsetWidth : 110;
    const pipHeight = pip ? pip.offsetHeight : 150;
    const minX = 14;
    const maxX = Math.max(minX, width - pipWidth - 14);
    const minY = 96;
    const maxY = Math.max(minY, height - pipHeight - 115);
    return { width, height, pipWidth, pipHeight, minX, maxX, minY, maxY };
  };

  // Draggable PiP State with Magnetic Edge Snap
  const [pipPos, setPipPos] = useState({ x: 240, y: 96, side: "right" });
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ startX: 0, startY: 0, initPipX: 0, initPipY: 0 });
  const hasMovedRef = useRef(false);
  const pipPosRef = useRef({ x: 240, y: 96, side: "right" });

  useEffect(() => {
    pipPosRef.current = pipPos;
  }, [pipPos]);

  // Set default initial position to Top-Right flush
  useEffect(() => {
    const timer = setTimeout(() => {
      const { maxX, minY } = getContainerMetrics();
      setPipPos({ x: maxX, y: minY, side: "right" });
    }, 40);
    return () => clearTimeout(timer);
  }, []);

  // Handle responsive resizing / rotation
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

  // Fetch signed URL for presentation PDF
  useEffect(() => {
    if (!materialPdfPath) return;
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

  // Connect camera stream to active video element
  useEffect(() => {
    if (mainView === "camera" && mainVideoRef.current && stream) {
      mainVideoRef.current.srcObject = stream;
    } else if (mainView === "slide" && pipVideoRef.current && stream) {
      pipVideoRef.current.srcObject = stream;
    }
  }, [stream, mainView, isCamOff]);

  // Toggle Mute Audio
  const toggleMute = () => {
    if (!stream) return;
    const audioTracks = stream.getAudioTracks();
    const nextMuted = !isMuted;
    audioTracks.forEach((t) => {
      t.enabled = !nextMuted;
    });
    setIsMuted(nextMuted);
  };

  // Toggle Video Cam
  const toggleCam = () => {
    if (!stream) return;
    const videoTracks = stream.getVideoTracks();
    const nextCamOff = !isCamOff;
    videoTracks.forEach((t) => {
      t.enabled = !nextCamOff;
    });
    setIsCamOff(nextCamOff);
  };

  // Swap Main View & PiP View
  const handleSwapView = () => {
    setMainView((prev) => (prev === "slide" ? "camera" : "slide"));
  };

  // Pointer / Touch Dragging Handlers with Magnetic Edge Snapping
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

    // Magnetic snap to nearest viewport edge (Left vs Right rail)
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
      // Tap / Click without moving -> toggle swap
      handleSwapView();
    }
  };

  const atFirst = slidePage <= 1;
  const atLast = slidePage >= totalSlidePages;

  return (
    <div className="simulasi-conference-screen" ref={containerRef}>
      {/* Top Bar: Conference Header with Timer */}
      <header className="simulasi-conference-topbar">
        <div className="simulasi-conference-topbar-left">
          <button
            type="button"
            className="simulasi-conference-back-btn"
            onClick={() => setShowExitModal(true)}
            aria-label="Keluar Presentasi"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div className="simulasi-conference-title-group">
            <span className="simulasi-conference-title">{scenario?.title || "Presentasi"}</span>
            <span className="simulasi-conference-sub">Mode Presentasi Interaktif</span>
          </div>
        </div>

        <div className="simulasi-conference-topbar-right">
          <div className="simulasi-conference-timer-badge">
            <span className="simulasi-conference-timer-dot" />
            <span className="simulasi-conference-timer-text">{formatTime(seconds)}</span>
          </div>
        </div>
      </header>

      {/* Main Stage (Full-bleed borderless display) */}
      <div className="simulasi-conference-main-stage">
        {mainView === "slide" ? (
          <div className="simulasi-conference-slide-wrapper">
            {slideError ? (
              <div className="simulasi-conference-stage-msg">
                <p>{slideError}</p>
                {cheatSheet && <p className="simulasi-conference-fallback-notes">{cheatSheet}</p>}
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
              <div className="simulasi-conference-stage-msg">
                <div className="simulasi-camera-spinner" />
                <p>Memuat slide presentasi...</p>
              </div>
            ) : cheatSheet ? (
              <div className="simulasi-conference-text-slide">
                <div className="simulasi-conference-text-slide-inner">
                  <span className="simulasi-conference-text-badge">Materi Presentasi</span>
                  <p>{cheatSheet}</p>
                </div>
              </div>
            ) : (
              <div className="simulasi-conference-stage-msg">
                <p>Slide siap dipresentasikan</p>
              </div>
            )}
          </div>
        ) : (
          <div className="simulasi-conference-camera-wrapper">
            {!isCamOff && stream ? (
              <video
                ref={mainVideoRef}
                autoPlay
                playsInline
                muted
                className="simulasi-conference-full-video"
              />
            ) : (
              <div className="simulasi-conference-cam-off-placeholder">
                <div className="simulasi-conference-avatar-circle">
                  <span>👤</span>
                </div>
                <p>Kamera Dinonaktifkan</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Draggable & Swappable PiP Box */}
      <div
        ref={pipRef}
        className={`simulasi-conference-pip ${isDragging ? "is-dragging" : ""}`}
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
          // In slide main mode, PiP shows camera
          <div className="simulasi-conference-pip-content">
            {!isCamOff && stream ? (
              <video
                ref={pipVideoRef}
                autoPlay
                playsInline
                muted
                className="simulasi-conference-pip-video"
              />
            ) : (
              <div className="simulasi-conference-pip-camoff">
                <span>👤</span>
              </div>
            )}
          </div>
        ) : (
          // In camera main mode, PiP shows slide
          <div className="simulasi-conference-pip-content simulasi-conference-pip-slide">
            {slideUrl ? (
              <SlideViewer
                url={slideUrl}
                page={slidePage}
                hideNav={true}
                tone="dark"
              />
            ) : (
              <div className="simulasi-conference-pip-notes">
                <span>📄 Slide</span>
              </div>
            )}
          </div>
        )}

        {/* Swap indicator badge on PiP */}
        <div className="simulasi-conference-pip-badge">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 16V4M7 4L3 8M7 4L11 8M17 8V20M17 20L21 16M17 20L13 16" />
          </svg>
        </div>
      </div>

      {/* Slide Navigation Controls Bar (Previous / Counter / Next) */}
      <div className="simulasi-conference-slide-nav-bar">
        <button
          type="button"
          className="simulasi-conference-nav-arrow"
          onClick={() => setSlidePage((p) => Math.max(1, p - 1))}
          disabled={atFirst || totalSlidePages <= 1}
          aria-label="Slide sebelumnya"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <span className="simulasi-conference-nav-counter">
          {slidePage} / {totalSlidePages || 1}
        </span>

        <button
          type="button"
          className="simulasi-conference-nav-arrow"
          onClick={() => setSlidePage((p) => Math.min(totalSlidePages, p + 1))}
          disabled={atLast || totalSlidePages <= 1}
          aria-label="Slide berikutnya"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* Bottom Conference Action Dock */}
      <div className="simulasi-conference-bottom-dock">
        {/* Mic Toggle Button */}
        <button
          type="button"
          className={`simulasi-conf-dock-btn ${isMuted ? "is-off" : ""}`}
          onClick={toggleMute}
          title={isMuted ? "Nyalakan Mic" : "Matikan Mic"}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
          <span className="simulasi-conf-dock-label">{isMuted ? "Unmute" : "Mute"}</span>
        </button>

        {/* Cam Toggle Button */}
        <button
          type="button"
          className={`simulasi-conf-dock-btn ${isCamOff ? "is-off" : ""}`}
          onClick={toggleCam}
          title={isCamOff ? "Nyalakan Kamera" : "Matikan Kamera"}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 7l-7 5 7 5V7z" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
          <span className="simulasi-conf-dock-label">{isCamOff ? "Cam Off" : "Cam On"}</span>
        </button>

        {/* Notes / Contekan Drawer Button */}
        <button
          type="button"
          className={`simulasi-conf-dock-btn ${showNotesSheet ? "is-active" : ""}`}
          onClick={() => setShowNotesSheet((v) => !v)}
          title="Buka Catatan / Contekan"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <span className="simulasi-conf-dock-label">Notes</span>
        </button>

        {/* End Call / Stop Recording Button */}
        <button
          type="button"
          className="simulasi-conf-dock-btn simulasi-conf-dock-btn--end"
          onClick={onFinish}
          title="Selesaikan Presentasi"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
            <line x1="23" y1="1" x2="1" y2="23" />
          </svg>
          <span className="simulasi-conf-dock-label">Selesai</span>
        </button>
      </div>

      {/* Notes / Contekan Slide-Up Bottom Sheet */}
      {showNotesSheet && (
        <div className="simulasi-conference-notes-backdrop" onClick={() => setShowNotesSheet(false)}>
          <div className="simulasi-conference-notes-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="simulasi-conference-notes-header">
              <div className="simulasi-conference-notes-handle" />
              <div className="simulasi-conference-notes-title-row">
                <span className="simulasi-conference-notes-title">📝 Contekan & Poin Materi</span>
                <button
                  type="button"
                  className="simulasi-conference-notes-close"
                  onClick={() => setShowNotesSheet(false)}
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="simulasi-conference-notes-body">
              {cheatSheet ? (
                <p className="simulasi-conference-notes-text">{cheatSheet}</p>
              ) : (
                <p className="simulasi-conference-notes-empty">Belum ada catatan materi untuk sesi ini.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Exit Confirmation Modal */}
      {showExitModal && (
        <LessonExitModal
          title="Keluar dari Presentasi?"
          desc="Rekaman presentasi tidak akan disimpan dan dianalisis jika kamu keluar sebelum selesai."
          stayText="Lanjutkan Presentasi"
          leaveText="Keluar Sesi"
          onCancel={() => setShowExitModal(false)}
          onConfirm={() => {
            setShowExitModal(false);
            if (onBack) onBack();
          }}
        />
      )}
    </div>
  );
}

// ─── Recording step ─────────────────────────────────────────────────────────
// `questions` non-empty = mode wawancara: satu rekaman berjalan terus, tapi
// pertanyaan berganti satu per satu di layar (tanya-jawab bergantian), dan
// feedback baru keluar setelah pertanyaan terakhir dijawab. Rekamannya sengaja
// TIDAK dipotong per pertanyaan supaya analyze-session tetap menerima satu file
// audio utuh seperti kategori lain — transkrip lengkapnya sudah memuat semua
// jawaban, jadi tidak perlu menggabung blob webm di sisi client.
function RecordingStep({ scenario, cheatSheet, materialPdfPath, questions = [], onBack, onFinish, onAbandon }) {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [camError, setCamError] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [showCheatSheet, setShowCheatSheet] = useState(false);
  const [qIndex, setQIndex] = useState(0);
  // Presentasi (kelas/lomba) uses modern Video Conference UI
  const isPresentasi = scenario?.kategori === "kelas" || scenario?.kategori === "lomba";
  const [analyserNode, setAnalyserNode] = useState(null);
  // null | "silent" | "incomplete" — see attemptFinish() below.
  const [gate, setGate] = useState(null);
  const isInterview = scenario?.kategori === "interview" || questions.length > 0;
  const isLastQuestion = qIndex >= questions.length - 1;
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  // recorder.onstop is a closure created once at recorder-start time, so it
  // would otherwise see a stale `seconds` (0) — a ref always has the latest.
  const secondsRef = useRef(0);
  const detectedSpeechRef = useRef(false);

  useEffect(() => {
    let active = true;
    let currentStream = null;

    const constraints =
      scenario?.kategori === "interview"
        ? { audio: true, video: false }
        : { video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true };

    if (navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia(constraints)
        .then((s) => {
          if (!active) {
            s.getTracks().forEach((t) => t.stop());
            return;
          }
          currentStream = s;
          setStream(s);
        })
        .catch((err) => setCamError(err));
    } else {
      setCamError(new Error("not_supported"));
    }

    return () => {
      active = false;
      if (currentStream) currentStream.getTracks().forEach((t) => t.stop());
      clearInterval(timerRef.current);
    };
  }, [scenario?.kategori]);

  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream]);

  // Listens to the mic the whole time the stream is live and flags whether
  // any speech-level volume was ever heard — attemptFinish() below reads
  // this ref (not state, so no re-renders) to decide whether to show the
  // "belum ngomong apa-apa" gate. Runs off the SAME audio track the
  // recorder itself uses, so no second getUserMedia prompt is needed.
  useEffect(() => {
    if (!stream) return undefined;
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) return undefined;

    let rafId;
    let audioCtx;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      audioCtx.createMediaStreamSource(new MediaStream(audioTracks)).connect(analyser);
      setAnalyserNode(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        if (sum / data.length > SILENCE_THRESHOLD) detectedSpeechRef.current = true;
        rafId = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      detectedSpeechRef.current = true;
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      audioCtx?.close?.().catch(() => {});
    };
  }, [stream]);

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        const next = s + 1;
        secondsRef.current = next;
        return next;
      });
    }, 1000);
  };

  const startRecording = () => {
    if (!stream) return;
    chunksRef.current = [];
    detectedSpeechRef.current = false;
    const audioOnlyStream = new MediaStream(stream.getAudioTracks());
    const mimeType = window.MediaRecorder?.isTypeSupported?.("audio/webm") ? "audio/webm" : "";
    const recorder = mimeType ? new MediaRecorder(audioOnlyStream, { mimeType }) : new MediaRecorder(audioOnlyStream);

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
      onFinish(blob, secondsRef.current);
    };

    mediaRecorderRef.current = recorder;
    recorder.start();
    setIsRecording(true);
    setGate(null);
    setSeconds(0);
    secondsRef.current = 0;
    startTimer();
  };

  // For interview & presentation: auto start recording on mount once stream is ready
  useEffect(() => {
    if ((scenario?.kategori === "interview" || isPresentasi) && stream && !isRecording && !gate) {
      startRecording();
    }
  }, [scenario?.kategori, isPresentasi, stream]);

  // Gate before finalizing a recording
  const attemptFinish = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    clearInterval(timerRef.current);

    if (!detectedSpeechRef.current) {
      recorder.pause();
      setGate("silent");
      return;
    }
    if (secondsRef.current < MIN_RECORDING_SECONDS) {
      recorder.pause();
      setGate("incomplete");
      return;
    }
    setIsRecording(false);
    recorder.stop();
  };

  const handleToggle = () => {
    if (isRecording) {
      attemptFinish();
      return;
    }
    startRecording();
  };

  const handleGateResume = () => {
    mediaRecorderRef.current?.resume();
    setGate(null);
    startTimer();
  };

  const handleAbandon = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null; // discard recording completely
      recorder.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    stream?.getTracks().forEach((t) => t.stop());
    setGate(null);
    if (onAbandon) onAbandon();
    else if (onBack) onBack();
  };

  const handleGateRestart = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      recorder.stop();
    }
    if (isInterview) setQIndex(0);
    startRecording();
  };

  const handleGateAbandon = () => {
    handleAbandon();
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  // Interview Scenario UI branch
  if (scenario?.kategori === "interview") {
    return (
      <div className="simulasi-interview-wrapper">
        {gate && (
          <RecordingGateModal
            variant={gate}
            secondsElapsed={seconds}
            onResume={handleGateResume}
            onRestart={handleGateRestart}
            onAbandon={handleGateAbandon}
          />
        )}
        <InterviewCallView
          scenario={scenario}
          questions={questions.length > 0 ? questions : DEFAULT_INTERVIEW_QUESTIONS}
          qIndex={qIndex}
          setQIndex={setQIndex}
          seconds={seconds}
          formatTime={formatTime}
          isRecording={isRecording}
          onFinish={handleToggle}
          onBack={handleAbandon}
          stream={stream}
          camError={camError}
          analyserNode={analyserNode}
        />
      </div>
    );
  }

  // Presentation Scenario UI branch (Video Conference style with borderless stage, draggable & swappable PiP facecam, slide navigation)
  if (isPresentasi) {
    return (
      <div className="simulasi-conference-wrapper">
        {gate && (
          <RecordingGateModal
            variant={gate}
            secondsElapsed={seconds}
            onResume={handleGateResume}
            onRestart={handleGateRestart}
            onAbandon={handleGateAbandon}
          />
        )}
        <PresentationConferenceView
          scenario={scenario}
          cheatSheet={cheatSheet}
          materialPdfPath={materialPdfPath}
          stream={stream}
          camError={camError}
          seconds={seconds}
          formatTime={formatTime}
          isRecording={isRecording}
          onFinish={handleToggle}
          onBack={handleAbandon}
        />
      </div>
    );
  }

  return (
    <div className="simulasi-recording-screen">
      {gate && (
        <RecordingGateModal
          variant={gate}
          secondsElapsed={seconds}
          onResume={handleGateResume}
          onRestart={handleGateRestart}
          onAbandon={handleGateAbandon}
        />
      )}

      <header className="simulasi-recording-topbar">
        <button type="button" className="simulasi-back-btn" onClick={onBack} aria-label="Kembali">
          <img src={arrowLeftIcon} alt="" className="simulasi-back-icon" />
        </button>
        <span className="simulasi-recording-scenario">{scenario.title}</span>
      </header>

      {isPresentasi ? (
        materialView === "slide" ? (
          // Picking Slide jumps straight here — no manual expand step.
          // Camera preview and every other control are gone; recording
          // itself keeps running off the independent getUserMedia stream
          // (see startRecording), so hiding the preview doesn't touch the
          // take. The only way back to the normal portrait view is
          // finishing the recording, which leaves this step entirely.
          <div className="simulasi-slide-immersive">
            <div className="simulasi-slide-immersive-stage">
              {slideError ? (
                <p className="simulasi-split-empty">{slideError}</p>
              ) : slideUrl ? (
                <SlideViewer url={slideUrl} expanded tone="light" />
              ) : (
                <p className="simulasi-split-empty">Memuat slide...</p>
              )}
            </div>
            <div className="simulasi-immersive-bar">
              {isRecording && (
                <span className="simulasi-rec-badge" style={{ position: "static" }}>
                  <span className="simulasi-rec-dot" />
                  <span>{formatTime(seconds)}</span>
                </span>
              )}
              <button
                type="button"
                className="simulasi-expanded-rec"
                onClick={handleToggle}
                disabled={!stream}
                aria-label={isRecording ? "Berhenti rekam" : "Mulai rekam"}
              >
                <span className={isRecording ? "simulasi-expanded-rec-stop" : "simulasi-expanded-rec-dot"} />
              </button>
            </div>
          </div>
        ) : (
          <div className="simulasi-split-stage">
            <div className="simulasi-split-camera">
              <video ref={videoRef} autoPlay playsInline muted className="simulasi-camera-video" />
              {!stream && !camError && (
                <div className="simulasi-camera-overlay">
                  <div className="simulasi-camera-spinner" />
                  <p>Menghubungkan kamera...</p>
                </div>
              )}
              {camError && (
                <div className="simulasi-camera-overlay">
                  <p>Kamera/mic belum bisa diakses. Izinkan akses lalu coba lagi.</p>
                </div>
              )}
              {isRecording && (
                <div className="simulasi-rec-badge">
                  <span className="simulasi-rec-dot" />
                  <span>{formatTime(seconds)}</span>
                </div>
              )}
            </div>

            <div className="simulasi-split-material">
              <div className="simulasi-split-toggle-row">
                <button type="button" className="simulasi-split-toggle active" onClick={() => setMaterialView("notes")}>
                  📝 Notes
                </button>
                <button
                  type="button"
                  className="simulasi-split-toggle"
                  onClick={() => setMaterialView("slide")}
                  disabled={!materialPdfPath}
                >
                  🖼️ Slide
                </button>
              </div>

              <div className="simulasi-split-content">
                {cheatSheet ? (
                  <p className="simulasi-split-notes-text">{cheatSheet}</p>
                ) : (
                  <p className="simulasi-split-empty">Belum ada notes untuk sesi ini.</p>
                )}
              </div>
            </div>
          </div>
        )
      ) : (
        <div className="simulasi-camera-frame">
          <video ref={videoRef} autoPlay playsInline muted className="simulasi-camera-video" />
          {!stream && !camError && (
            <div className="simulasi-camera-overlay">
              <div className="simulasi-camera-spinner" />
              <p>Menghubungkan kamera...</p>
            </div>
          )}
          {camError && (
            <div className="simulasi-camera-overlay">
              <p>Kamera/mic belum bisa diakses. Izinkan akses lalu coba lagi.</p>
            </div>
          )}
          {isRecording && (
            <div className="simulasi-rec-badge">
              <span className="simulasi-rec-dot" />
              <span>{formatTime(seconds)}</span>
            </div>
          )}
          {isInterview && (
            <div className="simulasi-question-panel">
              <p className="simulasi-question-counter">
                Pertanyaan {qIndex + 1}/{questions.length}
              </p>
              <p className="simulasi-question-text">{questions[qIndex]}</p>
            </div>
          )}
          {cheatSheet && (
            <button
              type="button"
              className="simulasi-cheatsheet-toggle"
              onClick={() => setShowCheatSheet((v) => !v)}
            >
              {showCheatSheet ? "Sembunyikan topik" : "Lihat topik"}
            </button>
          )}
          {cheatSheet && showCheatSheet && <div className="simulasi-cheatsheet-panel">{cheatSheet}</div>}
        </div>
      )}

      <p className="simulasi-recording-hint">
        {isRecording
          ? "Lagi rekam — tekan tombol lagi kalau sudah selesai."
          : "Tekan tombol rekam buat mulai latihan."}
      </p>

      <button
        type="button"
        className={`simulasi-btn-record ${isRecording ? "is-recording" : ""}`}
        onClick={handleToggle}
        disabled={!stream}
        aria-label={isRecording ? "Berhenti rekam" : "Mulai rekam"}
      >
        {isRecording ? <span className="simulasi-record-stop" /> : <span className="simulasi-record-dot-icon" />}
      </button>
    </div>
  );
}

// ─── Results step (AI Analysis UI aligned with Lesson 6) ───────────────────
function SimulasiAnalysisChip({ label, tone }) {
  return <span className={`simulasi-analysis-chip simulasi-analysis-chip--${tone}`}>{label}</span>;
}

// ─── Accumulation Score Hero (Circular Gauge Donut Progress Style) ───
export function AccumulationScoreHero({ score }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const clampedScore = Math.max(0, Math.min(100, score != null ? Math.round(score) : 80));

  const size = 160;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Animated states for entrance
  const [displayScore, setDisplayScore] = useState(0);
  const [dashOffset, setDashOffset] = useState(circumference);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Play crystal score reveal chime sound
    playScoreRevealSound();

    // Trigger stroke sweep animation
    const targetOffset = circumference - (clampedScore / 100) * circumference;
    const strokeTimer = setTimeout(() => {
      setDashOffset(targetOffset);
      setIsLoaded(true);
    }, 80);

    // Smooth number count-up animation over 1100ms
    const duration = 1100;
    const startTime = performance.now();
    let animId = null;

    const animateNumber = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Cubic ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(eased * clampedScore));

      if (progress < 1) {
        animId = requestAnimationFrame(animateNumber);
      }
    };

    animId = requestAnimationFrame(animateNumber);

    return () => {
      clearTimeout(strokeTimer);
      if (animId) cancelAnimationFrame(animId);
    };
  }, [clampedScore, circumference]);

  return (
    <div className={`simulasi-accumulation-hero simulasi-accumulation-hero--gauge ${isLoaded ? "simulasi-gauge--ready" : ""}`}>
      <div className="simulasi-gauge-container">
        <svg
          className="simulasi-gauge-svg"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
        >
          <defs>
            <linearGradient id="scoreGaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFA767" />
              <stop offset="100%" stopColor="#E8753D" />
            </linearGradient>
          </defs>

          {/* Inner filled background disc */}
          <circle
            className="simulasi-gauge-inner-disc"
            cx={size / 2}
            cy={size / 2}
            r={radius - strokeWidth / 2 + 1}
          />
          {/* Background track circle */}
          <circle
            className="simulasi-gauge-track"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
          />
          {/* Active progress arc */}
          <circle
            className="simulasi-gauge-progress"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>

        {/* Center score content */}
        <div className="simulasi-gauge-center">
          <div className="simulasi-accumulation-number-wrap">
            <h2 className="simulasi-gauge-number">{displayScore}</h2>
            <button
              type="button"
              className="simulasi-accumulation-info-btn simulasi-gauge-info-btn"
              onClick={() => setShowTooltip((prev) => !prev)}
              aria-label="Info akumulasi skor"
              title="Info akumulasi skor"
            >
              i
            </button>
          </div>
          <p className="simulasi-gauge-sub">dari 100</p>
        </div>
      </div>

      {showTooltip && (
        <div className="simulasi-accumulation-tooltip">
          Skor total dihitung dari akumulasi penilaian argumentasi, relevansi konteks, kestabilan tempo bicara, dan artikulasi intonasi.
        </div>
      )}
    </div>
  );
}

// Exported: SessionDetailScreen (Riwayat Sesi drill-down) reuses this exact
// scoring/metrics rendering — same fallback-default logic, so a history
// detail view can never silently drift out of sync with the live results
// screen. Deliberately excludes the hero/headline and the CTA (XP-gated
// "Lanjut" doesn't mean anything when just looking back at old history).
export function AnalysisCards({ results, showAccumulationScore = true }) {
  const metrics = results?.metrics;
  const feedback = results?.feedback;
  const sub = (() => {
    if (feedback?.sub_scores && typeof feedback.sub_scores === "object") return feedback.sub_scores;
    if (typeof feedback?.sub_scores === "string") {
      try {
        const parsed = JSON.parse(feedback.sub_scores);
        if (parsed && typeof parsed === "object") return parsed;
      } catch {}
    }
    return {};
  })();

  const totalScore =
    feedback?.skor != null
      ? Math.round(feedback.skor)
      : Math.round(
          ((sub?.argumentasi ?? sub?.kesesuaian_materi ?? 88) +
            (sub?.relevansi ?? sub?.kesesuaian_materi ?? sub?.fluency ?? 88) +
            (sub?.fluency ?? 88) +
            (sub?.intonasi ?? 80)) /
            4
        );

  const argScore = sub?.argumentasi ?? sub?.kesesuaian_materi ?? totalScore;
  const relScore = sub?.relevansi ?? sub?.kesesuaian_materi ?? sub?.fluency ?? totalScore;
  const fillerCount = metrics?.filler_word_count != null ? metrics.filler_word_count : 0;
  const paceWpm = metrics?.pace_wpm != null ? Math.round(metrics.pace_wpm) : 140;
  const clarityScore = sub?.fluency ?? 88;
  const energyScore = sub?.intonasi ?? 80;

  const scores = [
    {
      id: "argumentasi",
      icon: iconArgument,
      label: "Argumentasi",
      value: argScore,
      unit: "/ 100",
      note: "Gagasan terstruktur dan didukung alasan yang logis.",
      chip: argScore >= 75 ? "Kuat" : "Perlu Latihan",
      chipTone: argScore >= 75 ? "good" : "warn",
    },
    {
      id: "relevansi",
      icon: iconRelevance,
      label: "Relevansi",
      value: relScore,
      unit: "/ 100",
      note: "Penyampaian selaras dengan topik dan konteks yang dibahas.",
      chip: relScore >= 75 ? "Relevan" : "Perlu Latihan",
      chipTone: relScore >= 75 ? "good" : "warn",
    },
  ];

  const gridMetrics = [
    {
      id: "kata-pengisi",
      icon: iconQuote,
      label: "Kata Pengisi",
      value: fillerCount,
      unit: "Kali",
      chip: fillerCount <= 5 ? "Stabil" : "Perlu Latihan",
      chipTone: fillerCount <= 5 ? "good" : "warn",
      valueTone: fillerCount <= 5 ? "good" : "warn",
    },
    {
      id: "kecepatan",
      icon: iconSpeed,
      label: "Kecepatan",
      value: paceWpm,
      unit: "wpm",
      chip: paceWpm >= 110 && paceWpm <= 165 ? "Stabil" : "Perlu Latihan",
      chipTone: paceWpm >= 110 && paceWpm <= 165 ? "good" : "warn",
      valueTone: "good",
    },
    {
      id: "kejelasan",
      icon: iconMouth,
      label: "Kejelasan",
      value: clarityScore,
      unit: "/ 100",
      chip: clarityScore >= 75 ? "Baik" : "Perlu Latihan",
      chipTone: clarityScore >= 75 ? "good" : "warn",
      valueTone: "good",
    },
    {
      id: "energi",
      icon: iconFlash,
      label: "Energi & Intonasi",
      value: energyScore,
      unit: "/ 100",
      chip: energyScore >= 75 ? "Baik" : "Perlu Latihan",
      chipTone: energyScore >= 75 ? "good" : "warn",
      valueTone: energyScore >= 75 ? "good" : "warn",
    },
  ];

  const saranList = (() => {
    if (Array.isArray(feedback?.saran)) return feedback.saran;
    if (typeof feedback?.saran === "string" && feedback.saran.trim()) {
      try {
        const parsed = JSON.parse(feedback.saran);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        return [feedback.saran];
      }
    }
    return [];
  })();

  return (
    <>
      {showAccumulationScore && <AccumulationScoreHero score={totalScore} />}

      {scores.map((score) => (
        <div className="simulasi-analysis-card" key={score.id}>
          <div className="simulasi-analysis-card-top">
            <div className="simulasi-analysis-card-heading">
              <img src={score.icon} alt="" className="simulasi-analysis-icon" />
              <p className="simulasi-analysis-card-label">{score.label}</p>
            </div>
            <p className="simulasi-analysis-score">
              {score.value}
              <span className="simulasi-analysis-score-unit">{score.unit}</span>
            </p>
          </div>
          <p className="simulasi-analysis-note">{score.note}</p>
          <SimulasiAnalysisChip label={score.chip} tone={score.chipTone} />
        </div>
      ))}

      <div className="simulasi-analysis-grid">
        {gridMetrics.map((metric) => (
          <div className="simulasi-analysis-card simulasi-analysis-card--sm" key={metric.id}>
            <img src={metric.icon} alt="" className="simulasi-analysis-icon" />
            <p className="simulasi-analysis-card-label">{metric.label}</p>
            <p
              className={`simulasi-analysis-metric${
                metric.valueTone === "warn" ? " simulasi-analysis-metric--warn" : ""
              }`}
            >
              {metric.value}
              <span className="simulasi-analysis-metric-unit">{metric.unit}</span>
            </p>
            <SimulasiAnalysisChip label={metric.chip} tone={metric.chipTone} />
          </div>
        ))}
      </div>

      <div className="simulasi-analysis-card">
        <div className="simulasi-analysis-card-heading">
          <img src={iconAI} alt="" className="simulasi-analysis-icon" />
          <p className="simulasi-analysis-card-label">Feedback AI</p>
        </div>
        {saranList.length > 0 ? (
          <div className="simulasi-analysis-feedback">
            {saranList.map((item, i) => (
              <p key={i} className="simulasi-analysis-feedback-item">
                • {item}
              </p>
            ))}
          </div>
        ) : (
          <p className="simulasi-analysis-feedback">
            {feedback?.feedback ||
              feedback?.motivasi ||
              "Kamu sudah menyelesaikan sesi simulasi dengan baik! Pertahankan artikulasi dan kurangi kata pengisi di sesi berikutnya."}
          </p>
        )}
      </div>

      <TranscriptCard
        rawTranscript={
          results?.transcript ||
          results?.metrics?.transcript ||
          results?.feedback?.transcript ||
          results?.feedback?.transkrip
        }
        title="Transkrip Suara"
      />
    </>
  );
}

// Exported: LiveResultsScreen reuses this verbatim for the post-live AI
// feedback card — same shape (results, onDone), same visual language.
export function ResultsStep({ results, onDone }) {
  const { isReady: isXpReady } = useGainXpPreloader(videoGainXP);
  const [exportingPdf, setExportingPdf] = useState(false);

  const handleExportPDF = async () => {
    setExportingPdf(true);
    try {
      const sub = results?.feedback?.sub_scores || {};
      const scores = [
        {
          label: "Argumentasi",
          value: sub.argumentasi ?? sub.kesesuaian_materi ?? (results?.feedback?.skor ? Math.round(results.feedback.skor) : 88),
          unit: "/ 100",
          chip: "Kuat",
        },
        {
          label: "Relevansi",
          value: sub.relevansi ?? sub.kesesuaian_materi ?? sub.fluency ?? 88,
          unit: "/ 100",
          chip: "Relevan",
        },
      ];
      const metrics = [
        { label: "Kata Pengisi", value: results?.metrics?.filler_word_count ?? 0, unit: "Kali", chip: "Stabil" },
        { label: "Kecepatan", value: Math.round(results?.metrics?.pace_wpm || 140), unit: "wpm", chip: "Stabil" },
        { label: "Kejelasan", value: sub.fluency ?? 88, unit: "/ 100", chip: "Baik" },
        { label: "Energi", value: sub.intonasi ?? 80, unit: "/ 100", chip: "Baik" },
      ];

      await exportAnalysisToPDF({
        title: "Hasil Simulasi Berbicara",
        category: "Simulasi AI",
        scores,
        metrics,
        feedback: results?.feedback?.saran || results?.feedback?.feedback,
        motivasi: results?.feedback?.motivasi || "Dengan latihan yang konsisten, kamu akan semakin mahir dan percaya diri!",
        transcript:
          results?.transcript ||
          results?.metrics?.transcript ||
          results?.feedback?.transcript ||
          results?.feedback?.transkrip,
      });
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="simulasi-results-screen">
      <div className="simulasi-results-hero">
        <img src={imgAnalysisHero} alt="" className="simulasi-results-hero-img" />
      </div>

      <div className="simulasi-results-body">
        <div className="simulasi-results-headline">
          <p className="simulasi-results-eyebrow">Mantap!</p>
          <h1 className="simulasi-results-title">Kamu keren!</h1>
          <p className="simulasi-results-sub">
            {results?.feedback?.motivasi ||
              "Dengan latihan yang konsisten, kamu akan semakin mahir dan percaya diri dalam berbicara!"}
          </p>
        </div>

        <AnalysisCards results={results} />
      </div>
      
      <div className="simulasi-results-cta">
        <button
          type="button"
          className="btn-analysis-download"
          onClick={handleExportPDF}
          disabled={exportingPdf}
          aria-label="Unduh Laporan PDF"
          title="Unduh Laporan PDF"
        >
          <img src={iconDownload} alt="" className="btn-analysis-download-icon" />
        </button>
        <button
          type="button"
          className="btn-simulasi-lanjut btn-simulasi-lanjut--flex"
          onClick={onDone}
          disabled={!isXpReady}
          style={!isXpReady ? { opacity: 0.75, cursor: "not-allowed" } : undefined}
        >
          {!isXpReady ? "Menyiapkan XP..." : "Lanjut"}
        </button>
      </div>
    </div>
  );
}

// ─── Simulasi Gain XP Step ──────────────────────────────────────────────────
function SimulasiGainXpStep({ onClaim, xpEarned = 75 }) {
  const [displayedXP, setDisplayedXP] = useState(0);
  const [isCounting, setIsCounting] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const videoRef = useRef(null);
  const videoSrc = getPreloadedVideoSrc(videoGainXP);

  useEffect(() => {
    playGainXpIntroSound();
  }, []);

  const handleVideoEnded = () => {
    setIsCounting(true);

    let startTime = null;
    let lastTickVal = -1;
    const duration = 1500; // 1.5s count-up duration

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentVal = Math.floor(easeProgress * xpEarned);

      if (currentVal !== lastTickVal && currentVal > 0) {
        lastTickVal = currentVal;
        playXpTickSound(progress);
      }
      setDisplayedXP(currentVal);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setDisplayedXP(xpEarned);
        setIsCounting(false);
        playXpCompleteSound();

        setTimeout(() => {
          setShowButton(true);
        }, 1000);
      }
    };

    requestAnimationFrame(step);
  };

  return (
    <div className="lesson-completed-screen">
      <div className="lesson-completed-content">
        <div className="lesson-completed-video-wrap">
          <video
            ref={videoRef}
            src={videoSrc}
            autoPlay
            muted
            playsInline
            onEnded={handleVideoEnded}
            className="lesson-completed-video"
            aria-label="Animasi Perolehan XP"
          />
        </div>

        <h2 className="lesson-completed-title">Simulasi Selesai!</h2>

        {displayedXP > 0 && (
          <div className="lesson-completed-xp-block lesson-xp-appear">
            <p className="lesson-completed-xp-subtitle">Kamu meraih</p>
            <div className="lesson-completed-xp-amount-wrapper">
              <div className={`lesson-sparkle-stars ${isCounting ? "active-sparkle" : "sparkle-stopped"}`}>
                <span className="sparkle-star star-1">✦</span>
                <span className="sparkle-star star-2">✨</span>
                <span className="sparkle-star star-3">✧</span>
                <span className="sparkle-star star-4">✦</span>
                <span className="sparkle-star star-5">✨</span>
                <span className="sparkle-star star-6">✧</span>
              </div>
              <p className="lesson-completed-xp-amount">
                +{displayedXP} XP
              </p>
            </div>
          </div>
        )}
      </div>

      {showButton && (
        <div className="lesson-cta-wrapper lesson-cta-appear">
          <button
            type="button"
            className="btn-lesson-finish"
            onClick={onClaim}
          >
            Klaim XP
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main orchestrator ──────────────────────────────────────────────────────
export default function SimulasiScreen({ onNavigateHome, onNavigateSosial, onNavigateProfile }) {
  // picker | creating | topic | upload | processing-materials | manual-notes
  // | prep | recording | processing | results
  const [step, setStep] = useState("picker");
  const [scenario, setScenario] = useState(null);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [simulationId, setSimulationId] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [notes, setNotes] = useState("");
  // Storage path of the uploaded materi PDF — null for the manual-notes
  // fallback (edge case 11.1, no real PDF exists) or the spontan/interview
  // scenarios that never upload one. Only Presentasi's split-screen "Slide"
  // toggle uses this.
  const [materialPdfPath, setMaterialPdfPath] = useState(null);
  const [topics, setTopics] = useState([]);
  const [shufflingTopic, setShufflingTopic] = useState(false);
  const [interviewObjective, setInterviewObjective] = useState("kerja");
  const [candidateContext, setCandidateContext] = useState("");
  const [questions, setQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [results, setResults] = useState(null);
  // Tahap analisa untuk AnalysisProgress — diisi dari batas-batas nyata di
  // handleRecordingFinished + callback onStage runAnalysis.
  const [analysisStage, setAnalysisStage] = useState("uploading");
  const { xp, addXp, refreshProgress, isInitialized } = useUserProgress();

  const resetToPicker = () => {
    stopQuestionTTS();
    setScenario(null);
    setSelectedScenario(null);
    setSimulationId(null);
    setSessionId(null);
    setNotes("");
    setMaterialPdfPath(null);
    setTopics([]);
    setInterviewObjective("kerja");
    setCandidateContext("");
    setQuestions([]);
    setQuestionsLoading(false);
    setStep("picker");
  };

  // Stop any audio when navigating away from the simulation screen
  useEffect(() => {
    return () => {
      stopQuestionTTS();
    };
  }, []);

  const handlePick = async (s) => {
    setScenario(s);
    setErrorMessage("");
    setStep("creating");
    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr || !user) throw new Error("Sesi login tidak ditemukan, coba masuk ulang.");

      const simulation = await createSimulation(user.id, s.kategori);
      setSimulationId(simulation.id);

      if (s.needsUpload) {
        setStep("upload");
        return;
      }

      // Spontan: no upload/environment — create the session now so we have
      // a session_id to attach the spontaneous topic banner to.
      const newSessionId = crypto.randomUUID();
      await createSessionRow({ id: newSessionId, simulationId: simulation.id });
      setSessionId(newSessionId);
      const aiTopic = await generateSpontaneousTopicAI({
        sessionId: newSessionId,
        simulationId: simulation.id,
      });
      setTopics([aiTopic]);
      setStep("topic");
    } catch (err) {
      setErrorMessage(friendlySimulasiError(err));
      resetToPicker();
    }
  };

  const handleMaterialUpload = async (payload) => {
    const file = payload?.file || payload;
    const objective = payload?.interviewObjective || "kerja";
    setInterviewObjective(objective);

    setErrorMessage("");
    setStep("processing-materials");
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const pdfPath = await uploadMaterial(user.id, simulationId, file);
      // The PDF itself is safely stored the moment upload succeeds — the
      // "Slide" toggle can show it even if text extraction below comes back
      // empty (edge case 11.1) or hasn't happened at all for kategori kelas/lomba.
      setMaterialPdfPath(pdfPath);

      // 1. Ekstraksi teks PDF langsung di client (100% reliable)
      const clientExtractedText = await extractPdfTextClientSide(file);

      let text = "";
      try {
        text =
          scenario.kategori === "interview" ? await analyzeCv(simulationId, pdfPath) : await generateNotes(simulationId, pdfPath);
      } catch (genErr) {
        console.warn("AI extraction encountered error, falling back to client extracted text:", genErr);
      }

      const finalText = text || clientExtractedText;

      if (!finalText && scenario.kategori === "interview") {
        text = `Kandidat mengikuti interview dengan fokus: ${objective}.`;
      } else {
        text = finalText;
      }

      if (!text) {
        setStep("manual-notes");
        return;
      }
      if (scenario.kategori !== "interview") {
        setNotes(text);
        try {
          await saveManualMaterialText(simulationId, scenario.kategori, text);
        } catch (saveErr) {
          console.warn("saveManualMaterialText error:", saveErr);
        }
      } else {
        setCandidateContext(text);
      }
      await beginSessionForPrep(objective, text);
    } catch (err) {
      console.error("Upload material error:", err);
      // Fallback to manual text-area if Edge Function returns 422 or error
      const status = err?.context?.status ?? err?.status;
      if (status === 422 || err?.message?.includes("internal") || err?.message?.includes("kesalahan")) {
        setStep("manual-notes");
        return;
      }
      setErrorMessage(friendlySimulasiError(err));
      setStep("upload");
    }
  };

  const handleManualNotes = async (payload) => {
    const text = typeof payload === "string" ? payload : payload?.text || "";
    const objective = payload?.interviewObjective || interviewObjective || "kerja";
    setInterviewObjective(objective);

    setErrorMessage("");
    setStep("processing-materials");
    try {
      await saveManualMaterialText(simulationId, scenario.kategori, text);
      if (scenario.kategori !== "interview") {
        setNotes(text);
      } else {
        setCandidateContext(text);
      }
      await beginSessionForPrep(objective, text);
    } catch (err) {
      setErrorMessage(friendlySimulasiError(err));
      setStep("manual-notes");
    }
  };

  const beginSessionForPrep = async (targetObjective = interviewObjective, cvText = candidateContext) => {
    const newSessionId = crypto.randomUUID();
    await createSessionRow({ id: newSessionId, simulationId });
    setSessionId(newSessionId);

    // Interview langsung masuk ke sesi simulasi wawancara interaktif (tanpa layar cek kamera)
    if (scenario.kategori === "interview") {
      setQuestionsLoading(true);
      try {
        const generated = await generateInterviewQuestionsAI({
          sessionId: newSessionId,
          simulationId,
          objective: targetObjective || "kerja",
          candidateContext: cvText || "",
        });
        setQuestions(
          generated && generated.length > 0
            ? generated
            : INTERVIEW_QUESTIONS_BY_OBJECTIVE[targetObjective] || DEFAULT_INTERVIEW_QUESTIONS
        );
      } catch {
        setQuestions(INTERVIEW_QUESTIONS_BY_OBJECTIVE[targetObjective] || DEFAULT_INTERVIEW_QUESTIONS);
      } finally {
        setQuestionsLoading(false);
      }
      setStep("recording");
      return;
    }

    setStep("prep");
  };

  const handleRecordingFinished = async (audioBlob, durationSeconds) => {
    stopQuestionTTS();
    setStep("processing");
    setAnalysisStage("uploading");
    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr || !user) throw new Error("Sesi login tidak ditemukan, coba masuk ulang.");

      const audioPath = await uploadSessionAudio(user.id, sessionId, audioBlob);
      await updateSessionAudio(sessionId, audioPath);
      await runAnalysis({ sessionId, audioPath, durationSeconds, onStage: setAnalysisStage });
      const data = await fetchSessionResults(sessionId);
      await markSimulationCompleted(simulationId);
      refreshProgress();

      setAnalysisStage("done");
      setResults(data);
      setStep((curr) => (curr === "processing" ? "results" : curr));
    } catch (err) {
      setErrorMessage(friendlySimulasiError(err));
      setStep((curr) => (curr === "processing" ? "picker" : curr));
    }
  };

  if (step === "creating") {
    return <SessionLoadingScreen text="Menyiapkan sesi..." />;
  }

  if (step === "topic" && scenario) {
    return (
      <TopicStep
        topics={topics}
        loading={false}
        error={errorMessage}
        shuffling={shufflingTopic}
        onBack={resetToPicker}
        onStart={() => setStep("recording")}
        onShuffle={async () => {
          setShufflingTopic(true);
          try {
            const current = topics[0] || "";
            const next = await generateSpontaneousTopicAI({
              sessionId,
              simulationId,
              excludeTopic: current,
            });
            setTopics([next]);
          } finally {
            setShufflingTopic(false);
          }
        }}
      />
    );
  }

  if (step === "upload" && scenario) {
    return (
      <UploadStep
        scenario={scenario}
        uploading={false}
        error={errorMessage}
        onBack={resetToPicker}
        onSubmit={handleMaterialUpload}
      />
    );
  }

  if (step === "processing-materials") {
    return (
      <div className="simulasi-processing-screen">
        <div className="simulasi-processing-lottie-wrap">
          <DotLottieReact
            src={animaBotLottie}
            loop
            autoplay
            className="simulasi-processing-lottie"
          />
        </div>
        <p className="simulasi-processing-title">Memproses materi kamu...</p>
        <p className="simulasi-processing-sub">AI kami lagi baca file-nya, biasanya cuma beberapa detik. Untuk file hasil scan gambar, ini bisa lebih lama — mohon tunggu, jangan tutup halaman ini.</p>
      </div>
    );
  }

  if (step === "manual-notes" && scenario) {
    return (
      <ManualNotesStep scenario={scenario} saving={false} onBack={() => setStep("upload")} onSubmit={handleManualNotes} />
    );
  }

  if (step === "prep" && scenario) {
    return (
      <PrepStep
        scenario={scenario}
        notes={notes}
        error={errorMessage}
        questionsLoading={questionsLoading}
        onBack={resetToPicker}
        onStart={() => setStep("recording")}
      />
    );
  }

  if (step === "recording" && scenario) {
    return (
      <RecordingStep
        scenario={scenario}
        cheatSheet={scenario.kategori === "spontan" ? topics.join(" / ") : scenario.kategori !== "interview" ? notes : ""}
        materialPdfPath={materialPdfPath}
        questions={scenario.kategori === "interview" ? questions : []}
        onBack={() => setStep(scenario.kategori === "interview" ? "upload" : scenario.needsUpload ? "prep" : "topic")}
        onFinish={handleRecordingFinished}
        onAbandon={resetToPicker}
      />
    );
  }

  if (step === "processing") {
    return <AnalysisProgress stage={analysisStage} title="Menganalisis rekamanmu..." />;
  }

  if (step === "results" && results) {
    return (
      <ResultsStep
        results={results}
        onDone={() => {
          setStep("gain-xp");
        }}
      />
    );
  }

  if (step === "gain-xp") {
    const earned = results?.feedback?.skor ? Math.round(50 + results.feedback.skor * 0.5) : 75;
    return (
      <SimulasiGainXpStep
        xpEarned={earned}
        onClaim={() => {
          addXp(earned);
          setResults(null);
          resetToPicker();
        }}
      />
    );
  }

  if (!isInitialized && step === "picker") {
    return (
      <SimulasiSkeleton
        onNavigateHome={onNavigateHome}
        onNavigatePractice={() => {}}
        onNavigateSosial={onNavigateSosial}
        onNavigateProfile={onNavigateProfile}
      />
    );
  }

  return (
    <div className="simulasi-screen" data-name="Simulasi">
      <div className="simulasi-topbar">
        <h1 className="simulasi-topbar-title">Simulasi</h1>
        <div className="simulasi-xp-badge">
          <span className="simulasi-xp-text">{xp.toLocaleString("id-ID")} XP</span>
        </div>
      </div>

      <div className="simulasi-scroll-body">
        <p className="simulasi-picker-heading">Pilih jenis skenario yang kamu butuhkan</p>

        {errorMessage && <p className="simulasi-error-banner">{errorMessage}</p>}

        <div className="simulasi-card-list">
          {SCENARIOS.map((s) => {
            const isSelected = selectedScenario?.id === s.id;
            return (
              <button
                key={s.id}
                type="button"
                className={`simulasi-scenario-card ${isSelected ? "simulasi-scenario-card--selected" : ""}`}
                onClick={() => setSelectedScenario(s)}
              >
                <span className="simulasi-scenario-icon">
                  <ScenarioIcon id={s.id} />
                </span>
                <span className="simulasi-scenario-text">
                  <span className="simulasi-scenario-title">{s.title}</span>
                  <span className="simulasi-scenario-desc">{s.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {selectedScenario && (
        <div className="simulasi-bottom-cta-wrapper">
          <button
            type="button"
            className="simulasi-start-btn"
            onClick={() => handlePick(selectedScenario)}
          >
            <span className="simulasi-start-btn-text">Mulai</span>
          </button>
        </div>
      )}

      <div className="home-bottom-nav">
        <button type="button" className="home-nav-item" onClick={onNavigateHome} aria-label="Home">
          <img src={iconNavHome} alt="Home" className="home-nav-icon" />
        </button>
        <button type="button" className="home-nav-item home-nav-item--active" aria-label="Simulasi">
          <img src={iconNavMic} alt="Simulasi" className="home-nav-icon home-nav-icon--active" />
        </button>
        <button type="button" className="home-nav-item" onClick={onNavigateSosial} aria-label="Sosial">
          <img src={iconNavGroup} alt="Sosial" className="home-nav-icon" />
        </button>
        <button type="button" className="home-nav-item" onClick={onNavigateProfile} aria-label="Profile">
          <img src={iconNavUser} alt="Profile" className="home-nav-icon" />
        </button>
      </div>
    </div>
  );
}
