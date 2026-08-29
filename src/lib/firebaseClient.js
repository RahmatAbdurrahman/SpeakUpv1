import { initializeApp } from "firebase/app";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Unlike supabaseClient.js, this does NOT throw when unconfigured — push
// notifications are a progressive enhancement (TASK-H4), not core to the
// app, so a missing VITE_FIREBASE_API_KEY/APP_ID (Web app not registered
// in Firebase Console yet) must not crash the rest of SpeakUp.
const isConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.appId);
const firebaseApp = isConfigured ? initializeApp(firebaseConfig) : null;

/** Resolves to null if Firebase Web isn't configured yet, or this browser/context doesn't support Web Push. */
export async function getMessagingIfSupported() {
  if (!firebaseApp) return null;
  if (!(await isSupported())) return null;
  return getMessaging(firebaseApp);
}
