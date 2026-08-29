import React, { useEffect, useRef, useState } from "react";
import "./SimulasiScreen.css";
import arrowLeftIcon from "../assets/pages_assets/questionnaires/arrow_left.svg";
import iconNavHome from "../assets/pages_assets/bottom-nav-icons/Home.svg";
import iconNavMic from "../assets/pages_assets/bottom-nav-icons/Mic.svg";
import iconNavUser from "../assets/pages_assets/bottom-nav-icons/User.svg";
import iconNavGroup from "../assets/pages_assets/practice/icon_group.svg";
import { supabase } from "../lib/supabaseClient";
import {
  SCENARIOS,
  createSimulation,
  markSimulationCompleted,
  validateMaterialFile,
  uploadMaterial,
  generateNotes,
  analyzeCv,
  saveManualMaterialText,
  fetchGeneratedQuestions,
  createSessionRow,
  updateSessionAudio,
  uploadSessionAudio,
  runAnalysis,
  fetchSessionResults,
  friendlySimulasiError,
} from "../lib/simulasi";
import { fetchXp } from "../lib/progress";
import { goLive } from "../lib/sosial";

// ─── Simple category icons (placeholder — real Figma illustrations weren't
// exportable this round; swap for real assets when available) ─────────────
function ScenarioIcon({ id }) {
  if (id === "spontan") {
    return (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="14" cy="14" r="13" fill="#FFF3E0" />
        <path d="M15.5 6L9 15.5H13.5L12.5 22L19 12H14.5L15.5 6Z" fill="#E8753D" />
      </svg>
    );
  }
  if (id === "presentasi") {
    return (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="14" cy="14" r="13" fill="#EFF8FF" />
        <rect x="6" y="8" width="16" height="10" rx="1.5" stroke="#2E7FE8" strokeWidth="1.6" />
        <path d="M10 22L14 18L18 22" stroke="#2E7FE8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9.5 15L12 12.5L14.2 14.5L18.5 10.5" stroke="#2E7FE8" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="14" cy="14" r="13" fill="#F0FBF8" />
      <circle cx="10.5" cy="12" r="2.6" stroke="#24A981" strokeWidth="1.6" />
      <circle cx="17.5" cy="12" r="2.6" stroke="#17674F" strokeWidth="1.6" />
      <path d="M6 21c0.5-2.5 2.2-4 4.5-4s4 1.5 4.5 4" stroke="#24A981" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M13.5 21c0.5-2.5 2.2-4 4.5-4s4 1.5 4.5 4" stroke="#17674F" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

// ─── Topic step (Spontan only — "Daily Spontaneous Speak") ────────────────
function TopicStep({ topics, loading, error, onBack, onStart }) {
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
          <>
            <p className="simulasi-topic-label">Topik kamu hari ini</p>
            {topics.map((t, i) => (
              <p key={i} className="simulasi-topic-text">
                “{t}”
              </p>
            ))}
          </>
        )}
      </div>

      <div className="simulasi-prep-cta">
        <button type="button" className="btn-simulasi-lanjut" onClick={onStart} disabled={loading}>
          Mulai
        </button>
      </div>
    </div>
  );
}

// ─── Upload step (Presentasi / Interview — PDF or CV) ──────────────────────
function UploadStep({ scenario, uploading, error, onBack, onSubmit }) {
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
function ManualNotesStep({ scenario, saving, onBack, onSubmit }) {
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
function PrepStep({ scenario, notes, error, questionsLoading = false, onBack, onStart }) {
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
          {questionsLoading ? "Menyiapkan pertanyaan..." : "Mulai Simulasi"}
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
            Langsung ke Sesi Berikutnya
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
function RecordingStep({ scenario, cheatSheet, questions = [], onBack, onFinish, onAbandon }) {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [camError, setCamError] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [showCheatSheet, setShowCheatSheet] = useState(false);
  const [qIndex, setQIndex] = useState(0);
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
            {showCheatSheet ? "Sembunyikan contekan" : "Lihat contekan"}
          </button>
        )}
        {cheatSheet && showCheatSheet && <div className="simulasi-cheatsheet-panel">{cheatSheet}</div>}
      </div>

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

// ─── Results step ───────────────────────────────────────────────────────────
function ResultsStep({ results, onDone, canGoLive, onGoLive }) {
  const metrics = results?.metrics;
  const feedback = results?.feedback;
  const sub = feedback?.sub_scores || {};
  const [goingLive, setGoingLive] = useState(false);
  const [goLiveError, setGoLiveError] = useState("");

  const handleGoLive = async () => {
    setGoingLive(true);
    setGoLiveError("");
    try {
      await onGoLive();
    } catch (err) {
      setGoLiveError(friendlySimulasiError(err));
      setGoingLive(false);
    }
  };

  return (
    <div className="simulasi-results-screen">
      <div className="simulasi-results-body">
        <p className="simulasi-results-eyebrow">Mantap!</p>
        <h1 className="simulasi-results-title">Kamu keren!</h1>
        <p className="simulasi-results-sub">
          {feedback?.motivasi ||
            "Dengan latihan yang konsisten, kamu akan semakin mahir dan percaya diri dalam berbicara."}
        </p>

        <div className="simulasi-metrics-grid">
          <div className="simulasi-metric-card">
            <span className="simulasi-metric-label">Kata Pengisi (Filler Word)</span>
            <span className="simulasi-metric-value">
              {metrics?.filler_word_count ?? "–"} <small>kali</small>
            </span>
          </div>
          <div className="simulasi-metric-card">
            <span className="simulasi-metric-label">Kecepatan (Pace)</span>
            <span className="simulasi-metric-value">
              {metrics?.pace_wpm != null ? Math.round(metrics.pace_wpm) : "–"} <small>wpm</small>
            </span>
          </div>
          <div className="simulasi-metric-card">
            <span className="simulasi-metric-label">Kejelasan (Articulation)</span>
            <span className="simulasi-metric-value">
              {sub.fluency ?? "–"} <small>/100</small>
            </span>
          </div>
          <div className="simulasi-metric-card">
            <span className="simulasi-metric-label">Energi &amp; Intonasi</span>
            <span className="simulasi-metric-value">
              {sub.intonasi ?? "–"} <small>/100</small>
            </span>
          </div>
        </div>

        {feedback?.saran?.length > 0 && (
          <div className="simulasi-saran-block">
            <h3 className="simulasi-saran-heading">Saran buat kamu</h3>
            <ul className="simulasi-saran-list">
              {feedback.saran.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="simulasi-results-cta">
        {canGoLive && (
          <>
            {goLiveError && <p className="simulasi-error-banner">{goLiveError}</p>}
            <button type="button" className="btn-simulasi-golive" onClick={handleGoLive} disabled={goingLive}>
              {goingLive ? "Menyiapkan..." : "🔴 Jadikan Live"}
            </button>
          </>
        )}
        <button type="button" className="btn-simulasi-lanjut" onClick={onDone}>
          Lanjut
        </button>
      </div>
    </div>
  );
}

// ─── Main orchestrator ──────────────────────────────────────────────────────
export default function SimulasiScreen({ onNavigateHome, onNavigateSosial, onNavigateProfile, userName, onGoLive }) {
  // picker | creating | topic | upload | processing-materials | manual-notes
  // | prep | recording | processing | results
  const [step, setStep] = useState("picker");
  const [scenario, setScenario] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [simulationId, setSimulationId] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [notes, setNotes] = useState("");
  const [topics, setTopics] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [xp, setXp] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active || !user) return;
      try {
        const value = await fetchXp(user.id);
        if (active) setXp(value);
      } catch {
        // Non-critical widget — badge just stays at 0 on failure.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const resetToPicker = () => {
    setScenario(null);
    setSimulationId(null);
    setSessionId(null);
    setNotes("");
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
      // a session_id to attach the AI-generated topic banner to.
      const newSessionId = crypto.randomUUID();
      await createSessionRow({ id: newSessionId, simulationId: simulation.id });
      setSessionId(newSessionId);
      const generated = await fetchGeneratedQuestions(newSessionId, "spontan");
      setTopics(generated);
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

      setResults(data);
      setStep("results");
    } catch (err) {
      setErrorMessage(friendlySimulasiError(err));
      resetToPicker();
    }
  };

  if (step === "creating") {
    return (
      <div className="simulasi-processing-screen">
        <div className="simulasi-processing-spinner" />
        <p className="simulasi-processing-title">Menyiapkan sesi...</p>
      </div>
    );
  }

  if (step === "topic" && scenario) {
    return (
      <TopicStep
        topics={topics}
        loading={false}
        error={errorMessage}
        onBack={resetToPicker}
        onStart={() => setStep("recording")}
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
        <div className="simulasi-processing-spinner" />
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
        <div className="simulasi-processing-spinner" />
        <p className="simulasi-processing-title">Menganalisis rekamanmu...</p>
        <p className="simulasi-processing-sub">
          AI kami lagi dengerin cara kamu ngomong. Ini butuh beberapa detik.
        </p>
      </div>
    );
  }

  if (step === "results" && results) {
    const canGoLive = scenario?.kategori === "kelas" || scenario?.kategori === "lomba";
    return (
      <ResultsStep
        results={results}
        onDone={() => {
          setResults(null);
          resetToPicker();
        }}
        canGoLive={canGoLive}
        onGoLive={async () => {
          const room = await goLive(sessionId);
          onGoLive?.({
            roomId: room.id,
            hostId: room.host_id,
            sessionId: room.session_id,
            title: `Live: ${userName || "Latihan Presentasi"}`,
            hostName: userName || "Kamu",
          });
        }}
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
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              type="button"
              className="simulasi-scenario-card"
              onClick={() => handlePick(s)}
            >
              <span className="simulasi-scenario-icon">
                <ScenarioIcon id={s.id} />
              </span>
              <span className="simulasi-scenario-text">
                <span className="simulasi-scenario-title">{s.title}</span>
                <span className="simulasi-scenario-desc">{s.description}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

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
