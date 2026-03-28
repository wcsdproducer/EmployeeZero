import { adminDb } from "@/lib/admin";

/* ─── Token Management ─── */

async function getInstagramTokens(userId: string) {
  const snap = await adminDb.doc(`users/${userId}/settings/connections`).get();
  if (!snap.exists) throw new Error("No connections found — connect Instagram first");

  const data = snap.data() as Record<string, any>;
  const ig = data?.instagram;

  if (!ig?.connected || !ig?.accessToken) {
    throw new Error("Instagram is not connected. Go to Connections to set it up.");
  }

  return { accessToken: ig.accessToken as string };
}

const GRAPH_API = "https://graph.facebook.com/v21.0";

/* ─── Instagram Operations ─── */

export async function getProfile(userId: string) {
  const { accessToken } = await getInstagramTokens(userId);

  const res = await fetch(
    `${GRAPH_API}/me?fields=id,username,name,media_count,followers_count,follows_count,biography,profile_picture_url&access_token=${accessToken}`
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Instagram API error ${res.status}: ${text}`);
  }

  const profile = await res.json();
  return {
    id: profile.id,
    username: profile.username,
    name: profile.name,
    biography: profile.biography,
    mediaCount: profile.media_count,
    followers: profile.followers_count,
    following: profile.follows_count,
    profilePicture: profile.profile_picture_url,
  };
}

export async function getRecentMedia(userId: string, maxResults: number = 10) {
  const { accessToken } = await getInstagramTokens(userId);

  const res = await fetch(
    `${GRAPH_API}/me/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count,permalink&limit=${maxResults}&access_token=${accessToken}`
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Instagram API error ${res.status}: ${text}`);
  }

  const result = await res.json();
  return (result.data || []).map((post: any) => ({
    id: post.id,
    caption: post.caption,
    mediaType: post.media_type,
    mediaUrl: post.media_url,
    thumbnail: post.thumbnail_url,
    timestamp: post.timestamp,
    likes: post.like_count,
    comments: post.comments_count,
    permalink: post.permalink,
  }));
}

export async function createPost(userId: string, imageUrl: string, caption: string) {
  const { accessToken } = await getInstagramTokens(userId);

  // Step 1: Get IG user ID
  const meRes = await fetch(`${GRAPH_API}/me?fields=id&access_token=${accessToken}`);
  if (!meRes.ok) throw new Error("Failed to get Instagram user ID");
  const me = await meRes.json();

  // Step 2: Create media container
  const containerRes = await fetch(`${GRAPH_API}/${me.id}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image_url: imageUrl,
      caption,
      access_token: accessToken,
    }),
  });

  if (!containerRes.ok) {
    const text = await containerRes.text();
    throw new Error(`Instagram container creation failed: ${text}`);
  }

  const container = await containerRes.json();

  // Step 3: Publish
  const publishRes = await fetch(`${GRAPH_API}/${me.id}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      creation_id: container.id,
      access_token: accessToken,
    }),
  });

  if (!publishRes.ok) {
    const text = await publishRes.text();
    throw new Error(`Instagram publish failed: ${text}`);
  }

  const published = await publishRes.json();
  return { success: true, mediaId: published.id, message: "Post published to Instagram" };
}
