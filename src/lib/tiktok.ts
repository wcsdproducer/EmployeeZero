import { adminDb } from "@/lib/admin";

/* ─── Token Management ─── */

async function getTikTokTokens(userId: string) {
  const snap = await adminDb.doc(`users/${userId}/settings/connections`).get();
  if (!snap.exists) throw new Error("No connections found — connect TikTok first");

  const data = snap.data() as Record<string, any>;
  const tiktok = data?.tiktok;

  if (!tiktok?.connected || !tiktok?.accessToken) {
    throw new Error("TikTok is not connected. Go to Connections to set it up.");
  }

  return { accessToken: tiktok.accessToken as string };
}

/* ─── TikTok Operations (read-only until additional scopes approved) ─── */

export async function getProfile(userId: string) {
  const { accessToken } = await getTikTokTokens(userId);

  const res = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,follower_count,following_count,likes_count,video_count", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`TikTok API error ${res.status}: ${text}`);
  }

  const result = await res.json();
  const user = result.data?.user;

  return {
    displayName: user?.display_name,
    avatar: user?.avatar_url,
    followers: user?.follower_count,
    following: user?.following_count,
    likes: user?.likes_count,
    videos: user?.video_count,
  };
}
