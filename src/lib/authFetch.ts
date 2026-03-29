import { auth } from "@/lib/firebase";

/**
 * Authenticated fetch wrapper.
 * Automatically attaches the Firebase Auth ID token as a Bearer header.
 * Use this for all API calls to protected endpoints.
 * 
 * Usage:
 *   const res = await authFetch("/api/chat", { method: "POST", body: JSON.stringify({...}) });
 */
export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const idToken = await user.getIdToken();

  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
      Authorization: `Bearer ${idToken}`,
    },
  });
}
