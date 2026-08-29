import React, { useState, useEffect } from "react";
import "./PositiveAffirmation.css";

const AFFIRMATION_TEXT = "“Saya memiliki suara yang berharga dan layak didengar.”";

export default function PositiveAffirmation({ onContinue }) {
  const [displayedText, setDisplayedText] = useState("");
  const [isTypingFinished, setIsTypingFinished] = useState(false);

  useEffect(() => {
    let currentIndex = 0;
    setDisplayedText("");
    setIsTypingFinished(false);

    const interval = setInterval(() => {
      if (currentIndex < AFFIRMATION_TEXT.length) {
        setDisplayedText(AFFIRMATION_TEXT.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(interval);
        setIsTypingFinished(true);
      }
    }, 45);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="positive-affirmation-screen"
      data-node-id="211:4913"
      data-name="Positive Affirmation-OnBoardingTransition"
    >
      {/* Top Ambient Light Glow */}
      <div className="ambient-glow-top" data-node-id="228:344" aria-hidden="true" />

      {/* Centered Affirmation Text Container */}
      <div className="affirmation-center-section">
        <div className="affirmation-text-container" data-node-id="215:5065">
          <h2 className="affirmation-text">
            {displayedText}
            {!isTypingFinished && <span className="typing-cursor" aria-hidden="true">|</span>}
          </h2>
        </div>
      </div>

      {/* Bottom CTA Button - Appears after typing completes */}
      <div
        className={`affirmation-button-wrapper ${isTypingFinished ? "visible" : ""}`}
        data-node-id="228:429"
        data-name="Button-Large"
      >
        <button
          type="button"
          className="btn-affirmation-cta"
          onClick={onContinue}
          disabled={!isTypingFinished}
          data-node-id="228:430"
        >
          Ya, Suaraku penting!
        </button>
      </div>

    </div>
  );
}
