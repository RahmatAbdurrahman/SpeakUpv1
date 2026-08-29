import React, { useEffect, useState } from "react";
import "./LessonAffirmation.css";

const DEFAULT_QUOTE =
  "“Saya percaya pada suara saya dan mampu berbicara dengan tenang. Dengan setiap napas dalam, saya merasakan ketenangan dan keberanian untuk berbagi pikiran saya.”";

export default function LessonAffirmation({
  quote = DEFAULT_QUOTE,
  loadingText = "Memuat...",
  onComplete,
  duration = 2500,
  isReady = true,
}) {
  const [dots, setDots] = useState("");
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    // Subtle animated dots for loading state
    const dotInterval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 450);

    // Minimum time on affirmation screen
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, duration);

    return () => {
      clearInterval(dotInterval);
      clearTimeout(timer);
    };
  }, [duration]);

  useEffect(() => {
    if (minTimeElapsed && isReady) {
      onComplete?.();
    }
  }, [minTimeElapsed, isReady, onComplete]);

  return (
    <div
      className="lesson-affirmation-loading-screen"
      data-node-id="228:346"
      data-name="Positive Affirmation-TarikNapas"
    >
      {/* Vertically centered affirmation quote */}
      <div className="lesson-affirmation-quote-wrapper" data-node-id="228:347">
        <p className="lesson-affirmation-quote-text">{quote}</p>
      </div>

      {/* Bottom loading text */}
      <div className="lesson-affirmation-bottom-loading" data-node-id="235:492">
        <p className="lesson-affirmation-loading-label">
          {loadingText.replace(/\.+$/, "")}
          <span className="lesson-affirmation-animated-dots">{dots || "..."}</span>
        </p>
      </div>
    </div>
  );
}
