import React, { useState, useRef, useEffect } from "react";
import "./LessonModul7Screen.css";
import LessonExitModal from "./LessonExitModal";
import LessonAffirmation from "./LessonAffirmation";
import { useAssetPreloader, useGainXpPreloader, getPreloadedVideoSrc } from "../lib/assetPreloader";
import { useUserProgress } from "../context/UserProgressContext";
import { supabase } from "../lib/supabaseClient";
import {
  createSimulation,
  createSessionRow,
  uploadSessionAudio,
  updateSessionAudio,
  runAnalysis,
  fetchSessionResults,
  markSimulationCompleted,
  friendlySimulasiError,
} from "../lib/simulasi";

// ─── Assets for Modul 7 Lesson 6 ─────────────────────────────────────────────
import imgBlankTotal from "../assets/pages_assets/lessons/lesson-6-modul7/Image-BlankTotal.png";
import imgPanik from "../assets/pages_assets/lessons/lesson-6-modul7/Image-Panik-Page1.png";
import imgGakKompeten from "../assets/pages_assets/lessons/lesson-6-modul7/Image-GakKompeten-Page1.png";
import imgBrain from "../assets/pages_assets/lessons/lesson-6-modul7/Image-Brain.png";
import imgMascottQuotes from "../assets/pages_assets/lessons/lesson-6-modul7/Image-Mascott-Quotes.png";
import imgMascottSenyum from "../assets/pages_assets/lessons/lesson-6-modul7/Image-Mascott-SenyumJahat.png";
import imgMascottKhawatir from "../assets/pages_assets/lessons/lesson-6-modul7/Image-Mascott-Khawatir.png";
import videoHappySpeaker from "../assets/pages_assets/lessons/lesson-6-modul7/Video-Happy-Speaker.webm";
import videoGainXP from "../assets/pages_assets/gain_xp/Video-Gain-XP.webm";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import animaBotLottie from "../assets/lotties/AnimaBot.lottie";
import imgAnalysisHero from "../assets/pages_assets/ai_analysis/analysis_hero.png";
import iconArgument from "../assets/pages_assets/ai_analysis/Icons/Argument-Icon.svg";
import iconRelevance from "../assets/pages_assets/ai_analysis/Icons/Relevance-Icon.svg";
import iconSpeed from "../assets/pages_assets/ai_analysis/Icons/Speed-Icon.svg";
import iconQuote from "../assets/pages_assets/ai_analysis/Icons/Quote-Icon.svg";
import iconMouth from "../assets/pages_assets/ai_analysis/Icons/Mouth-Icon.svg";
import iconFlash from "../assets/pages_assets/ai_analysis/Icons/Flash-Icon.svg";
import iconAI from "../assets/pages_assets/ai_analysis/Icons/AI.svg";

const MODUL7_ASSETS = [
  imgBlankTotal,
  imgPanik,
  imgGakKompeten,
  imgBrain,
  imgMascottQuotes,
  imgMascottSenyum,
  imgMascottKhawatir,
  videoHappySpeaker,
  videoGainXP,
  imgAnalysisHero,
  iconArgument,
  iconRelevance,
  iconSpeed,
  iconQuote,
  iconMouth,
  iconFlash,
  iconAI,
];

// ─── Practice scenario content (Figma frames after node 334:1838) ────────────
const PRACTICE_FLOW_STEPS = [
  "Mendapatkan tema secara acak",
  "Siapkan 3 poin untuk argumenmu",
  "Mini-presentation",
  "Transisi Q&A",
  "Pertanyaan menantang",
  "Feedback",
];

const PRACTICE_TOPIC =
  "“Apakah belajar sambil mendengarkan musik membuatmu lebih fokus?”";

const PRACTICE_OUTLINE_HINTS = [
  "Pendapat utama: aku setuju/tidak setuju karena…",
  "Alasan atau contoh yang mendukung…",
  "Kesimpulan atau solusi yang bisa dilakukan…",
];

// Below this, an early "Selesai Bicara" click is treated as "belum selesai"
// rather than a real finish — same rationale/threshold as SimulasiScreen's
// RecordingStep. Applies to the opinion statement (120s budget) and both
// Q&A answers (60s budget) alike.
const MIN_SEGMENT_SECONDS = 10;

const PRACTICE_QUESTIONS = [
  "“Kamu bilang musik membantu fokus. Bagaimana kamu membuktikan bahwa fokusmu meningkat karena musik, bukan karena kamu memang sedang mengerjakan tugas yang lebih mudah atau sedang lebih termotivasi hari itu?”",
  "“Bagaimana kalau musik memang membuatmu sanggup belajar lebih lama, tetapi hasil akhirnya tidak lebih baik—misalnya kamu menghabiskan waktu dua jam, tetapi lebih sedikit materi yang benar-benar kamu ingat? Mana yang seharusnya menjadi ukuran fokus: durasi belajar atau kualitas pemahaman?”",
];

// Fallback shown only if the real analyze-session/generate-feedback call
// fails (or the mic couldn't be captured) and the user chooses to skip
// past the error instead of retrying — see AnalysisErrorScreen below.
const PRACTICE_ANALYSIS = {
  scores: [
    {
      id: "argumen",
      icon: iconArgument,
      label: "Argumen",
      value: 88,
      unit: "/ 100",
      note: "Pendapatmu jelas dan didukung alasan yang relevan.",
      chip: "Kuat",
      chipTone: "good",
    },
    {
      id: "relevansi",
      icon: iconRelevance,
      label: "Relevansi",
      value: 88,
      unit: "/ 100",
      note: "Pendapatmu jelas dan didukung alasan yang relevan.",
      chip: "Relevan",
      chipTone: "good",
    },
  ],
  metrics: [
    {
      id: "kata-pengisi",
      icon: iconQuote,
      label: "Kata Pengisi",
      value: 20,
      unit: "Kali",
      chip: "Perlu Latihan",
      chipTone: "warn",
      valueTone: "warn",
    },
    {
      id: "kecepatan",
      icon: iconSpeed,
      label: "Kecepatan",
      value: 146,
      unit: "wpm",
      chip: "Stabil",
      chipTone: "good",
    },
    {
      id: "kejelasan",
      icon: iconMouth,
      label: "Kejelasan",
      value: 88,
      unit: "/ 100",
      chip: "Baik",
      chipTone: "good",
    },
    {
      id: "energi",
      icon: iconFlash,
      label: "Energi & Intonasi",
      value: 58,
      unit: "/ 100",
      chip: "Perlu Latihan",
      chipTone: "warn",
      valueTone: "warn",
    },
  ],
  feedback:
    "Kamu sudah menjawab pertanyaan dengan relevan dan menyampaikan argumen yang cukup kuat. Fokus berikutnya: Kurangi kata pengisi saat berpindah dari satu alasan ke alasan berikutnya.",
};

// Maps the real { metrics, feedback } rows from analyze-session +
// generate-feedback (fetchSessionResults) onto the shape PracticeAnalysis
// already renders. Same fields SimulasiScreen's ResultsStep reads: filler
// word count / pace from simulation_metrics, sub_scores from
// simulation_feedback (fluency, intonasi, kesesuaian_materi, skor).
function mapSessionResultToAnalysis({ metrics, feedback } = {}) {
  const sub = feedback?.sub_scores || {};
  const skor = feedback?.skor ?? null;
  const kesesuaian = sub.kesesuaian_materi ?? null;
  const fluency = sub.fluency ?? null;
  const intonasi = sub.intonasi ?? null;
  const fillerCount = metrics?.filler_word_count ?? null;
  const paceWpm = metrics?.pace_wpm != null ? Math.round(metrics.pace_wpm) : null;
  const good = (v) => v != null && v >= 70;

  return {
    scores: [
      {
        id: "argumen",
        icon: iconSpeed,
        label: "Argumen",
        value: skor ?? "–",
        unit: skor != null ? "/ 100" : "",
        note: feedback?.saran?.[0] || "Terus asah caramu menyusun argumen.",
        chip: good(skor) ? "Kuat" : "Perlu Latihan",
        chipTone: good(skor) ? "good" : "warn",
      },
      {
        id: "relevansi",
        icon: iconSpeed,
        label: "Relevansi",
        value: kesesuaian ?? "–",
        unit: kesesuaian != null ? "/ 100" : "",
        note: feedback?.saran?.[1] || "Pastikan jawabanmu tetap nyambung ke pertanyaan.",
        chip: good(kesesuaian) ? "Relevan" : "Perlu Latihan",
        chipTone: good(kesesuaian) ? "good" : "warn",
      },
    ],
    metrics: [
      {
        id: "kata-pengisi",
        icon: iconQuote,
        label: "Kata Pengisi",
        value: fillerCount ?? "–",
        unit: "Kali",
        chip: fillerCount != null && fillerCount <= 10 ? "Terkendali" : "Perlu Latihan",
        chipTone: fillerCount != null && fillerCount <= 10 ? "good" : "warn",
        valueTone: fillerCount != null && fillerCount <= 10 ? undefined : "warn",
      },
      {
        id: "kecepatan",
        icon: iconSpeed,
        label: "Kecepatan",
        value: paceWpm ?? "–",
        unit: "wpm",
        chip: paceWpm != null && paceWpm >= 110 && paceWpm <= 160 ? "Stabil" : "Perlu Latihan",
        chipTone: paceWpm != null && paceWpm >= 110 && paceWpm <= 160 ? "good" : "warn",
      },
      {
        id: "kejelasan",
        icon: iconMouth,
        label: "Kejelasan",
        value: fluency ?? "–",
        unit: fluency != null ? "/ 100" : "",
        chip: good(fluency) ? "Baik" : "Perlu Latihan",
        chipTone: good(fluency) ? "good" : "warn",
      },
      {
        id: "energi",
        icon: iconFlash,
        label: "Energi & Intonasi",
        value: intonasi ?? "–",
        unit: intonasi != null ? "/ 100" : "",
        chip: good(intonasi) ? "Baik" : "Perlu Latihan",
        chipTone: good(intonasi) ? "good" : "warn",
      },
    ],
    feedback:
      [feedback?.motivasi, ...(feedback?.saran || []).slice(0, 2)].filter(Boolean).join(" ") ||
      "Kerja bagus! Terus berlatih supaya makin percaya diri.",
  };
}

// Every page of the lesson, in order — used to drive the progress bar.
const TOTAL_LESSON_STEPS = 17;

// ─── Back Arrow Icon ─────────────────────────────────────────────────────────
const IconArrowLeft = ({ color = "#243238" }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ─── Countdown helper — ticks once a second, fires onComplete at zero ────────
function useCountdown(seconds, onComplete) {
  const [remaining, setRemaining] = useState(seconds);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const left = seconds - Math.floor((Date.now() - startedAt) / 1000);
      if (left <= 0) {
        clearInterval(timer);
        setRemaining(0);
        onCompleteRef.current?.();
      } else {
        setRemaining(left);
      }
    }, 250);
    return () => clearInterval(timer);
  }, [seconds]);

  return remaining;
}

const formatClock = (totalSeconds) => {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
};

// ─── Animated voice bars shown while the user is speaking ────────────────────
const VoiceWave = () => (
  <div className="modul7-voice-wave" aria-hidden="true">
    <span className="modul7-voice-bar" />
    <span className="modul7-voice-bar" />
    <span className="modul7-voice-bar" />
    <span className="modul7-voice-bar" />
    <span className="modul7-voice-bar" />
  </div>
);

// ─── Listens to the mic while `active` and tracks whether any speech-level
// volume was heard. A ref (not state) so the RAF loop doesn't re-render. ────
function useSpeechCapture(active) {
  const detectedRef = useRef(false);

  useEffect(() => {
    if (!active) return undefined;
    detectedRef.current = false;

    let cancelled = false;
    let audioCtx;
    let rafId;
    let stream;

    const SILENCE_THRESHOLD = 12;

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("no getUserMedia");
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        audioCtx.createMediaStreamSource(stream).connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          analyser.getByteFrequencyData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) sum += data[i];
          if (sum / data.length > SILENCE_THRESHOLD) detectedRef.current = true;
          rafId = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        // No mic permission / no device — treated as silence when the
        // recording ends, which is exactly the state we want to surface.
      }
    })();

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      stream?.getTracks().forEach((track) => track.stop());
      audioCtx?.close?.().catch(() => {});
    };
  }, [active]);

  return detectedRef;
}

// ─── Overlay shown when "Selesai Bicara" is pressed too early (speech WAS
// heard, but well under MIN_SEGMENT_SECONDS). Renders ON TOP of the still-
// mounted recording screen underneath rather than replacing it, so
// "Lanjutkan" is just closing this overlay — the countdown/mic never
// stopped, nothing to resume from a saved state. ─────────────────────────
function PracticeIncompleteGate({ elapsedSeconds, onResume, onRestart, onSkip }) {
  return (
    <div className="modul7-gate-backdrop">
      <div className="modul7-gate-sheet">
        <h2 className="modul7-gate-title">Sesi kamu belum selesai</h2>
        <p className="modul7-gate-desc">
          Baru {elapsedSeconds} detik ngomong — hasil analisisnya bisa kurang akurat kalau dipotong sekarang. Mau gimana?
        </p>
        <div className="modul7-gate-actions">
          <button type="button" className="btn-modul7-next" onClick={onResume}>
            Lanjutkan Rekaman
          </button>
          <button type="button" className="btn-modul7-gate-secondary" onClick={onRestart}>
            Ulangi dari Awal
          </button>
          <button type="button" className="btn-modul7-gate-ghost" onClick={onSkip}>
            Langsung ke Sesi Berikutnya
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── "Suaramu tidak terdengar..." — shown when a recording step ends with no
// speech-level audio captured (mic muted/blocked/silent). ────────────────────
function NoVoiceDetected({ step, questionIndex, onBack, onRetry, onSkip, skipLabel }) {
  return (
    <div className="modul7-lesson-page modul7-dark-page" data-name="Practice-Suara Tidak Terdengar">
      <LessonTopBar currentStep={step} totalSteps={TOTAL_LESSON_STEPS} onBack={onBack} tone="dark" />

      {questionIndex != null && (
        <p className="modul7-practice-counter">
          {questionIndex + 1}/{PRACTICE_QUESTIONS.length}
        </p>
      )}

      <div className="modul7-lesson-content modul7-practice-bridge-content">
        <img src={imgMascottKhawatir} alt="" className="modul7-practice-bridge-img" />

        <div className="modul7-practice-bridge-text">
          <h2 className="modul7-practice-bridge-title">Suaramu tidak terdengar...</h2>
          <p className="modul7-practice-bridge-desc">
            Pastikan mikrofonmu aktif dan tidak tertutup. Kalau semuanya sudah siap, kita bisa mulai lagi.
          </p>
        </div>
      </div>

      <div className="modul7-lesson-cta-wrapper modul7-lesson-cta-wrapper--dark modul7-cta-with-hint">
        <button type="button" className="btn-modul7-next" onClick={onRetry}>
          Ulangi lagi
        </button>
        <button type="button" className="modul7-novoice-skip" onClick={onSkip}>
          {skipLabel}
        </button>
      </div>
    </div>
  );
}

// ─── TopBar with progress bar ─────────────────────────────────────────────────
function LessonTopBar({ currentStep, totalSteps, onBack, tone = "light" }) {
  const progress = (currentStep / totalSteps) * 100;
  return (
    <div
      className={`modul7-lesson-topbar${tone === "dark" ? " modul7-lesson-topbar--dark" : ""}`}
      data-node-id="329:1660"
    >
      <button
        type="button"
        className="modul7-lesson-back-btn"
        onClick={onBack}
        aria-label="Kembali"
        data-node-id="339:2630"
      >
        <IconArrowLeft color={tone === "dark" ? "#FFFFFF" : "#243238"} />
      </button>
      <div className="modul7-lesson-progress-bar" data-node-id="329:1665">
        <div className="modul7-lesson-progress-track" data-node-id="329:1666">
          <div
            className="modul7-lesson-progress-fill"
            style={{ width: `${progress}%` }}
            data-node-id="329:1667"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Page 1: Pernah nggak ngerasa... (Figma node 329:1659) ───────────────────
function LessonPage1({ onNext, onBack }) {
  return (
    <div className="modul7-lesson-page" data-node-id="329:1659" data-name="Lesson-Hadapi Pertanyaan Menantang">
      <LessonTopBar currentStep={1} totalSteps={TOTAL_LESSON_STEPS} onBack={onBack} />

      <div className="modul7-lesson-content" data-node-id="329:1669">
        <h2 className="modul7-lesson-heading" data-node-id="329:1670">
          Pernah nggak ngerasa...
        </h2>

        <div className="modul7-cards-wrapper" data-node-id="329:1683">
          {/* Card 1: Blank total */}
          <div className="modul7-feeling-card" data-node-id="329:1684">
            <div className="modul7-card-img-container" data-node-id="329:1685">
              <img
                src={imgBlankTotal}
                alt="Blank total saat ditanya hal yang nggak kamu siapkan"
                className="modul7-card-img"
              />
            </div>
            <p className="modul7-card-text" data-node-id="329:1686">
              Blank total saat ditanya hal yang nggak kamu siapkan?
            </p>
          </div>

          {/* Card 2: Jawaban belibet */}
          <div className="modul7-feeling-card" data-node-id="329:1687">
            <div className="modul7-card-img-container" data-node-id="329:1688">
              <img
                src={imgPanik}
                alt="Jawaban jadi belibet karena keburu panik"
                className="modul7-card-img"
              />
            </div>
            <p className="modul7-card-text" data-node-id="329:1689">
              Jawaban jadi belibet karena keburu panik?
            </p>
          </div>

          {/* Card 3: Takut nggak kompeten */}
          <div className="modul7-feeling-card" data-node-id="329:1690">
            <div className="modul7-card-img-container" data-node-id="329:1691">
              <img
                src={imgGakKompeten}
                alt="Takut kelihatan nggak kompeten di depan orang lain"
                className="modul7-card-img"
              />
            </div>
            <p className="modul7-card-text" data-node-id="329:1692">
              Takut kelihatan nggak kompeten di depan orang lain?
            </p>
          </div>
        </div>
      </div>

      {/* Fixed bottom CTA Button */}
      <div className="modul7-lesson-cta-wrapper">
        <button
          type="button"
          className="btn-modul7-next"
          onClick={onNext}
          data-node-id="329:1680"
        >
          Lanjut
        </button>
      </div>
    </div>
  );
}

// ─── Page 2: Quotes / Mindset (Figma node 329:1710) ──────────────────────────
function LessonPage2({ onNext, onBack }) {
  return (
    <div className="modul7-lesson-page modul7-lesson-page-2" data-node-id="329:1710" data-name="Lesson-Hadapi Pertanyaan Menantang">
      <LessonTopBar currentStep={2} totalSteps={TOTAL_LESSON_STEPS} onBack={onBack} />

      {/* Center Quotes Area */}
      <div className="modul7-page2-content" data-node-id="329:1719">
        <p className="modul7-page2-quote text-quotes" data-node-id="329:1720">
          ”Menghadapi pertanyaan sulit bukan berarti kita harus jadi kamus berjalan. Tantangan sebenarnya adalah bagaimana kita tetap tenang saat otak dipaksa berpikir cepat di hadapan orang lain.”
        </p>
      </div>

      {/* Bottom Mascot Illustration */}
      <div className="modul7-page2-mascot-wrapper" data-node-id="331:1763">
        <img
          src={imgMascottQuotes}
          alt="Mascot Quotes"
          className="modul7-page2-mascot-img"
        />
      </div>

      {/* Dual Bottom Buttons (Back pill + Lanjut pill) */}
      <div className="modul7-page2-cta-wrapper" data-node-id="338:2221">
        <button
          type="button"
          className="btn-modul7-round-back"
          onClick={onBack}
          aria-label="Kembali ke halaman sebelumnya"
          data-node-id="338:2222"
        >
          <IconArrowLeft />
        </button>
        <button
          type="button"
          className="btn-modul7-next btn-modul7-next--flex"
          onClick={onNext}
          data-node-id="338:2227"
        >
          Lanjut
        </button>
      </div>
    </div>
  );
}

// ─── Dotted Arrow Connector ──────────────────────────────────────────────────
const DottedArrow = () => (
  <div className="modul7-arrow-divider" aria-hidden="true" data-node-id="332:1776">
    <svg width="12" height="34" viewBox="0 0 12 34" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M6 0V26"
        stroke="#243238"
        strokeWidth="1.5"
        strokeDasharray="2 3"
        strokeLinecap="round"
      />
      <path
        d="M2.5 23L6 28L9.5 23"
        stroke="#243238"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </div>
);

// ─── Page 3: Cognitive Restructuring (Figma node 329:1733) ───────────────────
function LessonPage3({ onNext, onBack }) {
  return (
    <div className="modul7-lesson-page" data-node-id="329:1733" data-name="Lesson-Hadapi Pertanyaan Menantang">
      <LessonTopBar currentStep={3} totalSteps={TOTAL_LESSON_STEPS} onBack={onBack} />

      <div className="modul7-lesson-content modul7-page3-content" data-node-id="329:1742">
        {/* Title Header */}
        <div className="modul7-page3-header" data-node-id="334:1833">
          <p className="modul7-page3-subtitle" data-node-id="334:1831">
            Cognitive Restructuring
          </p>
          <h2 className="modul7-page3-title" data-node-id="329:1746">
            Pikiran itu belum<br />tentu fakta
          </h2>
        </div>

        {/* Cognitive Comparison Cards */}
        <div className="modul7-page3-cards-container" data-node-id="332:1780">
          {/* Dark Thought Card */}
          <div className="modul7-thought-card-dark" data-node-id="329:1748">
            <div className="modul7-brain-img-wrap" data-node-id="332:1774">
              <img
                src={imgBrain}
                alt="Brain"
                className="modul7-brain-img"
              />
            </div>
            <p className="modul7-thought-text-dark" data-node-id="329:1754">
              “Mereka pasti menilaiku buruk karena aku nggak bisa langsung menjawab pertanyaan ini.”
            </p>
          </div>

          {/* Dotted Arrow Connector */}
          <DottedArrow />

          {/* Fact Card */}
          <div className="modul7-fact-card-white" data-node-id="329:1756">
            <h3 className="modul7-fact-card-label" data-node-id="332:1782">
              Fakta Sebenarnya
            </h3>
            <p className="modul7-fact-card-text" data-node-id="329:1757">
              “Orang lain paham ini pertanyaan sulit. Yang paling penting bukan kecepatan menjawab, tapi kemampuanku untuk tetap tenang dan fokus memprosesnya.”
            </p>
          </div>
        </div>
      </div>

      {/* Dual Bottom Buttons */}
      <div className="modul7-page2-cta-wrapper" data-node-id="338:2185">
        <button
          type="button"
          className="btn-modul7-round-back"
          onClick={onBack}
          aria-label="Kembali ke halaman sebelumnya"
          data-node-id="338:2186"
        >
          <IconArrowLeft />
        </button>
        <button
          type="button"
          className="btn-modul7-next btn-modul7-next--flex"
          onClick={onNext}
          data-node-id="338:2191"
        >
          Lanjut
        </button>
      </div>
    </div>
  );
}

// ─── Short Dotted Arrow Connector ───────────────────────────────────────────
const DottedArrowShort = () => (
  <div className="modul7-arrow-divider-short" aria-hidden="true">
    <svg width="12" height="23" viewBox="0 0 12 23" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M6 0V15"
        stroke="#243238"
        strokeWidth="1.5"
        strokeDasharray="2 3"
        strokeLinecap="round"
      />
      <path
        d="M2.5 12L6 17L9.5 12"
        stroke="#243238"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </div>
);

// ─── Page 4: Cognitive Defusion (Figma node 333:1784) ────────────────────────
function LessonPage4({ onNext, onBack }) {
  return (
    <div className="modul7-lesson-page" data-node-id="333:1784" data-name="Lesson-Hadapi Pertanyaan Menantang">
      <LessonTopBar currentStep={4} totalSteps={TOTAL_LESSON_STEPS} onBack={onBack} />

      <div className="modul7-lesson-content modul7-page4-content" data-node-id="333:1793">
        {/* Title Header */}
        <div className="modul7-page4-header" data-node-id="334:1834">
          <p className="modul7-page4-subtitle" data-node-id="334:1835">
            Cognitive Defusion
          </p>
          <h2 className="modul7-page4-title" data-node-id="334:1836">
            Kamu nggak harus<br />percaya tiap pikiran
          </h2>
        </div>

        {/* Defusion Flow Container */}
        <div className="modul7-page4-cards-container" data-node-id="333:1795">
          {/* Dark Catastrophizing Thought Card */}
          <div className="modul7-thought-card-dark" data-node-id="333:1796">
            <div className="modul7-brain-img-wrap" data-node-id="333:1797">
              <img
                src={imgBrain}
                alt="Brain"
                className="modul7-brain-img"
              />
            </div>
            <p className="modul7-thought-text-dark" data-node-id="333:1798">
              “Gila, aku diam kelamaan pas ditanya. Habis sudah reputasiku, presentasiku pasti dianggap gagal total.”
            </p>
          </div>

          {/* Arrow 1 */}
          <DottedArrowShort />

          {/* Center Action Tag */}
          <p className="modul7-breath-tag" data-node-id="334:1811">
            Ambil napas 🧘
          </p>

          {/* Arrow 2 */}
          <DottedArrowShort />

          {/* White Reframed Card */}
          <div className="modul7-fact-card-white" data-node-id="333:1802">
            <h3 className="modul7-fact-card-label" data-node-id="333:1803">
              Ubah menjadi...
            </h3>
            <p className="modul7-fact-card-text" data-node-id="333:1804">
              ”Aku sedang mengamati pikiranku yang lagi muterin skenario 'reputasiku hancur' hanya karena aku butuh waktu 5 detik untuk mikir.”
            </p>
          </div>
        </div>
      </div>

      {/* Dual Bottom Buttons */}
      <div className="modul7-page2-cta-wrapper" data-node-id="338:2230">
        <button
          type="button"
          className="btn-modul7-round-back"
          onClick={onBack}
          aria-label="Kembali ke halaman sebelumnya"
          data-node-id="338:2231"
        >
          <IconArrowLeft />
        </button>
        <button
          type="button"
          className="btn-modul7-next btn-modul7-next--flex"
          onClick={onNext}
          data-node-id="338:2236"
        >
          Lanjut
        </button>
      </div>
    </div>
  );
}

// ─── Page 5: Conclusion / Empowering Mindset (Figma node 334:1816) ───────────
function LessonPage5({ onNext, onBack }) {
  return (
    <div className="modul7-lesson-page modul7-lesson-page-2" data-node-id="334:1816" data-name="Lesson-Hadapi Pertanyaan Menantang">
      <LessonTopBar currentStep={5} totalSteps={TOTAL_LESSON_STEPS} onBack={onBack} />

      {/* Center Quotes Area */}
      <div className="modul7-page2-content" data-node-id="334:1825">
        <p className="modul7-page2-quote text-quotes" data-node-id="334:1826">
          ”Saat pertanyaan sulit datang, pikiranmu akan mencoba membunyikan alarm palsu. Uji faktanya atau beri jarak pada paniknya. Ingat: kamu adalah pengendali panggungmu, bukan tawanan dari pikiranmu sendiri.”
        </p>
      </div>

      {/* Bottom Mascot Illustration */}
      <div className="modul7-page2-mascot-wrapper" data-node-id="334:1827">
        <img
          src={imgMascottQuotes}
          alt="Mascot Quotes"
          className="modul7-page2-mascot-img"
        />
      </div>

      {/* Dual Bottom Buttons */}
      <div className="modul7-page2-cta-wrapper" data-node-id="338:2239">
        <button
          type="button"
          className="btn-modul7-round-back"
          onClick={onBack}
          aria-label="Kembali ke halaman sebelumnya"
          data-node-id="338:2240"
        >
          <IconArrowLeft />
        </button>
        <button
          type="button"
          className="btn-modul7-next btn-modul7-next--flex"
          onClick={onNext}
          data-node-id="338:2245"
        >
          Lanjut
        </button>
      </div>
    </div>
  );
}

// ─── Page 6: Teknik Merespons Kritik (Figma node 334:1838) ───────────────────
function LessonPage6({ onNext, onBack }) {
  return (
    <div className="modul7-lesson-page" data-node-id="334:1838" data-name="Lesson-Hadapi Pertanyaan Menantang">
      <LessonTopBar currentStep={6} totalSteps={TOTAL_LESSON_STEPS} onBack={onBack} />

      <div className="modul7-lesson-content modul7-page6-content" data-node-id="334:1847">
        {/* Title Header */}
        <div className="modul7-page6-header" data-node-id="334:1848">
          <p className="modul7-page6-subtitle" data-node-id="334:1849">
            Teknik Merespons Kritik
          </p>
          <h2 className="modul7-page6-title" data-node-id="334:1850">
            Formula 3 langkah:<br />
            Empati → Titik Temu → Batas
          </h2>
        </div>

        {/* 3 Step Cards */}
        <div className="modul7-page6-cards-wrapper" data-node-id="334:1863">
          {/* Card 1 */}
          <div className="modul7-formula-card" data-node-id="334:1864">
            <div className="modul7-formula-num-badge" data-node-id="334:1874">
              1
            </div>
            <div className="modul7-formula-text-wrap" data-node-id="334:1883">
              <p className="modul7-formula-card-title" data-node-id="334:1866">
                Empati 🤝
              </p>
              <p className="modul7-formula-card-desc" data-node-id="334:1882">
                "Aku ngerti kenapa itu jadi concern buat kamu."
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="modul7-formula-card" data-node-id="334:1867">
            <div className="modul7-formula-num-badge" data-node-id="334:1876">
              2
            </div>
            <div className="modul7-formula-text-wrap" data-node-id="334:1885">
              <p className="modul7-formula-card-title" data-node-id="334:1886">
                Cari Titik Temu 🔎
              </p>
              <p className="modul7-formula-card-desc" data-node-id="334:1887">
                "Ada bagian yang emang bisa aku perjelas lebih lanjut."
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="modul7-formula-card" data-node-id="334:1870">
            <div className="modul7-formula-num-badge" data-node-id="334:1879">
              3
            </div>
            <div className="modul7-formula-text-wrap" data-node-id="334:1889">
              <p className="modul7-formula-card-title" data-node-id="334:1890">
                Sikap/Batas 🧭
              </p>
              <p className="modul7-formula-card-desc" data-node-id="334:1891">
                "Tapi dari data yang aku punya, kesimpulannya tetap seperti ini."
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Dual Bottom Buttons */}
      <div className="modul7-page2-cta-wrapper" data-node-id="338:2113">
        <button
          type="button"
          className="btn-modul7-round-back"
          onClick={onBack}
          aria-label="Kembali ke halaman sebelumnya"
          data-node-id="338:2248"
        >
          <IconArrowLeft />
        </button>
        <button
          type="button"
          className="btn-modul7-next btn-modul7-next--flex"
          onClick={onNext}
          data-node-id="338:2119"
        >
          Ayo Latihan
        </button>
      </div>
    </div>
  );
}

// ─── Page 7: Skenario Latihan — Hadapi Pertanyaan Menantang ──────────────────
function PracticeIntro({ onNext, onBack }) {
  return (
    <div className="modul7-lesson-page modul7-dark-page" data-name="Practice-Skenario Latihan">
      <LessonTopBar currentStep={7} totalSteps={TOTAL_LESSON_STEPS} onBack={onBack} tone="dark" />

      <div className="modul7-lesson-content modul7-practice-intro-content">
        <div className="modul7-practice-header">
          <p className="modul7-practice-eyebrow">Skenario Latihan</p>
          <h2 className="modul7-practice-title">
            Hadapi Pertanyaan<br />Menantang
          </h2>
        </div>

        <ol className="modul7-practice-steps">
          {PRACTICE_FLOW_STEPS.map((label, index) => (
            <li className="modul7-practice-step" key={label}>
              <span className="modul7-practice-step-num">{index + 1}</span>
              <span className="modul7-practice-step-label">{label}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="modul7-page2-cta-wrapper">
        <button
          type="button"
          className="btn-modul7-round-back btn-modul7-round-back--dark"
          onClick={onBack}
          aria-label="Kembali ke halaman sebelumnya"
        >
          <IconArrowLeft color="#FFFFFF" />
        </button>
        <button type="button" className="btn-modul7-next btn-modul7-next--flex" onClick={onNext}>
          Aku Siap!
        </button>
      </div>
    </div>
  );
}

// ─── Page 8: Tema nya adalah — random topic reveal ───────────────────────────
function PracticeTopic({ onNext, onBack }) {
  const remaining = useCountdown(10, onNext);

  return (
    <div className="modul7-lesson-page modul7-dark-page" data-name="Practice-Tema">
      <LessonTopBar currentStep={8} totalSteps={TOTAL_LESSON_STEPS} onBack={onBack} tone="dark" />

      <div className="modul7-lesson-content modul7-practice-centered">
        <p className="modul7-practice-eyebrow">Tema nya adalah</p>
        <p className="modul7-practice-topic">{PRACTICE_TOPIC}</p>
      </div>

      <div className="modul7-page2-cta-wrapper modul7-cta-with-hint">
        <p className="modul7-practice-autostart">Mulai otomatis dalam {remaining}</p>
        <div className="modul7-cta-row">
          <button
            type="button"
            className="btn-modul7-round-back btn-modul7-round-back--dark"
            onClick={onBack}
            aria-label="Kembali ke halaman sebelumnya"
          >
            <IconArrowLeft color="#FFFFFF" />
          </button>
          <button type="button" className="btn-modul7-next btn-modul7-next--flex" onClick={onNext}>
            Mulai
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page 9: Waktu Persiapan — 2 minute prep with a quick outline ────────────
function PracticePrep({ onNext, onBack }) {
  const [outline, setOutline] = useState(["", "", ""]);
  const remaining = useCountdown(120, onNext);

  const updateOutline = (index, value) => {
    setOutline((prev) => prev.map((item, i) => (i === index ? value : item)));
  };

  return (
    <div className="modul7-lesson-page modul7-dark-page" data-name="Practice-Waktu Persiapan">
      <LessonTopBar currentStep={9} totalSteps={TOTAL_LESSON_STEPS} onBack={onBack} tone="dark" />

      <div className="modul7-lesson-content modul7-practice-prep-content">
        <div className="modul7-practice-timer-bar">
          <span className="modul7-practice-timer-label">Waktu Persiapan</span>
          <span className="modul7-practice-timer-value">{formatClock(remaining)}</span>
        </div>

        <div className="modul7-practice-prompt">
          <p className="modul7-practice-prompt-topic">{PRACTICE_TOPIC}</p>
          <p className="modul7-practice-prompt-ask">Apa pendapatmu?</p>
        </div>

        <div className="modul7-outline-panel">
          <div className="modul7-outline-header">
            <span className="modul7-outline-title">Kerangka cepat</span>
            <span className="modul7-outline-optional">Opsional</span>
          </div>

          {PRACTICE_OUTLINE_HINTS.map((hint, index) => (
            <div className="modul7-outline-field" key={hint}>
              <span className="modul7-outline-num">{index + 1}</span>
              <textarea
                className="modul7-outline-input"
                placeholder={hint}
                value={outline[index]}
                onChange={(event) => updateOutline(index, event.target.value)}
                rows={2}
                aria-label={`Poin ${index + 1}`}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="modul7-lesson-cta-wrapper modul7-lesson-cta-wrapper--dark">
        <button type="button" className="btn-modul7-next" onClick={onNext}>
          Mulai Bicara
        </button>
      </div>
    </div>
  );
}

// ─── Page 10: Sampaikan pendapatmu — 2 minute mini-presentation ──────────────
function PracticeSpeak({ onNext, onBack }) {
  const [attempt, setAttempt] = useState(0);
  const [silent, setSilent] = useState(false);

  if (silent) {
    return (
      <NoVoiceDetected
        step={10}
        onBack={onBack}
        onRetry={() => {
          setSilent(false);
          setAttempt((a) => a + 1);
        }}
        onSkip={onNext}
        skipLabel="Tidak tahu apa yang harus disampaikan"
      />
    );
  }

  return (
    <PracticeSpeakRecording
      key={attempt}
      onBack={onBack}
      onRestart={() => setAttempt((a) => a + 1)}
      onDone={(heard) => (heard ? onNext() : setSilent(true))}
    />
  );
}

function PracticeSpeakRecording({ onDone, onRestart, onBack }) {
  const detectedRef = useSpeechCapture(true);
  const [gate, setGate] = useState(null); // null | "incomplete"
  // Populated from an effect (not during render) each time `remaining`
  // ticks, so attemptFinish() — a click handler / countdown callback, never
  // called mid-render — always reads a fresh value.
  const elapsedRef = useRef(0);

  const attemptFinish = () => {
    if (!detectedRef.current) {
      onDone(false);
      return;
    }
    if (elapsedRef.current < MIN_SEGMENT_SECONDS) {
      setGate("incomplete");
      return;
    }
    onDone(true);
  };

  const remaining = useCountdown(120, attemptFinish);
  useEffect(() => {
    elapsedRef.current = 120 - remaining;
  }, [remaining]);

  return (
    <div className="modul7-lesson-page modul7-dark-page" data-name="Practice-Sampaikan Pendapat">
      <LessonTopBar currentStep={10} totalSteps={TOTAL_LESSON_STEPS} onBack={onBack} tone="dark" />

      <div className="modul7-lesson-content modul7-practice-centered">
        <h2 className="modul7-practice-speak-title">Sampaikan pendapatmu</h2>
        <div className="modul7-practice-dial">{formatClock(remaining)}</div>
        <VoiceWave />
      </div>

      <div className="modul7-lesson-cta-wrapper modul7-lesson-cta-wrapper--dark">
        <button type="button" className="btn-modul7-stop" onClick={attemptFinish}>
          Selesai Bicara
        </button>
      </div>

      {gate === "incomplete" && (
        <PracticeIncompleteGate
          elapsedSeconds={120 - remaining}
          onResume={() => setGate(null)}
          onRestart={onRestart}
          onSkip={() => onDone(true)}
        />
      )}
    </div>
  );
}

// ─── Page 11: Argumenmu sudah siap! — bridge into the Q&A ───────────────────
function PracticeQaIntro({ onNext, onBack }) {
  return (
    <div className="modul7-lesson-page modul7-dark-page" data-name="Practice-Argumen Siap">
      <LessonTopBar currentStep={11} totalSteps={TOTAL_LESSON_STEPS} onBack={onBack} tone="dark" />

      <div className="modul7-lesson-content modul7-practice-bridge-content">
        <img src={imgMascottSenyum} alt="" className="modul7-practice-bridge-img" />

        <div className="modul7-practice-bridge-text">
          <h2 className="modul7-practice-bridge-title">Argumenmu sudah siap!</h2>
          <p className="modul7-practice-bridge-desc">
            Sekarang, kita latihan mempertahankan pendapatmu saat ada orang yang bertanya.
          </p>
        </div>

        <div className="modul7-practice-next-card">
          <p className="modul7-practice-next-label">Selanjutnya</p>
          <p className="modul7-practice-next-desc">
            Kamu akan menjawab {PRACTICE_QUESTIONS.length} pertanyaan tentang pendapatmu.
          </p>
        </div>
      </div>

      <div className="modul7-lesson-cta-wrapper modul7-lesson-cta-wrapper--dark">
        <button type="button" className="btn-modul7-next" onClick={onNext}>
          Mulai Tanya Jawab
        </button>
      </div>
    </div>
  );
}

// ─── Pages 12 & 15: the challenging question, before answering ──────────────
function PracticeQuestionCue({ step, questionIndex, onNext, onBack }) {
  const remaining = useCountdown(15, onNext);

  return (
    <div className="modul7-lesson-page modul7-dark-page" data-name="Practice-Pertanyaan">
      <LessonTopBar currentStep={step} totalSteps={TOTAL_LESSON_STEPS} onBack={onBack} tone="dark" />

      <p className="modul7-practice-counter">
        {questionIndex + 1}/{PRACTICE_QUESTIONS.length}
      </p>

      <div className="modul7-lesson-content modul7-practice-centered">
        <p className="modul7-practice-eyebrow">Pertanyaan #{questionIndex + 1}</p>
        <p className="modul7-practice-question">{PRACTICE_QUESTIONS[questionIndex]}</p>
      </div>

      <div className="modul7-lesson-cta-wrapper modul7-lesson-cta-wrapper--dark modul7-cta-with-hint">
        <p className="modul7-practice-autostart">Mulai otomatis dalam {remaining}</p>
        <button type="button" className="btn-modul7-next" onClick={onNext}>
          Mulai Jawab
        </button>
      </div>
    </div>
  );
}

// ─── Pages 13 & 16: answering the question with a 1 minute timer ────────────
function PracticeAnswer({ step, questionIndex, onNext, onBack }) {
  const [attempt, setAttempt] = useState(0);
  const [silent, setSilent] = useState(false);

  if (silent) {
    return (
      <NoVoiceDetected
        step={step}
        questionIndex={questionIndex}
        onBack={onBack}
        onRetry={() => {
          setSilent(false);
          setAttempt((a) => a + 1);
        }}
        onSkip={onNext}
        skipLabel="Aku tidak tahu jawabannya"
      />
    );
  }

  return (
    <PracticeAnswerRecording
      key={attempt}
      step={step}
      questionIndex={questionIndex}
      onBack={onBack}
      onRestart={() => setAttempt((a) => a + 1)}
      onDone={(heard) => (heard ? onNext() : setSilent(true))}
    />
  );
}

function PracticeAnswerRecording({ step, questionIndex, onDone, onRestart, onBack }) {
  const detectedRef = useSpeechCapture(true);
  const [gate, setGate] = useState(null); // null | "incomplete"
  // Populated from an effect (not during render) each time `remaining`
  // ticks, so attemptFinish() — a click handler / countdown callback, never
  // called mid-render — always reads a fresh value.
  const elapsedRef = useRef(0);

  const attemptFinish = () => {
    if (!detectedRef.current) {
      onDone(false);
      return;
    }
    if (elapsedRef.current < MIN_SEGMENT_SECONDS) {
      setGate("incomplete");
      return;
    }
    onDone(true);
  };

  const remaining = useCountdown(60, attemptFinish);
  useEffect(() => {
    elapsedRef.current = 60 - remaining;
  }, [remaining]);

  return (
    <div className="modul7-lesson-page modul7-dark-page" data-name="Practice-Jawab Pertanyaan">
      <LessonTopBar currentStep={step} totalSteps={TOTAL_LESSON_STEPS} onBack={onBack} tone="dark" />

      <p className="modul7-practice-counter">
        {questionIndex + 1}/{PRACTICE_QUESTIONS.length}
      </p>

      <div className="modul7-lesson-content modul7-practice-centered modul7-practice-answer-content">
        <div className="modul7-practice-question-card">
          <p className="modul7-practice-eyebrow">Pertanyaan #{questionIndex + 1}</p>
          <p className="modul7-practice-question-sm">{PRACTICE_QUESTIONS[questionIndex]}</p>
        </div>

        <div className="modul7-practice-dial">{formatClock(remaining)}</div>
        <VoiceWave />
      </div>

      <div className="modul7-lesson-cta-wrapper modul7-lesson-cta-wrapper--dark">
        <button type="button" className="btn-modul7-stop" onClick={attemptFinish}>
          Selesai Bicara
        </button>
      </div>

      {gate === "incomplete" && (
        <PracticeIncompleteGate
          elapsedSeconds={60 - remaining}
          onResume={() => setGate(null)}
          onRestart={onRestart}
          onSkip={() => onDone(true)}
        />
      )}
    </div>
  );
}

// ─── Page 14: Hebat, Tapi... — encouragement between the two questions ──────
function PracticeInterlude({ onNext, onBack }) {
  return (
    <div className="modul7-lesson-page modul7-dark-page" data-name="Practice-Hebat Tapi">
      <LessonTopBar currentStep={14} totalSteps={TOTAL_LESSON_STEPS} onBack={onBack} tone="dark" />

      <p className="modul7-practice-counter">1/{PRACTICE_QUESTIONS.length}</p>

      <div className="modul7-lesson-content modul7-practice-bridge-content">
        <img src={imgMascottSenyum} alt="" className="modul7-practice-bridge-img" />

        <div className="modul7-practice-bridge-text">
          <h2 className="modul7-practice-bridge-title">Hebat, Tapi...</h2>
          <p className="modul7-practice-bridge-desc">
            Masih ada pertanyaan berikutnya, ayo kamu pasti bisa!
          </p>
        </div>
      </div>

      <div className="modul7-lesson-cta-wrapper modul7-lesson-cta-wrapper--dark">
        <button type="button" className="btn-modul7-next" onClick={onNext}>
          Lanjut, Aku Pasti Bisa!
        </button>
      </div>
    </div>
  );
}



// ─── Page 17: Keren! — practice cleared ─────────────────────────────────────
function PracticeSuccess({ onNext, onBack }) {
  return (
    <div className="modul7-lesson-page" data-name="Practice-Keren">
      <LessonTopBar currentStep={17} totalSteps={TOTAL_LESSON_STEPS} onBack={onBack} />

      <div className="modul7-lesson-content modul7-practice-success-content">
        <video
          src={videoHappySpeaker}
          autoPlay
          muted
          playsInline
          className="modul7-practice-success-video"
          aria-label="Animasi selamat"
        />

        <div className="modul7-practice-success-text">
          <p className="modul7-practice-success-eyebrow">Keren!</p>
          <h2 className="modul7-practice-success-title">
            Kamu berhasil melewati pertanyaan sulit!
          </h2>
          <p className="modul7-practice-success-desc">
            Kamu baru saja menghadapi pertanyaan yang belum kamu siapkan.
          </p>
        </div>
      </div>

      <div className="modul7-lesson-cta-wrapper">
        <button
          type="button"
          className="btn-modul7-next"
          onClick={onNext}
        >
          Akhiri Pelajaran
        </button>
      </div>
    </div>
  );
}

// ─── Shown while analyze-session + generate-feedback are running for real ──
function AnalyzingScreen() {
  return (
    <div className="modul7-lesson-page modul7-dark-page modul7-analyzing-page" data-name="Practice-Menganalisis">
      <div className="modul7-analyzing-lottie-wrap">
        <DotLottieReact
          src={animaBotLottie}
          loop
          autoplay
          className="modul7-analyzing-lottie"
        />
      </div>
      <p className="modul7-analyzing-title">Menganalisis rekamanmu...</p>
      <p className="modul7-analyzing-sub">
        AI kami lagi dengerin jawabanmu, biasanya cuma beberapa detik. Jangan tutup halaman ini.
      </p>
    </div>
  );
}

// ─── Shown when the real analysis call fails (quota/overload/timeout) ──────
function AnalysisErrorScreen({ message, onRetry, onSkip }) {
  return (
    <div className="modul7-lesson-page modul7-dark-page" data-name="Practice-Analisis Gagal">
      <div className="modul7-lesson-content modul7-practice-bridge-content">
        <img src={imgMascottKhawatir} alt="" className="modul7-practice-bridge-img" />
        <div className="modul7-practice-bridge-text">
          <h2 className="modul7-practice-bridge-title">Analisis belum berhasil</h2>
          <p className="modul7-practice-bridge-desc">{message}</p>
        </div>
      </div>

      <div className="modul7-lesson-cta-wrapper modul7-lesson-cta-wrapper--dark modul7-cta-with-hint">
        <button type="button" className="btn-modul7-next" onClick={onRetry}>
          Coba Lagi
        </button>
        <button type="button" className="modul7-novoice-skip" onClick={onSkip}>
          Lewati, lihat contoh hasil
        </button>
      </div>
    </div>
  );
}

// ─── AI analysis result — Mantap! Kamu keren! ───────────────────────────────
function AnalysisChip({ label, tone }) {
  return <span className={`modul7-analysis-chip modul7-analysis-chip--${tone}`}>{label}</span>;
}

function PracticeAnalysis({ result = PRACTICE_ANALYSIS, onFinish }) {
  const { isReady: isXpReady } = useGainXpPreloader(videoGainXP);

  return (
    <div className="modul7-lesson-page modul7-analysis-page" data-name="Practice-Hasil Analisis AI">
      <div className="modul7-analysis-hero">
        <img src={imgAnalysisHero} alt="" className="modul7-analysis-hero-img" />
      </div>

      <div className="modul7-analysis-body">
        <div className="modul7-analysis-headline">
          <p className="modul7-analysis-eyebrow">Mantap!</p>
          <h1 className="modul7-analysis-title">Kamu keren!</h1>
          <p className="modul7-analysis-subtitle">
            Dengan latihan yang konsisten, kamu akan semakin mahir dan percaya diri dalam berbicara!
          </p>
        </div>

        {result.scores.map((score) => (
          <div className="modul7-analysis-card" key={score.id}>
            <div className="modul7-analysis-card-top">
              <div className="modul7-analysis-card-heading">
                <img src={score.icon} alt="" className="modul7-analysis-icon" />
                <p className="modul7-analysis-card-label">{score.label}</p>
              </div>
              <p className="modul7-analysis-score">
                {score.value}
                <span className="modul7-analysis-score-unit">{score.unit}</span>
              </p>
            </div>
            <p className="modul7-analysis-note">{score.note}</p>
            <AnalysisChip label={score.chip} tone={score.chipTone} />
          </div>
        ))}

        <div className="modul7-analysis-grid">
          {result.metrics.map((metric) => (
            <div className="modul7-analysis-card modul7-analysis-card--sm" key={metric.id}>
              <img src={metric.icon} alt="" className="modul7-analysis-icon" />
              <p className="modul7-analysis-card-label">{metric.label}</p>
              <p
                className={`modul7-analysis-metric${
                  metric.valueTone === "warn" ? " modul7-analysis-metric--warn" : ""
                }`}
              >
                {metric.value}
                <span className="modul7-analysis-metric-unit">{metric.unit}</span>
              </p>
              <AnalysisChip label={metric.chip} tone={metric.chipTone} />
            </div>
          ))}
        </div>

        <div className="modul7-analysis-card">
          <div className="modul7-analysis-card-heading">
            <img src={iconAI} alt="" className="modul7-analysis-icon" />
            <p className="modul7-analysis-card-label">Feedback AI</p>
          </div>
          <p className="modul7-analysis-feedback">{result.feedback}</p>
        </div>
      </div>

      <div className="modul7-lesson-cta-wrapper">
        <button
          type="button"
          className="btn-modul7-next"
          onClick={onFinish}
          disabled={!isXpReady}
          style={!isXpReady ? { opacity: 0.75, cursor: "not-allowed" } : undefined}
        >
          {!isXpReady ? "Menyiapkan XP..." : "Lanjut"}
        </button>
      </div>
    </div>
  );
}

// ─── Completed Lesson Gain XP Screen ─────────────────────────────────────────
function CompletedLesson({ onFinish, xpEarned = 95 }) {
  const { addXp } = useUserProgress();
  const [displayedXP, setDisplayedXP] = useState(0);
  const [isCounting, setIsCounting] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const videoRef = useRef(null);
  const videoSrc = getPreloadedVideoSrc(videoGainXP);

  const handleVideoEnded = () => {
    setIsCounting(true);
    let current = 0;
    const target = xpEarned;
    const duration = 2000;
    const stepTime = 20;
    const increment = target / (duration / stepTime);

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setDisplayedXP(target);
        clearInterval(timer);
        setIsCounting(false);
        setTimeout(() => {
          setShowButton(true);
        }, 1000);
      } else {
        setDisplayedXP(Math.floor(current));
      }
    }, stepTime);
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

        <h2 className="lesson-completed-title">Pelajaran Selesai!</h2>

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
            onClick={() => {
              addXp(xpEarned);
              onFinish?.();
            }}
          >
            Klaim XP
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Lesson 6 Modul 7 Screen ────────────────────────────────────────────
export default function LessonModul7Screen({ onBack, onFinish }) {
  // 1–6 = teori, 7–17 = latihan, lalu XP dan hasil analisis AI.
  const [step, setStep] = useState(1);
  const [initialAffirmationDone, setInitialAffirmationDone] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisError, setAnalysisError] = useState("");

  // Asset preloading: ensure >= 50% assets are ready before proceeding
  const { isThresholdMet } = useAssetPreloader(MODUL7_ASSETS, 0.5);

  // Real audio capture spans the whole practice section (step 10, "Sampaikan
  // pendapatmu", through step 16, the second Q&A answer) as ONE continuous
  // recording — analyze-session expects a single audio file per session,
  // same as SimulasiScreen's RecordingStep. useSpeechCapture() on the
  // individual practice screens is untouched; it only gates the "no voice
  // detected" retry UX and runs off its own separate mic stream.
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const recordingStartRef = useRef(null);
  const audioResultRef = useRef(null);

  useEffect(() => {
    if (step !== 10 || recorderRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const mimeType = window.MediaRecorder?.isTypeSupported?.("audio/webm") ? "audio/webm" : "";
        const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
        chunksRef.current = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        recordingStartRef.current = Date.now();
        recorder.start();
        recorderRef.current = recorder;
      } catch {
        // Mic unavailable for real capture — submitForAnalysis() below
        // surfaces this as "rekaman tidak ditemukan" instead of silently
        // faking a result. The practice flow itself still works fine since
        // useSpeechCapture() opens its own independent stream.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step]);

  useEffect(() => {
    if (step !== 17 || !recorderRef.current || recorderRef.current.state === "inactive") return;
    const recorder = recorderRef.current;
    const durationSeconds = Math.max(1, Math.round((Date.now() - recordingStartRef.current) / 1000));
    recorder.onstop = () => {
      audioResultRef.current = {
        blob: new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" }),
        durationSeconds,
      };
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    recorder.stop();
  }, [step]);

  // Stop the mic if the user backs out of the lesson mid-practice.
  useEffect(() => {
    return () => {
      if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const submitForAnalysis = async () => {
    const recorded = audioResultRef.current;
    if (!recorded?.blob) {
      setAnalysisError("Rekaman latihan tidak ditemukan. Pastikan mikrofon diizinkan, lalu ulangi latihannya.");
      setStep("analysis-error");
      return;
    }
    setAnalysisError("");
    setStep("analyzing");
    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr || !user) throw new Error("Sesi login tidak ditemukan, coba masuk ulang.");

      // "spontan": no upload materials, matches this lesson's flow (fixed
      // lesson questions, no PDF/CV step) — same DB-level kategori enum
      // SimulasiScreen uses for its Spontaneous scenario.
      const simulation = await createSimulation(user.id, "spontan");
      const sessionId = crypto.randomUUID();
      await createSessionRow({ id: sessionId, simulationId: simulation.id });
      const audioPath = await uploadSessionAudio(user.id, sessionId, recorded.blob);
      await updateSessionAudio(sessionId, audioPath);
      await runAnalysis({ sessionId, audioPath, durationSeconds: recorded.durationSeconds });
      const data = await fetchSessionResults(sessionId);
      await markSimulationCompleted(simulation.id);

      setAnalysisResult(mapSessionResultToAnalysis(data));
      setStep("analysis");
    } catch (err) {
      setAnalysisError(friendlySimulasiError(err));
      setStep("analysis-error");
    }
  };

  const [showExitModal, setShowExitModal] = useState(false);

  const handleRequestExit = () => {
    setShowExitModal(true);
  };

  const handleConfirmExit = () => {
    setShowExitModal(false);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onBack?.();
  };

  const goNext = () => {
    setStep((prev) => {
      if (prev === 17) {
        submitForAnalysis();
        return "analyzing";
      }
      if (prev === "analysis") return "completed";
      if (prev === "completed") {
        onFinish?.();
        return "completed";
      }
      return prev + 1;
    });
  };

  if (!initialAffirmationDone) {
    return (
      <LessonAffirmation
        quote="“Ketenangan adalah kunci kejernihan berpikir. Kamu memiliki kemampuan untuk berbicara dengan terstruktur dan meyakinkan.”"
        isReady={isThresholdMet}
        onComplete={() => setInitialAffirmationDone(true)}
      />
    );
  }

  return (
    <div className="modul7-lesson-screen">
      {step === 1 && <LessonPage1 onNext={goNext} onBack={handleRequestExit} />}
      {step === 2 && <LessonPage2 onNext={goNext} onBack={handleRequestExit} />}
      {step === 3 && <LessonPage3 onNext={goNext} onBack={handleRequestExit} />}
      {step === 4 && <LessonPage4 onNext={goNext} onBack={handleRequestExit} />}
      {step === 5 && <LessonPage5 onNext={goNext} onBack={handleRequestExit} />}
      {step === 6 && <LessonPage6 onNext={goNext} onBack={handleRequestExit} />}
      {step === 7 && <PracticeIntro onNext={goNext} onBack={handleRequestExit} />}
      {step === 8 && <PracticeTopic onNext={goNext} onBack={handleRequestExit} />}
      {step === 9 && <PracticePrep onNext={goNext} onBack={handleRequestExit} />}
      {step === 10 && <PracticeSpeak onNext={goNext} onBack={handleRequestExit} />}
      {step === 11 && <PracticeQaIntro onNext={goNext} onBack={handleRequestExit} />}
      {step === 12 && (
        <PracticeQuestionCue step={12} questionIndex={0} onNext={goNext} onBack={handleRequestExit} />
      )}
      {step === 13 && (
        <PracticeAnswer step={13} questionIndex={0} onNext={goNext} onBack={handleRequestExit} />
      )}
      {step === 14 && <PracticeInterlude onNext={goNext} onBack={handleRequestExit} />}
      {step === 15 && (
        <PracticeQuestionCue step={15} questionIndex={1} onNext={goNext} onBack={handleRequestExit} />
      )}
      {step === 16 && (
        <PracticeAnswer step={16} questionIndex={1} onNext={goNext} onBack={handleRequestExit} />
      )}
      {step === 17 && <PracticeSuccess onNext={goNext} onBack={handleRequestExit} />}
      {step === "analyzing" && <AnalyzingScreen />}
      {step === "analysis-error" && (
        <AnalysisErrorScreen
          message={analysisError}
          onRetry={submitForAnalysis}
          onSkip={() => {
            setAnalysisResult(null);
            setStep("analysis");
          }}
        />
      )}
      {step === "analysis" && <PracticeAnalysis result={analysisResult ?? PRACTICE_ANALYSIS} onFinish={goNext} />}
      {step === "completed" && <CompletedLesson onFinish={onFinish} />}

      {showExitModal && (
        <LessonExitModal
          onCancel={() => setShowExitModal(false)}
          onConfirm={handleConfirmExit}
        />
      )}
    </div>
  );
}
