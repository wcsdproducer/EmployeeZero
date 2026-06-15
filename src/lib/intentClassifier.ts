/**
 * Intent Classifier — zero-latency, rule-based intent detection
 * 
 * Classifies user messages into intent categories to enable:
 * - Dynamic system prompt (only inject relevant service docs)
 * - Lazy tool loading (only load matching tool groups)
 * - Adaptive thinking budget (simple chat = 0, research = 4096)
 */

export type Intent =
  | "chat"
  | "email"
  | "calendar"
  | "drive"
  | "sheets"
  | "search"
  | "research"
  | "social"
  | "workflow"
  | "skills"
  | "notes"
  | "finance"
  | "media"
  | "tasks"
  | "pdf"
  | "contacts"
  | "forms"
  | "slides"
  | "analytics"
  | "business"
  | "maps";

export interface IntentResult {
  intents: Intent[];
  thinkingBudget: number;
}

// Keyword → intent mapping (lowercase)
const INTENT_KEYWORDS: Record<Intent, string[]> = {
  email: [
    "email", "emails", "inbox", "send", "reply", "forward", "draft", "compose",
    "unsubscribe", "spam", "archive", "trash", "gmail", "mail", "message to",
    "unread", "attachment",
  ],
  calendar: [
    "schedule", "meeting", "event", "calendar", "appointment", "free", "busy",
    "availability", "reschedule", "cancel meeting", "book", "time slot", "agenda",
  ],
  drive: [
    "drive", "file", "folder", "upload", "download", "document", "google doc",
    "shared", "storage",
  ],
  sheets: [
    "spreadsheet", "sheet", "sheets", "cells", "rows", "columns", "csv",
    "table", "data entry", "formula",
  ],
  search: [
    "search for", "look up", "find out", "what is", "who is", "where is",
    "how to", "google", "search the web", "web search", "look into",
  ],
  research: [
    "research", "analyze", "analysis", "compare", "deep dive", "investigate",
    "report on", "study", "comprehensive", "detailed breakdown", "cost of living",
    "budget", "market analysis", "pros and cons",
  ],
  social: [
    "linkedin", "tweet", "twitter", "post to", "instagram", "facebook", "tiktok",
    "social media", "publish", "share on",
  ],
  workflow: [
    "workflow", "automate", "automation", "cron", "schedule job", "recurring",
    "run every", "daily", "weekly", "routine", "run workflow", "run the",
  ],
  skills: [
    "skill", "skills", "tool", "tools", "automation catalog", "what can you do",
    "your capabilities", "show me what", "available automations", "what automations",
    "run skill", "use skill", "lead research", "email campaign", "content publishing",
    "morning briefing prep", "meeting preparation", "competitor intelligence",
    // Creation intents — load CRUD tools
    "create a skill", "create a tool", "create a workflow", "create an automation",
    "build a skill", "build a tool", "build a workflow", "build an automation",
    "make a skill", "make a tool", "make a workflow", "make an automation",
    "design a skill", "design a tool", "design a workflow",
    "new skill", "new tool", "new workflow", "new automation",
    "set up a skill", "set up a tool", "set up a workflow",
    "add a skill", "add a tool", "add a workflow",
    "delete the skill", "delete the tool", "delete the workflow",
    "edit the skill", "edit the tool", "edit the workflow",
    "update the skill", "update the tool", "update the workflow",
    "assign a toolset", "assign tools",
  ],

  notes: [
    "note", "notes", "save this", "write down", "knowledge base", "remember this",
    "jot down",
  ],
  finance: [
    "stripe", "revenue", "payment", "payments", "mrr", "subscription", "charge",
    "refund", "invoice", "billing", "balance",
  ],
  media: [
    "youtube", "video", "channel", "views", "subscribers", "watch",
  ],
  tasks: [
    "task", "tasks", "todo", "to-do", "to do", "checklist", "action item",
    "due date", "mark complete",
  ],
  pdf: [
    "pdf", "generate report", "create report", "export pdf", "print",
  ],
  contacts: [
    "contact", "contacts", "phone number", "address book",
  ],
  forms: [
    "form", "survey", "questionnaire", "feedback form", "quiz",
  ],
  slides: [
    "presentation", "slide", "slides", "deck", "pitch deck", "powerpoint",
  ],
  analytics: [
    "analytics", "traffic", "pageviews", "visitors", "bounce rate", "ga4",
  ],
  business: [
    "review", "reviews", "business profile", "google business", "yelp",
    "reputation", "customer feedback",
  ],
  maps: [
    "directions", "directions to", "how do i get to", "navigate to", "navigation",
    "nearby", "near me", "closest", "find a restaurant", "find a hotel", "find a",
    "maps", "google maps", "street address", "geocode", "coordinates", "latitude",
    "how far", "distance from", "drive from", "commute", "travel time", "miles from",
    "look up address", "verify address", "is this a real address",
  ],
  chat: [], // Default fallback — no keywords needed
};

// Thinking budget per intent complexity
const THINKING_BUDGETS: Record<Intent, number> = {
  chat: 256,
  email: 1024,
  calendar: 1024,
  drive: 1024,
  sheets: 1024,
  search: 2048,
  research: 4096,
  social: 1024,
  workflow: 2048,
  notes: 512,
  finance: 2048,
  media: 1024,
  tasks: 512,
  pdf: 2048,
  contacts: 512,
  forms: 1024,
  slides: 1024,
  analytics: 2048,
  business: 1024,
  skills: 1024,
  maps: 1024,
};

/**
 * Classify user message into one or more intents.
 * Pure keyword matching — no LLM call, ~0ms latency.
 */
export function classifyIntent(message: string): IntentResult {
  const lower = message.toLowerCase();
  const matched: Intent[] = [];

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS) as [Intent, string[]][]) {
    if (intent === "chat") continue; // chat is the fallback
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        matched.push(intent);
        break; // One match per intent is enough
      }
    }
  }

  // Default to chat if nothing matched
  if (matched.length === 0) {
    return { intents: ["chat"], thinkingBudget: 0 };
  }

  // Use the highest thinking budget among matched intents
  const maxBudget = Math.max(...matched.map(i => THINKING_BUDGETS[i]));

  return { intents: matched, thinkingBudget: maxBudget };
}

/**
 * Map intents to the tool group names that should be loaded.
 * Returns which tool groups are needed for this request.
 */
export interface ToolLoadConfig {
  loadBrowser: boolean;
  loadGmail: boolean;
  loadCalendar: boolean;
  loadDrive: boolean;
  loadSheets: boolean;
  loadYoutube: boolean;
  loadStripe: boolean;
  loadLinkedin: boolean;
  loadTwitter: boolean;
  loadInstagram: boolean;
  loadFacebook: boolean;
  loadTiktok: boolean;
  loadContacts: boolean;
  loadTasks: boolean;
  loadDocs: boolean;
  loadSlides: boolean;
  loadForms: boolean;
  loadAnalytics: boolean;
  loadBusiness: boolean;
  loadMaps: boolean;
  loadWorkflow: boolean;
  loadNotes: boolean;
  loadMemory: boolean;
}

const INTENT_TO_TOOLS: Record<Intent, (keyof ToolLoadConfig)[]> = {
  chat: ["loadMemory"],
  email: ["loadGmail", "loadContacts", "loadMemory"],
  calendar: ["loadCalendar", "loadMemory"],
  drive: ["loadDrive", "loadDocs", "loadMemory"],
  sheets: ["loadSheets", "loadMemory"],
  search: ["loadBrowser", "loadMemory"],
  research: ["loadBrowser", "loadMemory", "loadNotes"],
  social: ["loadLinkedin", "loadTwitter", "loadInstagram", "loadFacebook", "loadTiktok", "loadMemory"],
  workflow: ["loadWorkflow", "loadMemory"],
  skills: ["loadWorkflow", "loadMemory"],
  notes: ["loadNotes", "loadMemory"],
  finance: ["loadStripe", "loadMemory"],
  media: ["loadYoutube", "loadAnalytics", "loadMemory"],
  tasks: ["loadTasks", "loadMemory"],
  pdf: ["loadBrowser", "loadMemory"],
  contacts: ["loadContacts", "loadMemory"],
  forms: ["loadForms", "loadMemory"],
  slides: ["loadSlides", "loadMemory"],
  analytics: ["loadAnalytics", "loadMemory"],
  business: ["loadBusiness", "loadMemory"],
  maps: ["loadMaps", "loadMemory"],
};

export function getToolLoadConfig(intents: Intent[]): ToolLoadConfig {
  const config: ToolLoadConfig = {
    loadBrowser: false,
    loadGmail: false,
    loadCalendar: false,
    loadDrive: false,
    loadSheets: false,
    loadYoutube: false,
    loadStripe: false,
    loadLinkedin: false,
    loadTwitter: false,
    loadInstagram: false,
    loadFacebook: false,
    loadTiktok: false,
    loadContacts: false,
    loadTasks: false,
    loadDocs: false,
    loadSlides: false,
    loadForms: false,
    loadAnalytics: false,
    loadBusiness: false,
    loadMaps: false,
    loadWorkflow: false,
    loadNotes: false,
    loadMemory: true, // Always load memory tools
  };

  for (const intent of intents) {
    const keys = INTENT_TO_TOOLS[intent] || [];
    for (const key of keys) {
      config[key] = true;
    }
  }

  return config;
}

/**
 * Returns which system prompt sections should be included.
 */
export function getPromptSections(intents: Intent[]): Set<string> {
  const sections = new Set<string>();
  
  // Always include these
  sections.add("core");      // Personality + capability rules
  sections.add("datetime");  // Current date/time
  sections.add("services");  // Connected services list (just names)
  sections.add("memories");  // User memories
  sections.add("memory_instructions"); // How to save memories (condensed)

  // Intent-specific sections
  const INTENT_TO_SECTIONS: Record<Intent, string[]> = {
    chat: [],
    email: ["gmail"],
    calendar: ["calendar"],
    drive: ["drive", "docs"],
    sheets: ["sheets"],
    search: ["web_browsing"],
    research: ["web_browsing", "notes"],
    social: ["linkedin", "twitter", "instagram", "facebook", "tiktok"],
    workflow: ["workflows"],
    skills: ["workflows"],
    notes: ["notes"],
    finance: ["stripe"],
    media: ["youtube", "analytics"],
    tasks: ["tasks"],
    pdf: ["web_browsing"],
    contacts: ["contacts"],
    forms: ["forms"],
    slides: ["slides"],
    analytics: ["analytics"],
    business: ["business"],
    maps: ["maps"],
  };

  for (const intent of intents) {
    const secs = INTENT_TO_SECTIONS[intent] || [];
    for (const s of secs) sections.add(s);
  }

  return sections;
}
