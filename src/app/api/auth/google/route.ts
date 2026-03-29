import { NextResponse } from "next/server";
import { google } from "googleapis";

export const dynamic = "force-dynamic";

/* ─── Scope map per Google service ─── */
const SCOPE_MAP: Record<string, string[]> = {
  gmail: [
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.readonly",
  ],
  calendar: [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/calendar.readonly",
  ],
  drive: [
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/drive.readonly",
  ],
  sheets: [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.readonly",
  ],
  youtube: [
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/youtube.force-ssl",
  ],
  tasks: [
    "https://www.googleapis.com/auth/tasks",
    "https://www.googleapis.com/auth/tasks.readonly",
  ],
  docs: [
    "https://www.googleapis.com/auth/documents",
    "https://www.googleapis.com/auth/drive.file",
  ],
  analytics: [
    "https://www.googleapis.com/auth/analytics.readonly",
  ],
  forms: [
    "https://www.googleapis.com/auth/forms.body",
    "https://www.googleapis.com/auth/forms.responses.readonly",
  ],
  slides: [
    "https://www.googleapis.com/auth/presentations",
    "https://www.googleapis.com/auth/drive.file",
  ],
  business: [
    "https://www.googleapis.com/auth/business.manage",
  ],
  contacts: [
    "https://www.googleapis.com/auth/contacts.readonly",
    "https://www.googleapis.com/auth/contacts",
  ],
};

function getRedirectUri() {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3003";
  return `${base}/api/auth/google/callback`;
}

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Google OAuth not configured — missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET" },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const service = searchParams.get("service");
  const userId = searchParams.get("userId");

  if (!service || !userId) {
    return NextResponse.json(
      { error: "Missing required params: service, userId" },
      { status: 400 }
    );
  }

  const scopes = SCOPE_MAP[service];
  if (!scopes) {
    return NextResponse.json(
      { error: `Unknown service: ${service}. Supported: ${Object.keys(SCOPE_MAP).join(", ")}` },
      { status: 400 }
    );
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, getRedirectUri());

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",       // Get refresh token
    prompt: "consent",            // Force consent to always get refresh token
    include_granted_scopes: true, // Incremental auth
    scope: scopes,
    state: JSON.stringify({ service, userId }),
  });

  return NextResponse.redirect(authUrl);
}
