import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase Configuration (Migrated from original KibiMex keys)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBuGUsI9YoeIpvpfiNl9xbdkwyGSE1i4Yk",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "kibimex.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "kibimex",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "kibimex.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "678268067561",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:678268067561:web:a64a482ae5210dd1d25a78",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-XZ77PCH8H0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
