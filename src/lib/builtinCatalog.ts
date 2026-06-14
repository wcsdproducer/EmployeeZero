/**
 * Built-in Catalog
 *
 * Pre-installed, fully trained and tested Tools, Skills, and Workflows
 * available to ALL users. Hard-coded — cannot be edited or deleted by users.
 * Distinct from user's Custom items stored in Firestore.
 */

export interface BuiltinTool {
  id: string;
  name: string;
  description: string;
  toolNames: string[];
  requiredConnections: string[];
  category: "email" | "sheets" | "research" | "calendar" | "docs" | "social" | "drive" | "ai";
  icon: string;
}

export interface BuiltinSkill {
  id: string;
  name: string;
  description: string;
  toolIds: string[];
  requiredConnections: string[];
  category: "productivity" | "sales" | "content" | "research" | "reporting";
  icon: string;
}

export interface BuiltinWorkflow {
  id: string;
  name: string;
  description: string;
  workflowDefinitionId: string;
  requiredConnections: string[];
  category: "daily" | "email" | "social" | "sales" | "reporting" | "content" | "calendar";
  icon: string;
}

// ─── BUILT-IN TOOLS ──────────────────────────────────────────────────────────

export const BUILTIN_TOOLS: BuiltinTool[] = [
  {
    id: "builtin-search-gmail",
    name: "Search Gmail Inbox",
    description: "Search for emails by keyword, sender, subject, or date range. Returns matching threads with summaries.",
    toolNames: ["search_emails"],
    requiredConnections: ["gmail"],
    category: "email",
    icon: "📧",
  },
  {
    id: "builtin-send-email",
    name: "Send Email",
    description: "Compose and send an email via Gmail. Supports To, CC, Subject, body, and reply-to-thread.",
    toolNames: ["send_email", "reply_to_email"],
    requiredConnections: ["gmail"],
    category: "email",
    icon: "📤",
  },
  {
    id: "builtin-read-email",
    name: "Read & Summarize Email",
    description: "Read the full content of an email and produce a concise summary with action items.",
    toolNames: ["get_email"],
    requiredConnections: ["gmail"],
    category: "email",
    icon: "📨",
  },
  {
    id: "builtin-read-sheet",
    name: "Read Google Sheet",
    description: "Read data from a Google Sheets tab. Returns all rows and columns as structured data.",
    toolNames: ["read_sheet", "get_spreadsheet_info"],
    requiredConnections: ["sheets"],
    category: "sheets",
    icon: "📊",
  },
  {
    id: "builtin-write-sheet",
    name: "Write to Google Sheet",
    description: "Write or update data in a Google Sheet. Overwrites a range or appends new rows.",
    toolNames: ["write_sheet", "append_to_sheet"],
    requiredConnections: ["sheets"],
    category: "sheets",
    icon: "✏️",
  },
  {
    id: "builtin-format-sheet",
    name: "Format Google Sheet",
    description: "Apply formatting — bold headers, set colors, freeze rows, resize columns, merge cells.",
    toolNames: ["format_row", "format_cells", "freeze_rows", "freeze_columns", "auto_resize_columns"],
    requiredConnections: ["sheets"],
    category: "sheets",
    icon: "🎨",
  },
  {
    id: "builtin-create-sheet",
    name: "Create Spreadsheet",
    description: "Create a brand new Google Sheets file with one or more named tabs.",
    toolNames: ["create_spreadsheet", "add_sheet_tab"],
    requiredConnections: ["sheets"],
    category: "sheets",
    icon: "📋",
  },
  {
    id: "builtin-web-search",
    name: "Web Search",
    description: "Quick factual web search. Returns titles, URLs, and snippets from top results.",
    toolNames: ["web_search"],
    requiredConnections: [],
    category: "research",
    icon: "🔍",
  },
  {
    id: "builtin-deep-research",
    name: "Deep Research",
    description: "Comprehensive multi-source research. Runs 5+ parallel searches, reads pages, and produces a detailed report.",
    toolNames: ["deep_research"],
    requiredConnections: [],
    category: "research",
    icon: "🧠",
  },
  {
    id: "builtin-browse-url",
    name: "Browse Web Page",
    description: "Read the content of a specific URL. Extracts text from any publicly accessible web page.",
    toolNames: ["browse_url"],
    requiredConnections: [],
    category: "research",
    icon: "🌐",
  },
  {
    id: "builtin-search-calendar",
    name: "Search Calendar Events",
    description: "Find upcoming calendar events. Filter by date range, keyword, or attendee.",
    toolNames: ["search_events", "get_upcoming_events"],
    requiredConnections: ["calendar"],
    category: "calendar",
    icon: "📅",
  },
  {
    id: "builtin-create-event",
    name: "Create Calendar Event",
    description: "Schedule a new event on Google Calendar. Supports title, date/time, location, attendees, and recurrence.",
    toolNames: ["create_event"],
    requiredConnections: ["calendar"],
    category: "calendar",
    icon: "➕",
  },
  {
    id: "builtin-create-doc",
    name: "Create Google Doc",
    description: "Create a new Google Doc with formatted content including headers, bullets, and tables.",
    toolNames: ["create_doc"],
    requiredConnections: ["drive"],
    category: "docs",
    icon: "📄",
  },
  {
    id: "builtin-create-pdf",
    name: "Create PDF Report",
    description: "Generate a formatted PDF document and save it to Google Drive with a shareable link.",
    toolNames: ["create_pdf"],
    requiredConnections: [],
    category: "docs",
    icon: "📑",
  },
  {
    id: "builtin-search-drive",
    name: "Search Google Drive",
    description: "Search for files and documents in Google Drive by name, type, or keyword.",
    toolNames: ["search_drive"],
    requiredConnections: ["drive"],
    category: "drive",
    icon: "🗂️",
  },
  {
    id: "builtin-post-linkedin",
    name: "Post to LinkedIn",
    description: "Publish a post to the user's LinkedIn profile. Supports text up to 3,000 characters.",
    toolNames: ["create_linkedin_post"],
    requiredConnections: ["linkedin"],
    category: "social",
    icon: "💼",
  },
  {
    id: "builtin-post-twitter",
    name: "Post to Twitter / X",
    description: "Publish a tweet to the user's Twitter/X account. Supports up to 280 characters.",
    toolNames: ["post_tweet"],
    requiredConnections: ["twitter"],
    category: "social",
    icon: "🐦",
  },
  {
    id: "builtin-post-instagram",
    name: "Post to Instagram",
    description: "Publish a caption and image to the user's Instagram account.",
    toolNames: ["create_instagram_post"],
    requiredConnections: ["instagram"],
    category: "social",
    icon: "📸",
  },
];

// ─── BUILT-IN SKILLS ─────────────────────────────────────────────────────────

export const BUILTIN_SKILLS: BuiltinSkill[] = [
  {
    id: "builtin-skill-lead-research",
    name: "Lead Research",
    description: "Research a lead: web search their company, search Gmail for prior contact, and log findings to a Google Sheet.",
    toolIds: ["builtin-web-search", "builtin-search-gmail", "builtin-write-sheet"],
    requiredConnections: ["gmail", "sheets"],
    category: "sales",
    icon: "🎯",
  },
  {
    id: "builtin-skill-email-campaign",
    name: "Email Campaign",
    description: "Search Gmail for context on a recipient, draft a personalized message, and send it.",
    toolIds: ["builtin-search-gmail", "builtin-read-email", "builtin-send-email"],
    requiredConnections: ["gmail"],
    category: "sales",
    icon: "📬",
  },
  {
    id: "builtin-skill-content-publishing",
    name: "Content Publishing",
    description: "Research a topic, then publish platform-specific posts to LinkedIn, Twitter/X, and Instagram.",
    toolIds: ["builtin-deep-research", "builtin-post-linkedin", "builtin-post-twitter", "builtin-post-instagram"],
    requiredConnections: ["linkedin", "twitter", "instagram"],
    category: "content",
    icon: "📢",
  },
  {
    id: "builtin-skill-morning-briefing",
    name: "Morning Briefing Prep",
    description: "Check today's calendar events, scan Gmail for urgent emails, and search for priority news.",
    toolIds: ["builtin-search-calendar", "builtin-search-gmail", "builtin-web-search"],
    requiredConnections: ["calendar", "gmail"],
    category: "productivity",
    icon: "☀️",
  },
  {
    id: "builtin-skill-spreadsheet-report",
    name: "Spreadsheet Reporter",
    description: "Read a Google Sheet, format the header row, auto-resize columns, then email the sheet as a report.",
    toolIds: ["builtin-read-sheet", "builtin-format-sheet", "builtin-send-email"],
    requiredConnections: ["sheets", "gmail"],
    category: "reporting",
    icon: "📈",
  },
  {
    id: "builtin-skill-competitor-research",
    name: "Competitor Intelligence",
    description: "Deep research a competitor, browse their website, and log findings to a Google Sheet.",
    toolIds: ["builtin-deep-research", "builtin-browse-url", "builtin-write-sheet"],
    requiredConnections: ["sheets"],
    category: "research",
    icon: "🔭",
  },
  {
    id: "builtin-skill-meeting-prep",
    name: "Meeting Preparation",
    description: "Search calendar for upcoming meetings, research attendees in Gmail, and compile a meeting brief document.",
    toolIds: ["builtin-search-calendar", "builtin-search-gmail", "builtin-deep-research", "builtin-create-doc"],
    requiredConnections: ["calendar", "gmail", "drive"],
    category: "productivity",
    icon: "🤝",
  },
  {
    id: "builtin-skill-data-entry",
    name: "Data Entry & Logging",
    description: "Read data from an email, structure it into rows, write to a Google Sheet, and format the sheet.",
    toolIds: ["builtin-read-email", "builtin-write-sheet", "builtin-format-sheet"],
    requiredConnections: ["gmail", "sheets"],
    category: "reporting",
    icon: "🗃️",
  },
];

// ─── BUILT-IN WORKFLOWS ───────────────────────────────────────────────────────

export const BUILTIN_WORKFLOWS: BuiltinWorkflow[] = [
  {
    id: "builtin-wf-morning-briefing",
    name: "Morning Briefing",
    description: "Scan unread emails, categorize by urgency, and present a daily briefing with suggested priorities.",
    workflowDefinitionId: "morning-briefing",
    requiredConnections: ["gmail"],
    category: "daily",
    icon: "☀️",
  },
  {
    id: "builtin-wf-inbox-commander",
    name: "Inbox Commander",
    description: "Categorize all unread emails as Urgent / Action Needed / FYI / Noise with recommended next steps.",
    workflowDefinitionId: "inbox-commander",
    requiredConnections: ["gmail"],
    category: "email",
    icon: "📥",
  },
  {
    id: "builtin-wf-meeting-prep",
    name: "Meeting Prep",
    description: "Research upcoming meetings, review past email threads with attendees, and generate briefing notes.",
    workflowDefinitionId: "meeting-prep",
    requiredConnections: ["gmail"],
    category: "calendar",
    icon: "📋",
  },
  {
    id: "builtin-wf-eod-wrapup",
    name: "End-of-Day Wrap-Up",
    description: "Comprehensive daily summary across all connected services — emails, meetings, tasks, and progress.",
    workflowDefinitionId: "eod-wrapup",
    requiredConnections: ["gmail"],
    category: "daily",
    icon: "🌙",
  },
  {
    id: "builtin-wf-weekly-report",
    name: "Weekly Report",
    description: "Summarize the week's email activity, key decisions, and milestones into a structured report.",
    workflowDefinitionId: "weekly-report",
    requiredConnections: ["gmail"],
    category: "reporting",
    icon: "📊",
  },
  {
    id: "builtin-wf-lead-tracker",
    name: "Lead Tracker",
    description: "Search Gmail for sales leads, extract contact info and deal status, and log to a tracking sheet.",
    workflowDefinitionId: "lead-tracker",
    requiredConnections: ["gmail", "sheets"],
    category: "sales",
    icon: "🎯",
  },
  {
    id: "builtin-wf-competitor-intel",
    name: "Competitor Intelligence",
    description: "Research competitors, monitor their public activity, and compile an intelligence report.",
    workflowDefinitionId: "competitor-intel",
    requiredConnections: [],
    category: "reporting",
    icon: "🔭",
  },
  {
    id: "builtin-wf-social-autopilot",
    name: "Social Autopilot",
    description: "Check trending topics, draft platform-specific posts, and publish across all connected social networks.",
    workflowDefinitionId: "social-autopilot",
    requiredConnections: ["linkedin", "twitter", "instagram"],
    category: "social",
    icon: "📱",
  },
  {
    id: "builtin-wf-content-calendar",
    name: "Content Calendar",
    description: "Generate a week of content ideas, draft posts for each platform, and organize in a spreadsheet.",
    workflowDefinitionId: "content-calendar",
    requiredConnections: ["sheets"],
    category: "content",
    icon: "🗓️",
  },
  {
    id: "builtin-wf-meeting-follow-up",
    name: "Meeting Follow-Up",
    description: "After a meeting, draft follow-up emails, create action item lists, and schedule next steps.",
    workflowDefinitionId: "meeting-follow-up",
    requiredConnections: ["gmail", "calendar"],
    category: "calendar",
    icon: "✅",
  },
  {
    id: "builtin-wf-revenue-tracker",
    name: "Revenue Tracker",
    description: "Search Gmail for invoice and payment emails, extract amounts and dates, and update a revenue sheet.",
    workflowDefinitionId: "revenue-tracker",
    requiredConnections: ["gmail", "sheets"],
    category: "reporting",
    icon: "💰",
  },
  {
    id: "builtin-wf-business-pulse",
    name: "Business Pulse",
    description: "A full business health check — emails, social, analytics, and a web intelligence pulse report.",
    workflowDefinitionId: "business-pulse",
    requiredConnections: ["gmail"],
    category: "reporting",
    icon: "💼",
  },
];

export const TOOL_CATEGORIES: Record<string, string> = {
  email: "Email",
  sheets: "Spreadsheets",
  research: "Research",
  calendar: "Calendar",
  docs: "Documents",
  social: "Social Media",
  drive: "Drive",
  ai: "AI",
};

export const SKILL_CATEGORIES: Record<string, string> = {
  productivity: "Productivity",
  sales: "Sales & CRM",
  content: "Content",
  research: "Research",
  reporting: "Reporting",
};

export const WORKFLOW_CATEGORIES: Record<string, string> = {
  daily: "Daily Routines",
  email: "Email",
  social: "Social Media",
  sales: "Sales & CRM",
  reporting: "Reporting",
  content: "Content",
  calendar: "Calendar",
};
