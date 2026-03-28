import { NextResponse } from "next/server";
import crypto from "crypto";
import { getRequestToken, getAuthorizeUrl } from "@/lib/twitter-oauth1";

export const dynamic = "force-dynamic";

/* ─── Platform OAuth configs ─── */

interface OAuthConfig {
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string[];
  clientIdEnv: string;
  clientSecretEnv: string;
  usePKCE?: boolean;
}

const PLATFORM_CONFIGS: Record<string, OAuthConfig> = {
  twitter: {
    // OAuth 1.0a — handled separately, these are just placeholders
    authorizeUrl: "https://api.twitter.com/oauth/authorize",
    tokenUrl: "https://api.twitter.com/oauth/access_token",
    scopes: [],
    clientIdEnv: "TWITTER_CONSUMER_KEY",
    clientSecretEnv: "TWITTER_CONSUMER_SECRET",
  },
  instagram: {
    authorizeUrl: "https://www.facebook.com/v21.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
    scopes: [],
    clientIdEnv: "META_APP_ID",
    clientSecretEnv: "META_APP_SECRET",
  },
  facebook: {
    authorizeUrl: "https://www.facebook.com/v21.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
    scopes: [],
    clientIdEnv: "META_APP_ID",
    clientSecretEnv: "META_APP_SECRET",
  },
  tiktok: {
    authorizeUrl: "https://www.tiktok.com/v2/auth/authorize/",
    tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
    scopes: ["user.info.basic"],
    clientIdEnv: "TIKTOK_CLIENT_KEY",
    clientSecretEnv: "TIKTOK_CLIENT_SECRET",
  },
  linkedin: {
    authorizeUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    scopes: ["openid", "profile", "w_member_social"],
    clientIdEnv: "LINKEDIN_CLIENT_ID",
    clientSecretEnv: "LINKEDIN_CLIENT_SECRET",
  },
};

function getRedirectUri(platform: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3003";
  return `${base}/api/auth/social/callback`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform");
  const userId = searchParams.get("userId");

  if (!platform || !userId) {
    const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3003";
    return NextResponse.redirect(`${base}/connections?error=missing_params`);
  }

  const config = PLATFORM_CONFIGS[platform];
  if (!config) {
    const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3003";
    return NextResponse.redirect(`${base}/connections?error=unknown_platform`);
  }

  const clientId = process.env[config.clientIdEnv]?.trim();
  if (!clientId) {
    const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3003";
    return NextResponse.redirect(
      `${base}/connections?setup=${platform}`
    );
  }

  const redirectUri = getRedirectUri(platform);

  /* ─── Twitter OAuth 1.0a flow ─── */
  if (platform === "twitter") {
    try {
      // The callback URL includes the userId in the state via query params
      const callbackWithState = `${redirectUri}?state=${encodeURIComponent(JSON.stringify({ platform, userId, oauth1: true }))}`;
      const { oauth_token, oauth_token_secret } = await getRequestToken(callbackWithState);

      // Store token secret temporarily (we need it for step 3)
      // Using a cookie since we can't use server-side state easily in Next.js API routes
      const authorizeUrl = getAuthorizeUrl(oauth_token);
      const response = NextResponse.redirect(authorizeUrl);

      // Store oauth_token_secret in a secure cookie for the callback
      response.cookies.set("twitter_oauth_token_secret", oauth_token_secret, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 600, // 10 minutes
        path: "/",
      });

      return response;
    } catch (err: any) {
      console.error("[Twitter OAuth 1.0a] Failed to get request token:", err.message);
      const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3003";
      return NextResponse.redirect(
        `${base}/connections?error=token_exchange_failed&detail=${encodeURIComponent(err.message)}`
      );
    }
  }

  /* ─── Standard OAuth 2.0 flow ─── */
  const state = JSON.stringify({ platform, userId });
  const params = new URLSearchParams();

  if (platform === "tiktok") {
    // TikTok uses different param names
    params.set("client_key", clientId);
    params.set("response_type", "code");
    if (config.scopes.length > 0) params.set("scope", config.scopes.join(","));
    params.set("redirect_uri", redirectUri);
    params.set("state", state);
  } else {
    params.set("client_id", clientId);
    params.set("response_type", "code");
    params.set("redirect_uri", redirectUri);
    if (config.scopes.length > 0) params.set("scope", config.scopes.join(" "));
    params.set("state", state);
  }

  const authUrl = `${config.authorizeUrl}?${params.toString()}`;
  return NextResponse.redirect(authUrl);
}
