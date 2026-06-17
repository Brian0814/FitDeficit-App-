import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC4G5jRoG1DMg3u9aOQ8S1NYeht3aam440",
  authDomain: "winged-tribute-ttxfk.firebaseapp.com",
  projectId: "winged-tribute-ttxfk",
  storageBucket: "winged-tribute-ttxfk.firebasestorage.app",
  messagingSenderId: "190327942120",
  appId: "1:190327942120:web:8a8e05133916ed737f925d"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use the specific firestoreDatabaseId "ai-studio-7dddd442-984d-41b2-a8c3-13715a95444c"
export const db = initializeFirestore(app, {}, "ai-studio-7dddd442-984d-41b2-a8c3-13715a95444c");
