import { FirebaseApp, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { FirebaseStorage, getStorage } from 'firebase/storage';
import { getMessaging, Messaging, isSupported } from 'firebase/messaging';

// Firebase configuration from google-services.json
const firebaseConfig = {
  apiKey: "AIzaSyBuuM3rbUFdu2MSTEg-w7pB-9l_Q1SOj5M",
  authDomain: "al-farhan-c3a30.firebaseapp.com",
  projectId: "al-farhan-c3a30",
  storageBucket: "al-farhan-c3a30.firebasestorage.app",
  messagingSenderId: "871976480343",
  appId: "1:871976480343:web:baea3ef580b28a3589fd12",
  measurementId: "G-XXXXXXXXXX"
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