import { adminDb } from '@/lib/admin';
import { loadUserSOUL } from '@/lib/soulAdmin';
import { BROWSER_TOOLS, WORKFLOW_TOOLS, NOTES_TOOLS, RUN_IN_BACKGROUND_TOOL, CREATE_CHART_TOOL, GMAIL_TOOLS, CALENDAR_TOOLS, DRIVE_TOOLS, SHEETS_TOOLS, YOUTUBE_TOOLS, STRIPE_TOOLS, LINKEDIN_TOOLS, TWITTER_TOOLS, INSTAGRAM_TOOLS, FACEBOOK_TOOLS, TIKTOK_TOOLS, CONTACTS_TOOLS, TASKS_TOOLS, DOCS_TOOLS, BUSINESS_PROFILE_TOOLS, ANALYTICS_TOOLS, FORMS_TOOLS, SLIDES_TOOLS } from '@/lib/agentTools';

const userId = "iDlOWBqU4ocwHB3D7fTJG3FBAxY2";
const agentId = "atlas";

async function main() {
  const [connections, soul] = await Promise.all([
    adminDb.doc(`users/${userId}/settings/connections`).get().then(s => s.exists ? s.data() : {}),
    loadUserSOUL(userId, agentId)
  ]);

  console.log("soul.enabledTools in Firestore:", JSON.stringify(soul.enabledTools));

  const allTools = [...BROWSER_TOOLS, ...WORKFLOW_TOOLS, ...NOTES_TOOLS, RUN_IN_BACKGROUND_TOOL, CREATE_CHART_TOOL];
  const hasGmailTools = connections.gmail?.connected || (connections.google?.connected && connections.google?.scopes?.includes("https://mail.google.com/"));
  if (hasGmailTools) allTools.push(...GMAIL_TOOLS);
  if (connections.calendar?.connected) allTools.push(...CALENDAR_TOOLS);
  if (connections.drive?.connected) allTools.push(...DRIVE_TOOLS);
  if (connections.sheets?.connected) allTools.push(...SHEETS_TOOLS);
  if (connections.youtube?.connected) allTools.push(...YOUTUBE_TOOLS);
  if (connections.stripe?.connected) allTools.push(...STRIPE_TOOLS);
  if (connections.linkedin?.connected) allTools.push(...LINKEDIN_TOOLS);
  if (connections.twitter?.connected) allTools.push(...TWITTER_TOOLS);
  if (connections.instagram?.connected) allTools.push(...INSTAGRAM_TOOLS);
  if (connections.facebook?.connected) allTools.push(...FACEBOOK_TOOLS);
  if (connections.tiktok?.connected) allTools.push(...TIKTOK_TOOLS);
  if (connections.gmail?.connected || connections.calendar?.connected || connections.drive?.connected) {
    allTools.push(...CONTACTS_TOOLS);
  }
  if (connections.tasks?.connected) allTools.push(...TASKS_TOOLS);
  if (connections.docs?.connected) allTools.push(...DOCS_TOOLS);
  if (connections.business?.connected) allTools.push(...BUSINESS_PROFILE_TOOLS); // wait, check if it is business or business_profile
  if (connections.analytics?.connected) allTools.push(...ANALYTICS_TOOLS);
  if (connections.forms?.connected) allTools.push(...FORMS_TOOLS);
  if (connections.slides?.connected) allTools.push(...SLIDES_TOOLS);

  let filteredTools = allTools;
  if (soul.enabledTools && soul.enabledTools.length > 0) {
    filteredTools = allTools.filter(t => 
      soul.enabledTools.includes(t.name)
    );
  }

  console.log("filteredTools count:", filteredTools.length);
  console.log("filteredTools names:", filteredTools.map(t => t.name));
}

main();
