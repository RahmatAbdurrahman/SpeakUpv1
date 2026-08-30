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
 * Global click listener strictly for real action/CTA buttons
 * (Excludes bottom nav, icon-only buttons, back buttons, settings, close buttons, cards, etc.)
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

    // Only target actual <button> elements or elements explicitly marked with .btn-primary / .btn-secondary
    const btn = target.closest("button, .btn-primary, .btn-secondary");
    if (!btn) return;

    // 1. Explicit opt-out
    if (btn.getAttribute("data-no-sound") === "true") return;

    // 2. Disabled buttons
    if (btn.hasAttribute("disabled") || btn.getAttribute("aria-disabled") === "true") return;

    // 3. Exclude bottom navigation & toggle bars completely
    if (btn.closest(".bottom-nav, .home-bottom-nav, .nav-bar, nav, .skeleton-bottom-nav, .tab-buttons-container, .practice-mode-toggle, .sosial-tab-btn, .tab-btn")) {
      return;
    }

    // 4. Exclude icon-only buttons / navigation / back / settings / close buttons
    const className = (typeof btn.className === "string" ? btn.className : "");
    const isIconOrNav =
      className.includes("back") ||
      className.includes("close") ||
      className.includes("settings") ||
      className.includes("icon") ||
      className.includes("round-back") ||
      className.includes("reaction") ||
      className.includes("teams-control") ||
      className.includes("chat-send") ||
      btn.closest(".lesson-back-btn, .btn-profile-settings, .btn-modul7-round-back, .btn-round-back, .modal-close-btn");

    if (isIconOrNav) return;

    // 5. Exclude if there is no readable text inside the button (e.g. only contains SVG/image)
    const text = (btn.innerText || "").trim();
    if (!text) return;

    // 6. Play the sound for actual action/CTA buttons
    playTapSound();
  };

  window.addEventListener("pointerdown", handlePointerDown, { passive: true });
}
