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

async function igFetch(accessToken: string, url: string) {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Instagram API error ${res.status}: ${text}`);
  }
  return res.json();
}

async function getIgUserId(accessToken: string): Promise<string> {
  const me = await igFetch(accessToken, `${GRAPH_API}/me?fields=id&access_token=${accessToken}`);
  return me.id;
}

export async function getPostComments(userId: string, mediaId: string) {
  const { accessToken } = await getInstagramTokens(userId);

  const result = await igFetch(
    accessToken,
    `${GRAPH_API}/${mediaId}/comments?fields=id,text,username,timestamp,like_count,replies{id,text,username,timestamp}&access_token=${accessToken}`
  );

  return (result.data || []).map((c: any) => ({
    id: c.id,
    text: c.text,
    username: c.username,
    timestamp: c.timestamp,
    likes: c.like_count,
    replies: c.replies?.data?.map((r: any) => ({
      id: r.id, text: r.text, username: r.username, timestamp: r.timestamp,
    })) || [],
  }));
}

export async function replyToComment(userId: string, mediaId: string, commentId: string, text: string) {
  const { accessToken } = await getInstagramTokens(userId);

  const res = await fetch(`${GRAPH_API}/${mediaId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: text,
      access_token: accessToken,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Instagram reply failed: ${errText}`);
  }

  const result = await res.json();
  return { success: true, commentId: result.id, message: "Reply posted on Instagram" };
}

export async function createCarouselPost(userId: string, imageUrls: string[], caption: string) {
  const { accessToken } = await getInstagramTokens(userId);
  const igUserId = await getIgUserId(accessToken);

  // Step 1: Create individual item containers
  const itemIds: string[] = [];
  for (const url of imageUrls) {
    const res = await fetch(`${GRAPH_API}/${igUserId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: url,
        is_carousel_item: true,
        access_token: accessToken,
      }),
    });
    if (!res.ok) throw new Error(`Failed to create carousel item for ${url}`);
    const item = await res.json();
    itemIds.push(item.id);
  }

  // Step 2: Create carousel container
  const carouselRes = await fetch(`${GRAPH_API}/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      media_type: "CAROUSEL",
      children: itemIds.join(","),
      caption,
      access_token: accessToken,
    }),
  });
  if (!carouselRes.ok) throw new Error(`Failed to create carousel container`);
  const carousel = await carouselRes.json();

  // Step 3: Publish
  const publishRes = await fetch(`${GRAPH_API}/${igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: carousel.id, access_token: accessToken }),
  });
  if (!publishRes.ok) throw new Error("Failed to publish carousel");
  const published = await publishRes.json();

  return { success: true, mediaId: published.id, message: `Carousel with ${imageUrls.length} images published to Instagram` };
}

export async function createReel(userId: string, videoUrl: string, caption: string) {
  const { accessToken } = await getInstagramTokens(userId);
  const igUserId = await getIgUserId(accessToken);

  // Step 1: Create video container
  const containerRes = await fetch(`${GRAPH_API}/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      media_type: "REELS",
      video_url: videoUrl,
      caption,
      access_token: accessToken,
    }),
  });
  if (!containerRes.ok) {
    const text = await containerRes.text();
    throw new Error(`Reel container creation failed: ${text}`);
  }
  const container = await containerRes.json();

  // Step 2: Poll for processing completion (video processing takes time)
  let status = "IN_PROGRESS";
  let attempts = 0;
  while (status === "IN_PROGRESS" && attempts < 30) {
    await new Promise(r => setTimeout(r, 5000)); // Wait 5 seconds
    const checkRes = await igFetch(
      accessToken,
      `${GRAPH_API}/${container.id}?fields=status_code&access_token=${accessToken}`
    );
    status = checkRes.status_code;
    attempts++;
  }

  if (status !== "FINISHED") {
    throw new Error(`Reel processing failed with status: ${status}`);
  }

  // Step 3: Publish
  const publishRes = await fetch(`${GRAPH_API}/${igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: container.id, access_token: accessToken }),
  });
  if (!publishRes.ok) throw new Error("Failed to publish reel");
  const published = await publishRes.json();

  return { success: true, mediaId: published.id, message: "Reel published to Instagram" };
}

export async function getPostInsights(userId: string, mediaId: string) {
  const { accessToken } = await getInstagramTokens(userId);

  const result = await igFetch(
    accessToken,
    `${GRAPH_API}/${mediaId}/insights?metric=impressions,reach,saved,shares,likes,comments,total_interactions&access_token=${accessToken}`
  );

  const metrics: Record<string, number> = {};
  for (const item of result.data || []) {
    metrics[item.name] = item.values?.[0]?.value || 0;
  }
  return metrics;
}

export async function getAccountInsights(userId: string, period: string = "day", days: number = 7) {
  const { accessToken } = await getInstagramTokens(userId);
  const igUserId = await getIgUserId(accessToken);

  const since = Math.floor(Date.now() / 1000) - (days * 86400);
  const until = Math.floor(Date.now() / 1000);

  const result = await igFetch(
    accessToken,
    `${GRAPH_API}/${igUserId}/insights?metric=impressions,reach,profile_views,accounts_engaged,follows_and_unfollows&period=${period}&since=${since}&until=${until}&access_token=${accessToken}`
  );

  return (result.data || []).map((metric: any) => ({
    name: metric.name,
    period: metric.period,
    values: metric.values,
  }));
}

export async function getStories(userId: string) {
  const { accessToken } = await getInstagramTokens(userId);
  const igUserId = await getIgUserId(accessToken);

  const result = await igFetch(
    accessToken,
    `${GRAPH_API}/${igUserId}/stories?fields=id,media_type,media_url,timestamp,caption&access_token=${accessToken}`
  );

  return (result.data || []).map((story: any) => ({
    id: story.id,
    mediaType: story.media_type,
    mediaUrl: story.media_url,
    timestamp: story.timestamp,
    caption: story.caption,
  }));
}

export async function searchHashtag(userId: string, hashtag: string) {
  const { accessToken } = await getInstagramTokens(userId);
  const igUserId = await getIgUserId(accessToken);

  // Step 1: Get hashtag ID
  const searchRes = await igFetch(
    accessToken,
    `${GRAPH_API}/ig_hashtag_search?q=${encodeURIComponent(hashtag)}&user_id=${igUserId}&access_token=${accessToken}`
  );

  const hashtagId = searchRes.data?.[0]?.id;
  if (!hashtagId) throw new Error(`Hashtag #${hashtag} not found`);

  // Step 2: Get recent media for hashtag
  const mediaRes = await igFetch(
    accessToken,
    `${GRAPH_API}/${hashtagId}/recent_media?user_id=${igUserId}&fields=id,caption,media_type,like_count,comments_count,timestamp,permalink&access_token=${accessToken}`
  );

  return (mediaRes.data || []).map((post: any) => ({
    id: post.id,
    caption: post.caption,
    mediaType: post.media_type,
    likes: post.like_count,
    comments: post.comments_count,
    timestamp: post.timestamp,
    permalink: post.permalink,
  }));
}

export async function deletePost(userId: string, mediaId: string) {
  const { accessToken } = await getInstagramTokens(userId);

  const res = await fetch(`${GRAPH_API}/${mediaId}?access_token=${accessToken}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Instagram delete failed: ${text}`);
  }

  return { success: true, message: "Post deleted from Instagram" };
}
