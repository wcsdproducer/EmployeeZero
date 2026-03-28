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

export async function getPosts(userId: string, count: number = 10) {
  const { accessToken } = await getLinkedInTokens(userId);

  const profile = await linkedInFetch(accessToken, "https://api.linkedin.com/v2/userinfo");
  const personUrn = `urn:li:person:${profile.sub}`;

  const result = await linkedInFetch(
    accessToken,
    `https://api.linkedin.com/v2/ugcPosts?q=authors&authors=List(${encodeURIComponent(personUrn)})&count=${count}`
  );

  return (result.elements || []).map((post: any) => ({
    id: post.id,
    text: post.specificContent?.["com.linkedin.ugc.ShareContent"]?.shareCommentary?.text || "",
    mediaCategory: post.specificContent?.["com.linkedin.ugc.ShareContent"]?.shareMediaCategory,
    visibility: post.visibility?.["com.linkedin.ugc.MemberNetworkVisibility"],
    createdAt: post.created?.time ? new Date(post.created.time).toISOString() : null,
  }));
}

export async function deletePost(userId: string, postId: string) {
  const { accessToken } = await getLinkedInTokens(userId);

  const res = await fetch(`https://api.linkedin.com/v2/ugcPosts/${encodeURIComponent(postId)}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "X-RestLi-Protocol-Version": "2.0.0",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LinkedIn delete failed ${res.status}: ${text}`);
  }

  return { success: true, message: "Post deleted from LinkedIn" };
}

export async function createImagePost(userId: string, text: string, imageUrl: string) {
  const { accessToken } = await getLinkedInTokens(userId);

  const profile = await linkedInFetch(accessToken, "https://api.linkedin.com/v2/userinfo");
  const personUrn = `urn:li:person:${profile.sub}`;

  // Step 1: Register image upload
  const registerBody = {
    registerUploadRequest: {
      recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
      owner: personUrn,
      serviceRelationships: [
        { relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" },
      ],
    },
  };

  const registerResult = await linkedInFetch(
    accessToken,
    "https://api.linkedin.com/v2/assets?action=registerUpload",
    { method: "POST", body: JSON.stringify(registerBody) }
  );

  const uploadUrl = registerResult.value?.uploadMechanism?.["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]?.uploadUrl;
  const assetUrn = registerResult.value?.asset;

  if (!uploadUrl || !assetUrn) {
    throw new Error("Failed to register image upload with LinkedIn");
  }

  // Step 2: Download the image and upload to LinkedIn
  const imageRes = await fetch(imageUrl);
  if (!imageRes.ok) throw new Error(`Failed to download image from ${imageUrl}`);
  const imageBuffer = await imageRes.arrayBuffer();

  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/octet-stream",
    },
    body: imageBuffer,
  });

  if (!uploadRes.ok) {
    throw new Error(`Failed to upload image to LinkedIn: ${uploadRes.status}`);
  }

  // Step 3: Create the post with the uploaded image
  const postBody = {
    author: personUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text },
        shareMediaCategory: "IMAGE",
        media: [
          {
            status: "READY",
            media: assetUrn,
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
    body: JSON.stringify(postBody),
  });

  return { success: true, postId: result.id, message: "Image post published to LinkedIn" };
}

export async function commentOnPost(userId: string, postUrn: string, text: string) {
  const { accessToken } = await getLinkedInTokens(userId);

  const profile = await linkedInFetch(accessToken, "https://api.linkedin.com/v2/userinfo");
  const personUrn = `urn:li:person:${profile.sub}`;

  const body = {
    actor: personUrn,
    object: postUrn,
    message: { text },
  };

  const result = await linkedInFetch(accessToken, "https://api.linkedin.com/v2/socialActions/${encodeURIComponent(postUrn)}/comments", {
    method: "POST",
    body: JSON.stringify(body),
  });

  return { success: true, commentId: result.id, message: "Comment posted on LinkedIn" };
}

export async function reactToPost(userId: string, postUrn: string, reactionType: string = "LIKE") {
  const { accessToken } = await getLinkedInTokens(userId);

  const profile = await linkedInFetch(accessToken, "https://api.linkedin.com/v2/userinfo");
  const personUrn = `urn:li:person:${profile.sub}`;

  // Valid types: LIKE, CELEBRATE, SUPPORT, LOVE, INSIGHTFUL, FUNNY
  const validReactions = ["LIKE", "CELEBRATE", "SUPPORT", "LOVE", "INSIGHTFUL", "FUNNY"];
  const reaction = validReactions.includes(reactionType.toUpperCase()) ? reactionType.toUpperCase() : "LIKE";

  const body = {
    root: postUrn,
    reactionType: reaction,
  };

  await linkedInFetch(
    accessToken,
    `https://api.linkedin.com/v2/socialActions/${encodeURIComponent(postUrn)}/likes`,
    { method: "POST", body: JSON.stringify(body) }
  );

  return { success: true, message: `Reacted with ${reaction} on LinkedIn post` };
}
