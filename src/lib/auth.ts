import { getAuth } from "firebase-admin/auth";
import { NextResponse } from "next/server";

/**
 * Verify Firebase Auth ID token from request headers.
 * Returns the verified userId or a NextResponse error.
 * 
 * Usage in API routes:
 *   const auth = await verifyAuth(request);
 *   if (auth.error) return auth.error;
 *   const userId = auth.userId;
 */
export async function verifyAuth(request: Request): Promise<
  { userId: string; error?: never } | { userId?: never; error: NextResponse }
> {
  const authHeader = request.headers.get("authorization");
  
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      error: NextResponse.json(
        { error: "Missing or invalid Authorization header" },
        { status: 401 }
      ),
    };
  }

  const idToken = authHeader.slice(7);

  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    return { userId: decoded.uid };
  } catch (err: any) {
    console.error("[Auth] Token verification failed:", err.message);
    return {
      error: NextResponse.json(
        { error: "Invalid or expired auth token" },
        { status: 401 }
      ),
    };
  }
}

/**
 * Simple in-memory rate limiter.
 * Generous limits — designed to stop bots, not real users.
 * 
 * Limits:
 *   - 30 requests per minute per user (chat messages)
 *   - 200 requests per hour per user (workflows, bulk actions)
 * 
 * Real users typically send 1-3 messages per minute.
 * A bot hammering the API would hit 30/min quickly.
 */

interface RateEntry {
  minuteCount: number;
  minuteReset: number;
  hourCount: number;
  hourReset: number;
}

const rateLimits = new Map<string, RateEntry>();

// Clean up stale entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimits) {
    if (now - entry.hourReset > 7200000) { // 2 hours stale
      rateLimits.delete(key);
    }
  }
}, 600000);

const PER_MINUTE = 30;
const PER_HOUR = 200;

export function checkRateLimit(userId: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  let entry = rateLimits.get(userId);

  if (!entry) {
    entry = { minuteCount: 0, minuteReset: now + 60000, hourCount: 0, hourReset: now + 3600000 };
    rateLimits.set(userId, entry);
  }

  // Reset minute window
  if (now > entry.minuteReset) {
    entry.minuteCount = 0;
    entry.minuteReset = now + 60000;
  }

  // Reset hour window
  if (now > entry.hourReset) {
    entry.hourCount = 0;
    entry.hourReset = now + 3600000;
  }

  entry.minuteCount++;
  entry.hourCount++;

  if (entry.minuteCount > PER_MINUTE) {
    const retryAfter = Math.ceil((entry.minuteReset - now) / 1000);
    return { allowed: false, retryAfter };
  }

  if (entry.hourCount > PER_HOUR) {
    const retryAfter = Math.ceil((entry.hourReset - now) / 1000);
    return { allowed: false, retryAfter };
  }

  return { allowed: true };
}

export function rateLimitResponse(retryAfter: number): NextResponse {
  return NextResponse.json(
    { error: "Too many requests. Please slow down.", retryAfter },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}
