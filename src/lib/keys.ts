import { db } from "./firebase";
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  collection,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";

/* ─── Types ─── */

export type IntegrationStatus = "connected" | "error" | "not_connected";

export interface IntegrationRecord {
  key: string;
  connectedAt: Timestamp | null;
  status: IntegrationStatus;
  label?: string;
}

export interface IntegrationConfig {
  id: string;
  name: string;
  category: "google" | "social" | "tools";
  description: string;
  placeholder: string;
  helpUrl?: string;
}

/* ─── Integration definitions ─── */

export const INTEGRATIONS: IntegrationConfig[] = [
  // Google Workspace
  { id: "gmail", name: "Gmail", category: "google", description: "Send and manage emails on your behalf", placeholder: "Gmail API key or OAuth token", helpUrl: "https://console.cloud.google.com/apis/credentials" },
  { id: "calendar", name: "Calendar", category: "google", description: "Schedule meetings, check availability, send invites", placeholder: "Calendar API key or OAuth token", helpUrl: "https://console.cloud.google.com/apis/credentials" },
  { id: "docs", name: "Docs", category: "google", description: "Create and edit documents", placeholder: "Docs API key or OAuth token", helpUrl: "https://console.cloud.google.com/apis/credentials" },
  { id: "sheets", name: "Sheets", category: "google", description: "Read and write spreadsheet data", placeholder: "Sheets API key or OAuth token", helpUrl: "https://console.cloud.google.com/apis/credentials" },
  { id: "drive", name: "Drive", category: "google", description: "Upload, organize, and share files", placeholder: "Drive API key or OAuth token", helpUrl: "https://console.cloud.google.com/apis/credentials" },
  { id: "meet", name: "Meet", category: "google", description: "Create and join video meetings", placeholder: "Meet API key or OAuth token", helpUrl: "https://console.cloud.google.com/apis/credentials" },
  // Social Media
  { id: "instagram", name: "Instagram", category: "social", description: "Post content, read DMs, track analytics", placeholder: "Instagram Graph API token", helpUrl: "https://developers.facebook.com/apps" },
  { id: "x_twitter", name: "X / Twitter", category: "social", description: "Post tweets, engage followers, monitor mentions", placeholder: "X API Bearer token", helpUrl: "https://developer.x.com/portal" },
  { id: "linkedin", name: "LinkedIn", category: "social", description: "Publish posts, manage connections, prospect leads", placeholder: "LinkedIn API access token", helpUrl: "https://www.linkedin.com/developers/apps" },
  { id: "facebook", name: "Facebook", category: "social", description: "Manage pages, schedule posts, respond to messages", placeholder: "Facebook Page access token", helpUrl: "https://developers.facebook.com/apps" },
  { id: "tiktok", name: "TikTok", category: "social", description: "Upload videos, track performance metrics", placeholder: "TikTok API access token", helpUrl: "https://developers.tiktok.com" },
  { id: "youtube", name: "YouTube", category: "social", description: "Upload videos, manage channel, check analytics", placeholder: "YouTube Data API key", helpUrl: "https://console.cloud.google.com/apis/credentials" },
  // More Tools
  { id: "slack", name: "Slack", category: "tools", description: "Send messages, manage channels, post updates", placeholder: "Slack Bot token (xoxb-...)", helpUrl: "https://api.slack.com/apps" },
  { id: "notion", name: "Notion", category: "tools", description: "Create pages, manage databases, search content", placeholder: "Notion integration token", helpUrl: "https://www.notion.so/my-integrations" },
  { id: "zapier", name: "Zapier", category: "tools", description: "Trigger automations across 6,000+ apps", placeholder: "Zapier webhook URL or API key", helpUrl: "https://zapier.com/app/developer" },
  { id: "stripe", name: "Stripe", category: "tools", description: "Create invoices, check balances, manage payments", placeholder: "Stripe secret key (sk_...)", helpUrl: "https://dashboard.stripe.com/apikeys" },
  { id: "hubspot", name: "HubSpot", category: "tools", description: "Manage contacts, deals, and marketing campaigns", placeholder: "HubSpot private app token", helpUrl: "https://app.hubspot.com/private-apps" },
];

/* ─── Firestore CRUD ─── */

function integrationDoc(userId: string, integrationId: string) {
  return doc(db, "users", userId, "integrations", integrationId);
}

export async function saveIntegrationKey(
  userId: string,
  integrationId: string,
  key: string
): Promise<void> {
  await setDoc(integrationDoc(userId, integrationId), {
    key,
    connectedAt: serverTimestamp(),
    status: "connected" as IntegrationStatus,
  });
}

export async function getIntegrationKey(
  userId: string,
  integrationId: string
): Promise<IntegrationRecord | null> {
  const snap = await getDoc(integrationDoc(userId, integrationId));
  if (!snap.exists()) return null;
  return snap.data() as IntegrationRecord;
}

export async function getAllIntegrationKeys(
  userId: string
): Promise<Record<string, IntegrationRecord>> {
  const snap = await getDocs(
    collection(db, "users", userId, "integrations")
  );
  const result: Record<string, IntegrationRecord> = {};
  snap.forEach((d) => {
    result[d.id] = d.data() as IntegrationRecord;
  });
  return result;
}

export async function deleteIntegrationKey(
  userId: string,
  integrationId: string
): Promise<void> {
  await deleteDoc(integrationDoc(userId, integrationId));
}

/** Basic format validation — not a live API call */
export function validateKeyFormat(integrationId: string, key: string): boolean {
  const trimmed = key.trim();
  if (trimmed.length < 4) return false;
  // Stripe keys must start with sk_ or pk_
  if (integrationId === "stripe" && !/^[sp]k_/.test(trimmed)) return false;
  // Slack bot tokens start with xoxb-
  if (integrationId === "slack" && !trimmed.startsWith("xoxb-") && !trimmed.startsWith("xoxp-")) return false;
  return true;
}
