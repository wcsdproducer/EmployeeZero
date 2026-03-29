import { NextResponse } from "next/server";
import { adminDb } from "@/lib/admin";

export const dynamic = "force-dynamic";

/* ─── Platform token exchange configs ─── */

interface TokenConfig {
  tokenUrl: string;
  clientIdEnv: string;
  clientSecretEnv: string;
  usePKCE?: boolean;
  useBasicAuth?: boolean;
}

const TOKEN_CONFIGS: Record<string, TokenConfig> = {
  twitter: {
    tokenUrl: "https://api.twitter.com/2/oauth2/token",
    clientIdEnv: "TWITTER_CLIENT_ID",
    clientSecretEnv: "TWITTER_CLIENT_SECRET",
    usePKCE: true,
    useBasicAuth: true,
  },
  instagram: {
    tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
    clientIdEnv: "META_APP_ID",
    clientSecretEnv: "META_APP_SECRET",
  },
  facebook: {
    tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
    clientIdEnv: "META_APP_ID",
    clientSecretEnv: "META_APP_SECRET",
  },
  tiktok: {
    tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
    clientIdEnv: "TIKTOK_CLIENT_KEY",
    clientSecretEnv: "TIKTOK_CLIENT_SECRET",
  },
  linkedin: {
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    clientIdEnv: "LINKEDIN_CLIENT_ID",
    clientSecretEnv: "LINKEDIN_CLIENT_SECRET",
  },
};

function getRedirectUri() {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3003";
  return `${base}/api/auth/social/callback`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const stateRaw = searchParams.get("state");
  const error = searchParams.get("error");

  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3003";

  // Handle user denying access
  if (error) {
    return NextResponse.redirect(
      `${base}/connections?error=${encodeURIComponent(error)}`
    );
  }

  if (!code || !stateRaw) {
    return NextResponse.redirect(
      `${base}/connections?error=missing_code_or_state`
    );
  }

  let state: { platform: string; userId: string; codeVerifier?: string };
  try {
    // Try base64url-decoded JSON first, fall back to raw JSON
    const decoded = Buffer.from(stateRaw, "base64url").toString("utf8");
    state = JSON.parse(decoded);
  } catch {
    // Fallback: try parsing as raw JSON (for other platforms)
    try {
      state = JSON.parse(stateRaw);
    } catch {
      return NextResponse.redirect(
        `${base}/connections?error=invalid_state`
      );
    }
  }

  const { platform, userId, codeVerifier } = state;

  if (!platform || !userId) {
    return NextResponse.redirect(
      `${base}/connections?error=incomplete_state`
    );
  }

  const config = TOKEN_CONFIGS[platform];
  if (!config) {
    return NextResponse.redirect(
      `${base}/connections?error=unknown_platform`
    );
  }

  const clientId = process.env[config.clientIdEnv]?.trim();
  const clientSecret = process.env[config.clientSecretEnv]?.trim();

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      `${base}/connections?error=oauth_not_configured`
    );
  }

  // Exchange code for tokens
  try {
    let tokenData: any;

    if (platform === "tiktok") {
      // TikTok uses a different format
      const res = await fetch(config.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_key: clientId,
          client_secret: clientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: getRedirectUri(),
        }),
      });
      tokenData = await res.json();
    } else if (config.useBasicAuth) {
      // Twitter uses Basic Auth + PKCE
      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
      const body: Record<string, string> = {
        code,
        grant_type: "authorization_code",
        redirect_uri: getRedirectUri(),
      };
      if (codeVerifier) body.code_verifier = codeVerifier;

      const res = await fetch(config.tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${credentials}`,
        },
        body: new URLSearchParams(body),
      });
      tokenData = await res.json();
      console.log(`[Social OAuth] Token response for ${platform}:`, JSON.stringify(tokenData));
    } else {
      // Standard OAuth (Meta, LinkedIn)
      const tokenBody = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: getRedirectUri(),
      });

      const res = await fetch(config.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: tokenBody,
      });
      tokenData = await res.json();
      console.log(`[Social OAuth] Token response for ${platform}:`, JSON.stringify(tokenData));
    }

    // Normalize token response
    const accessToken =
      tokenData.access_token || tokenData.data?.access_token || "";
    const refreshToken =
      tokenData.refresh_token || tokenData.data?.refresh_token || "";
    const expiresIn =
      tokenData.expires_in || tokenData.data?.expires_in || 3600;

    if (!accessToken) {
      console.error(`[Social OAuth] No access_token for ${platform}:`, JSON.stringify(tokenData));
      const errorDetail = tokenData.error_description || tokenData.error || tokenData.message || "unknown";
      return NextResponse.redirect(
        `${base}/connections?error=token_exchange_failed&detail=${encodeURIComponent(errorDetail)}`
      );
    }

    // Store tokens in Firestore
    const connectionsRef = adminDb.doc(`users/${userId}/settings/connections`);
    await connectionsRef.set(
      {
        [platform]: {
          connected: true,
          tokenType: "oauth",
          accessToken,
          refreshToken,
          expiryDate: Date.now() + expiresIn * 1000,
          connectedAt: new Date().toISOString(),
        },
      },
      { merge: true }
    );

    console.log(
      `[Social OAuth] Tokens stored for user ${userId}, platform ${platform}`
    );

    return NextResponse.redirect(
      `${base}/connections?connected=${platform}`
    );
  } catch (err: any) {
    console.error(`[Social OAuth] Token exchange failed for ${platform}:`, err.message);
    return NextResponse.redirect(
      `${base}/connections?error=token_exchange_failed`
    );
  }
}
