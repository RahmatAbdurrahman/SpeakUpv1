/**
 * Ultra-realistic Text-To-Speech using ElevenLabs Multilingual v2 (Adam - Male Voice)
 * with automatic fallback to Microsoft Edge TTS (id-ID-ArdiNeural) and Web Speech.
 */

const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY || "";
const ELEVENLABS_VOICE_ID = "pNInz6obpgDQGcFmaJgB"; // Adam - Professional & Natural Male Voice

let currentAudioInstance = null;
let activePlaybackId = 0;
let currentAbortController = null;
const audioCache = new Map();

/**
 * Instantly stops any ongoing or in-flight TTS playback, aborts network fetch,
 * and releases audio elements.
 */
export function stopQuestionTTS() {
  activePlaybackId++; // Invalidate any pending or in-flight requests immediately

  if (currentAbortController) {
    try {
      currentAbortController.abort();
    } catch (_) {}
    currentAbortController = null;
  }

  if (currentAudioInstance) {
    try {
      currentAudioInstance.pause();
      currentAudioInstance.src = "";
      currentAudioInstance.load();
    } catch (_) {}
    currentAudioInstance = null;
  }

  if ("speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (_) {}
  }
}

/**
 * Synthesizes and plays real-time male voice TTS using ElevenLabs (Adam)
 * and falls back seamlessly to Microsoft Edge TTS if quota is exceeded or unavailable.
 */
export async function playQuestionTTS(text, { onStart, onEnd } = {}) {
  stopQuestionTTS();
  if (!text || typeof text !== "string" || !text.trim()) return;

  const cleanText = text.trim();
  const playbackId = activePlaybackId;

  // 1. Check local audio blob cache (preserves quota when repeating questions)
  if (audioCache.has(cleanText)) {
    const cachedBlobUrl = audioCache.get(cleanText);
    playBlobUrl(cachedBlobUrl, { onStart, onEnd, fallbackText: cleanText, playbackId });
    return;
  }

  // 2. Try ElevenLabs if API key is provided
  if (ELEVENLABS_API_KEY) {
    try {
      const abortController = new AbortController();
      currentAbortController = abortController;

      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
        {
          method: "POST",
          signal: abortController.signal,
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": ELEVENLABS_API_KEY,
          },
          body: JSON.stringify({
            text: cleanText,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
              style: 0.0,
              use_speaker_boost: true,
            },
          }),
        }
      );

      // Check if session was stopped or exited during fetch
      if (activePlaybackId !== playbackId) return;

      if (response.ok) {
        const audioBlob = await response.blob();
        if (activePlaybackId !== playbackId) return;

        const blobUrl = URL.createObjectURL(audioBlob);
        audioCache.set(cleanText, blobUrl);
        playBlobUrl(blobUrl, { onStart, onEnd, fallbackText: cleanText, playbackId });
        return;
      } else {
        console.warn(
          `ElevenLabs TTS response error (${response.status}), falling back to Edge TTS.`
        );
      }
    } catch (err) {
      if (err?.name === "AbortError" || activePlaybackId !== playbackId) {
        return; // Aborted intentionally on exit, do not trigger fallback
      }
      console.warn("ElevenLabs TTS request failed, falling back to Edge TTS:", err);
    }
  }

  // Check if session was stopped before triggering fallback
  if (activePlaybackId !== playbackId) return;

  // 3. Fallback to Microsoft Edge TTS (id-ID-ArdiNeural)
  playWithEdgeTts(cleanText, { onStart, onEnd, playbackId });
}

function playBlobUrl(blobUrl, { onStart, onEnd, fallbackText, playbackId }) {
  if (activePlaybackId !== playbackId) return;

  try {
    const audio = new Audio(blobUrl);
    currentAudioInstance = audio;

    audio.onplay = () => {
      if (activePlaybackId === playbackId && onStart) onStart();
    };

    audio.onended = () => {
      if (currentAudioInstance === audio) currentAudioInstance = null;
      if (activePlaybackId === playbackId && onEnd) onEnd();
    };

    audio.onerror = (e) => {
      if (activePlaybackId !== playbackId) return;
      console.warn("Blob audio playback error, fallback to Edge TTS:", e);
      if (currentAudioInstance === audio) currentAudioInstance = null;
      playWithEdgeTts(fallbackText, { onStart, onEnd, playbackId });
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        if (activePlaybackId !== playbackId) return;
        console.warn("Blob audio play blocked, fallback to Edge TTS:", err);
        playWithEdgeTts(fallbackText, { onStart, onEnd, playbackId });
      });
    }
  } catch (err) {
    if (activePlaybackId === playbackId) {
      playWithEdgeTts(fallbackText, { onStart, onEnd, playbackId });
    }
  }
}

function playWithEdgeTts(text, { onStart, onEnd, playbackId } = {}) {
  if (activePlaybackId !== playbackId) return;
  const ttsUrl = `/api/tts?text=${encodeURIComponent(text)}&voice=id-ID-ArdiNeural`;

  try {
    const audio = new Audio(ttsUrl);
    currentAudioInstance = audio;

    audio.onplay = () => {
      if (activePlaybackId === playbackId && onStart) onStart();
    };

    audio.onended = () => {
      if (currentAudioInstance === audio) currentAudioInstance = null;
      if (activePlaybackId === playbackId && onEnd) onEnd();
    };

    audio.onerror = (e) => {
      if (activePlaybackId !== playbackId) return;
      console.warn("Edge TTS stream error, fallback to Web Speech:", e);
      if (currentAudioInstance === audio) currentAudioInstance = null;
      fallbackWebSpeech(text, { onStart, onEnd, playbackId });
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        if (activePlaybackId !== playbackId) return;
        console.warn("Audio play blocked, fallback to Web Speech:", err);
        fallbackWebSpeech(text, { onStart, onEnd, playbackId });
      });
    }
  } catch (err) {
    if (activePlaybackId === playbackId) {
      fallbackWebSpeech(text, { onStart, onEnd, playbackId });
    }
  }
}

function fallbackWebSpeech(text, { onStart, onEnd, playbackId } = {}) {
  if (activePlaybackId !== playbackId) return;

  if (!("speechSynthesis" in window)) {
    if (onStart) onStart();
    if (onEnd) setTimeout(onEnd, 3000);
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "id-ID";
  utterance.rate = 0.95;
  utterance.pitch = 0.65;

  utterance.onstart = () => {
    if (activePlaybackId === playbackId && onStart) onStart();
  };

  utterance.onend = () => {
    if (activePlaybackId === playbackId && onEnd) onEnd();
  };

  utterance.onerror = () => {
    if (activePlaybackId === playbackId && onEnd) onEnd();
  };

  window.speechSynthesis.speak(utterance);
}

