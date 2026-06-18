import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";

// Read from Environment Variables (useful when deploying custom builds on other domains like Vercel)
const env = (import.meta as any).env || {};
const customApiKey = env.VITE_FIREBASE_API_KEY;

const firebaseConfig = customApiKey ? {
  apiKey: customApiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID
} : {
  apiKey: "AIzaSyC4G5jRoG1DMg3u9aOQ8S1NYeht3aam440",
  authDomain: "winged-tribute-ttxfk.firebaseapp.com",
  projectId: "winged-tribute-ttxfk",
  storageBucket: "winged-tribute-ttxfk.firebasestorage.app",
  messagingSenderId: "190327942120",
  appId: "1:190327942120:web:8a8e05133916ed737f925d"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Fall back to starter-tier database ID if custom keys are not configured
const databaseId = customApiKey 
  ? (env.VITE_FIREBASE_FIRESTORE_DB_ID || "(default)")
  : "ai-studio-7dddd442-984d-41b2-a8c3-13715a95444c";

export const db = initializeFirestore(app, {}, databaseId);
