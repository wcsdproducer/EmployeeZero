"use client";

import { useState, useEffect } from "react";
import { auth, onAuthStateChanged, handleRedirectResult, type User } from "@/lib/firebase";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Handle any pending redirect result from signInWithRedirect
    handleRedirectResult().catch(() => {});

    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { user, loading };
}
