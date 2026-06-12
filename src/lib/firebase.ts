import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle(): Promise<{ user: User | null; isNewUser: boolean }> {
  // Detect mobile — go straight to redirect (popup is unreliable on mobile browsers)
  const isMobile = typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android|webOS|BlackBerry|Opera Mini|IEMobile/i.test(navigator.userAgent);

  if (isMobile) {
    await signInWithRedirect(auth, googleProvider);
    return { user: null, isNewUser: false }; // redirect will reload the page
  }

  try {
    // Desktop: try popup first
    const result = await signInWithPopup(auth, googleProvider);
    const { getAdditionalUserInfo } = await import("firebase/auth");
    const additionalInfo = getAdditionalUserInfo(result);
    return { user: result.user, isNewUser: !!additionalInfo?.isNewUser };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    // If popup is blocked by COOP or browser policy, fall back to redirect
    if (
      code === "auth/popup-blocked" ||
      code === "auth/popup-closed-by-user" ||
      code === "auth/cancelled-popup-request" ||
      code === "auth/internal-error"
    ) {
      await signInWithRedirect(auth, googleProvider);
      return { user: null, isNewUser: false };
    }
    throw err;
  }
}

// Call this on app init to handle redirect result
export async function handleRedirectResult(): Promise<User | null> {
  try {
    const result = await getRedirectResult(auth);
    return result?.user ?? null;
  } catch {
    return null;
  }
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function signUpWithEmail(email: string, password: string): Promise<User> {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export { onAuthStateChanged, type User };
