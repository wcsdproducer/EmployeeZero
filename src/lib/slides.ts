import { google, slides_v1 } from "googleapis";
import { adminDb } from "@/lib/admin";

/* ─── Auth helper ─── */

async function getAuthenticatedSlides(userId: string): Promise<slides_v1.Slides> {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error("Google OAuth not configured on server");

  const snap = await adminDb.doc(`users/${userId}/settings/connections`).get();
  if (!snap.exists) throw new Error("No connections found — connect Google Slides first");
  const data = snap.data() as Record<string, any>;
  const slides = data?.slides;
  if (!slides?.connected || !slides?.refreshToken) {
    throw new Error("Google Slides is not connected. Go to Connections to set it up.");
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({
    access_token: slides.accessToken,
    refresh_token: slides.refreshToken,
    expiry_date: slides.expiryDate,
  });

  oauth2Client.on("tokens", async (tokens) => {
    try {
      const updates: Record<string, any> = {};
      if (tokens.access_token) updates["slides.accessToken"] = tokens.access_token;
      if (tokens.expiry_date) updates["slides.expiryDate"] = tokens.expiry_date;
      if (tokens.refresh_token) updates["slides.refreshToken"] = tokens.refresh_token;
      await adminDb.doc(`users/${userId}/settings/connections`).update(updates);
    } catch (err) {
      console.error("[Slides] Failed to persist refreshed tokens:", err);
    }
  });

  return google.slides({ version: "v1", auth: oauth2Client });
}

/* ─── Operations ─── */

export async function createPresentation(userId: string, title: string) {
  const slides = await getAuthenticatedSlides(userId);
  const res = await slides.presentations.create({ requestBody: { title } });
  return {
    presentationId: res.data.presentationId,
    title: res.data.title,
    url: `https://docs.google.com/presentation/d/${res.data.presentationId}/edit`,
    slideCount: res.data.slides?.length || 0,
  };
}

export async function getPresentation(userId: string, presentationId: string) {
  const slides = await getAuthenticatedSlides(userId);
  const res = await slides.presentations.get({ presentationId });
  return {
    presentationId: res.data.presentationId,
    title: res.data.title,
    url: `https://docs.google.com/presentation/d/${presentationId}/edit`,
    slideCount: res.data.slides?.length || 0,
    slides: (res.data.slides || []).map((s, i) => ({
      index: i,
      objectId: s.objectId,
    })),
  };
}

export async function addSlide(
  userId: string,
  presentationId: string,
  layout: string = "TITLE_AND_BODY"
) {
  const slides = await getAuthenticatedSlides(userId);
  const slideId = `slide_${Date.now()}`;
  await slides.presentations.batchUpdate({
    presentationId,
    requestBody: {
      requests: [
        {
          createSlide: {
            objectId: slideId,
            slideLayoutReference: { predefinedLayout: layout },
          },
        },
      ],
    },
  });
  return { success: true, slideId, presentationId, action: "slide_added" };
}

export async function insertSlideText(
  userId: string,
  presentationId: string,
  slideObjectId: string,
  text: string
) {
  const slides = await getAuthenticatedSlides(userId);
  // Get the slide to find text placeholders
  const pres = await slides.presentations.get({ presentationId });
  const slide = pres.data.slides?.find((s) => s.objectId === slideObjectId);
  if (!slide) throw new Error(`Slide ${slideObjectId} not found`);

  // Find first text placeholder shape
  const textShape = slide.pageElements?.find(
    (el) => el.shape?.placeholder?.type === "BODY" || el.shape?.placeholder?.type === "TITLE"
  );

  if (!textShape?.objectId) {
    throw new Error("No text placeholder found on this slide. Try a different layout.");
  }

  await slides.presentations.batchUpdate({
    presentationId,
    requestBody: {
      requests: [
        {
          insertText: {
            objectId: textShape.objectId,
            text,
          },
        },
      ],
    },
  });
  return { success: true, slideId: slideObjectId, action: "text_inserted" };
}
