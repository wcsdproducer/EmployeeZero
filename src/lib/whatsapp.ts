/**
 * WhatsApp Business Cloud API Integration
 * Using Meta's Graph API v21.0
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

const BASE = "https://graph.facebook.com/v21.0";

// ── Credential helpers ────────────────────────────────────────────────────

interface WhatsAppCreds {
  accessToken: string;
  phoneNumberId: string;
  wabaId: string;
}

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

/** Fetch WhatsApp credentials from Firestore for a given user */
export async function getWhatsAppCreds(userId: string): Promise<WhatsAppCreds> {
  const { adminDb } = await import("@/lib/admin");
  const snap = await adminDb.doc(`users/${userId}/settings/connections`).get();
  const data = snap.data();
  const wa = data?.whatsapp;
  if (!wa?.connected || !wa.accessToken || !wa.phoneNumberId) {
    throw new Error("WhatsApp is not connected. Please connect WhatsApp in Settings → Connections.");
  }
  return {
    accessToken: wa.accessToken,
    phoneNumberId: wa.phoneNumberId,
    wabaId: wa.wabaId || "",
  };
}

// ── Send Text Message ─────────────────────────────────────────────────────

export async function sendWhatsAppMessage(
  userId: string,
  to: string,
  body: string
) {
  const creds = await getWhatsAppCreds(userId);
  // Normalize phone number (strip spaces, dashes, +)
  const normalizedTo = to.replace(/[\s\-\(\)]/g, "").replace(/^\+/, "");

  const res = await fetch(`${BASE}/${creds.phoneNumberId}/messages`, {
    method: "POST",
    headers: authHeader(creds.accessToken),
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: normalizedTo,
      type: "text",
      text: { body, preview_url: false },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    const err = data?.error?.message || JSON.stringify(data);
    throw new Error(`WhatsApp API error: ${err}`);
  }

  return {
    success: true,
    messageId: data.messages?.[0]?.id,
    to: normalizedTo,
    body,
  };
}

// ── Send Template Message ─────────────────────────────────────────────────

export async function sendWhatsAppTemplate(
  userId: string,
  to: string,
  templateName: string,
  languageCode: string = "en_US",
  bodyParams: string[] = []
) {
  const creds = await getWhatsAppCreds(userId);
  const normalizedTo = to.replace(/[\s\-\(\)]/g, "").replace(/^\+/, "");

  const components: any[] = [];
  if (bodyParams.length > 0) {
    components.push({
      type: "body",
      parameters: bodyParams.map((p) => ({ type: "text", text: p })),
    });
  }

  const res = await fetch(`${BASE}/${creds.phoneNumberId}/messages`, {
    method: "POST",
    headers: authHeader(creds.accessToken),
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: normalizedTo,
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        ...(components.length > 0 && { components }),
      },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    const err = data?.error?.message || JSON.stringify(data);
    throw new Error(`WhatsApp template error: ${err}`);
  }

  return {
    success: true,
    messageId: data.messages?.[0]?.id,
    to: normalizedTo,
    templateName,
  };
}

// ── Send Media Message ────────────────────────────────────────────────────

export async function sendWhatsAppMedia(
  userId: string,
  to: string,
  mediaUrl: string,
  mediaType: "image" | "document" | "video" | "audio",
  caption?: string,
  filename?: string
) {
  const creds = await getWhatsAppCreds(userId);
  const normalizedTo = to.replace(/[\s\-\(\)]/g, "").replace(/^\+/, "");

  const mediaObj: any = { link: mediaUrl };
  if (caption) mediaObj.caption = caption;
  if (filename && mediaType === "document") mediaObj.filename = filename;

  const res = await fetch(`${BASE}/${creds.phoneNumberId}/messages`, {
    method: "POST",
    headers: authHeader(creds.accessToken),
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: normalizedTo,
      type: mediaType,
      [mediaType]: mediaObj,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    const err = data?.error?.message || JSON.stringify(data);
    throw new Error(`WhatsApp media error: ${err}`);
  }

  return {
    success: true,
    messageId: data.messages?.[0]?.id,
    to: normalizedTo,
    mediaType,
    mediaUrl,
  };
}

// ── List Templates ────────────────────────────────────────────────────────

export async function listWhatsAppTemplates(userId: string) {
  const creds = await getWhatsAppCreds(userId);
  if (!creds.wabaId) {
    return { templates: [], note: "WABA ID not configured — add it in Connections settings to list templates." };
  }

  const params = new URLSearchParams({
    fields: "name,status,language,category,components",
    status: "APPROVED",
    limit: "50",
  });

  const res = await fetch(`${BASE}/${creds.wabaId}/message_templates?${params}`, {
    headers: { Authorization: `Bearer ${creds.accessToken}` },
  });

  const data = await res.json();
  if (!res.ok) {
    const err = data?.error?.message || JSON.stringify(data);
    throw new Error(`Template list error: ${err}`);
  }

  const templates = (data.data || []).map((t: any) => ({
    name: t.name,
    status: t.status,
    language: t.language,
    category: t.category,
    bodyText: t.components?.find((c: any) => c.type === "BODY")?.text || "",
  }));

  return { templates, count: templates.length };
}

// ── Get Business Profile ──────────────────────────────────────────────────

export async function getWhatsAppBusinessProfile(userId: string) {
  const creds = await getWhatsAppCreds(userId);
  const fields = "about,address,description,email,profile_picture_url,websites,vertical,messaging_product";

  const res = await fetch(
    `${BASE}/${creds.phoneNumberId}/whatsapp_business_profile?fields=${fields}`,
    { headers: { Authorization: `Bearer ${creds.accessToken}` } }
  );

  const data = await res.json();
  if (!res.ok) {
    const err = data?.error?.message || JSON.stringify(data);
    throw new Error(`Profile error: ${err}`);
  }

  return data?.data?.[0] || data;
}
