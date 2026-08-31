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
import SlideViewer from "./SlideViewer";
import TranscriptCard from "./TranscriptCard";
import { exportAnalysisToPDF } from "../lib/pdfExport";
import { supabase } from "../lib/supabaseClient";
import {
  SCENARIOS,
  createSimulation,
  markSimulationCompleted,
  validateMaterialFile,
  uploadMaterial,
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
  friendlySimulasiError,
} from "../lib/simulasi";
import { useUserProgress } from "../context/UserProgressContext";
import { SimulasiSkeleton } from "./SkeletonLoader";

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
  const [localError, setLocalError] = useState("");

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
      <header className="simulasi-recording-topbar">
        <button type="button" className="simulasi-back-btn" onClick={onBack} aria-label="Kembali">
          <img src={arrowLeftIcon} alt="" className="simulasi-back-icon" />
        </button>
        <span className="simulasi-recording-scenario">{scenario.title}</span>
      </header>

      <div className="simulasi-upload-body">
        <p className="simulasi-upload-label">{scenario.uploadLabel}</p>
        <p className="simulasi-hint-text">Format PDF, maksimal 10MB.</p>

        <label className="simulasi-file-drop">
          <input type="file" accept="application/pdf" onChange={handleFileChange} hidden />
          {file ? file.name : "Pilih file PDF"}
        </label>

        {(localError || error) && <p className="simulasi-error-banner">{localError || error}</p>}
      </div>

      <div className="simulasi-prep-cta">
        <button
          type="button"
          className="btn-simulasi-lanjut"
          disabled={!file || uploading}
          onClick={() => onSubmit(file)}
        >
          {uploading ? "Mengunggah..." : "Lanjut"}
        </button>
      </div>
    </div>
  );
}

// ─── Manual notes fallback (edge case 11.1 — PDF gagal diparse) ───────────
// Exported for the same reason as UploadStep above (edge case 11.1 fallback).
export function ManualNotesStep({ scenario, saving, onBack, onSubmit }) {
  const [text, setText] = useState("");
  return (
    <div className="simulasi-upload-screen">
      <header className="simulasi-recording-topbar">
        <button type="button" className="simulasi-back-btn" onClick={onBack} aria-label="Kembali">
          <img src={arrowLeftIcon} alt="" className="simulasi-back-icon" />
        </button>
        <span className="simulasi-recording-scenario">{scenario.title}</span>
      </header>
      <div className="simulasi-upload-body">
        <p className="simulasi-upload-label">
          File-nya gagal dibaca otomatis (mungkin hasil scan gambar). Tulis ringkasannya manual ya, biar sesi tetap
          bisa lanjut.
        </p>
        <textarea
          className="simulasi-manual-textarea"
          rows={8}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            scenario.kategori === "interview"
              ? "Ringkas pengalaman & skill utama kamu..."
              : "Ringkas poin-poin utama materi kamu..."
          }
        />
      </div>
      <div className="simulasi-prep-cta">
        <button
          type="button"
          className="btn-simulasi-lanjut"
          disabled={!text.trim() || saving}
          onClick={() => onSubmit(text.trim())}
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
  // Presentasi (kelas/lomba) only — split-screen camera+materi below replaces
  // the overlay cheat-sheet other scenarios still use (see isPresentasi).
  const isPresentasi = scenario?.kategori === "kelas" || scenario?.kategori === "lomba";
  const [materialView, setMaterialView] = useState("notes"); // "notes" | "slide"
  const [slideUrl, setSlideUrl] = useState(null);
  const [slideError, setSlideError] = useState("");
  // Slide needs far more room than notes text does, so the split ratio
  // adapts instead of staying a fixed 50/50 — and "Perbesar" goes further,
  // giving the slide the whole stage while the camera stays as a corner PiP.
  const [slideExpanded, setSlideExpanded] = useState(false);
  const showingSlide = materialView === "slide" && Boolean(slideUrl);
  // null | "silent" | "incomplete" — see attemptFinish() below.
  const [gate, setGate] = useState(null);
  const isInterview = questions.length > 0;
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
      clearInterval(timerRef.current);
    };
  }, []);

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
      analyser.fftSize = 512;
      audioCtx.createMediaStreamSource(new MediaStream(audioTracks)).connect(analyser);
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
      // No AudioContext support in this browser — treat as "detected" so we
      // never falsely block a real recording client-side. analyze-session's
      // own transcript-length check is the authoritative backstop either way.
      detectedSpeechRef.current = true;
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      audioCtx?.close?.().catch(() => {});
    };
  }, [stream]);

  // Lazy — only fetched once the presenter actually taps the Slide toggle,
  // not on mount, since most of a session may be spent on Notes instead.
  useEffect(() => {
    if (!isPresentasi || materialView !== "slide" || !materialPdfPath || slideUrl) return undefined;
    let active = true;
    setSlideError("");
    getMaterialSignedUrl(materialPdfPath)
      .then((url) => {
        if (active) setSlideUrl(url);
      })
      .catch(() => {
        if (active) setSlideError("Gagal memuat slide. Coba lagi.");
      });
    return () => {
      active = false;
    };
  }, [isPresentasi, materialView, materialPdfPath, slideUrl]);

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
    // analyze-session only wants audio, so record just the audio track even
    // though the preview above shows the full video+audio stream.
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

  // Gate before finalizing a recording: silence -> nothing to analyse at
  // all; too short -> probably an accidental/rushed stop. Both PAUSE the
  // recorder (not stop it) so "Lanjutkan" can resume the same take.
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

  const handleGateRestart = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null; // discard — don't fire the stale onFinish
      recorder.stop();
    }
    if (isInterview) setQIndex(0);
    startRecording();
  };

  const handleGateAbandon = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      recorder.stop();
    }
    stream?.getTracks().forEach((t) => t.stop());
    setGate(null);
    onAbandon?.();
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

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
        <div
          className={`simulasi-split-stage${showingSlide ? " simulasi-split-stage--slide" : ""}${
            showingSlide && slideExpanded ? " simulasi-split-stage--expanded" : ""
          }`}
        >
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
            {slideExpanded && showingSlide ? (
              // Expanded lifts over the whole screen, so the controls the
              // normal layout provides (rec timer, record/stop) have to come
              // along — otherwise the presenter couldn't stop the take.
              <div className="simulasi-expanded-bar">
                <button
                  type="button"
                  className="simulasi-split-expand-btn"
                  onClick={() => setSlideExpanded(false)}
                  title="Perkecil slide"
                >
                  ⤡
                </button>
                <button
                  type="button"
                  className="simulasi-split-toggle"
                  onClick={() => {
                    setMaterialView("notes");
                    setSlideExpanded(false);
                  }}
                >
                  📝 Notes
                </button>
                <span className="simulasi-expanded-spacer" />
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
            ) : (
            <div className="simulasi-split-toggle-row">
              <button
                type="button"
                className={`simulasi-split-toggle ${materialView === "notes" ? "active" : ""}`}
                onClick={() => {
                  setMaterialView("notes");
                  setSlideExpanded(false);
                }}
              >
                📝 Notes
              </button>
              <button
                type="button"
                className={`simulasi-split-toggle ${materialView === "slide" ? "active" : ""}`}
                onClick={() => setMaterialView("slide")}
                disabled={!materialPdfPath}
              >
                🖼️ Slide
              </button>
              {showingSlide && (
                <button
                  type="button"
                  className="simulasi-split-expand-btn"
                  onClick={() => setSlideExpanded((v) => !v)}
                  aria-pressed={slideExpanded}
                  title="Perbesar slide"
                >
                  ⤢
                </button>
              )}
            </div>
            )}

            <div className="simulasi-split-content">
              {materialView === "notes" ? (
                cheatSheet ? (
                  <p className="simulasi-split-notes-text">{cheatSheet}</p>
                ) : (
                  <p className="simulasi-split-empty">Belum ada notes untuk sesi ini.</p>
                )
              ) : slideError ? (
                <p className="simulasi-split-empty">{slideError}</p>
              ) : slideUrl ? (
                <SlideViewer url={slideUrl} expanded={slideExpanded} tone="light" />
              ) : materialPdfPath ? (
                <p className="simulasi-split-empty">Memuat slide...</p>
              ) : (
                <p className="simulasi-split-empty">Materi PDF tidak tersedia untuk sesi ini.</p>
              )}
            </div>
          </div>
        </div>
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
        {isInterview
          ? isRecording
            ? isLastQuestion
              ? "Pertanyaan terakhir — tekan selesai kalau jawabanmu sudah tuntas."
              : "Jawab pertanyaan di atas, lalu lanjut ke pertanyaan berikutnya."
            : "Pewawancara sudah siap. Tekan tombol rekam buat mulai wawancara."
          : isRecording
            ? "Lagi rekam — tekan tombol lagi kalau sudah selesai."
            : "Tekan tombol rekam buat mulai latihan."}
      </p>

      {/* Saat wawancara sedang berjalan, tombol utamanya jadi navigasi
          pertanyaan — tombol bulat merah cuma dipakai untuk MEMULAI supaya
          tidak ada dua kontrol berhenti yang membingungkan. */}
      {isInterview && isRecording ? (
        <button
          type="button"
          className="btn-simulasi-lanjut simulasi-question-cta"
          onClick={() => (isLastQuestion ? handleToggle() : setQIndex((i) => i + 1))}
        >
          {isLastQuestion ? "Selesai Wawancara" : "Pertanyaan Berikutnya"}
        </button>
      ) : (
        <button
          type="button"
          className={`simulasi-btn-record ${isRecording ? "is-recording" : ""}`}
          onClick={handleToggle}
          disabled={!stream}
          aria-label={isRecording ? "Berhenti rekam" : "Mulai rekam"}
        >
          {isRecording ? <span className="simulasi-record-stop" /> : <span className="simulasi-record-dot-icon" />}
        </button>
      )}
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
  const [questions, setQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [results, setResults] = useState(null);
  const { xp, addXp, refreshProgress, isInitialized } = useUserProgress();

  const resetToPicker = () => {
    setScenario(null);
    setSelectedScenario(null);
    setSimulationId(null);
    setSessionId(null);
    setNotes("");
    setMaterialPdfPath(null);
    setTopics([]);
    setQuestions([]);
    setQuestionsLoading(false);
    setStep("picker");
  };

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

  const handleMaterialUpload = async (file) => {
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
      const text =
        scenario.kategori === "interview" ? await analyzeCv(simulationId, pdfPath) : await generateNotes(simulationId, pdfPath);

      if (!text) {
        setStep("manual-notes");
        return;
      }
      if (scenario.kategori !== "interview") setNotes(text);
      await beginSessionForPrep();
    } catch (err) {
      // Edge Function returns 422 when the PDF/CV couldn't be parsed (e.g. a
      // scanned image) — edge case 11.1: fall back to a manual text-area,
      // don't cancel the session.
      const status = err?.context?.status ?? err?.status;
      if (status === 422) {
        setStep("manual-notes");
        return;
      }
      setErrorMessage(friendlySimulasiError(err));
      setStep("upload");
    }
  };

  const handleManualNotes = async (text) => {
    setErrorMessage("");
    setStep("processing-materials");
    try {
      await saveManualMaterialText(simulationId, scenario.kategori, text);
      if (scenario.kategori !== "interview") setNotes(text);
      await beginSessionForPrep();
    } catch (err) {
      setErrorMessage(friendlySimulasiError(err));
      setStep("manual-notes");
    }
  };

  const beginSessionForPrep = async () => {
    const newSessionId = crypto.randomUUID();
    await createSessionRow({ id: newSessionId, simulationId });
    setSessionId(newSessionId);
    setStep("prep");

    // Interview butuh daftar pertanyaan sebelum sesi mulai. Diambil di
    // BELAKANG layar prep (bukan ditambahkan ke loading upload) supaya
    // waktu tunggunya tertutup sambil user mengecek kamera — tombol "Mulai
    // Simulasi" yang menunggu hasilnya, bukan layar penuh.
    if (scenario.kategori === "interview") {
      setQuestionsLoading(true);
      try {
        const generated = await fetchGeneratedQuestions(newSessionId, "interview");
        setQuestions(generated);
      } catch {
        // Bukan blocker: kalau gagal, sesi tetap jalan sebagai rekaman
        // tunggal seperti kategori lain (lihat RecordingStep) daripada
        // menggagalkan wawancara yang materinya sudah diproses.
        setQuestions([]);
      } finally {
        setQuestionsLoading(false);
      }
    }
  };

  const handleRecordingFinished = async (audioBlob, durationSeconds) => {
    setStep("processing");
    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr || !user) throw new Error("Sesi login tidak ditemukan, coba masuk ulang.");

      const audioPath = await uploadSessionAudio(user.id, sessionId, audioBlob);
      await updateSessionAudio(sessionId, audioPath);
      await runAnalysis({ sessionId, audioPath, durationSeconds });
      const data = await fetchSessionResults(sessionId);
      await markSimulationCompleted(simulationId);
      refreshProgress();

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
        onBack={() => setStep(scenario.needsUpload ? "prep" : "topic")}
        onFinish={handleRecordingFinished}
        onAbandon={resetToPicker}
      />
    );
  }

  if (step === "processing") {
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
        <p className="simulasi-processing-title">Menganalisis rekamanmu...</p>
        <p className="simulasi-processing-sub">
          AI kami lagi dengerin cara kamu ngomong. Ini butuh beberapa detik.
        </p>
      </div>
    );
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
