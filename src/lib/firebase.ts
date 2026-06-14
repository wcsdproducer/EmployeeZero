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

const getAuthDomain = () => {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    const isLocal =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) ||
      hostname.endsWith(".local");
    
    if (!isLocal && hostname) {
      return hostname;
    }
  }
  return process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
};

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: getAuthDomain(),
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
  googleProvider.addScope("email");
  googleProvider.addScope("profile");

  const isMobile = typeof window !== "undefined" &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(window.navigator.userAgent);

  if (isMobile) {
    await signInWithRedirect(auth, googleProvider);
    return { user: null, isNewUser: false };
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);
    const { getAdditionalUserInfo } = await import("firebase/auth");
    const additionalInfo = getAdditionalUserInfo(result);
    return { user: result.user, isNewUser: !!additionalInfo?.isNewUser };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (
      code === "auth/popup-blocked" ||
      code === "auth/cancelled-popup-request" ||
      code === "auth/internal-error"
    ) {
      await signInWithRedirect(auth, googleProvider);
      return { user: null, isNewUser: false };
    }
    if (code === "auth/popup-closed-by-user") {
      return { user: null, isNewUser: false };
    }
    throw err;
  }
}

// Call this on app init to handle redirect result
export async function handleRedirectResult(): Promise<User | null> {
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) {
      const { getAdditionalUserInfo } = await import("firebase/auth");
      const additionalInfo = getAdditionalUserInfo(result);
      if (additionalInfo?.isNewUser) {
        const token = await result.user.getIdToken();
        await fetch("/api/webhooks/auth/signup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ email: result.user.email }),
        }).catch(console.error);
      }
    }
    return result?.user ?? null;
  } catch (err) {
    console.error("Error handling redirect result:", err);
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
