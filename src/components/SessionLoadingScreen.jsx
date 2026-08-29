import React, { useEffect, useState } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import loadingLottie from "../assets/lotties/Loading.lottie";
import "./SessionLoadingScreen.css";

export default function SessionLoadingScreen({
  text = "Menyiapkan sesi...",
  duration = 2000,
  isReady = true,
  onComplete,
}) {
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  useEffect(() => {
    if (minTimeElapsed && isReady) {
      onComplete?.();
    }
  }, [minTimeElapsed, isReady, onComplete]);

  return (
    <div className="session-loading-screen" data-name="Session-Loading">
      <div className="session-loading-content">
        <div className="session-loading-lottie-wrap">
          <DotLottieReact
            src={loadingLottie}
            loop
            autoplay
            className="session-loading-lottie"
          />
        </div>
        <p className="session-loading-title">{text}</p>
      </div>
    </div>
  );
}
