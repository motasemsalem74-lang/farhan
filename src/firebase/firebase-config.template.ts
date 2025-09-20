import { FirebaseApp, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { FirebaseStorage, getStorage } from 'firebase/storage';
import { getMessaging, Messaging, isSupported } from 'firebase/messaging';

// Firebase configuration from environment variables or fallback to defaults
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBuuM3rbUFdu2MSTEg-w7pB-9l_Q1SOj5M",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "al-farhan-c3a30.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "al-farhan-c3a30",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "al-farhan-c3a30.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "871976480343",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:871976480343:web:baea3ef580b28a3589fd12",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-XXXXXXXXXX"
};

// Initialize Firebase
const app: FirebaseApp = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth: Auth = getAuth(app);

// Initialize Cloud Firestore
export const db: Firestore = getFirestore(app);

// Initialize Firebase Storage
export const storage: FirebaseStorage = getStorage(app);

// Initialize Firebase Cloud Messaging (only on client)
let messaging: Messaging | null = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      messaging = getMessaging(app);
    }
  });
}
export { messaging };

// Development environment emulators (uncomment for local development)
/*
if (process.env.NODE_ENV === 'development') {
  // Emulator connections would go here
}
*/

export default app;