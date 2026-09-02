import { Room, RoomEvent, Track } from "livekit-client";

const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL;

export { RoomEvent, Track };

export function isLivekitConfigured() {
  return Boolean(LIVEKIT_URL);
}

/** Connects to a LiveKit room using a token from get-live-token. Caller owns disconnect(). */
export async function connectToRoom(token) {
  if (!LIVEKIT_URL) {
    throw new Error("VITE_LIVEKIT_URL belum di-set. Cek file .env di root project.");
  }
  const room = new Room();
  await room.connect(LIVEKIT_URL, token);
  return room;
}

/** Broadcaster only: turns the local camera on/off, publishing/unpublishing the track. */
export async function setCameraEnabled(room, enabled) {
  await room.localParticipant.setCameraEnabled(enabled);
}

/** Broadcaster only: turns the local microphone on/off, publishing/unpublishing the track. */
export async function setMicrophoneEnabled(room, enabled) {
  await room.localParticipant.setMicrophoneEnabled(enabled);
}

/** Attaches a track to a container element and returns the created media element for cleanup. */
export function attachTrack(track, container) {
  if (!container) return null;
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
  const el = track.attach();
  container.appendChild(el);
  return el;
}

export function detachTrack(track) {
  track.detach().forEach((el) => el.remove());
}
