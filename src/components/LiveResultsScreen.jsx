import React, { useEffect, useState } from "react";
import "./LiveResultsScreen.css";
import videoGainXP from "../assets/pages_assets/gain_xp/Video-Gain-XP.webm";
import { useGainXpPreloader, getPreloadedVideoSrc } from "../lib/assetPreloader";
import { playXpTickSound, playXpCompleteSound, playGainXpIntroSound } from "../lib/soundEffects";
import { ResultsStep } from "./SimulasiScreen";

// Same XP count-up animation as SimulasiGainXpStep, duplicated rather than
// exported because this one needs two CTAs at the end instead of one
// "Klaim XP" — see "Lanjut" / "Lihat Feedback dari Viewer" below.
function LiveGainXpStep({ xpEarned, onContinue, onViewViewerFeedback }) {
  const [displayedXP, setDisplayedXP] = useState(0);
  const [isCounting, setIsCounting] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  const { isReady: isXpReady } = useGainXpPreloader(videoGainXP);
  const videoSrc = getPreloadedVideoSrc(videoGainXP);

  useEffect(() => {
    playGainXpIntroSound();
  }, []);

  const handleVideoEnded = () => {
    setIsCounting(true);
    let startTime = null;
    let lastTickVal = -1;
    const duration = 1500;

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
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
        setTimeout(() => setShowButtons(true), 1000);
      }
    };

    requestAnimationFrame(step);
  };

  return (
    <div className="lesson-completed-screen">
      <div className="lesson-completed-content">
        <div className="lesson-completed-video-wrap">
          <video
            src={videoSrc}
            autoPlay
            muted
            playsInline
            onEnded={handleVideoEnded}
            className="lesson-completed-video"
            aria-label="Animasi Perolehan XP"
          />
        </div>

        <h2 className="lesson-completed-title">Live Presentasi Selesai!</h2>

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
              <p className="lesson-completed-xp-amount">+{displayedXP} XP</p>
            </div>
          </div>
        )}
      </div>

      {showButtons && (
        <div className="live-gainxp-cta-wrapper lesson-cta-appear">
          <button type="button" className="btn-lesson-finish" onClick={onContinue} disabled={!isXpReady}>
            Lanjut
          </button>
          <button type="button" className="btn-live-view-feedback" onClick={onViewViewerFeedback}>
            Lihat Feedback dari Viewer
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Post-live flow for a Live Presentation: AI feedback (reuses SimulasiScreen's
 * ResultsStep verbatim — same scoring/metrics shape, since analyze-session +
 * generate-feedback are the exact same pipeline) -> Gain XP with a second
 * option to jump straight to the viewer feedback page.
 */
export default function LiveResultsScreen({ results, sessionId, onDone, onViewViewerFeedback }) {
  const [step, setStep] = useState("feedback");
  const earned = results?.feedback?.skor ? Math.round(60 + results.feedback.skor * 0.5) : 85;

  if (step === "feedback") {
    return <ResultsStep results={results} onDone={() => setStep("gain-xp")} />;
  }

  return (
    <LiveGainXpStep
      xpEarned={earned}
      onContinue={onDone}
      onViewViewerFeedback={() => onViewViewerFeedback?.(sessionId)}
    />
  );
}
