import { NextResponse } from "next/server";
import crypto from "crypto";

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
    authorizeUrl: "https://twitter.com/i/oauth2/authorize",
    tokenUrl: "https://api.twitter.com/2/oauth2/token",
    scopes: ["tweet.read", "tweet.write", "users.read", "offline.access"],
    clientIdEnv: "TWITTER_CLIENT_ID",
    clientSecretEnv: "TWITTER_CLIENT_SECRET",
    usePKCE: true,
  },
  instagram: {
    authorizeUrl: "https://www.facebook.com/v21.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
    scopes: [
      "public_profile",
      "email",
    ],
    clientIdEnv: "META_APP_ID",
    clientSecretEnv: "META_APP_SECRET",
  },
  facebook: {
    authorizeUrl: "https://www.facebook.com/v21.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
    scopes: [
      "public_profile",
      "email",
    ],
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
  const state = JSON.stringify({ platform, userId });

  // Build authorization URL
  const params = new URLSearchParams();

  if (platform === "tiktok") {
    // TikTok uses different param names
    params.set("client_key", clientId);
    params.set("response_type", "code");
    params.set("scope", config.scopes.join(","));
    params.set("redirect_uri", redirectUri);
    params.set("state", state);
  } else {
    params.set("client_id", clientId);
    params.set("response_type", "code");
    params.set("redirect_uri", redirectUri);
    params.set("scope", config.scopes.join(" "));
    params.set("state", state);

    if (config.usePKCE) {
      // PKCE for Twitter
      const codeVerifier = crypto.randomBytes(32).toString("base64url");
      const codeChallenge = crypto
        .createHash("sha256")
        .update(codeVerifier)
        .digest("base64url");

      params.set("code_challenge", codeChallenge);
      params.set("code_challenge_method", "S256");

      // Store code_verifier temporarily — we'll need it in the callback
      // Using state to pass it (encoded in the state JSON)
      const stateWithPKCE = JSON.stringify({ platform, userId, codeVerifier });
      params.set("state", stateWithPKCE);
    }
  }

  const authUrl = `${config.authorizeUrl}?${params.toString()}`;
  return NextResponse.redirect(authUrl);
}
