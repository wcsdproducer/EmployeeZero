import { google } from "googleapis";
import { adminDb } from "@/lib/admin";

/* ─── Auth helper ─── */

async function getAuthenticatedAnalytics(userId: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error("Google OAuth not configured on server");

  const snap = await adminDb.doc(`users/${userId}/settings/connections`).get();
  if (!snap.exists) throw new Error("No connections found — connect Google Analytics first");
  const data = snap.data() as Record<string, any>;
  const analytics = data?.analytics;
  if (!analytics?.connected || !analytics?.refreshToken) {
    throw new Error("Google Analytics is not connected. Go to Connections to set it up.");
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({
    access_token: analytics.accessToken,
    refresh_token: analytics.refreshToken,
    expiry_date: analytics.expiryDate,
  });

  oauth2Client.on("tokens", async (tokens) => {
    try {
      const updates: Record<string, any> = {};
      if (tokens.access_token) updates["analytics.accessToken"] = tokens.access_token;
      if (tokens.expiry_date) updates["analytics.expiryDate"] = tokens.expiry_date;
      if (tokens.refresh_token) updates["analytics.refreshToken"] = tokens.refresh_token;
      await adminDb.doc(`users/${userId}/settings/connections`).update(updates);
    } catch (err) {
      console.error("[Analytics] Failed to persist refreshed tokens:", err);
    }
  });

  return oauth2Client;
}

/* ─── Operations ─── */

export async function listProperties(userId: string) {
  const auth = await getAuthenticatedAnalytics(userId);
  const adminAnalytics = google.analyticsadmin({ version: "v1beta", auth });
  const res = await adminAnalytics.properties.list({
    filter: "parent:accounts/-",
    pageSize: 20,
  });
  return (res.data.properties || []).map((p) => ({
    propertyId: p.name?.replace("properties/", ""),
    displayName: p.displayName,
    timeZone: p.timeZone,
    currencyCode: p.currencyCode,
  }));
}

export async function runReport(
  userId: string,
  propertyId: string,
  startDate: string,
  endDate: string,
  dimensions: string[],
  metrics: string[]
) {
  const auth = await getAuthenticatedAnalytics(userId);
  const analyticsData = google.analyticsdata({ version: "v1beta", auth });
  const res: any = await analyticsData.properties.runReport({
    property: `properties/${propertyId}`,
    requestBody: {
      dateRanges: [{ startDate, endDate }],
      dimensions: dimensions.map((d) => ({ name: d })),
      metrics: metrics.map((m) => ({ name: m })),
      limit: "25",
    },
  });

  const headers = [
    ...(res.data.dimensionHeaders || []).map((h: any) => h.name),
    ...(res.data.metricHeaders || []).map((h: any) => h.name),
  ];

  const rows = (res.data.rows || []).map((row: any) => {
    const values = [
      ...(row.dimensionValues || []).map((v: any) => v.value),
      ...(row.metricValues || []).map((v: any) => v.value),
    ];
    return Object.fromEntries(headers.map((h: any, i: number) => [h, values[i]]));
  });

  return { rowCount: res.data.rowCount, headers, rows };
}

export async function getRealtimeData(userId: string, propertyId: string) {
  const auth = await getAuthenticatedAnalytics(userId);
  const analyticsData = google.analyticsdata({ version: "v1beta", auth });
  const res: any = await analyticsData.properties.runRealtimeReport({
    property: `properties/${propertyId}`,
    requestBody: {
      dimensions: [{ name: "country" }],
      metrics: [{ name: "activeUsers" }],
    },
  });

  const rows = (res.data.rows || []).map((row: any) => ({
    country: row.dimensionValues?.[0]?.value,
    activeUsers: row.metricValues?.[0]?.value,
  }));

  const totalUsers = rows.reduce((sum: number, r: any) => sum + parseInt(r.activeUsers || "0", 10), 0);
  return { totalActiveUsers: totalUsers, byCountry: rows };
}
