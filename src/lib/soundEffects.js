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
 * Pentatonic scale notes for Brilliant-style melodic XP count-up
 * (C5, D5, E5, G5, A5, C6, D6, E6, G6, A6)
 */
const PENTATONIC_SCALE = [
  523.25, 587.33, 659.25, 783.99, 880.00,
  1046.50, 1174.66, 1318.51, 1567.98, 1760.00
];

/**
 * Play a Brilliant.org style crisp wooden marimba/kalimba pop when XP counts up
 * @param {number} progress - 0.0 to 1.0 representing count-up progression
 */
export function playXpTickSound(progress = 0) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const clampedProgress = Math.max(0, Math.min(1, progress));
    
    // Pick note from pentatonic scale based on progress
    const noteIndex = Math.min(
      Math.floor(clampedProgress * (PENTATONIC_SCALE.length - 1)),
      PENTATONIC_SCALE.length - 1
    );
    const fundamentalFreq = PENTATONIC_SCALE[noteIndex];

    // Master gain for the tick
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, now);
    masterGain.gain.linearRampToValueAtTime(0.18, now + 0.002);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);
    masterGain.connect(ctx.destination);

    // 1. Primary Marimba Fundamental (Sine with quick mallet attack)
    const osc1 = ctx.createOscillator();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(fundamentalFreq * 1.35, now);
    osc1.frequency.exponentialRampToValueAtTime(fundamentalFreq, now + 0.006);
    osc1.connect(masterGain);
    osc1.start(now);
    osc1.stop(now + 0.07);

    // 2. Woody Overtone (Triangle harmonic 2.76x for wooden bar resonance)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(fundamentalFreq * 2.76, now);
    gain2.gain.setValueAtTime(0.07, now);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);
    osc2.connect(gain2);
    gain2.connect(masterGain);
    osc2.start(now);
    osc2.stop(now + 0.03);

    // 3. Subtle sub-pop for tactile punch (45Hz drop)
    const oscSub = ctx.createOscillator();
    const gainSub = ctx.createGain();
    oscSub.type = "sine";
    oscSub.frequency.setValueAtTime(fundamentalFreq * 0.5, now);
    gainSub.gain.setValueAtTime(0.05, now);
    gainSub.gain.exponentialRampToValueAtTime(0.0001, now + 0.015);
    oscSub.connect(gainSub);
    gainSub.connect(masterGain);
    oscSub.start(now);
    oscSub.stop(now + 0.02);
  } catch {}
}

/**
 * Play Brilliant-style sparkling celebration arpeggio when XP finishes counting
 */
export function playXpCompleteSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Brilliant-style sparkling major triad + major 7th flourish
    const chord = [523.25, 659.25, 783.99, 987.77, 1046.50, 1318.51]; // C5, E5, G5, B5, C6, E6
    chord.forEach((freq, i) => {
      const noteTime = ctx.currentTime + i * 0.05;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(3200, noteTime);

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq * 1.05, noteTime);
      osc.frequency.exponentialRampToValueAtTime(freq, noteTime + 0.008);

      gain.gain.setValueAtTime(0.001, noteTime);
      gain.gain.linearRampToValueAtTime(0.14, noteTime + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.55);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.56);

      // Shimmer octave overtone for the last 2 notes
      if (i >= 4) {
        const shimmerOsc = ctx.createOscillator();
        const shimmerGain = ctx.createGain();
        shimmerOsc.type = "triangle";
        shimmerOsc.frequency.setValueAtTime(freq * 2, noteTime + 0.01);

        shimmerGain.gain.setValueAtTime(0.001, noteTime + 0.01);
        shimmerGain.gain.linearRampToValueAtTime(0.05, noteTime + 0.02);
        shimmerGain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.4);

        shimmerOsc.connect(shimmerGain);
        shimmerGain.connect(ctx.destination);

        shimmerOsc.start(noteTime + 0.01);
        shimmerOsc.stop(noteTime + 0.42);
      }
    });
  } catch {}
}

/**
 * Play an inspiring, magical fanfare & coin shimmer sound when the Gain XP video starts
 */
export function playGainXpIntroSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. Warm uplifting harmonic pad chord (C major add9: C4, E4, G4, D5)
    const padNotes = [261.63, 329.63, 392.00, 587.33];
    padNotes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(900 + idx * 300, now);

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.07, now + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 1.25);
    });

    // 2. Sparkling celestial glissando (rising star glitter)
    const sparkles = [523.25, 659.25, 783.99, 1046.50, 1174.66, 1318.51, 1567.98, 2093.00];
    sparkles.forEach((freq, idx) => {
      const noteTime = now + 0.06 + idx * 0.055;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq * 1.02, noteTime);
      osc.frequency.exponentialRampToValueAtTime(freq, noteTime + 0.01);

      gain.gain.setValueAtTime(0.001, noteTime);
      gain.gain.linearRampToValueAtTime(0.09, noteTime + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.46);
    });

    // 3. Golden Star Coin Ping (bright crystal bell impact)
    const coinTime = now + 0.46;
    const coinOsc = ctx.createOscillator();
    const coinGain = ctx.createGain();
    coinOsc.type = "sine";
    coinOsc.frequency.setValueAtTime(2349.32, coinTime); // D7 high crystal bell
    coinOsc.frequency.exponentialRampToValueAtTime(1174.66, coinTime + 0.04);

    coinGain.gain.setValueAtTime(0.001, coinTime);
    coinGain.gain.linearRampToValueAtTime(0.12, coinTime + 0.005);
    coinGain.gain.exponentialRampToValueAtTime(0.0001, coinTime + 0.6);

    coinOsc.connect(coinGain);
    coinGain.connect(ctx.destination);

    coinOsc.start(coinTime);
    coinOsc.stop(coinTime + 0.62);
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
