/**
 * Twitter OAuth 1.0a helper
 *
 * Implements the 3-legged OAuth 1.0a flow using the older, more stable
 * api.twitter.com/oauth endpoints instead of the buggy OAuth 2.0
 * twitter.com/i/oauth2/authorize flow.
 */
import crypto from "crypto";

const REQUEST_TOKEN_URL = "https://api.twitter.com/oauth/request_token";
const AUTHORIZE_URL = "https://api.twitter.com/oauth/authorize";
const ACCESS_TOKEN_URL = "https://api.twitter.com/oauth/access_token";

function getConsumerKey() {
  return process.env.TWITTER_CONSUMER_KEY?.trim() || "";
}

function getConsumerSecret() {
  return process.env.TWITTER_CONSUMER_SECRET?.trim() || "";
}

/**
 * Percent-encode a string per RFC 3986
 */
function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) =>
    `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

/**
 * Generate an OAuth 1.0a signature
 */
function generateSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string = ""
): string {
  // Sort params alphabetically
  const sortedKeys = Object.keys(params).sort();
  const paramString = sortedKeys
    .map((k) => `${percentEncode(k)}=${percentEncode(params[k])}`)
    .join("&");

  // Create signature base string
  const signatureBase = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(paramString),
  ].join("&");

  // Create signing key
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;

  // HMAC-SHA1
  const hmac = crypto.createHmac("sha1", signingKey);
  hmac.update(signatureBase);
  return hmac.digest("base64");
}

/**
 * Generate OAuth 1.0a authorization header
 */
function generateAuthHeader(
  method: string,
  url: string,
  oauthParams: Record<string, string>,
  extraParams: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string = ""
): string {
  // All params for signing
  const allParams = { ...oauthParams, ...extraParams };
  const signature = generateSignature(method, url, allParams, consumerSecret, tokenSecret);

  // Build header from oauth params + signature
  const headerParams = { ...oauthParams, oauth_signature: signature };
  const headerString = Object.entries(headerParams)
    .map(([k, v]) => `${percentEncode(k)}="${percentEncode(v)}"`)
    .join(", ");

  return `OAuth ${headerString}`;
}

/**
 * Step 1: Get a request token from Twitter
 */
export async function getRequestToken(callbackUrl: string): Promise<{
  oauth_token: string;
  oauth_token_secret: string;
}> {
  const consumerKey = getConsumerKey();
  const consumerSecret = getConsumerSecret();

  if (!consumerKey || !consumerSecret) {
    throw new Error("Twitter consumer key/secret not configured");
  }

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: "1.0",
    oauth_callback: callbackUrl,
  };

  const authHeader = generateAuthHeader(
    "POST",
    REQUEST_TOKEN_URL,
    oauthParams,
    {},
    consumerSecret
  );

  const response = await fetch(REQUEST_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: authHeader,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("[Twitter OAuth 1.0a] Request token failed:", response.status, text);
    throw new Error(`Request token failed: ${response.status} ${text}`);
  }

  const body = await response.text();
  const parsed = new URLSearchParams(body);

  const oauthToken = parsed.get("oauth_token");
  const oauthTokenSecret = parsed.get("oauth_token_secret");

  if (!oauthToken || !oauthTokenSecret) {
    throw new Error("Missing oauth_token in response");
  }

  return {
    oauth_token: oauthToken,
    oauth_token_secret: oauthTokenSecret,
  };
}

/**
 * Step 2: Get the authorization URL to redirect the user to
 */
export function getAuthorizeUrl(oauthToken: string): string {
  return `${AUTHORIZE_URL}?oauth_token=${encodeURIComponent(oauthToken)}`;
}

/**
 * Step 3: Exchange the oauth_verifier for an access token
 */
export async function getAccessToken(
  oauthToken: string,
  oauthTokenSecret: string,
  oauthVerifier: string
): Promise<{
  oauth_token: string;
  oauth_token_secret: string;
  user_id: string;
  screen_name: string;
}> {
  const consumerKey = getConsumerKey();
  const consumerSecret = getConsumerSecret();

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: oauthToken,
    oauth_version: "1.0",
  };

  const extraParams = {
    oauth_verifier: oauthVerifier,
  };

  const authHeader = generateAuthHeader(
    "POST",
    ACCESS_TOKEN_URL,
    oauthParams,
    extraParams,
    consumerSecret,
    oauthTokenSecret
  );

  const response = await fetch(ACCESS_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(extraParams),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("[Twitter OAuth 1.0a] Access token failed:", response.status, text);
    throw new Error(`Access token failed: ${response.status} ${text}`);
  }

  const body = await response.text();
  const parsed = new URLSearchParams(body);

  return {
    oauth_token: parsed.get("oauth_token") || "",
    oauth_token_secret: parsed.get("oauth_token_secret") || "",
    user_id: parsed.get("user_id") || "",
    screen_name: parsed.get("screen_name") || "",
  };
}
