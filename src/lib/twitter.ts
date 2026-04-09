import { adminDb } from "@/lib/admin";

/* ─── Token Management ─── */

async function refreshTwitterToken(userId: string, refreshToken: string): Promise<string> {
  const clientId = process.env.TWITTER_CLIENT_ID?.trim();
  const clientSecret = process.env.TWITTER_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error("Twitter OAuth credentials not configured");

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  const tokenData = await res.json();
  if (!tokenData.access_token) {
    console.error("[Twitter] Token refresh failed:", JSON.stringify(tokenData));
    throw new Error("Twitter token refresh failed — please reconnect in Connections.");
  }

  // Persist the new tokens
  const updates: Record<string, any> = {
    "twitter.accessToken": tokenData.access_token,
    "twitter.expiryDate": Date.now() + (tokenData.expires_in || 7200) * 1000,
  };
  if (tokenData.refresh_token) updates["twitter.refreshToken"] = tokenData.refresh_token;

  await adminDb.doc(`users/${userId}/settings/connections`).update(updates);
  console.log(`[Twitter] Token refreshed for user ${userId}`);
  return tokenData.access_token;
}

async function getTwitterTokens(userId: string) {
  const snap = await adminDb.doc(`users/${userId}/settings/connections`).get();
  if (!snap.exists) throw new Error("No connections found — connect X/Twitter first");

  const data = snap.data() as Record<string, any>;
  const twitter = data?.twitter;

  if (!twitter?.connected || !twitter?.accessToken) {
    throw new Error("X/Twitter is not connected. Go to Connections to set it up.");
  }

  // Proactive token refresh — Twitter tokens expire every 2 hours
  const now = Date.now();
  if (twitter.refreshToken && twitter.expiryDate && twitter.expiryDate < now + 5 * 60_000) {
    console.log(`[Twitter] Token expired or expiring soon, refreshing...`);
    const newToken = await refreshTwitterToken(userId, twitter.refreshToken);
    return { accessToken: newToken };
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

export async function deleteTweet(userId: string, tweetId: string) {
  const { accessToken } = await getTwitterTokens(userId);

  await twitterFetch(accessToken, `https://api.twitter.com/2/tweets/${tweetId}`, {
    method: "DELETE",
  });

  return { success: true, message: "Tweet deleted" };
}

export async function replyToTweet(userId: string, tweetId: string, text: string) {
  const { accessToken } = await getTwitterTokens(userId);

  const result = await twitterFetch(accessToken, "https://api.twitter.com/2/tweets", {
    method: "POST",
    body: JSON.stringify({
      text,
      reply: { in_reply_to_tweet_id: tweetId },
    }),
  });

  return { success: true, tweetId: result.data.id, message: "Reply posted" };
}

export async function retweet(userId: string, tweetId: string) {
  const { accessToken } = await getTwitterTokens(userId);

  const me = await twitterFetch(accessToken, "https://api.twitter.com/2/users/me");

  await twitterFetch(accessToken, `https://api.twitter.com/2/users/${me.data.id}/retweets`, {
    method: "POST",
    body: JSON.stringify({ tweet_id: tweetId }),
  });

  return { success: true, message: "Retweeted successfully" };
}

export async function undoRetweet(userId: string, tweetId: string) {
  const { accessToken } = await getTwitterTokens(userId);

  const me = await twitterFetch(accessToken, "https://api.twitter.com/2/users/me");

  await twitterFetch(accessToken, `https://api.twitter.com/2/users/${me.data.id}/retweets/${tweetId}`, {
    method: "DELETE",
  });

  return { success: true, message: "Retweet undone" };
}

export async function likeTweet(userId: string, tweetId: string) {
  const { accessToken } = await getTwitterTokens(userId);

  const me = await twitterFetch(accessToken, "https://api.twitter.com/2/users/me");

  await twitterFetch(accessToken, `https://api.twitter.com/2/users/${me.data.id}/likes`, {
    method: "POST",
    body: JSON.stringify({ tweet_id: tweetId }),
  });

  return { success: true, message: "Tweet liked" };
}

export async function unlikeTweet(userId: string, tweetId: string) {
  const { accessToken } = await getTwitterTokens(userId);

  const me = await twitterFetch(accessToken, "https://api.twitter.com/2/users/me");

  await twitterFetch(accessToken, `https://api.twitter.com/2/users/${me.data.id}/likes/${tweetId}`, {
    method: "DELETE",
  });

  return { success: true, message: "Tweet unliked" };
}

export async function getMentions(userId: string, maxResults: number = 10) {
  const { accessToken } = await getTwitterTokens(userId);

  const me = await twitterFetch(accessToken, "https://api.twitter.com/2/users/me");

  const result = await twitterFetch(
    accessToken,
    `https://api.twitter.com/2/users/${me.data.id}/mentions?max_results=${Math.min(maxResults, 100)}&tweet.fields=created_at,public_metrics,author_id,text`
  );

  return (result.data || []).map((tweet: any) => ({
    id: tweet.id,
    text: tweet.text,
    authorId: tweet.author_id,
    createdAt: tweet.created_at,
    likes: tweet.public_metrics?.like_count,
    retweets: tweet.public_metrics?.retweet_count,
    replies: tweet.public_metrics?.reply_count,
  }));
}

export async function getFollowers(userId: string, maxResults: number = 20) {
  const { accessToken } = await getTwitterTokens(userId);

  const me = await twitterFetch(accessToken, "https://api.twitter.com/2/users/me");

  const result = await twitterFetch(
    accessToken,
    `https://api.twitter.com/2/users/${me.data.id}/followers?max_results=${Math.min(maxResults, 100)}&user.fields=name,username,description,public_metrics,profile_image_url`
  );

  return (result.data || []).map((user: any) => ({
    id: user.id,
    name: user.name,
    username: user.username,
    description: user.description,
    followers: user.public_metrics?.followers_count,
    profileImage: user.profile_image_url,
  }));
}

export async function bookmarkTweet(userId: string, tweetId: string) {
  const { accessToken } = await getTwitterTokens(userId);
  const me = await twitterFetch(accessToken, "https://api.twitter.com/2/users/me");
  await twitterFetch(accessToken, `https://api.twitter.com/2/users/${me.data.id}/bookmarks`, {
    method: "POST",
    body: JSON.stringify({ tweet_id: tweetId }),
  });
  return { success: true, message: "Tweet bookmarked" };
}

export async function getBookmarks(userId: string, maxResults: number = 10) {
  const { accessToken } = await getTwitterTokens(userId);
  const me = await twitterFetch(accessToken, "https://api.twitter.com/2/users/me");
  const result = await twitterFetch(
    accessToken,
    `https://api.twitter.com/2/users/${me.data.id}/bookmarks?max_results=${Math.min(maxResults, 100)}&tweet.fields=created_at,public_metrics,text`
  );
  return (result.data || []).map((tweet: any) => ({
    id: tweet.id,
    text: tweet.text,
    createdAt: tweet.created_at,
    likes: tweet.public_metrics?.like_count,
    retweets: tweet.public_metrics?.retweet_count,
  }));
}

export async function getLikedTweets(userId: string, maxResults: number = 10) {
  const { accessToken } = await getTwitterTokens(userId);
  const me = await twitterFetch(accessToken, "https://api.twitter.com/2/users/me");
  const result = await twitterFetch(
    accessToken,
    `https://api.twitter.com/2/users/${me.data.id}/liked_tweets?max_results=${Math.min(maxResults, 100)}&tweet.fields=created_at,public_metrics,text,author_id`
  );
  return (result.data || []).map((tweet: any) => ({
    id: tweet.id,
    text: tweet.text,
    authorId: tweet.author_id,
    createdAt: tweet.created_at,
    likes: tweet.public_metrics?.like_count,
  }));
}

export async function followUser(userId: string, targetUserId: string) {
  const { accessToken } = await getTwitterTokens(userId);
  const me = await twitterFetch(accessToken, "https://api.twitter.com/2/users/me");
  await twitterFetch(accessToken, `https://api.twitter.com/2/users/${me.data.id}/following`, {
    method: "POST",
    body: JSON.stringify({ target_user_id: targetUserId }),
  });
  return { success: true, message: "User followed" };
}

export async function unfollowUser(userId: string, targetUserId: string) {
  const { accessToken } = await getTwitterTokens(userId);
  const me = await twitterFetch(accessToken, "https://api.twitter.com/2/users/me");
  await twitterFetch(accessToken, `https://api.twitter.com/2/users/${me.data.id}/following/${targetUserId}`, {
    method: "DELETE",
  });
  return { success: true, message: "User unfollowed" };
}

export async function muteUser(userId: string, targetUserId: string) {
  const { accessToken } = await getTwitterTokens(userId);
  const me = await twitterFetch(accessToken, "https://api.twitter.com/2/users/me");
  await twitterFetch(accessToken, `https://api.twitter.com/2/users/${me.data.id}/muting`, {
    method: "POST",
    body: JSON.stringify({ target_user_id: targetUserId }),
  });
  return { success: true, message: "User muted" };
}

export async function blockUser(userId: string, targetUserId: string) {
  const { accessToken } = await getTwitterTokens(userId);
  const me = await twitterFetch(accessToken, "https://api.twitter.com/2/users/me");
  await twitterFetch(accessToken, `https://api.twitter.com/2/users/${me.data.id}/blocking`, {
    method: "POST",
    body: JSON.stringify({ target_user_id: targetUserId }),
  });
  return { success: true, message: "User blocked" };
}
