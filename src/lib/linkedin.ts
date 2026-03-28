import { adminDb } from "@/lib/admin";

/* ─── Token Management ─── */

async function getLinkedInTokens(userId: string) {
  const snap = await adminDb.doc(`users/${userId}/settings/connections`).get();
  if (!snap.exists) throw new Error("No connections found — connect LinkedIn first");

  const data = snap.data() as Record<string, any>;
  const linkedin = data?.linkedin;

  if (!linkedin?.connected || !linkedin?.accessToken) {
    throw new Error("LinkedIn is not connected. Go to Connections to set it up.");
  }

  return { accessToken: linkedin.accessToken as string };
}

async function linkedInFetch(accessToken: string, url: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-RestLi-Protocol-Version": "2.0.0",
      ...((options.headers as Record<string, string>) || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LinkedIn API error ${res.status}: ${text}`);
  }

  return res.json();
}

/* ─── LinkedIn Operations ─── */

export async function getProfile(userId: string) {
  const { accessToken } = await getLinkedInTokens(userId);

  const profile = await linkedInFetch(accessToken, "https://api.linkedin.com/v2/userinfo");

  return {
    name: profile.name || `${profile.given_name} ${profile.family_name}`,
    email: profile.email,
    picture: profile.picture,
    sub: profile.sub, // This is the member ID
  };
}

export async function createPost(userId: string, text: string) {
  const { accessToken } = await getLinkedInTokens(userId);

  // Get member URN
  const profile = await linkedInFetch(accessToken, "https://api.linkedin.com/v2/userinfo");
  const personUrn = `urn:li:person:${profile.sub}`;

  const body = {
    author: personUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text },
        shareMediaCategory: "NONE",
      },
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    },
  };

  const result = await linkedInFetch(accessToken, "https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    body: JSON.stringify(body),
  });

  return { success: true, postId: result.id, message: "Post published to LinkedIn" };
}

export async function createPostWithLink(userId: string, text: string, url: string, title?: string) {
  const { accessToken } = await getLinkedInTokens(userId);

  const profile = await linkedInFetch(accessToken, "https://api.linkedin.com/v2/userinfo");
  const personUrn = `urn:li:person:${profile.sub}`;

  const body = {
    author: personUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text },
        shareMediaCategory: "ARTICLE",
        media: [
          {
            status: "READY",
            originalUrl: url,
            title: { text: title || url },
          },
        ],
      },
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    },
  };

  const result = await linkedInFetch(accessToken, "https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    body: JSON.stringify(body),
  });

  return { success: true, postId: result.id, message: "Link shared on LinkedIn" };
}
