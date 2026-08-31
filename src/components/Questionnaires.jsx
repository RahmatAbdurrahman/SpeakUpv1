import React, { useState } from "react";
import "./Questionnaires.css";

// ─── Asset Imports ───────────────────────────────────────────────────────────
import q1Illustration from "../assets/pages_assets/questionnaires/q1_illustration.png";
import q2Illustration from "../assets/pages_assets/questionnaires/q2_illustration.png";
import q3Illustration from "../assets/pages_assets/questionnaires/q3_illustration.png";
import q4Illustration from "../assets/pages_assets/questionnaires/q4_illustration.png";
import q5Illustration from "../assets/pages_assets/questionnaires/q5_illustration.png";
import q6Illustration from "../assets/pages_assets/questionnaires/q6_illustration.png";
import arrowLeftIcon from "../assets/pages_assets/questionnaires/arrow_left.svg";

// ─── Question Dataset ─────────────────────────────────────────────────────────
export const DEFAULT_QUESTIONS = [
  {
    id: "q1",
    step: 1,
    title: "Kamu paling sering butuh ngomong di depan orang buat apa?",
    type: "tags_multi",
    illustration: q1Illustration,
    options: [
      { id: "kuliah", label: "Presentasi kelas/kuliah" },
      { id: "lomba", label: "Pitching lomba" },
      { id: "kantor", label: "Rapat atau kerjaan kantor" },
      { id: "interview", label: "Interview kerja atau beasiswa" },
      { id: "networking", label: "Networking & kenalan orang baru" },
      { id: "mc", label: "MC atau public speaking formal" },
      { id: "other", label: "Yang lain..." },
    ],
  },
  {
    id: "q2",
    step: 2,
    title: "Seberapa sering kamu harus ngomong di depan orang lain?",
    type: "radio",
    illustration: q2Illustration,
    options: [
      { id: "daily", label: "Hampir setiap hari" },
      { id: "weekly", label: "Beberapa kali seminggu" },
      { id: "monthly", label: "Beberapa kali sebulan" },
      { id: "rare", label: "Jarang banget" },
    ],
  },
  {
    id: "q3",
    step: 3,
    title:
      "Kalau harus ngomong di depan umum sekarang, seberapa deg-degan kamu?",
    type: "slider",
    illustration: q3Illustration,
    min: 1,
    max: 10,
    defaultValue: 5,
    minLabel: "Santai Aja",
    maxLabel: "Panik Banget",
  },
  {
    id: "q4",
    step: 4,
    title: "Momen apa yang paling bikin kamu blank atau gugup parah?",
    type: "radio",
    illustration: q4Illustration,
    options: [
      { id: "mendadak", label: "Pas harus jawab pertanyaan mendadak" },
      { id: "penting", label: "Pas ngomong di depan orang penting" },
      { id: "improvisasi", label: "Pas harus improvisasi tanpa naskah" },
      { id: "semua_mata", label: "Pas semua mata tertuju ke aku" },
      { id: "always", label: "Dari awal sampai akhir gugup terus" },
    ],
  },
  {
    id: "q5",
    step: 5,
    title: "Kalau harus mulai latihan, kamu lebih nyaman yang gimana?",
    type: "radio",
    illustration: q5Illustration,
    options: [
      { id: "sendiri", label: "Latihan sendiri dulu, pelan-pelan" },
      {
        id: "paksa",
        label: "Langsung coba di depan beberapa orang biar kepaksa berani",
      },
      {
        id: "stepbystep",
        label: "Ikutin panduan step-by-step, jangan buru-buru",
      },
      {
        id: "sistem",
        label: "Terserah sistem aja, yang penting cepat kelihatan hasilnya",
      },
    ],
  },
  {
    id: "q6",
    step: 6,
    title:
      "Kalau berhasil lebih pede ngomong di depan umum, apa yang paling pengin kamu capai?",
    type: "radio",
    illustration: q6Illustration,
    options: [
      { id: "nilai", label: "Nilai presentasi/tugas lebih bagus" },
      { id: "lolos", label: "Lolos interview kerja/beasiswa impian" },
      { id: "speakup", label: "Berani speak up di rapat/organisasi" },
      { id: "grogi", label: "Nggak lagi grogi tiap ketemu orang baru" },
      { id: "buktiin", label: "Buktiin ke diri sendiri kalau aku bisa" },
    ],
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Multiple-select tag chips */
function TagsMultiInput({ question, value, onChange }) {
  const selected = Array.isArray(value) ? value : [];
  return (
    <div className="questionnaire-tags-wrapper" data-node-id="207:3169">
      {question.options.map((option) => {
        const isActive = selected.includes(option.id);
        return (
          <button
            key={option.id}
            type="button"
            className={`tag-chip ${isActive ? "active" : ""}`}
            onClick={() => {
              if (isActive) onChange(selected.filter((id) => id !== option.id));
              else onChange([...selected, option.id]);
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Radio card list (single select) */
function RadioInput({ question, value, onChange }) {
  return (
    <div className="questionnaire-radio-list">
      {question.options.map((option) => {
        const isActive = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            className={`radio-card ${isActive ? "active" : ""}`}
            onClick={() => onChange(option.id)}
          >
            <span className="radio-indicator">
              <span className="radio-dot" />
            </span>
            <span className="radio-label">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Modern Interactive Slider Input (Slider Skala Normal & Responsif) */
function ModernSliderInput({ question, value, onChange }) {
  const min = question.min ?? 1;
  const max = question.max ?? 10;
  const current = value ?? question.defaultValue ?? 5;

  const percent = ((current - min) / (max - min)) * 100;

  // Generate tick stops
  const ticks = [];
  for (let i = min; i <= max; i++) {
    ticks.push(i);
  }

  // Dynamic theme color (Green for calm, Orange for intense)
  const isHigh = current > 5;
  const themeColor = isHigh ? "#E8753D" : "#24A981";

  return (
    <div className="modern-slider-container" data-node-id="207:3249">
      {/* Value Indicator Badge */}
      <div className="slider-value-display">
        <span
          className="slider-value-badge"
          style={{
            backgroundColor: `${themeColor}18`,
            borderColor: themeColor,
            color: themeColor,
          }}
        >
          Skala {current}:{" "}
          <strong>
            {current <= 3
              ? "Santai"
              : current <= 6
                ? "Agak Deg-degan"
                : current <= 8
                  ? "Gugup"
                  : "Panik Banget"}
          </strong>
        </span>
      </div>

      {/* Main Track & Interactive area */}
      <div className="slider-interactive-track">
        {/* Visual background dual-tone track */}
        <div className="slider-track-bg-left" />
        <div className="slider-track-bg-right" />

        {/* Dynamic progress fill */}
        <div
          className="slider-track-active-fill"
          style={{
            width: `${percent}%`,
            backgroundColor: `${themeColor}50`,
          }}
        />

        {/* Tick stop dots */}
        <div className="slider-ticks-row">
          {ticks.map((num) => {
            const tickPercent = ((num - min) / (max - min)) * 100;
            const isPassed = num <= current;
            return (
              <div
                key={num}
                className={`slider-tick-dot ${isPassed ? "passed" : ""}`}
                style={{
                  left: `${tickPercent}%`,
                  backgroundColor: isPassed
                    ? themeColor
                    : "rgba(36, 50, 56, 0.2)",
                }}
              />
            );
          })}
        </div>

        {/* Custom Draggable Thumb handle */}
        <div
          className="slider-custom-thumb"
          style={{
            left: `calc(12px + (${percent} / 100) * (100% - 24px))`,
            borderColor: themeColor,
          }}
        >
          <div
            className="slider-thumb-inner"
            style={{ backgroundColor: themeColor }}
          />
        </div>

        {/* Native Range Input over the entire track for drag & touch */}
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={current}
          onChange={(e) => onChange(Number(e.target.value))}
          className="slider-range-overlay"
          aria-label={question.title}
        />
      </div>

      {/* Bottom Boundary Labels */}
      <div className="slider-bottom-labels">
        <span className="slider-bottom-min">
          {question.minLabel || "Santai Aja"}
        </span>
        <span className="slider-bottom-max">
          {question.maxLabel || "Panik Banget"}
        </span>
      </div>
    </div>
  );
}

// ─── Main Questionnaire Component ─────────────────────────────────────────────
export default function Questionnaires({
  questions = DEFAULT_QUESTIONS,
  onBackToOnboarding,
  onFinish,
}) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [direction, setDirection] = useState("forward");
  // Seed answers with each question's defaultValue (e.g. the slider) so an
  // untouched control still records what it visually shows.
  const [answers, setAnswers] = useState(() => {
    const initial = {};
    questions.forEach((q) => {
      if (q.defaultValue !== undefined) initial[q.id] = q.defaultValue;
    });
    return initial;
  });

  const totalSteps = questions.length;
  const currentQuestion = questions[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;

  // Generic answer setter
  const setAnswer = (qId, val) =>
    setAnswers((prev) => ({ ...prev, [qId]: val }));

  const handleNext = () => {
    setDirection("forward");
    if (isLastStep) {
      if (onFinish) onFinish(answers);
    } else {
      setCurrentStepIndex((i) => i + 1);
    }
  };

  const handleBack = () => {
    setDirection("backward");
    if (isFirstStep) {
      if (onBackToOnboarding) onBackToOnboarding();
    } else {
      setCurrentStepIndex((i) => i - 1);
    }
  };

  // Render the answer input based on type
  const renderBody = () => {
    const q = currentQuestion;
    const val = answers[q.id];

    return (
      <>
        {/* Question Title + Illustration */}
        <div className="question-header-content" data-node-id="207:3166">
          <h1 className="question-title" data-node-id="207:3167">
            {q.title}
          </h1>
          {q.illustration && (
            <div
              className="question-illustration-container"
              data-node-id="207:3168"
            >
              <img
                src={q.illustration}
                alt=""
                className="question-illustration"
              />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="question-input-area">
          {q.type === "tags_multi" && (
            <TagsMultiInput
              question={q}
              value={val}
              onChange={(v) => setAnswer(q.id, v)}
            />
          )}
          {q.type === "radio" && (
            <RadioInput
              question={q}
              value={val}
              onChange={(v) => setAnswer(q.id, v)}
            />
          )}
          {(q.type === "slider" ||
            q.type === "scale" ||
            q.type === "centered_slider" ||
            q.type === "scale_boxes") && (
            <ModernSliderInput
              question={q}
              value={val}
              onChange={(v) => setAnswer(q.id, v)}
            />
          )}
        </div>
      </>
    );
  };

  return (
    <div
      className="questionnaire-screen"
      data-node-id="207:3141"
      data-name="OnBoarding-Questionnaire"
    >
      {/* ── Sticky TopBar ─────────────────────────────────────── */}
      <header className="questionnaire-topbar" data-node-id="207:3142">
        <div className="segmented-progress-bar" data-node-id="207:3144">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <div
              key={index}
              className={`progress-segment ${index <= currentStepIndex ? "filled" : ""}`}
            />
          ))}
        </div>

        <div className="topbar-nav-row" data-node-id="207:3159">
          <button
            type="button"
            className="btn-nav-back"
            onClick={handleBack}
            aria-label="Kembali"
          >
            <img src={arrowLeftIcon} alt="Back" className="nav-back-icon" />
          </button>
          <p className="step-counter-text">
            {currentStepIndex + 1} dari {totalSteps}
          </p>
        </div>
      </header>

      {/* ── Main Form Section ─────────────────────────────────── */}
      <main className="questionnaire-form-section" data-node-id="207:3165">
        <div
          key={currentStepIndex}
          className={`questionnaire-content-wrap questionnaire-slide-${direction}`}
        >
          {renderBody()}
        </div>

        {/* Bottom CTA - Fixed / Non-sliding */}
        <div className="questionnaire-footer" data-node-id="207:3174">
          <button
            type="button"
            className="btn-questionnaire-submit"
            onClick={handleNext}
            data-node-id="207:3175"
          >
            {isLastStep ? "Selesai" : "Lanjut"}
          </button>
        </div>
      </main>
    </div>
  );
}
