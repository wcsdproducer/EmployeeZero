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

async function getPageToken(userId: string, pageId: string): Promise<string> {
  const pages = await getPages(userId);
  const page = pages.find((p: any) => p.id === pageId);
  if (!page) throw new Error(`Page ${pageId} not found. Use get_facebook_pages first.`);
  return page._pageAccessToken;
}

export async function getPageInsights(userId: string, pageId: string, period: string = "day", days: number = 7) {
  const token = await getPageToken(userId, pageId);

  const since = Math.floor(Date.now() / 1000) - (days * 86400);
  const until = Math.floor(Date.now() / 1000);

  const res = await fetch(
    `${GRAPH_API}/${pageId}/insights?metric=page_impressions,page_engaged_users,page_post_engagements,page_fans,page_views_total&period=${period}&since=${since}&until=${until}&access_token=${token}`
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Facebook insights error: ${text}`);
  }

  const result = await res.json();
  return (result.data || []).map((metric: any) => ({
    name: metric.name,
    period: metric.period,
    values: metric.values,
    title: metric.title,
    description: metric.description,
  }));
}

export async function getPostComments(userId: string, postId: string) {
  const { accessToken } = await getFacebookTokens(userId);

  const res = await fetch(
    `${GRAPH_API}/${postId}/comments?fields=id,message,from,created_time,like_count,comment_count&access_token=${accessToken}`
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Facebook comments error: ${text}`);
  }

  const result = await res.json();
  return (result.data || []).map((c: any) => ({
    id: c.id,
    message: c.message,
    from: c.from?.name,
    createdTime: c.created_time,
    likes: c.like_count,
    replies: c.comment_count,
  }));
}

export async function replyToComment(userId: string, commentId: string, message: string) {
  const { accessToken } = await getFacebookTokens(userId);

  const res = await fetch(`${GRAPH_API}/${commentId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, access_token: accessToken }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Facebook reply failed: ${text}`);
  }

  const result = await res.json();
  return { success: true, commentId: result.id, message: "Reply posted on Facebook" };
}

export async function deletePagePost(userId: string, postId: string) {
  const { accessToken } = await getFacebookTokens(userId);

  const res = await fetch(`${GRAPH_API}/${postId}?access_token=${accessToken}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Facebook delete failed: ${text}`);
  }

  return { success: true, message: "Post deleted from Facebook" };
}

export async function createPagePhotoPost(userId: string, pageId: string, imageUrl: string, caption: string) {
  const token = await getPageToken(userId, pageId);

  const res = await fetch(`${GRAPH_API}/${pageId}/photos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: imageUrl,
      caption,
      access_token: token,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Facebook photo post failed: ${text}`);
  }

  const result = await res.json();
  return { success: true, postId: result.id, message: "Photo posted to Facebook page" };
}

export async function schedulePagePost(userId: string, pageId: string, message: string, scheduledTime: number, link?: string) {
  const token = await getPageToken(userId, pageId);

  const body: Record<string, any> = {
    message,
    published: false,
    scheduled_publish_time: scheduledTime,
    access_token: token,
  };
  if (link) body.link = link;

  const res = await fetch(`${GRAPH_API}/${pageId}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Facebook schedule failed: ${text}`);
  }

  const result = await res.json();
  return { success: true, postId: result.id, message: `Post scheduled for ${new Date(scheduledTime * 1000).toISOString()}` };
}
