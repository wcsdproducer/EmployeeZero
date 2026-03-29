/**
 * Google Contacts tools for the agent.
 * Uses googleapis People API.
 */

import { google, people_v1 } from "googleapis";
import { adminDb } from "@/lib/admin";

/* ─── Auth helper ─── */

async function getAuthenticatedPeople(userId: string): Promise<people_v1.People> {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth not configured on server");
  }

  const snap = await adminDb.doc(`users/${userId}/settings/connections`).get();
  if (!snap.exists) throw new Error("No connections found — connect Google first");

  const data = snap.data() as Record<string, any>;
  // Reuse gmail or calendar connection tokens (same Google account)
  const conn = data?.gmail || data?.calendar || data?.drive;

  if (!conn?.connected || !conn?.refreshToken) {
    throw new Error("Google is not connected. Go to Connections to set it up.");
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({
    access_token: conn.accessToken,
    refresh_token: conn.refreshToken,
    expiry_date: conn.expiryDate,
  });

  return google.people({ version: "v1", auth: oauth2Client });
}

/* ─── Operations ─── */

export async function listContacts(
  userId: string,
  searchQuery?: string,
  maxResults = 20
): Promise<any[]> {
  const people = await getAuthenticatedPeople(userId);

  if (searchQuery) {
    const res = await people.people.searchContacts({
      query: searchQuery,
      readMask: "names,emailAddresses,phoneNumbers,organizations",
      pageSize: maxResults,
    });

    return (res.data.results || []).map((r) => {
      const p = r.person;
      return {
        resourceName: p?.resourceName,
        name: p?.names?.[0]?.displayName || "Unknown",
        email: p?.emailAddresses?.[0]?.value || "",
        phone: p?.phoneNumbers?.[0]?.value || "",
        company: p?.organizations?.[0]?.name || "",
      };
    });
  }

  const res = await people.people.connections.list({
    resourceName: "people/me",
    personFields: "names,emailAddresses,phoneNumbers,organizations",
    pageSize: maxResults,
    sortOrder: "LAST_MODIFIED_DESCENDING",
  });

  return (res.data.connections || []).map((p) => ({
    resourceName: p.resourceName,
    name: p.names?.[0]?.displayName || "Unknown",
    email: p.emailAddresses?.[0]?.value || "",
    phone: p.phoneNumbers?.[0]?.value || "",
    company: p.organizations?.[0]?.name || "",
  }));
}

export async function getContact(
  userId: string,
  resourceName: string
): Promise<any> {
  const people = await getAuthenticatedPeople(userId);

  const res = await people.people.get({
    resourceName,
    personFields:
      "names,emailAddresses,phoneNumbers,organizations,addresses,birthdays,biographies,urls",
  });

  const p = res.data;
  return {
    resourceName: p.resourceName,
    name: p.names?.[0]?.displayName || "Unknown",
    firstName: p.names?.[0]?.givenName || "",
    lastName: p.names?.[0]?.familyName || "",
    emails: (p.emailAddresses || []).map((e) => ({ email: e.value, type: e.type })),
    phones: (p.phoneNumbers || []).map((ph) => ({ phone: ph.value, type: ph.type })),
    company: p.organizations?.[0]?.name || "",
    title: p.organizations?.[0]?.title || "",
    address: p.addresses?.[0]?.formattedValue || "",
    birthday: p.birthdays?.[0]?.text || "",
    notes: p.biographies?.[0]?.value || "",
    websites: (p.urls || []).map((u) => u.value),
  };
}

export async function createContact(
  userId: string,
  firstName: string,
  lastName?: string,
  email?: string,
  phone?: string,
  company?: string,
  title?: string
): Promise<any> {
  const people = await getAuthenticatedPeople(userId);

  const personData: any = {
    names: [{ givenName: firstName, familyName: lastName || "" }],
  };

  if (email) personData.emailAddresses = [{ value: email }];
  if (phone) personData.phoneNumbers = [{ value: phone }];
  if (company || title) {
    personData.organizations = [{ name: company || "", title: title || "" }];
  }

  const res = await people.people.createContact({
    requestBody: personData,
    personFields: "names,emailAddresses,phoneNumbers,organizations",
  });

  return {
    resourceName: res.data.resourceName,
    name: res.data.names?.[0]?.displayName || `${firstName} ${lastName || ""}`.trim(),
    email: res.data.emailAddresses?.[0]?.value || email || "",
    phone: res.data.phoneNumbers?.[0]?.value || phone || "",
  };
}

export async function deleteContact(
  userId: string,
  resourceName: string
): Promise<{ success: boolean }> {
  const people = await getAuthenticatedPeople(userId);
  await people.people.deleteContact({ resourceName });
  return { success: true };
}
