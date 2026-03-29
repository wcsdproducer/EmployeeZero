import { google } from "googleapis";
import { adminDb } from "@/lib/admin";

/* ─── Auth helper ─── */

async function getAuthenticatedBusiness(userId: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error("Google OAuth not configured on server");

  const snap = await adminDb.doc(`users/${userId}/settings/connections`).get();
  if (!snap.exists) throw new Error("No connections found — connect Google Business Profile first");
  const data = snap.data() as Record<string, any>;
  const business = data?.business;
  if (!business?.connected || !business?.refreshToken) {
    throw new Error("Google Business Profile is not connected. Go to Connections to set it up.");
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({
    access_token: business.accessToken,
    refresh_token: business.refreshToken,
    expiry_date: business.expiryDate,
  });

  oauth2Client.on("tokens", async (tokens) => {
    try {
      const updates: Record<string, any> = {};
      if (tokens.access_token) updates["business.accessToken"] = tokens.access_token;
      if (tokens.expiry_date) updates["business.expiryDate"] = tokens.expiry_date;
      if (tokens.refresh_token) updates["business.refreshToken"] = tokens.refresh_token;
      await adminDb.doc(`users/${userId}/settings/connections`).update(updates);
    } catch (err) {
      console.error("[Business] Failed to persist refreshed tokens:", err);
    }
  });

  return oauth2Client;
}

/* ─── Operations ─── */
// Google Business Profile uses REST API directly since googleapis client may not have all methods

async function fetchGBP(auth: any, url: string, method = "GET", body?: any) {
  const accessToken = (await auth.getAccessToken()).token;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GBP API error (${res.status}): ${err}`);
  }
  return res.json();
}

export async function listAccounts(userId: string) {
  const auth = await getAuthenticatedBusiness(userId);
  const data = await fetchGBP(auth, "https://mybusinessaccountmanagement.googleapis.com/v1/accounts");
  return (data.accounts || []).map((a: any) => ({
    name: a.name,
    accountName: a.accountName,
    type: a.type,
  }));
}

export async function listLocations(userId: string, accountId: string) {
  const auth = await getAuthenticatedBusiness(userId);
  const data = await fetchGBP(
    auth,
    `https://mybusinessbusinessinformation.googleapis.com/v1/${accountId}/locations?readMask=name,title,storefrontAddress,websiteUri,phoneNumbers`
  );
  return (data.locations || []).map((loc: any) => ({
    name: loc.name,
    title: loc.title,
    address: loc.storefrontAddress?.addressLines?.join(", "),
    phone: loc.phoneNumbers?.primaryPhone,
    website: loc.websiteUri,
  }));
}

export async function getReviews(userId: string, locationName: string) {
  const auth = await getAuthenticatedBusiness(userId);
  const data = await fetchGBP(
    auth,
    `https://mybusiness.googleapis.com/v4/${locationName}/reviews`
  );
  return (data.reviews || []).slice(0, 20).map((r: any) => ({
    reviewId: r.reviewId,
    reviewer: r.reviewer?.displayName,
    rating: r.starRating,
    comment: r.comment,
    createTime: r.createTime,
    hasReply: !!r.reviewReply,
    reply: r.reviewReply?.comment,
  }));
}

export async function replyToReview(userId: string, reviewName: string, comment: string) {
  const auth = await getAuthenticatedBusiness(userId);
  await fetchGBP(
    auth,
    `https://mybusiness.googleapis.com/v4/${reviewName}/reply`,
    "PUT",
    { comment }
  );
  return { success: true, action: "reply_posted" };
}

export async function createLocalPost(
  userId: string,
  locationName: string,
  summary: string,
  callToAction?: { actionType: string; url: string }
) {
  const auth = await getAuthenticatedBusiness(userId);
  const body: any = {
    topicType: "STANDARD",
    languageCode: "en",
    summary,
  };
  if (callToAction) {
    body.callToAction = callToAction;
  }
  const data = await fetchGBP(
    auth,
    `https://mybusiness.googleapis.com/v4/${locationName}/localPosts`,
    "POST",
    body
  );
  return { success: true, postName: data.name, action: "post_created" };
}
