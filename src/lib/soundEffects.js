// Web Audio API procedural sound synthesizer (unrecognizable by OS media player)
let audioCtx = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Play a gentle, crisp UI button tap sound
 */
export function playTapSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    // Quick, subtle pitch drop for a natural tactile feel
    osc.frequency.setValueAtTime(360, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.04);

    // Smooth envelope to avoid clicks/pops at edges
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.045);
  } catch {
    // Fail silently if audio is restricted by browser policy
  }
}

/**
 * Play an uplifting chime for achievements/success
 */
export function playSuccessSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    const noteDuration = 0.07;

    notes.forEach((freq, i) => {
      const now = ctx.currentTime + i * noteDuration;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.1, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.23);
    });
  } catch {}
}

/**
 * Global click listener for all interactive elements
 */
export function initGlobalSoundEffects() {
  if (typeof window === "undefined") return;

  const handleClick = (e) => {
    // Resume context on user gesture
    getAudioContext();

    const target = e.target;
    if (!target) return;

    // Check if clicked element or its parent is a button or interactive
    const clickable = target.closest(
      "button, [role='button'], .btn, .btn-primary, .btn-secondary, .home-module-item, .simulasi-scenario-card, .tab-btn, .sosial-room-card, .practice-mode-btn"
    );

    if (clickable) {
      if (clickable.getAttribute("data-no-sound") === "true") return;
      if (clickable.hasAttribute("disabled") || clickable.getAttribute("aria-disabled") === "true") return;

      playTapSound();
    }
  };

  window.addEventListener("pointerdown", handleClick, { passive: true });
}
