import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Shared Firebase Admin initialization — import this instead of duplicating
if (!getApps().length) {
  initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "employee-zero-production",
  });
}

export const adminDb = getFirestore();
