import { adminDb } from "@/lib/admin";

/* ─── Token Management ─── */

async function getTwitterTokens(userId: string) {
  const snap = await adminDb.doc(`users/${userId}/settings/connections`).get();
  if (!snap.exists) throw new Error("No connections found — connect X/Twitter first");

  const data = snap.data() as Record<string, any>;
  const twitter = data?.twitter;

  if (!twitter?.connected || !twitter?.accessToken) {
    throw new Error("X/Twitter is not connected. Go to Connections to set it up.");
  }

  return { accessToken: twitter.accessToken as string };
}

async function twitterFetch(accessToken: string, url: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`X API error ${res.status}: ${text}`);
  }

  return res.json();
}

/* ─── X/Twitter Operations ─── */

export async function getProfile(userId: string) {
  const { accessToken } = await getTwitterTokens(userId);

  const result = await twitterFetch(
    accessToken,
    "https://api.twitter.com/2/users/me?user.fields=name,username,description,profile_image_url,public_metrics"
  );

  const user = result.data;
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    description: user.description,
    profileImage: user.profile_image_url,
    followers: user.public_metrics?.followers_count,
    following: user.public_metrics?.following_count,
    tweetCount: user.public_metrics?.tweet_count,
  };
}

export async function getTimeline(userId: string, maxResults: number = 10) {
  const { accessToken } = await getTwitterTokens(userId);

  // First get user ID
  const me = await twitterFetch(accessToken, "https://api.twitter.com/2/users/me");
  const twitterUserId = me.data.id;

  const result = await twitterFetch(
    accessToken,
    `https://api.twitter.com/2/users/${twitterUserId}/tweets?max_results=${Math.min(maxResults, 100)}&tweet.fields=created_at,public_metrics,text`
  );

  return (result.data || []).map((tweet: any) => ({
    id: tweet.id,
    text: tweet.text,
    createdAt: tweet.created_at,
    likes: tweet.public_metrics?.like_count,
    retweets: tweet.public_metrics?.retweet_count,
    replies: tweet.public_metrics?.reply_count,
    impressions: tweet.public_metrics?.impression_count,
  }));
}

export async function createTweet(userId: string, text: string) {
  const { accessToken } = await getTwitterTokens(userId);

  const result = await twitterFetch(accessToken, "https://api.twitter.com/2/tweets", {
    method: "POST",
    body: JSON.stringify({ text }),
  });

  return { success: true, tweetId: result.data.id, message: "Tweet posted successfully" };
}

export async function searchTweets(userId: string, query: string, maxResults: number = 10) {
  const { accessToken } = await getTwitterTokens(userId);

  const params = new URLSearchParams({
    query,
    max_results: String(Math.min(Math.max(maxResults, 10), 100)),
    "tweet.fields": "created_at,public_metrics,author_id,text",
  });

  const result = await twitterFetch(
    accessToken,
    `https://api.twitter.com/2/tweets/search/recent?${params.toString()}`
  );

  return (result.data || []).map((tweet: any) => ({
    id: tweet.id,
    text: tweet.text,
    authorId: tweet.author_id,
    createdAt: tweet.created_at,
    likes: tweet.public_metrics?.like_count,
    retweets: tweet.public_metrics?.retweet_count,
  }));
}
