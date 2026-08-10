import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getMessaging, isSupported, type Messaging } from 'firebase/messaging';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
};

let app: FirebaseApp | null = null;
let messagingPromise: Promise<Messaging | null> | null = null;

function isFirebaseConfigured(): boolean {
  return !!(firebaseConfig.apiKey && firebaseConfig.appId && firebaseConfig.projectId);
}

// Lazily inits Firebase + resolves a Messaging instance only when actually
// needed (push opt-in), and only in browsers that support the Push API —
// avoids crashing SSR/unsupported browsers and avoids paying Firebase's
// init cost for users who never touch notification settings.
export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (typeof window === 'undefined' || !isFirebaseConfigured()) return null;

  if (!messagingPromise) {
    messagingPromise = isSupported().then((supported) => {
      if (!supported) return null;
      if (!app) app = initializeApp(firebaseConfig);
      return getMessaging(app);
    });
  }

  return messagingPromise;
}
