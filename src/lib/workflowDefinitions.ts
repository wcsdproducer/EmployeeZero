/**
 * Executable Workflow Definitions
 * 
 * Each workflow maps to a structured goal that the task engine can execute.
 * The task engine's ReAct loop uses these goals with the available tools
 * (email, browser, etc.) to autonomously complete each workflow.
 */

export interface WorkflowDefinition {
  id: string;
  /** The goal prompt sent to the task engine */
  goal: string;
  /** Tools this workflow requires — used for preflight checks */
  requiredConnections: string[];
  /** Whether this workflow can run without any connections (e.g., web-only) */
  connectionOptional?: boolean;
}

export const WORKFLOW_DEFINITIONS: Record<string, WorkflowDefinition> = {
  "morning-briefing": {
    id: "morning-briefing",
    goal: `You are running the Morning Briefing workflow for the user. Do the following steps:

1. Search for unread emails from the last 24 hours. Categorize them as: Urgent, Action Needed, FYI, or Noise.
2. Get the unread email count.
3. Summarize the top 5 most important emails with sender, subject, and a one-line summary.
4. If any emails require immediate action (payments due, meeting changes, client requests), flag them at the top.
5. Present the briefing in a clean, structured format with sections:
   - 📊 **Inbox Overview** (unread count, categories)
   - 🔴 **Urgent / Action Required** (if any)
   - 📧 **Top Messages** (summarized)
   - ✅ **Suggested Priorities** (3 things to focus on today)

Be concise and actionable. This is meant to be read in under 2 minutes.`,
    requiredConnections: ["gmail"],
  },

  "inbox-commander": {
    id: "inbox-commander",
    goal: `You are running the Inbox Commander workflow. Do the following:

1. Search for all unread emails in the inbox.
2. Read and categorize each email:
   - 🔴 **Urgent** — needs response within hours
   - 🟡 **Action Needed** — requires a response but not urgent
   - 🔵 **FYI** — informational, no action needed
   - ⚫ **Noise** — newsletters, promotions, automated notifications
3. For Urgent emails: summarize and suggest a draft reply.
4. For Noise emails: list them and suggest which to archive or unsubscribe from.
5. Present a clean digest with counts per category and actionable next steps.

Do NOT archive or delete anything without explicit permission. Just categorize and recommend.`,
    requiredConnections: ["gmail"],
  },

  "meeting-prep": {
    id: "meeting-prep",
    goal: `You are running the Meeting Prep workflow. Do the following:

1. Search emails for any meeting-related messages from the last 48 hours (invites, calendar updates, agendas).
2. For each upcoming meeting found, research:
   - Who are the attendees? Search for past email threads with them.
   - What was the last discussion topic?
   - Are there any pending action items?
3. Generate a briefing for each meeting with:
   - 📋 **Meeting**: Subject and time
   - 👥 **Attendees**: Names and context
   - 📝 **Talking Points**: Key items to discuss
   - ⚠️ **Open Items**: Anything unresolved from previous interactions

Present each meeting as a separate section.`,
    requiredConnections: ["gmail"],
  },

  "eod-wrapup": {
    id: "eod-wrapup",
    goal: `You are running the End-of-Day Wrap-Up workflow. Do the following:

1. Search for all emails sent by the user today (from:me, today's date).
2. Search for all emails received today.
3. Compile a summary:
   - 📤 **Emails Sent**: Count and key topics
   - 📥 **Emails Received**: Count and highlights
   - ✅ **Accomplished**: What was handled today
   - 🔜 **Tomorrow's Priorities**: Top 3 things to focus on based on pending items
4. Note any unanswered urgent emails that should be addressed.

Keep it concise — this is a 1-minute end-of-day read.`,
    requiredConnections: ["gmail"],
  },

  "lead-tracker": {
    id: "lead-tracker",
    goal: `You are running the Lead Tracker workflow. Do the following:

1. Search emails for potential new leads — look for inquiry emails, contact form submissions, "interested in" messages from the last 7 days.
2. For each potential lead found:
   - Extract: Name, email, company (if available), what they're interested in
   - Check if there's been any follow-up already
   - Assess urgency (hot lead vs. warm vs. cold)
3. Search the web for any leads that need enrichment (company info, LinkedIn profiles).
4. Present a lead report:
   - 🔥 **Hot Leads** — responded to an offer or asked for pricing
   - 🟡 **Warm Leads** — showed interest, no commitment
   - 🧊 **Cold Leads** — general inquiries
   - 📧 **Follow-Up Needed** — leads that haven't received a response

Suggest specific follow-up actions for each lead.`,
    requiredConnections: ["gmail"],
  },

  "appointment-scheduler": {
    id: "appointment-scheduler",
    goal: `You are running the Appointment Scheduler workflow. Do the following:

1. Search emails for scheduling requests — messages containing "schedule", "book", "meeting", "available", "call" from the last 7 days.
2. For each scheduling request:
   - Identify who wants to meet and their preferred times
   - Note any scheduling constraints mentioned
3. Draft polite replies proposing available times (suggest 2-3 options for the next 5 business days).
4. Present a summary:
   - 📅 **Pending Requests**: Who wants to meet and when
   - ✍️ **Draft Replies**: Ready to review and send
   - ⚠️ **Conflicts**: Any overlapping requests

Do NOT send any replies — just draft them for review.`,
    requiredConnections: ["gmail"],
  },

  "review-responder": {
    id: "review-responder",
    goal: `You are running the Customer Review Responder workflow. Do the following:

1. Search emails for review notifications — from Google Business, Yelp, Facebook, App Store, or any review platform. Look for subjects containing "review", "rating", "feedback" from the last 7 days.
2. Read each review notification and extract:
   - Platform, rating (if available), reviewer name, review text
3. For each review, draft a response:
   - ⭐ **Positive (4-5 stars)**: Thank them personally, mention specific points they praised
   - ⚠️ **Negative (1-3 stars)**: Acknowledge concern, empathize, offer resolution
   - 📝 **Neutral**: Thank and invite to share more
4. Present all reviews with their drafted responses for approval.

Do NOT post any responses — just draft them.`,
    requiredConnections: ["gmail"],
  },

  "client-onboarding": {
    id: "client-onboarding",
    goal: `You are running the Client Onboarding workflow. Do the following:

1. Search emails for any new client-related communications from the last 14 days — look for welcome emails you sent, contract signs, payment confirmations.
2. For each new client identified:
   - Check what onboarding communications have been sent
   - Identify gaps in the onboarding sequence
3. Draft next-step emails for any client that needs follow-up:
   - **Day 1**: Welcome + setup guide (if not sent)
   - **Day 3**: Tips & best practices
   - **Day 7**: Check-in & feedback request
   - **Day 14**: Value recap & next steps
4. Present a client onboarding status report with draft emails.

Do NOT send any emails — just draft them for review.`,
    requiredConnections: ["gmail"],
  },

  "invoice-tracker": {
    id: "invoice-tracker",
    goal: `You are running the Invoice & Expense Tracker workflow. Do the following:

1. Search emails for invoices, receipts, and payment confirmations from the last 30 days. Look for subjects containing "invoice", "receipt", "payment", "billing", "statement".
2. For each financial document found:
   - Extract: Vendor/sender, amount, date, due date (if applicable), status (paid/unpaid)
3. Organize into a financial summary:
   - 💰 **Income Received**: Payments and amounts
   - 📤 **Expenses/Bills**: Invoices received with amounts
   - ⏰ **Upcoming Due Dates**: Bills due in the next 14 days
   - ⚠️ **Overdue**: Any past-due items
4. Calculate totals and present a clean financial overview.`,
    requiredConnections: ["gmail"],
  },

  "weekly-report": {
    id: "weekly-report",
    goal: `You are running the Weekly Report Builder workflow. Compile a comprehensive weekly summary:

1. Search sent emails from the past 7 days — count and categorize by type (client communication, internal, sales).
2. Search received emails from the past 7 days — count, highlight urgent items handled.
3. Compile the report:
   - 📊 **Week at a Glance**: Total emails sent/received, response rate
   - 💼 **Client Activity**: Key client interactions
   - 📈 **Sales Pipeline**: Any new leads, proposals, or deals
   - ✅ **Wins**: Notable accomplishments
   - 🔜 **Next Week Focus**: Recommended priorities
4. Present in a polished, executive-summary format.`,
    requiredConnections: ["gmail"],
  },

  "content-calendar": {
    id: "content-calendar",
    goal: `You are running the Content Calendar Manager workflow. Do the following:

1. Search the web for current trending topics in the user's industry.
2. Generate a week of social media content (Monday through Friday):
   - Each day gets: Topic, Hook (first line), Full Post Body, Suggested Hashtags, Best Platform
3. Adapt content for different platforms:
   - **LinkedIn**: Professional, insight-driven, 150-200 words
   - **Twitter/X**: Punchy, under 280 characters, with a hook
   - **Instagram**: Visual-first caption, storytelling, emojis
4. Present as a structured calendar with all posts ready for review.

Focus on content that drives engagement and positions the user as an authority.`,
    requiredConnections: [],
    connectionOptional: true,
  },

  "competitor-intel": {
    id: "competitor-intel",
    goal: `You are running the Competitor Intelligence workflow. Do the following:

1. Ask the user: "Which competitors would you like me to research? Provide 2-3 company names or URLs."
2. Once provided, for each competitor:
   - Browse their website for recent updates, new products, pricing changes
   - Search the web for recent news, press releases, or social media activity
3. Compile an intelligence report:
   - 🏢 **Company Overview**: What they do, target market
   - 🆕 **Recent Changes**: New products, pricing, features
   - 📰 **News & PR**: Recent media coverage
   - 💡 **Strategic Insights**: What this means for the user's business
   - ⚔️ **Competitive Advantage**: Where the user can win

Present actionable insights, not just raw data.`,
    requiredConnections: [],
    connectionOptional: true,
  },

  "social-autopilot": {
    id: "social-autopilot",
    goal: `You are running the Social Media Autopilot workflow. Do the following:

1. Search the web for trending topics and viral content formats in the user's niche.
2. Generate 5 social media posts, each adapted for multiple platforms:
   - **Post 1**: Thought leadership / industry insight
   - **Post 2**: Behind-the-scenes / personal story
   - **Post 3**: Value bomb / tips list
   - **Post 4**: Engagement bait / question or poll
   - **Post 5**: Promotion / call to action
3. For each post, provide:
   - LinkedIn version (professional, 150+ words)
   - Twitter/X version (punchy, <280 chars)
   - Instagram caption (visual, storytelling)
4. Present all posts organized by day with platform-specific versions.`,
    requiredConnections: [],
    connectionOptional: true,
  },

  "business-pulse": {
    id: "business-pulse",
    goal: `You are running the Business Pulse Dashboard workflow. Do the following:

1. Get unread email count for overall inbox health.
2. Search emails from the last 7 days for:
   - Revenue-related emails (payments, invoices, sales)
   - Client communications (count of active conversations)
   - Support requests or complaints
3. Search sent emails to measure response activity.
4. Compile a Business Pulse report:
   - 📧 **Communication Volume**: Emails in/out, response rate
   - 💰 **Revenue Signals**: Payment confirmations, new deals
   - 👥 **Client Health**: Active conversations, complaints
   - ⚠️ **Attention Needed**: Unanswered urgent items
   - 📈 **Trend**: Is activity up or down vs. normal?
5. End with a one-sentence "Business Health Score" assessment.`,
    requiredConnections: ["gmail"],
  },
};

/**
 * Get the executable goal for a workflow by ID.
 * Returns null if the workflow doesn't exist.
 */
export function getWorkflowGoal(workflowId: string): string | null {
  return WORKFLOW_DEFINITIONS[workflowId]?.goal || null;
}

/**
 * Check if all required connections for a workflow are available.
 */
export function getRequiredConnections(workflowId: string): string[] {
  return WORKFLOW_DEFINITIONS[workflowId]?.requiredConnections || [];
}
