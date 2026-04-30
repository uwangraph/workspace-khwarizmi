// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";

// Your web app's Firebase configuration
import { 
  PUBLIC_FIREBASE_API_KEY, 
  PUBLIC_FIREBASE_AUTH_DOMAIN, 
  PUBLIC_FIREBASE_PROJECT_ID, 
  PUBLIC_FIREBASE_STORAGE_BUCKET, 
  PUBLIC_FIREBASE_MESSAGING_SENDER_ID, 
  PUBLIC_FIREBASE_APP_ID, 
  PUBLIC_FIREBASE_MEASUREMENT_ID 
} from '$env/static/public';

const firebaseConfig = {
  apiKey: PUBLIC_FIREBASE_API_KEY,
  authDomain: PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: PUBLIC_FIREBASE_APP_ID,
  measurementId: PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Matikan Analytics di mode Development agar tidak diblokir AdBlocker dan mengotori konsol
const isDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// Dynamic imports to prevent SSR issues and AdBlocker crashes
export const analytics = typeof window !== 'undefined' && !isDev
  ? import("firebase/analytics").then(async ({ getAnalytics, isSupported }) => {
      try {
        const supported = await isSupported();
        return supported ? getAnalytics(app) : null;
      } catch (e) {
        return null;
      }
    }).catch(() => null)
  : null;

export const messaging = typeof window !== 'undefined'
  ? import("firebase/messaging").then(async ({ getMessaging, isSupported }) => {
      try {
        const supported = await isSupported();
        return supported ? getMessaging(app) : null;
      } catch (e) {
        return null;
      }
    }).catch(() => null)
  : null;

export default app;