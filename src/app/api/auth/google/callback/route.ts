import { NextResponse } from "next/server";
import { google } from "googleapis";
import { adminDb } from "@/lib/admin";

export const dynamic = "force-dynamic";

function getRedirectUri() {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3003";
  return `${base}/api/auth/google/callback`;
}

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Google OAuth not configured" },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const stateRaw = searchParams.get("state");
  const error = searchParams.get("error");

  // Handle user denying access
  if (error) {
    const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3003";
    return NextResponse.redirect(`${base}/connections?error=${encodeURIComponent(error)}`);
  }

  if (!code || !stateRaw) {
    return NextResponse.json(
      { error: "Missing authorization code or state" },
      { status: 400 }
    );
  }

  let state: { service: string; userId: string };
  try {
    state = JSON.parse(stateRaw);
  } catch {
    return NextResponse.json({ error: "Invalid state parameter" }, { status: 400 });
  }

  const { service, userId } = state;
  if (!service || !userId) {
    return NextResponse.json({ error: "Incomplete state — missing service or userId" }, { status: 400 });
  }

  // Exchange auth code for tokens
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, getRedirectUri());

  let tokens: { access_token?: string | null; refresh_token?: string | null; expiry_date?: number | null };
  try {
    const response = await oauth2Client.getToken(code);
    tokens = response.tokens;
  } catch (err: any) {
    console.error("Token exchange failed:", err.message);
    const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3003";
    return NextResponse.redirect(`${base}/connections?error=token_exchange_failed`);
  }

  // Store tokens in Firestore
  try {
    const connectionsRef = adminDb.doc(`users/${userId}/settings/connections`);
    await connectionsRef.set(
      {
        [service]: {
          connected: true,
          tokenType: "oauth",
          accessToken: tokens.access_token || "",
          refreshToken: tokens.refresh_token || "",
          expiryDate: tokens.expiry_date || null,
          connectedAt: new Date().toISOString(),
        },
      },
      { merge: true }
    );

    console.log(`OAuth tokens stored for user ${userId}, service ${service}`);
  } catch (err: any) {
    console.error("Firestore write failed:", err.message);
    const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3003";
    return NextResponse.redirect(`${base}/connections?error=storage_failed`);
  }

  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3003";
  return NextResponse.redirect(`${base}/connections?connected=${service}`);
}
