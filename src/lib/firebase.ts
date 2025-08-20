import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Simple check to see if all required env vars are loaded.
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error("Firebase config is missing or incomplete. Check your .env.local file.");
}

// Initialize Firebase
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

// Export auth and firestore instances
// We will let them throw an error if the 'app' is invalid, which is better for debugging.
const auth: Auth = getAuth(app);
const firestore: Firestore = getFirestore(app);

// Add a console log for debugging during development
if (process.env.NODE_ENV === 'development') {
    console.log("Firebase Auth Initialized:", auth ? "Success" : "Failed");
}

export { app, auth, firestore };