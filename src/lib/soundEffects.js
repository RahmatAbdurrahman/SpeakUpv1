import buttonClickMp3 from "../assets/sound_effects/buttonclick.mp3";

// Web Audio API procedural + AudioBuffer player (100% unrecognized by OS media players / lockscreens)
let audioCtx = null;
let buttonAudioBuffer = null;
let isPreloading = false;

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
 * Preload and decode the MP3 into memory buffer
 */
export async function preloadSoundBuffer() {
  if (buttonAudioBuffer || isPreloading) return;
  isPreloading = true;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const response = await fetch(buttonClickMp3);
    const arrayBuffer = await response.arrayBuffer();
    buttonAudioBuffer = await ctx.decodeAudioData(arrayBuffer);
  } catch (err) {
    console.warn("Failed to decode buttonclick.mp3, falling back to synth:", err);
  } finally {
    isPreloading = false;
  }
}

/**
 * Play the button click sound via Web Audio API BufferSource
 */
export function playTapSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // If MP3 buffer is loaded, play it from memory
    if (buttonAudioBuffer) {
      const source = ctx.createBufferSource();
      const gainNode = ctx.createGain();

      source.buffer = buttonAudioBuffer;
      gainNode.gain.setValueAtTime(0.8, ctx.currentTime);

      source.connect(gainNode);
      gainNode.connect(ctx.destination);

      source.start(0);
      return;
    }

    // Try preloading if not loaded yet
    preloadSoundBuffer();

    // Fallback procedural sound if buffer not ready on first tap
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.04);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.045);
  } catch {
    // Fail silently if browser blocks audio
  }
}

/**
 * Play a crisp, pleasant rising tick sound when XP is counting up
 * @param {number} progress - 0.0 to 1.0 representing count-up progression
 */
export function playXpTickSound(progress = 0) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    // Pitch gently ascends as XP counts up (from 420Hz up to 860Hz)
    const baseFreq = 420 + Math.max(0, Math.min(1, progress)) * 440;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.05, now + 0.025);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.09, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.035);
  } catch {}
}

/**
 * Play celebration chord when XP count finishes
 */
export function playXpCompleteSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const chord = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    chord.forEach((freq, i) => {
      const now = ctx.currentTime + i * 0.06;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.36);
    });
  } catch {}
}

/**
 * Global click listener for real action/CTA buttons & card buttons
 * (Includes CTA buttons and card buttons with shadows; excludes bottom nav, icon-only buttons, back buttons, settings, close buttons)
 */
export function initGlobalSoundEffects() {
  if (typeof window === "undefined") return;

  // Preload sound buffer on initial load
  preloadSoundBuffer();

  const handlePointerDown = (e) => {
    // Ensure AudioContext is running on user interaction
    const ctx = getAudioContext();
    if (ctx && !buttonAudioBuffer) {
      preloadSoundBuffer();
    }

    const target = e.target;
    if (!target) return;

    // Target real action buttons and cards with 3D button shadows
    const clickable = target.closest(
      "button, .btn, .btn-primary, .btn-secondary, .home-module-item, .home-todays-lesson-card, .simulasi-scenario-card, .lesson-p1-card, .radio-card, .tag-chip, [data-name*='CardButton'], [data-name*='Card-Button']"
    );
    if (!clickable) return;

    // 1. Explicit opt-out
    if (clickable.getAttribute("data-no-sound") === "true") return;

    // 2. Disabled or inactive buttons/cards (e.g. inactive module cards, locked lessons)
    if (
      clickable.hasAttribute("disabled") ||
      clickable.getAttribute("aria-disabled") === "true" ||
      clickable.classList.contains("home-module-item--disabled") ||
      clickable.classList.contains("home-module-item--inactive") ||
      clickable.classList.contains("btn-lesson-status--inactive") ||
      clickable.classList.contains("btn-open-next-module--inactive") ||
      clickable.closest("[disabled], [aria-disabled='true'], .home-module-item--disabled, .home-module-item--inactive, .btn-lesson-status--inactive")
    ) {
      return;
    }

    // 3. Exclude bottom navigation & toggle tabs completely
    if (clickable.closest(".bottom-nav, .home-bottom-nav, .nav-bar, nav, .skeleton-bottom-nav, .tab-buttons-container, .practice-mode-toggle, .sosial-tab-btn, .tab-btn")) {
      return;
    }

    // 4. Exclude icon-only buttons / navigation / back / settings / close buttons
    const className = (typeof clickable.className === "string" ? clickable.className : "");
    const isIconOrNav =
      className.includes("back") ||
      className.includes("close") ||
      className.includes("settings") ||
      className.includes("icon-btn") ||
      className.includes("btn-icon") ||
      className.includes("round-back") ||
      className.includes("reaction") ||
      className.includes("teams-control") ||
      className.includes("chat-send") ||
      clickable.closest(".lesson-back-btn, .btn-profile-settings, .btn-modul7-round-back, .btn-round-back, .modal-close-btn");

    if (isIconOrNav) return;

    // 5. If it's a plain <button>, ensure it's not an empty icon button
    if (clickable.tagName === "BUTTON") {
      const text = (clickable.innerText || "").trim();
      const hasImage = clickable.querySelector("img");
      if (!text && !hasImage) return;
    }

    // 6. Play the sound for actual CTA buttons & 3D shadow card buttons
    playTapSound();
  };

  window.addEventListener("pointerdown", handlePointerDown, { passive: true });
}
