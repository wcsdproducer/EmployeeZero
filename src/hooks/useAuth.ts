"use client";

import { useState, useEffect } from "react";
import { auth, onAuthStateChanged, handleRedirectResult, type User } from "@/lib/firebase";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Handle any pending redirect result from signInWithRedirect
    handleRedirectResult().catch(() => {});

    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);

      // Auto-detect and save timezone on login
      if (u?.uid) {
        try {
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
          setDoc(
            doc(db, "users", u.uid, "settings", "preferences"),
            { timezone: tz, lastSeen: new Date().toISOString() },
            { merge: true }
          ).catch(() => {});
        } catch {}
      }
    });
    return () => unsub();
  }, []);

  return { user, loading };
}
