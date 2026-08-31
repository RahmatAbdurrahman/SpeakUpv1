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
 * (Starts very softly with a gentle warm cloud swell, then blossoms into starry sparkles and crystal coin ping)
 */
export function playGainXpIntroSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. Soft, dreamy cloud parting swell (Gentle C major 9: C4, E4, G4, B4, D5)
    // Starts whisper-quiet, then slowly opens up like sunlight breaking through clouds
    const padNotes = [261.63, 329.63, 392.00, 493.88, 587.33];
    padNotes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // Low-pass filter sweeps from warm whisper (350Hz) to open daylight (1400Hz)
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(350 + idx * 80, now);
      filter.frequency.exponentialRampToValueAtTime(1400 + idx * 200, now + 0.55);

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);

      // Very soft, gradual attack fade-in
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.045, now + 0.35);
      gain.gain.exponentialRampToValueAtTime(0.00001, now + 1.4);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 1.45);
    });

    // 2. Delicate celestial harp sparkles (Progressive crescendo from soft to luminous)
    const sparkles = [523.25, 659.25, 783.99, 1046.50, 1174.66, 1318.51, 1567.98, 2093.00];
    sparkles.forEach((freq, idx) => {
      // Notes begin after the initial soft cloud swell
      const noteTime = now + 0.18 + idx * 0.052;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq * 1.015, noteTime);
      osc.frequency.exponentialRampToValueAtTime(freq, noteTime + 0.01);

      // Volume increases dynamically as sparkles ascend
      const noteGain = 0.025 + (idx / (sparkles.length - 1)) * 0.06;
      gain.gain.setValueAtTime(0.0001, noteTime);
      gain.gain.linearRampToValueAtTime(noteGain, noteTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.00001, noteTime + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.52);
    });

    // 3. Golden Star Coin Ping (Crisp, gentle crystal chime at peak reveal: 0.58s)
    const coinTime = now + 0.56;
    const coinOsc = ctx.createOscillator();
    const coinGain = ctx.createGain();
    coinOsc.type = "sine";
    coinOsc.frequency.setValueAtTime(2349.32, coinTime); // D7 crystal bell
    coinOsc.frequency.exponentialRampToValueAtTime(1174.66, coinTime + 0.035);

    coinGain.gain.setValueAtTime(0.0001, coinTime);
    coinGain.gain.linearRampToValueAtTime(0.095, coinTime + 0.006);
    coinGain.gain.exponentialRampToValueAtTime(0.00001, coinTime + 0.7);

    coinOsc.connect(coinGain);
    coinGain.connect(ctx.destination);

    coinOsc.start(coinTime);
    coinOsc.stop(coinTime + 0.72);
  } catch {}
}

/**
 * Play a deeply satisfying, calming zen singing bowl & crystal chime when breathing exercise completes
 */
export function playBreathingCompleteSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. Zen Singing Bowl Harmonic Resonance (F Major / Solfeggio soothing grounding chord)
    const bowlFrequencies = [174.61, 261.63, 349.23, 440.00, 523.25, 698.46];

    bowlFrequencies.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1200 + idx * 250, now);

      osc.type = idx % 2 === 0 ? "sine" : "triangle";
      osc.frequency.setValueAtTime(freq * 1.008, now);
      osc.frequency.exponentialRampToValueAtTime(freq, now + 0.04);

      const peakGain = 0.14 / (1 + idx * 0.4);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(peakGain, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.00001, now + 2.4);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 2.45);
    });

    // 2. Gentle Crystal Sparkles that bloom softly
    const crystalNotes = [880.00, 1046.50, 1318.51, 1567.98];
    crystalNotes.forEach((freq, i) => {
      const noteTime = now + 0.2 + i * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq * 1.01, noteTime);
      osc.frequency.exponentialRampToValueAtTime(freq, noteTime + 0.01);

      gain.gain.setValueAtTime(0.0001, noteTime);
      gain.gain.linearRampToValueAtTime(0.06, noteTime + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.00001, noteTime + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 1.25);
    });
  } catch {}
}

/**
 * Play a serene, calming Zen start chime (432Hz Mindful Gong) when the breathing practice session begins
 */
export function playBreathingStartSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. Deep 432Hz Relaxing Resonance Gong & Harmonic Pad
    const startFrequencies = [216.00, 324.00, 432.00, 648.00];

    startFrequencies.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(900 + idx * 300, now);

      osc.type = idx === 0 ? "sine" : "triangle";
      osc.frequency.setValueAtTime(freq * 1.006, now);
      osc.frequency.exponentialRampToValueAtTime(freq, now + 0.05);

      const peakGain = 0.12 / (1 + idx * 0.35);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(peakGain, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.00001, now + 2.0);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 2.05);
    });

    // 2. High crystal breath chime
    const bellOsc = ctx.createOscillator();
    const bellGain = ctx.createGain();
    bellOsc.type = "sine";
    bellOsc.frequency.setValueAtTime(1296.00, now); // 432Hz * 3 (harmonic E6)
    bellGain.gain.setValueAtTime(0.0001, now);
    bellGain.gain.linearRampToValueAtTime(0.05, now + 0.01);
    bellGain.gain.exponentialRampToValueAtTime(0.00001, now + 1.4);

    bellOsc.connect(bellGain);
    bellGain.connect(ctx.destination);

    bellOsc.start(now);
    bellOsc.stop(now + 1.45);
  } catch {}
}

/**
 * Immersive session enter UI sound, smooth digital swoop with a soft bouncing sonar echo,
 * futuristic anti-gravity drop, crisp resonant reverb tail, pleasant and satisfying ear candy.
 * Triggered when entering any lesson session.
 */
export function playLessonEnterPortalSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // ── 1. Smooth Digital Swoop (Liquid ascending curve 260Hz -> 840Hz) ─────────
    const swoopOsc = ctx.createOscillator();
    const swoopGain = ctx.createGain();
    const swoopFilter = ctx.createBiquadFilter();

    swoopFilter.type = "lowpass";
    swoopFilter.frequency.setValueAtTime(800, now);
    swoopFilter.frequency.exponentialRampToValueAtTime(3200, now + 0.14);

    swoopOsc.type = "sine";
    swoopOsc.frequency.setValueAtTime(260, now);
    swoopOsc.frequency.exponentialRampToValueAtTime(840, now + 0.14);

    swoopGain.gain.setValueAtTime(0.0001, now);
    swoopGain.gain.linearRampToValueAtTime(0.24, now + 0.08);
    swoopGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    swoopOsc.connect(swoopFilter);
    swoopFilter.connect(swoopGain);
    swoopGain.connect(ctx.destination);

    swoopOsc.start(now);
    swoopOsc.stop(now + 0.25);

    // ── 2. Futuristic Anti-Gravity Drop (Round, satisfying sub-bass glide 220Hz -> 50Hz) ──
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    const subFilter = ctx.createBiquadFilter();

    subFilter.type = "lowpass";
    subFilter.frequency.setValueAtTime(350, now + 0.08);
    subFilter.frequency.exponentialRampToValueAtTime(90, now + 1.2);

    subOsc.type = "sine";
    subOsc.frequency.setValueAtTime(220, now + 0.08);
    subOsc.frequency.exponentialRampToValueAtTime(50, now + 0.48);
    subOsc.frequency.linearRampToValueAtTime(42, now + 2.0);

    subGain.gain.setValueAtTime(0.0001, now + 0.08);
    subGain.gain.linearRampToValueAtTime(0.38, now + 0.18);
    subGain.gain.exponentialRampToValueAtTime(0.12, now + 0.7);
    subGain.gain.exponentialRampToValueAtTime(0.00001, now + 2.1);

    subOsc.connect(subFilter);
    subFilter.connect(subGain);
    subGain.connect(ctx.destination);

    subOsc.start(now + 0.08);
    subOsc.stop(now + 2.15);

    // ── 3. Soft Bouncing Sonar Echoes (Rhythmic crystal droplet pings) ───────────
    // Rhythmic pings: Main ping + 3 decaying bounces with subtle pitch shifts
    const sonarPings = [
      { delay: 0.12, freq: 1318.51, gain: 0.14, dur: 0.28 }, // E6 primary sonar
      { delay: 0.32, freq: 1567.98, gain: 0.08, dur: 0.24 }, // G6 bounce 1
      { delay: 0.54, freq: 1975.53, gain: 0.045, dur: 0.22 }, // B6 bounce 2
      { delay: 0.78, freq: 2637.02, gain: 0.025, dur: 0.20 }, // E7 bounce 3
    ];

    sonarPings.forEach(({ delay, freq, gain: pingVol, dur }) => {
      const pingTime = now + delay;

      // Pure crystal sine
      const pingOsc = ctx.createOscillator();
      const pingGain = ctx.createGain();

      pingOsc.type = "sine";
      pingOsc.frequency.setValueAtTime(freq * 1.02, pingTime);
      pingOsc.frequency.exponentialRampToValueAtTime(freq, pingTime + 0.02);

      pingGain.gain.setValueAtTime(0.0001, pingTime);
      pingGain.gain.linearRampToValueAtTime(pingVol, pingTime + 0.004);
      pingGain.gain.exponentialRampToValueAtTime(0.00001, pingTime + dur);

      pingOsc.connect(pingGain);
      pingGain.connect(ctx.destination);

      pingOsc.start(pingTime);
      pingOsc.stop(pingTime + dur + 0.02);

      // Delicate bell harmonic overtone (3x frequency) for glassy shimmer
      const overtoneOsc = ctx.createOscillator();
      const overtoneGain = ctx.createGain();

      overtoneOsc.type = "triangle";
      overtoneOsc.frequency.setValueAtTime(freq * 2.5, pingTime);

      overtoneGain.gain.setValueAtTime(0.0001, pingTime);
      overtoneGain.gain.linearRampToValueAtTime(pingVol * 0.25, pingTime + 0.003);
      overtoneGain.gain.exponentialRampToValueAtTime(0.00001, pingTime + dur * 0.55);

      overtoneOsc.connect(overtoneGain);
      overtoneGain.connect(ctx.destination);

      overtoneOsc.start(pingTime);
      overtoneOsc.stop(pingTime + dur * 0.6);
    });

    // ── 4. Crisp Resonant Reverb Bloom & Ambient Tail (Luminous E-Major chord) ────
    const ambientChord = [329.63, 493.88, 659.25, 830.61, 987.77, 1318.51];
    ambientChord.forEach((freq, idx) => {
      const padOsc = ctx.createOscillator();
      const padGain = ctx.createGain();
      const padFilter = ctx.createBiquadFilter();

      padFilter.type = "lowpass";
      padFilter.frequency.setValueAtTime(500, now + 0.1);
      padFilter.frequency.exponentialRampToValueAtTime(2400, now + 0.55);
      padFilter.frequency.exponentialRampToValueAtTime(600, now + 2.4);

      padOsc.type = idx % 2 === 0 ? "sine" : "triangle";
      padOsc.frequency.setValueAtTime(freq, now + 0.1);

      const maxGain = 0.065 / (1 + idx * 0.22);
      padGain.gain.setValueAtTime(0.0001, now + 0.1);
      padGain.gain.linearRampToValueAtTime(maxGain, now + 0.35 + idx * 0.03);
      padGain.gain.exponentialRampToValueAtTime(maxGain * 0.35, now + 0.95);
      padGain.gain.exponentialRampToValueAtTime(0.00001, now + 2.45);

      padOsc.connect(padFilter);
      padFilter.connect(padGain);
      padGain.connect(ctx.destination);

      padOsc.start(now + 0.1);
      padOsc.stop(now + 2.5);
    });
  } catch {}
}

/**
 * Play an energetic, triumphant celebration fanfare & confetti pop
 * when user passes a difficult challenge (e.g. Modul 7 "Kamu berhasil melewati pertanyaan sulit!")
 */
export function playChallengePassedSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. Crisp Confetti Pop (soft air impact pop)
    const popOsc = ctx.createOscillator();
    const popGain = ctx.createGain();
    popOsc.type = "sine";
    popOsc.frequency.setValueAtTime(320, now);
    popOsc.frequency.exponentialRampToValueAtTime(60, now + 0.035);

    popGain.gain.setValueAtTime(0.001, now);
    popGain.gain.linearRampToValueAtTime(0.18, now + 0.003);
    popGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

    popOsc.connect(popGain);
    popGain.connect(ctx.destination);
    popOsc.start(now);
    popOsc.stop(now + 0.055);

    // 2. Triumphant Ascending Fanfare Motive (C4 -> G4 -> C5 -> E5 -> G5 -> C6)
    const fanfareNotes = [
      { freq: 261.63, time: 0.02, dur: 0.09 },
      { freq: 392.00, time: 0.08, dur: 0.09 },
      { freq: 523.25, time: 0.14, dur: 0.11 },
      { freq: 659.25, time: 0.20, dur: 0.13 },
      { freq: 783.99, time: 0.26, dur: 0.16 },
      { freq: 1046.50, time: 0.33, dur: 0.65 }, // High C6 sustained triumphant note
    ];

    fanfareNotes.forEach(({ freq, time, dur }) => {
      const noteTime = now + time;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(2400, noteTime);

      osc.type = "triangle"; // Warm brass/synthesizer timbre
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.0001, noteTime);
      gain.gain.linearRampToValueAtTime(0.13, noteTime + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.00001, noteTime + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + dur + 0.05);
    });

    // 3. Sparkling Celebration Shimmer & Glissando Overtones
    const sparkles = [1318.51, 1567.98, 2093.00];
    sparkles.forEach((freq, idx) => {
      const sparkleTime = now + 0.36 + idx * 0.06;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, sparkleTime);

      gain.gain.setValueAtTime(0.0001, sparkleTime);
      gain.gain.linearRampToValueAtTime(0.07, sparkleTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.00001, sparkleTime + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(sparkleTime);
      osc.stop(sparkleTime + 0.48);
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

/**
 * Play a sparkling crystal score reveal chime when entering the analysis screen
 */
export function playScoreRevealSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. Soft ascending chime flourish (D5, G5, C6)
    const notes = [587.33, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const noteTime = now + 0.12 + idx * 0.1;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq * 1.05, noteTime);
      osc.frequency.exponentialRampToValueAtTime(freq, noteTime + 0.015);

      gain.gain.setValueAtTime(0.0001, noteTime);
      gain.gain.linearRampToValueAtTime(0.14, noteTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.00001, noteTime + 0.65);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.7);

      // Shimmer overtone on the final crystal high note
      if (idx === 2) {
        const shimmer = ctx.createOscillator();
        const sGain = ctx.createGain();
        shimmer.type = "triangle";
        shimmer.frequency.setValueAtTime(freq * 2, noteTime + 0.02);

        sGain.gain.setValueAtTime(0.0001, noteTime + 0.02);
        sGain.gain.linearRampToValueAtTime(0.05, noteTime + 0.03);
        sGain.gain.exponentialRampToValueAtTime(0.00001, noteTime + 0.45);

        shimmer.connect(sGain);
        sGain.connect(ctx.destination);

        shimmer.start(noteTime + 0.02);
        shimmer.stop(noteTime + 0.5);
      }
    });
  } catch {}
}
