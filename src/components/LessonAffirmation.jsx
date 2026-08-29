import React from "react";
import SessionLoadingScreen from "./SessionLoadingScreen";

export default function LessonAffirmation({
  loadingText = "Menyiapkan sesi...",
  onComplete,
  duration = 2000,
  isReady = true,
}) {
  return (
    <SessionLoadingScreen
      text={loadingText}
      duration={duration}
      isReady={isReady}
      onComplete={onComplete}
    />
  );
}
