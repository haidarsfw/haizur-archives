import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

if (!firebaseConfig.apiKey) {
  throw new Error("Missing VITE_FIREBASE_API_KEY. Copy .env.example to .env and fill in your Firebase config.");
}

const app = initializeApp(firebaseConfig);

// Realtime Database for multiplayer presence
export const db = getDatabase(app);

// Firestore for persistent chat messages
export const firestore = getFirestore(app);

// The config dict itself is needed to boot the FCM service worker, which runs
// in a separate context (no access to import.meta.env). Frontend passes this
// to the worker via a query string on the service-worker registration URL.
export const firebaseConfigPublic = firebaseConfig;

// Cloud Messaging — lazy, since not every browser supports it (Safari desktop
// pre-16, old Chromium embedded, etc.). Returns a messaging instance or null.
let messagingPromise = null;
export function getMessagingIfSupported() {
  if (!messagingPromise) {
    messagingPromise = isSupported()
      .then((supported) => (supported ? getMessaging(app) : null))
      .catch(() => null);
  }
  return messagingPromise;
}