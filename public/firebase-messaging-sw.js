// Firebase Cloud Messaging background handler. Must live as a plain static
// file at the site root (not under src/) — service workers can't go through
// Vite's bundler, so unlike the rest of the app this can't read
// import.meta.env and needs the config hardcoded below. The apiKey/appId
// here are the public Web identifiers (safe to expose — see Firebase's own
// docs on this), NOT secrets; actual access control is Firebase project
// rules, same as VITE_SUPABASE_ANON_KEY being safe in the client bundle.
//
// Keep these two values in sync with .env's VITE_FIREBASE_API_KEY /
// VITE_FIREBASE_APP_ID if they're ever rotated in Firebase Console.
importScripts("https://www.gstatic.com/firebasejs/12.18.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.18.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDrignGF9CXKBpOcGquQq-darHlSVDClWw",
  authDomain: "speakup-2712a.firebaseapp.com",
  projectId: "speakup-2712a",
  storageBucket: "speakup-2712a.firebasestorage.app",
  messagingSenderId: "96689645346",
  appId: "1:96689645346:web:c9c7f26efcfe348ebce77b",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || "SpeakUp", {
    body: body || "",
    icon: "/favicon.svg",
  });
});
