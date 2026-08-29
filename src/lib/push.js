import { getToken } from "firebase/messaging";
import { getMessagingIfSupported } from "./firebaseClient";
import { updateProfile } from "./profile";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

/**
 * Requests browser notification permission, registers the FCM service
 * worker, and saves the resulting token to profiles.fcm_token — the same
 * column get_streak_reminder_candidates()/send-streak-reminders already
 * read server-side (TASK-H4). Returns a {status} object rather than
 * throwing, since every failure mode here (not configured, unsupported
 * browser, permission denied) is a normal outcome the caller should show,
 * not an error.
 */
export async function enablePushNotifications(userId) {
  const messaging = await getMessagingIfSupported();
  if (!messaging || !VAPID_KEY) return { status: "not_configured" };

  if (typeof Notification === "undefined") return { status: "unsupported" };
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { status: "denied" };

  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
  if (!token) return { status: "no_token" };

  await updateProfile(userId, { fcm_token: token });
  return { status: "ok", token };
}
