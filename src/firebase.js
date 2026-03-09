import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyA4jcCscCOQ2-pAr5mtnG5kCxtPh2sb430",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "haizur-types.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://haizur-types-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "haizur-types",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "haizur-types.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "344311091924",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:344311091924:web:4dbf349fbdd02c23f26141",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-9EDMPLVYP7",
};

const app = initializeApp(firebaseConfig);

// Realtime Database for multiplayer presence
export const db = getDatabase(app);

// Firestore for persistent chat messages
export const firestore = getFirestore(app);