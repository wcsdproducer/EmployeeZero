import { google, youtube_v3 } from "googleapis";
import { adminDb } from "@/lib/admin";

/* ─── Auth helper ─── */

export async function getAuthenticatedYouTube(userId: string): Promise<youtube_v3.Youtube> {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth not configured on server");
  }

  const snap = await adminDb.doc(`users/${userId}/settings/connections`).get();
  if (!snap.exists) throw new Error("No connections found — connect YouTube first");

  const data = snap.data() as Record<string, any>;
  const yt = data?.youtube;

  if (!yt?.connected || !yt?.refreshToken) {
    throw new Error("YouTube is not connected. Go to Connections to set it up.");
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({
    access_token: yt.accessToken,
    refresh_token: yt.refreshToken,
    expiry_date: yt.expiryDate,
  });

  oauth2Client.on("tokens", async (tokens) => {
    try {
      const updates: Record<string, any> = {};
      if (tokens.access_token) updates["youtube.accessToken"] = tokens.access_token;
      if (tokens.expiry_date) updates["youtube.expiryDate"] = tokens.expiry_date;
      if (tokens.refresh_token) updates["youtube.refreshToken"] = tokens.refresh_token;
      await adminDb.doc(`users/${userId}/settings/connections`).update(updates);
    } catch (err) {
      console.error("[YouTube] Failed to persist refreshed tokens:", err);
    }
  });

  return google.youtube({ version: "v3", auth: oauth2Client });
}

/* ─── Operations ─── */

export async function listChannels(userId: string): Promise<any[]> {
  const yt = await getAuthenticatedYouTube(userId);

  const res = await yt.channels.list({
    part: ["snippet", "statistics"],
    mine: true,
  });

  return (res.data.items || []).map((ch) => ({
    id: ch.id,
    title: ch.snippet?.title,
    description: ch.snippet?.description?.slice(0, 200),
    subscribers: ch.statistics?.subscriberCount,
    totalViews: ch.statistics?.viewCount,
    videoCount: ch.statistics?.videoCount,
    thumbnail: ch.snippet?.thumbnails?.default?.url,
  }));
}

export async function listVideos(
  userId: string,
  channelId?: string,
  maxResults = 10
): Promise<any[]> {
  const yt = await getAuthenticatedYouTube(userId);

  // If no channelId, get the user's channel first
  let targetChannelId = channelId;
  if (!targetChannelId) {
    const channels = await listChannels(userId);
    if (channels.length === 0) throw new Error("No YouTube channels found");
    targetChannelId = channels[0].id;
  }

  // Search for videos on the channel
  const searchRes = await yt.search.list({
    part: ["snippet"],
    channelId: targetChannelId,
    type: ["video"],
    order: "date",
    maxResults,
  });

  const videoIds = (searchRes.data.items || [])
    .map((item) => item.id?.videoId)
    .filter(Boolean) as string[];

  if (videoIds.length === 0) return [];

  // Get detailed stats
  const statsRes = await yt.videos.list({
    part: ["snippet", "statistics", "contentDetails"],
    id: videoIds,
  });

  return (statsRes.data.items || []).map((v) => ({
    id: v.id,
    title: v.snippet?.title,
    description: v.snippet?.description?.slice(0, 200),
    published: v.snippet?.publishedAt,
    views: v.statistics?.viewCount,
    likes: v.statistics?.likeCount,
    comments: v.statistics?.commentCount,
    duration: v.contentDetails?.duration,
    thumbnail: v.snippet?.thumbnails?.medium?.url,
    link: `https://youtube.com/watch?v=${v.id}`,
  }));
}

export async function getVideoAnalytics(userId: string, videoId: string): Promise<any> {
  const yt = await getAuthenticatedYouTube(userId);

  const res = await yt.videos.list({
    part: ["snippet", "statistics", "contentDetails"],
    id: [videoId],
  });

  const video = res.data.items?.[0];
  if (!video) throw new Error(`Video not found: ${videoId}`);

  return {
    id: video.id,
    title: video.snippet?.title,
    description: video.snippet?.description?.slice(0, 500),
    published: video.snippet?.publishedAt,
    channel: video.snippet?.channelTitle,
    views: video.statistics?.viewCount,
    likes: video.statistics?.likeCount,
    comments: video.statistics?.commentCount,
    favorites: video.statistics?.favoriteCount,
    duration: video.contentDetails?.duration,
    tags: video.snippet?.tags?.slice(0, 10),
    thumbnail: video.snippet?.thumbnails?.high?.url,
    link: `https://youtube.com/watch?v=${video.id}`,
  };
}

export async function searchYouTube(
  userId: string,
  query: string,
  maxResults = 5
): Promise<any[]> {
  const yt = await getAuthenticatedYouTube(userId);

  const res = await yt.search.list({
    part: ["snippet"],
    q: query,
    type: ["video"],
    maxResults,
    order: "relevance",
  });

  return (res.data.items || []).map((item) => ({
    id: item.id?.videoId,
    title: item.snippet?.title,
    channel: item.snippet?.channelTitle,
    description: item.snippet?.description?.slice(0, 200),
    published: item.snippet?.publishedAt,
    thumbnail: item.snippet?.thumbnails?.medium?.url,
    link: `https://youtube.com/watch?v=${item.id?.videoId}`,
  }));
}

export async function listPlaylists(userId: string): Promise<any[]> {
  const yt = await getAuthenticatedYouTube(userId);

  const res = await yt.playlists.list({
    part: ["snippet", "contentDetails"],
    mine: true,
    maxResults: 25,
  });

  return (res.data.items || []).map((pl) => ({
    id: pl.id,
    title: pl.snippet?.title,
    description: pl.snippet?.description?.slice(0, 200),
    videoCount: pl.contentDetails?.itemCount,
    thumbnail: pl.snippet?.thumbnails?.medium?.url,
  }));
}

export async function addToPlaylist(userId: string, playlistId: string, videoId: string): Promise<any> {
  const yt = await getAuthenticatedYouTube(userId);

  const res = await yt.playlistItems.insert({
    part: ["snippet"],
    requestBody: {
      snippet: {
        playlistId,
        resourceId: { kind: "youtube#video", videoId },
      },
    },
  });

  return { success: true, id: res.data.id, message: "Video added to playlist" };
}

export async function getVideoComments(userId: string, videoId: string, maxResults = 10): Promise<any[]> {
  const yt = await getAuthenticatedYouTube(userId);

  const res = await yt.commentThreads.list({
    part: ["snippet"],
    videoId,
    maxResults,
    order: "relevance",
  });

  return (res.data.items || []).map((thread) => ({
    id: thread.id,
    text: thread.snippet?.topLevelComment?.snippet?.textDisplay,
    author: thread.snippet?.topLevelComment?.snippet?.authorDisplayName,
    authorImage: thread.snippet?.topLevelComment?.snippet?.authorProfileImageUrl,
    likes: thread.snippet?.topLevelComment?.snippet?.likeCount,
    replyCount: thread.snippet?.totalReplyCount,
    published: thread.snippet?.topLevelComment?.snippet?.publishedAt,
  }));
}

export async function replyToComment(userId: string, commentId: string, text: string): Promise<any> {
  const yt = await getAuthenticatedYouTube(userId);

  const res = await yt.comments.insert({
    part: ["snippet"],
    requestBody: {
      snippet: {
        parentId: commentId,
        textOriginal: text,
      },
    },
  });

  return { success: true, commentId: res.data.id, message: "Reply posted on YouTube" };
}
