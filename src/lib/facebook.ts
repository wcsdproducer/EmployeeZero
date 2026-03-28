import { adminDb } from "@/lib/admin";

/* ─── Token Management ─── */

async function getFacebookTokens(userId: string) {
  const snap = await adminDb.doc(`users/${userId}/settings/connections`).get();
  if (!snap.exists) throw new Error("No connections found — connect Facebook first");

  const data = snap.data() as Record<string, any>;
  const fb = data?.facebook;

  if (!fb?.connected || !fb?.accessToken) {
    throw new Error("Facebook is not connected. Go to Connections to set it up.");
  }

  return { accessToken: fb.accessToken as string };
}

const GRAPH_API = "https://graph.facebook.com/v21.0";

/* ─── Facebook Operations ─── */

export async function getPages(userId: string) {
  const { accessToken } = await getFacebookTokens(userId);

  const res = await fetch(
    `${GRAPH_API}/me/accounts?fields=id,name,category,fan_count,access_token&access_token=${accessToken}`
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Facebook API error ${res.status}: ${text}`);
  }

  const result = await res.json();
  return (result.data || []).map((page: any) => ({
    id: page.id,
    name: page.name,
    category: page.category,
    fans: page.fan_count,
    // Store page access token for posting
    _pageAccessToken: page.access_token,
  }));
}

export async function getPagePosts(userId: string, pageId: string, maxResults: number = 10) {
  const { accessToken } = await getFacebookTokens(userId);

  // Get page access token
  const pages = await getPages(userId);
  const page = pages.find((p: any) => p.id === pageId);
  const token = page?._pageAccessToken || accessToken;

  const res = await fetch(
    `${GRAPH_API}/${pageId}/posts?fields=id,message,created_time,full_picture,permalink_url,shares,likes.summary(true),comments.summary(true)&limit=${maxResults}&access_token=${token}`
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Facebook API error ${res.status}: ${text}`);
  }

  const result = await res.json();
  return (result.data || []).map((post: any) => ({
    id: post.id,
    message: post.message,
    createdTime: post.created_time,
    image: post.full_picture,
    permalink: post.permalink_url,
    shares: post.shares?.count || 0,
    likes: post.likes?.summary?.total_count || 0,
    comments: post.comments?.summary?.total_count || 0,
  }));
}

export async function createPagePost(userId: string, pageId: string, message: string, link?: string) {
  // Get page access token (required for posting to pages)
  const pages = await getPages(userId);
  const page = pages.find((p: any) => p.id === pageId);

  if (!page) {
    throw new Error(`Page ${pageId} not found. Use get_facebook_pages to list your pages first.`);
  }

  const token = page._pageAccessToken;

  const body: Record<string, string> = { message, access_token: token };
  if (link) body.link = link;

  const res = await fetch(`${GRAPH_API}/${pageId}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Facebook post failed: ${text}`);
  }

  const result = await res.json();
  return { success: true, postId: result.id, message: "Post published to Facebook page" };
}

export async function getProfile(userId: string) {
  const { accessToken } = await getFacebookTokens(userId);

  const res = await fetch(
    `${GRAPH_API}/me?fields=id,name,email&access_token=${accessToken}`
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Facebook API error ${res.status}: ${text}`);
  }

  return await res.json();
}
