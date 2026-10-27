import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";

// Firebase client configuration (Can be populated from Firebase Console Project Settings)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDemoKeyForHazardSenseOS2026",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "hazardsense-construction.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "hazardsense-construction",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "hazardsense-construction.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789012",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789012:web:abcdef123456"
};

let app = null;
let db = null;

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  db = getFirestore(app);
  console.log("[FIREBASE CLIENT] Initialized Firestore client.");
} catch (e) {
  console.warn("[FIREBASE CLIENT] Operating in hybrid/local mode:", e.message);
}

export { app, db, collection, onSnapshot, query, orderBy, limit };
