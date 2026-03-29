import { google } from "googleapis";
import { adminDb } from "@/lib/admin";

/* ─── Token Management ─── */

async function getCalendarClient(userId: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth not configured on server");
  }

  const snap = await adminDb.doc(`users/${userId}/settings/connections`).get();
  if (!snap.exists) throw new Error("No connections found — connect Google Calendar first");

  const data = snap.data() as Record<string, any>;
  const cal = data?.calendar;

  if (!cal?.connected || !cal?.refreshToken) {
    throw new Error("Google Calendar is not connected. Go to Connections to set it up.");
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({
    access_token: cal.accessToken,
    refresh_token: cal.refreshToken,
    expiry_date: cal.expiryDate,
  });

  // Auto-refresh: persist new tokens
  oauth2Client.on("tokens", async (tokens) => {
    try {
      const updates: Record<string, any> = {};
      if (tokens.access_token) updates["calendar.accessToken"] = tokens.access_token;
      if (tokens.expiry_date) updates["calendar.expiryDate"] = tokens.expiry_date;
      if (tokens.refresh_token) updates["calendar.refreshToken"] = tokens.refresh_token;
      await adminDb.doc(`users/${userId}/settings/connections`).update(updates);
    } catch (err) {
      console.error("[Calendar] Failed to persist refreshed tokens:", err);
    }
  });

  return google.calendar({ version: "v3", auth: oauth2Client });
}

/* ─── Calendar Operations ─── */

export async function listEvents(
  userId: string,
  timeMin?: string,
  timeMax?: string,
  maxResults: number = 10
): Promise<{
  id: string;
  summary: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
  attendees?: string[];
  status: string;
}[]> {
  const client = await getCalendarClient(userId);

  const now = new Date();
  const res = await client.events.list({
    calendarId: "primary",
    timeMin: timeMin || now.toISOString(),
    timeMax: timeMax || new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    maxResults: Math.min(maxResults, 50),
    singleEvents: true,
    orderBy: "startTime",
  });

  return (res.data.items || []).map((evt) => ({
    id: evt.id!,
    summary: evt.summary || "(No title)",
    start: evt.start?.dateTime || evt.start?.date || "",
    end: evt.end?.dateTime || evt.end?.date || "",
    location: evt.location || undefined,
    description: evt.description?.substring(0, 500) || undefined,
    attendees: evt.attendees?.map((a) => a.email || "").filter(Boolean),
    status: evt.status || "confirmed",
  }));
}

export async function getEvent(
  userId: string,
  eventId: string
): Promise<{
  id: string;
  summary: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
  attendees?: { email: string; responseStatus: string }[];
  organizer?: string;
  htmlLink?: string;
}> {
  const client = await getCalendarClient(userId);

  const res = await client.events.get({
    calendarId: "primary",
    eventId,
  });

  const evt = res.data;
  return {
    id: evt.id!,
    summary: evt.summary || "(No title)",
    start: evt.start?.dateTime || evt.start?.date || "",
    end: evt.end?.dateTime || evt.end?.date || "",
    location: evt.location || undefined,
    description: evt.description?.substring(0, 2000) || undefined,
    attendees: evt.attendees?.map((a) => ({
      email: a.email || "",
      responseStatus: a.responseStatus || "needsAction",
    })),
    organizer: evt.organizer?.email || undefined,
    htmlLink: evt.htmlLink || undefined,
  };
}

export async function createEvent(
  userId: string,
  summary: string,
  startTime: string,
  endTime: string,
  description?: string,
  attendees?: string[],
  location?: string
): Promise<{ id: string; htmlLink: string }> {
  const client = await getCalendarClient(userId);

  const res = await client.events.insert({
    calendarId: "primary",
    requestBody: {
      summary,
      description,
      location,
      start: { dateTime: startTime },
      end: { dateTime: endTime },
      attendees: attendees?.map((email) => ({ email })),
    },
  });

  return { id: res.data.id!, htmlLink: res.data.htmlLink || "" };
}

export async function updateEvent(
  userId: string,
  eventId: string,
  updates: {
    summary?: string;
    description?: string;
    startTime?: string;
    endTime?: string;
    location?: string;
  }
): Promise<{ id: string; updated: boolean }> {
  const client = await getCalendarClient(userId);

  const body: any = {};
  if (updates.summary) body.summary = updates.summary;
  if (updates.description) body.description = updates.description;
  if (updates.location) body.location = updates.location;
  if (updates.startTime) body.start = { dateTime: updates.startTime };
  if (updates.endTime) body.end = { dateTime: updates.endTime };

  await client.events.patch({
    calendarId: "primary",
    eventId,
    requestBody: body,
  });

  return { id: eventId, updated: true };
}

export async function deleteEvent(
  userId: string,
  eventId: string
): Promise<{ deleted: boolean }> {
  const client = await getCalendarClient(userId);
  await client.events.delete({ calendarId: "primary", eventId });
  return { deleted: true };
}

export async function findFreeSlots(
  userId: string,
  date: string
): Promise<{ busySlots: { start: string; end: string }[]; freeHours: number }> {
  const client = await getCalendarClient(userId);

  const dayStart = new Date(date);
  dayStart.setHours(8, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(18, 0, 0, 0);

  const res = await client.freebusy.query({
    requestBody: {
      timeMin: dayStart.toISOString(),
      timeMax: dayEnd.toISOString(),
      items: [{ id: "primary" }],
    },
  });

  const busySlots = (res.data.calendars?.primary?.busy || []).map((b) => ({
    start: b.start || "",
    end: b.end || "",
  }));

  // Calculate free hours
  let busyMinutes = 0;
  for (const slot of busySlots) {
    const start = new Date(slot.start).getTime();
    const end = new Date(slot.end).getTime();
    busyMinutes += (end - start) / 60000;
  }
  const freeHours = Math.round((600 - busyMinutes) / 60 * 10) / 10; // 10h workday

  return { busySlots, freeHours };
}
