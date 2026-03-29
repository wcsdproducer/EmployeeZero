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
    goal: `You are running the End-of-Day Wrap-Up workflow. This is a COMPREHENSIVE daily summary across ALL workspaces and services. Be thorough — the user relies on this to know everything that happened today.

Do the following steps IN ORDER, using every connected service available:

## 1. Email Activity (Gmail)
- Search for all emails sent by the user today (from:me, today's date) — count and summarize key topics
- Search for all emails received today — count and highlight important ones
- Flag any urgent unanswered emails that need attention

## 2. Calendar & Meetings (Google Calendar)
- Get today's calendar events — list all meetings/calls that occurred
- Note any no-shows, cancellations, or rescheduled items
- Check tomorrow's calendar for upcoming commitments

## 3. Tasks & Projects (Google Tasks)
- List recently completed tasks
- List any overdue or pending tasks
- Note tasks due tomorrow

## 4. Files & Documents (Google Drive)
- Search for files modified today — what documents were worked on?
- Note any new files created or shared

## 5. Website & Analytics (Google Analytics — if connected)
- Pull today's visitor stats, page views, top pages
- Note any significant traffic changes or trends

## 6. Business Activity (Google Business Profile — if connected)
- Check for new reviews, messages, or customer interactions

## 7. Social Media Activity (any connected platforms)
- Check for notable engagement, messages, or mentions

## FINAL SUMMARY FORMAT:
Structure your report as:
📊 **Daily Dashboard** — [Date]
- 📤 Emails Sent: [count] — [key topics]
- 📥 Emails Received: [count] — [highlights]
- 📅 Meetings: [count] — [key outcomes]
- ✅ Tasks Completed: [count] — [details]
- 📁 Files Worked On: [list]
- 🌐 Website: [visitors, pageviews, trends]
- ⚠️ Needs Attention: [urgent items]
- 🔜 Tomorrow's Priorities: Top 3 items based on pending work, upcoming meetings, and deadlines

Keep sections concise but don't skip any connected service. If a service has no activity, say "No activity" rather than omitting it. This should be a 2-minute executive read that captures EVERYTHING.`,
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

  // ═══════════════════════════════════════════════════════
  // SOCIAL MEDIA WORKFLOWS
  // ═══════════════════════════════════════════════════════

  "social-engagement-sweep": {
    id: "social-engagement-sweep",
    goal: `You are running the Social Engagement Sweep workflow. Check all connected social platforms and respond to engagement:

1. **Twitter/X**: Get mentions and check follower notifications. For each mention:
   - If it's a positive comment → like it and reply with a brief thank you
   - If it's a question → reply with a helpful answer
   - If it's negative → do NOT reply, just flag it for review
2. **Instagram**: Get recent comments on the latest 5 posts. For each comment:
   - If compliment or simple reaction → reply with a brief thank you
   - If question about products/services → reply helpfully
   - If spam → flag for deletion review
3. **Facebook**: Get comments on recent page posts. Apply the same logic as Instagram.
4. **YouTube**: Get comments on the latest 3 videos. Reply to substantive comments.
5. Save a summary note titled "Social Engagement [today's date]" with:
   - 📊 **Engagement Summary**: Mentions, comments, replies sent
   - 🔥 **Hot Topics**: What people are saying most about
   - ⚠️ **Needs Attention**: Negative items flagged for manual review
   - 🎯 **Engagement Rate**: Approximate interaction quality

Do NOT delete or block anyone without permission. Be authentic and on-brand in all replies.`,
    requiredConnections: ["twitter", "instagram"],
  },

  "social-post-all-platforms": {
    id: "social-post-all-platforms",
    goal: `You are running the Cross-Platform Post workflow. Do the following:

1. Ask the user: "What topic would you like to post about? I'll create platform-specific versions."
2. Once provided, generate content adapted for each connected platform:
   - **LinkedIn**: Professional, 150-250 words, thought leadership angle, 3-5 relevant hashtags
   - **Twitter/X**: Punchy hook under 280 characters, optional thread for longer content
   - **Instagram**: Visual storytelling caption with emojis, 20-30 relevant hashtags at the end
   - **Facebook**: Conversational tone, 100-200 words, question or CTA at the end
3. Generate a supporting image using the image generator tool that matches the post theme.
4. Post to ALL connected platforms simultaneously:
   - Create LinkedIn post
   - Send tweet
   - Create Instagram post with the generated image
   - Create Facebook page post
5. Save a note titled "Post Campaign [today's date]" logging what was posted and where.

Present a confirmation summary showing all posted content with links.`,
    requiredConnections: ["linkedin", "twitter", "instagram", "facebook"],
  },

  "social-analytics-report": {
    id: "social-analytics-report",
    goal: `You are running the Social Analytics Report workflow. Gather metrics from all connected platforms:

1. **Twitter/X**: Get profile stats (followers count), get recent timeline to count likes/retweets, check bookmarks for saved content ideas.
2. **Instagram**: Get profile stats (followers, posts), get account insights, check post insights for the last 5 posts to find top performers.
3. **Facebook**: Get page insights, get page details, count recent post engagement.
4. **LinkedIn**: Get profile info, get recent posts and their reactions.
5. **YouTube**: Get channel analytics, list recent videos and their view counts.
6. Compile a comprehensive report and save as a note titled "Social Analytics Report [date]":
   - 📊 **Platform Overview**: Followers/subscribers per platform
   - 🔥 **Top Performing Content**: Best posts across all platforms
   - 📈 **Growth Trends**: Any notable changes
   - 💡 **Content Recommendations**: What type of content is working best
   - 🎯 **Action Items**: Specific suggestions for growth

Also log the raw numbers in a Google Sheet (create a new spreadsheet called "Social Analytics" or append to existing).`,
    requiredConnections: ["twitter", "instagram"],
  },

  "twitter-growth-engine": {
    id: "twitter-growth-engine",
    goal: `You are running the Twitter Growth Engine workflow. Do the following:

1. Search Twitter for trending topics in the user's niche using web search.
2. Get the user's Twitter profile to understand their brand.
3. Get the user's recent timeline to analyze what's performing well.
4. Get liked tweets and bookmarked tweets for content inspiration.
5. Create 3 high-engagement tweets:
   - **Tweet 1**: Hot take or insight on a trending topic (use a hook → value → CTA format)
   - **Tweet 2**: Thread-worthy educational content (send as a reply chain)
   - **Tweet 3**: Engagement bait (question, poll-style, or "help me decide")
6. Like and reply to 5 recent tweets from accounts similar to the user (use search to find them).
7. Save engagement stats and content ideas to notes.

Present what was posted and any engagement opportunities found.`,
    requiredConnections: ["twitter"],
  },

  "instagram-content-machine": {
    id: "instagram-content-machine",
    goal: `You are running the Instagram Content Machine workflow. Do the following:

1. Search the web for trending content in the user's industry.
2. Get the user's Instagram profile and recent media to understand their brand.
3. Check post insights to find top-performing content themes.
4. Generate 3 images using the image generation tool:
   - Image 1: Quote graphic with industry insight
   - Image 2: Product/service showcase style image
   - Image 3: Behind-the-scenes or lifestyle image
5. Create 3 Instagram posts using the generated images with optimized captions:
   - Each caption: Hook (first line), value proposition, call-to-action, 20-30 hashtags
6. Get recent comments and reply to any unanswered ones.
7. Search trending hashtags in the niche and save them as a note for future reference.

Present all created content with engagement optimization tips.`,
    requiredConnections: ["instagram"],
  },

  "linkedin-thought-leader": {
    id: "linkedin-thought-leader",
    goal: `You are running the LinkedIn Thought Leadership workflow. Do the following:

1. Browse the web for the latest industry news, trends, and hot takes.
2. Get the user's LinkedIn profile for positioning context.
3. Get their recent LinkedIn posts to see what resonated.
4. Create 3 LinkedIn posts targeting different engagement types:
   - **Post 1**: Industry insight with a contrarian take (aim for comments/debate)
   - **Post 2**: Personal story or lesson learned (aim for resonance)
   - **Post 3**: Practical tips or framework (aim for saves and shares)
5. Comment thoughtfully on 3 relevant posts found via web search (industry leaders).
6. Save all created content and engagement actions to a note.

Each post should be 150-250 words, use line breaks for readability, and end with a question to drive comments.`,
    requiredConnections: ["linkedin"],
  },

  // ═══════════════════════════════════════════════════════
  // CALENDAR + EMAIL WORKFLOWS
  // ═══════════════════════════════════════════════════════

  "daily-standup": {
    id: "daily-standup",
    goal: `You are running the Daily Standup workflow. Compile a complete daily overview:

1. **Calendar**: List today's events. For each meeting, note the time, attendees, and purpose.
2. **Email**: Get unread count and search for urgent emails from the last 12 hours.
3. **Notes**: Search notes for any active tasks, to-dos, or reminders.
4. Find free time slots today for deep work or catch-up.
5. Compile the standup report:
   - 📅 **Today's Schedule**: All meetings with times and prep notes
   - 📧 **Inbox Status**: Unread count + urgent items
   - 📝 **Active Tasks**: From notes
   - ⏰ **Free Blocks**: Available time for focused work
   - 🎯 **Top 3 Priorities**: What to focus on today based on urgency
6. Save this as a note titled "Daily Standup [date]".

Keep it to a 2-minute read.`,
    requiredConnections: ["gmail", "calendar"],
  },

  "meeting-follow-up": {
    id: "meeting-follow-up",
    goal: `You are running the Meeting Follow-Up workflow. Do the following:

1. **Calendar**: List all events from the past 24 hours (yesterday and today).
2. For each completed meeting:
   - Search emails for any prior communication with attendees
   - Check notes for any existing context about these contacts
3. Draft follow-up emails for each meeting:
   - Thank attendees for their time
   - Summarize key discussion points (use calendar event description if available)
   - List action items
   - Propose next steps or next meeting date
4. Check free slots for the next 5 business days to suggest follow-up meeting times.
5. Save meeting summaries as notes for future reference.
6. Present all draft emails for review — do NOT send without approval.

Create one follow-up email per meeting, ready to send.`,
    requiredConnections: ["gmail", "calendar"],
  },

  "week-planner": {
    id: "week-planner",
    goal: `You are running the Week Planner workflow. Plan the upcoming week:

1. **Calendar**: List events for the next 7 days. Identify busy days vs. open days.
2. **Calendar**: Find free slots across the week for deep work, follow-ups, and personal time.
3. **Email**: Search for any emails mentioning deadlines, due dates, or commitments this week.
4. **Notes**: Search notes for tasks, goals, or priorities that were set previously.
5. Compile the week plan:
   - 📅 **Monday-Friday Overview**: Key meetings and commitments per day
   - 🕐 **Deep Work Blocks**: Recommended focus time slots
   - 📧 **Email Deadlines**: Items due this week
   - 📝 **Carry-Over Tasks**: Unfinished items from notes
   - 🎯 **Weekly Goals**: 3-5 goals based on priorities
   - ⚡ **Quick Wins**: Easy items to knock out early
6. Save as a note titled "Week Plan [date range]".`,
    requiredConnections: ["calendar", "gmail"],
  },

  // ═══════════════════════════════════════════════════════
  // CRM & CONTACTS WORKFLOWS
  // ═══════════════════════════════════════════════════════

  "crm-sync": {
    id: "crm-sync",
    goal: `You are running the CRM Sync workflow. Keep contacts and communications in sync:

1. **Contacts**: List all contacts (up to 50).
2. **Email**: Search sent emails from the last 30 days — extract unique recipients.
3. Cross-reference: Find people you've emailed who are NOT in your contacts.
4. For each missing contact:
   - Create a new contact with their name and email
5. **Email**: For existing contacts, check when you last communicated with them.
6. Compile a relationship health report:
   - 🟢 **Active**: Communicated in the last 7 days
   - 🟡 **Warm**: Communicated in the last 30 days
   - 🔴 **Cold**: No communication in 30+ days
   - ➕ **New Contacts Added**: List of auto-created contacts
7. Flag any important contacts that need re-engagement and draft short check-in emails.
8. Save the report as a note titled "CRM Sync [date]".

Do NOT send any emails — just draft them for review.`,
    requiredConnections: ["gmail"],
  },

  "customer-birthday-checker": {
    id: "customer-birthday-checker",
    goal: `You are running the Customer Birthday & Anniversary Checker workflow:

1. **Contacts**: List all contacts and check for any with birthday fields set.
2. Check if any birthdays are coming up in the next 7 days.
3. For each upcoming birthday:
   - Draft a personalized birthday email
   - If they're on LinkedIn, suggest a birthday post or message
4. Also search emails for any "anniversary" mentions — client anniversaries, subscription renewals, etc.
5. For each anniversary:
   - Draft a congratulatory email with a personal touch
6. Save all findings as a note titled "Birthdays & Milestones [date]".

Present all draft messages for review. Do NOT send without permission.`,
    requiredConnections: ["gmail"],
  },

  // ═══════════════════════════════════════════════════════
  // CONTENT & BRAND WORKFLOWS
  // ═══════════════════════════════════════════════════════

  "brand-mention-monitor": {
    id: "brand-mention-monitor",
    goal: `You are running the Brand Mention Monitor workflow. Track what people say about you:

1. Ask the user for their brand/company name (or use the one from their profile).
2. **Twitter**: Search tweets mentioning the brand name. For positive mentions → like them. Flag negative ones.
3. **Web**: Search Google for recent mentions of the brand name.
4. **Instagram**: Check tagged media — see who tagged the brand in their posts.
5. **YouTube**: Search YouTube for the brand name — any reviews, unboxings, or mentions.
6. **Email**: Search emails for the brand name in case of customer feedback.
7. Compile a Brand Health Report:
   - 📊 **Mention Volume**: How many mentions found across platforms
   - 😊 **Sentiment**: Positive / Neutral / Negative breakdown
   - 🌟 **Top Advocates**: People who mention the brand positively (potential partners)
   - ⚠️ **Negative Alerts**: Issues that need addressing
   - 💡 **PR Opportunities**: Positive mentions worth amplifying
8. Save as a note titled "Brand Monitor [date]".`,
    requiredConnections: ["twitter"],
  },

  "youtube-channel-manager": {
    id: "youtube-channel-manager",
    goal: `You are running the YouTube Channel Manager workflow:

1. **YouTube**: List channels, get channel analytics for the past 28 days.
2. **YouTube**: List recent videos (last 10) with view counts and engagement.
3. **YouTube**: Get comments on the last 5 videos. Reply to substantive comments with thoughtful responses.
4. Identify top-performing videos and analyze what made them successful (topic, title, thumbnail concept).
5. Search the web for trending topics in the user's niche.
6. Generate 3 video title + description suggestions based on what's trending and what works for the channel.
7. Compile a channel report:
   - 📊 **Channel Stats**: Subscribers, total views, watch time
   - 🎬 **Top Performers**: Best videos and why
   - 💬 **Comment Summary**: Key themes from audience feedback
   - 🆕 **Content Ideas**: 3 video concepts with titles
   - ⚠️ **Action Items**: Comments needing replies, community engagement gaps
8. Save as a note titled "YouTube Report [date]".`,
    requiredConnections: ["youtube"],
  },

  "visual-content-batch": {
    id: "visual-content-batch",
    goal: `You are running the Visual Content Batch Creator workflow:

1. Ask the user: "What's your content theme this week? (e.g., 'AI productivity tips', 'spring sale', 'team culture')"
2. Once provided, generate 5 unique images using the image generation tool:
   - Image 1: Eye-catching quote graphic
   - Image 2: Product/service showcase
   - Image 3: Infographic-style tip card
   - Image 4: Motivational or aspirational image
   - Image 5: Behind-the-scenes or casual moment
3. For each image, write captions adapted for:
   - Instagram (visual storytelling + hashtags)
   - Facebook (conversational + question)
   - LinkedIn (professional insight)
4. Save all images and captions as a note titled "Content Batch [date]".
5. Present the complete batch for review before posting.

This gives the user a week's worth of visual social media content in one go.`,
    requiredConnections: [],
    connectionOptional: true,
  },

  // ═══════════════════════════════════════════════════════
  // FINANCE & SPREADSHEET WORKFLOWS
  // ═══════════════════════════════════════════════════════

  "expense-logger": {
    id: "expense-logger",
    goal: `You are running the Expense Logger workflow:

1. **Email**: Search for receipt and invoice emails from the last 7 days (subjects containing "receipt", "invoice", "order confirmation", "payment").
2. Read each email and extract: Date, Vendor, Amount, Category (software, meals, travel, office supplies, etc.).
3. **Sheets**: Check if a spreadsheet called "Expense Tracker" exists (search spreadsheets).
   - If yes → append the new expenses as rows
   - If no → create a new spreadsheet with headers: Date, Vendor, Amount, Category, Notes
4. Calculate totals by category for the week.
5. Present a summary:
   - 💳 **Expenses This Week**: Total spend
   - 📊 **By Category**: Breakdown with amounts
   - 📧 **Source Emails**: Quick reference to each receipt
   - ⚠️ **Large Purchases**: Anything over $100 flagged for review
6. Save the summary as a note titled "Expenses [date range]".

Automate the tedious receipt-to-spreadsheet process.`,
    requiredConnections: ["gmail", "sheets"],
  },

  "revenue-tracker": {
    id: "revenue-tracker",
    goal: `You are running the Revenue Tracker workflow:

1. **Email**: Search for payment confirmations, invoice payments, and deposit notifications from the last 30 days. Look for Stripe, PayPal, Zelle, wire transfer, ACH, and check deposit emails.
2. Extract from each: Date, Client/Source, Amount, Payment Method.
3. **Sheets**: Check if a "Revenue Tracker" spreadsheet exists.
   - If yes → append new revenue entries
   - If no → create one with headers: Date, Client, Amount, Method, Status
4. Calculate:
   - Total revenue this month
   - Average transaction size
   - Top clients by revenue
   - Revenue by payment method
5. Compile a revenue report:
   - 💰 **Monthly Revenue**: Total and comparison note
   - 👥 **Top Clients**: By revenue contribution
   - 📈 **Trend**: Is revenue growing, flat, or declining?
   - 🎯 **Pipeline**: Pending invoices or expected payments
6. Save as a note titled "Revenue Report [month/year]".`,
    requiredConnections: ["gmail", "sheets"],
  },

  // ═══════════════════════════════════════════════════════
  // HR & TEAM WORKFLOWS
  // ═══════════════════════════════════════════════════════

  "hiring-pipeline": {
    id: "hiring-pipeline",
    goal: `You are running the Hiring Pipeline workflow:

1. **Email**: Search for job application emails from the last 14 days — look for "resume", "application", "apply", "cover letter", "job", "position".
2. For each applicant found, extract: Name, Email, Position applied for, Date received.
3. Check for any follow-up emails already sent to each applicant.
4. Categorize applicants:
   - 🆕 **New**: No response sent yet
   - 📧 **In Progress**: Communication ongoing
   - ✅ **Scheduled**: Interview set up
   - ❌ **Rejected**: Decline sent
5. For new applicants without a response:
   - Draft an acknowledgment email thanking them for applying
   - If they look promising, draft an interview scheduling email with free calendar slots
6. **Calendar**: Find free slots for the next 5 days for interviews (30-min blocks).
7. **Sheets**: Log all applicants in a "Hiring Pipeline" spreadsheet.
8. Save as a note titled "Hiring Pipeline [date]".

Do NOT send emails without permission.`,
    requiredConnections: ["gmail", "calendar", "sheets"],
  },

  "team-newsletter": {
    id: "team-newsletter",
    goal: `You are running the Team/Company Newsletter Builder workflow:

1. Gather content from the past week:
   - **Email**: Search for wins, milestones, announcements, and notable customer feedback
   - **Social Media**: Check Instagram, Facebook, LinkedIn for any posts that got high engagement
   - **Notes**: Search for any saved announcements or updates
2. Search the web for relevant industry news (2-3 highlights).
3. Compile a newsletter draft:
   - 📣 **Company Updates**: Big announcements
   - 🏆 **Wins This Week**: Sales, milestones, testimonials
   - 📱 **Social Media Highlights**: Top-performing posts
   - 📰 **Industry News**: Relevant external news
   - 📅 **Upcoming**: Next week's key dates and events
   - 💬 **Quote of the Week**: Motivational or industry-relevant
4. Draft the newsletter as an email (ready to be sent to a mailing list).
5. Save the draft as a note titled "Newsletter [date]".

Present the newsletter for review before sending.`,
    requiredConnections: ["gmail"],
  },

  // ═══════════════════════════════════════════════════════
  // RESEARCH & INTELLIGENCE WORKFLOWS
  // ═══════════════════════════════════════════════════════

  "market-research": {
    id: "market-research",
    goal: `You are running the Market Research workflow. Do the following:

1. Ask the user: "What market, product, or industry should I research?"
2. Perform comprehensive web research:
   - Search for market size, trends, and growth projections
   - Find key players and competitors
   - Look for recent news and disruptions
   - Identify emerging technologies or approaches
3. Search YouTube for recent talks, presentations, or reviews related to the topic.
4. Search Twitter for industry conversations and sentiment.
5. Compile a research report:
   - 📊 **Market Overview**: Size, growth, key trends
   - 🏢 **Key Players**: Top companies and their positions
   - 🆕 **Emerging Trends**: What's new and what's changing
   - 💡 **Opportunities**: Where the user can capitalize
   - ⚠️ **Threats**: What to watch out for
   - 🔗 **Sources**: URLs for further reading
6. Save as a note titled "Market Research: [topic] [date]".`,
    requiredConnections: [],
    connectionOptional: true,
  },

  "seo-audit": {
    id: "seo-audit",
    goal: `You are running the SEO Audit workflow. Do the following:

1. Ask the user: "What website URL should I audit?"
2. Browse the website and analyze:
   - Page title and meta description
   - Heading structure (H1, H2, H3)
   - Content quality and keyword density
   - Page load speed indicators
   - Mobile-friendliness indicators
3. Search Google for the brand/company name to see search visibility.
4. Search for the top 3 target keywords to see competitor rankings.
5. Browse competitor websites for comparison.
6. Compile an SEO report:
   - 📊 **Technical Score**: Title, meta, headings assessment
   - 🔍 **Search Visibility**: How the site appears in Google
   - 🏆 **Competitor Comparison**: Where competitors rank
   - 🎯 **Keyword Opportunities**: Underserved keywords to target
   - ⚠️ **Issues Found**: Technical problems to fix
   - 💡 **Quick Wins**: Easy improvements for fast results
7. Save as a note titled "SEO Audit: [domain] [date]".`,
    requiredConnections: [],
    connectionOptional: true,
  },

  // ═══════════════════════════════════════════════════════
  // DRIVE & DOCUMENT WORKFLOWS
  // ═══════════════════════════════════════════════════════

  "drive-cleanup": {
    id: "drive-cleanup",
    goal: `You are running the Drive Cleanup & Organization workflow:

1. **Drive**: List all files in the root directory.
2. Analyze files for organization issues:
   - Files without clear names
   - Files in the root that should be in folders
   - Very old files (by name/context) that may be obsolete
3. Create an organized folder structure if it doesn't exist:
   - "Documents", "Receipts", "Contracts", "Reports", "Media"
4. Present a cleanup plan:
   - 📂 **Current State**: Number of files, disorganization level
   - 🗂️ **Suggested Organization**: Which files should go where
   - 🗑️ **Archive Candidates**: Old files that might be deletable
   - ✅ **Action Plan**: Steps to organize
5. Save as a note titled "Drive Cleanup Plan [date]".

Do NOT move or delete files without permission — just recommend.`,
    requiredConnections: ["drive"],
  },

  "weekly-file-report": {
    id: "weekly-file-report",
    goal: `You are running the Weekly File & Document Report workflow:

1. **Drive**: List recently created or modified files.
2. **Sheets**: List all spreadsheets to check for recently updated ones.
3. **Email**: Search for email attachments received in the last 7 days.
4. Compile a document activity report:
   - 📄 **New Files**: Recently created documents
   - ✏️ **Modified Files**: Recently edited documents
   - 📎 **Email Attachments**: Files received via email (may need saving to Drive)
   - 📊 **Active Spreadsheets**: Sheets with recent activity
   - 🗂️ **Storage Overview**: General file organization status
5. Suggest any email attachments that should be saved to Drive.
6. Save as a note titled "File Report [date]".`,
    requiredConnections: ["drive", "sheets", "gmail"],
  },

  // ═══════════════════════════════════════════════════════
  // KNOWLEDGE BASE WORKFLOWS
  // ═══════════════════════════════════════════════════════

  "notes-digest": {
    id: "notes-digest",
    goal: `You are running the Notes & Knowledge Base Digest workflow:

1. **Notes**: List all notes in the system.
2. Analyze the knowledge base:
   - Count total notes
   - Identify categories/patterns (meeting notes, tasks, ideas, reports)
   - Find old notes that may be outdated
   - Look for duplicate or overlapping notes
3. Search notes for any action items, to-dos, or follow-ups that haven't been completed.
4. Compile a digest:
   - 📝 **KB Status**: Total notes, last updated dates
   - 🏷️ **Categories**: Notes grouped by type
   - ✅ **Open Action Items**: Tasks found in notes that seem pending
   - 🗑️ **Cleanup Candidates**: Notes that may be obsolete
   - 💡 **Insights**: Patterns and trends in what's being tracked
5. Update any notes that need status changes.

This keeps the knowledge base clean and actionable.`,
    requiredConnections: [],
    connectionOptional: true,
  },

  // ═══════════════════════════════════════════════════════
  // COMBINED POWER WORKFLOWS
  // ═══════════════════════════════════════════════════════

  "full-business-autopilot": {
    id: "full-business-autopilot",
    goal: `You are running the Full Business Autopilot — the most comprehensive daily workflow. Do everything:

1. **EMAIL TRIAGE**:
   - Get unread count and search for urgent emails
   - Categorize inbox: Urgent / Action / FYI / Noise
   - Draft replies for urgent items
2. **CALENDAR CHECK**:
   - List today's meetings with prep notes
   - Find free slots for follow-ups
3. **SOCIAL MEDIA SCAN**:
   - Twitter: Check mentions, like positive ones
   - Instagram: Check latest comments, reply to genuine ones
   - Facebook: Check page comments
   - LinkedIn: Check any notifications via recent posts
4. **CONTENT CREATION**:
   - Generate 1 social media post for the day based on trending topics
   - Create a supporting image
   - Post to the platform with the most engagement recently
5. **NOTES UPDATE**:
   - Create a daily log note with everything accomplished
   - Flag any items needing manual attention
6. Present the full report:
   - 📧 Inbox: [unread count] — [urgent items]
   - 📅 Meetings: [today's schedule]
   - 📱 Social: [engagement summary]
   - 📝 Posted: [what was created]
   - 🎯 Focus: [top 3 priorities for the day]

This is the ultimate "run my business for me" workflow.`,
    requiredConnections: ["gmail", "calendar"],
  },

  "end-of-week-everything": {
    id: "end-of-week-everything",
    goal: `You are running the End-of-Week Everything Report — a comprehensive weekly summary. Do the following:

1. **Email**: Count emails sent and received this week. Highlight key client interactions.
2. **Calendar**: List all meetings that happened this week. Note any action items.
3. **Social Media**: Get engagement stats from all connected platforms this week.
4. **YouTube**: Check channel analytics for the week if connected.
5. **Sheets**: Check any tracking spreadsheets for updates (Revenue, Expenses, etc.).
6. **Notes**: Search for all notes created this week.
7. Compile the ultimate weekly report:
   - 📧 **Communications**: Emails in/out, key threads
   - 📅 **Meetings**: Count, key outcomes
   - 📱 **Social Media**: Followers gained, top posts, engagement rate
   - 💰 **Revenue**: From any payment emails detected
   - 💳 **Expenses**: From any receipt emails detected
   - 📊 **Content Performance**: What content worked best
   - 🏆 **Week's Wins**: Top accomplishments
   - 🎯 **Next Week**: Top priorities and goals
8. Save as a note titled "Weekly Report [date range]".
9. Draft a summary email ready to send to stakeholders or team.

This is the "everything in one place" Friday report.`,
    requiredConnections: ["gmail"],
  },

  // ═══════════════════════════════════════════════════════
  // STANDALONE PLATFORM WORKFLOWS
  // ═══════════════════════════════════════════════════════

  "facebook-page-manager": {
    id: "facebook-page-manager",
    goal: `You are running the Facebook Page Manager workflow. Do the following:

1. **Facebook**: Get the user's page details and page insights.
2. **Facebook**: Get recent page posts and their engagement (likes, comments, shares).
3. **Facebook**: Get comments on the last 5 posts. Reply to genuine comments with helpful, on-brand responses.
4. Analyze which post types perform best (text, photo, video, reel).
5. Search the web for trending topics in the user's niche.
6. Create 2 new posts:
   - **Post 1**: Value-driven post with a question to drive comments
   - **Post 2**: Photo post with an engaging caption
7. Generate an image using the image generation tool for the photo post.
8. Compile a page health report:
   - 📊 **Page Stats**: Followers, reach, engagement rate
   - 🔥 **Top Posts**: Best-performing recent content
   - 💬 **Comments Handled**: Replies sent
   - 📝 **New Content Created**: Posts published
   - 🎯 **Recommendations**: Content strategy suggestions
9. Save as a note titled "Facebook Report [date]".`,
    requiredConnections: ["facebook"],
  },

  "tiktok-scout": {
    id: "tiktok-scout",
    goal: `You are running the TikTok Scout workflow. Do the following:

1. **TikTok**: Get the user's TikTok profile stats (followers, likes, video count).
2. Search the web for trending TikTok sounds, challenges, and content formats right now.
3. Search the web for viral TikTok videos in the user's niche.
4. Analyze what makes the trending content successful (hooks, duration, formats).
5. Generate 5 TikTok video concepts including:
   - **Concept 1**: Trending sound + custom take
   - **Concept 2**: "Day in the life" style
   - **Concept 3**: Quick tips or hacks (under 30 seconds)
   - **Concept 4**: Duet/Stitch response to a viral video
   - **Concept 5**: Before/After or transformation
6. For each concept, provide:
   - Hook (first 2 seconds)
   - Script/outline
   - Suggested hashtags (10-15)
   - Best posting time
7. Compile a TikTok strategy report:
   - 📊 **Profile Status**: Current followers and engagement
   - 🔥 **Trending Now**: Sounds, challenges, formats
   - 🎬 **Content Ideas**: 5 detailed concepts
   - 📈 **Growth Strategy**: Recommendations for growth
8. Save as a note titled "TikTok Strategy [date]".

Note: TikTok posting is currently read-only. Video concepts are prepared for manual upload.`,
    requiredConnections: ["tiktok"],
  },

  "contact-manager": {
    id: "contact-manager",
    goal: `You are running the Contact Manager workflow. Organize and enrich your contacts:

1. **Contacts**: List all contacts (up to 50).
2. Analyze the contact list:
   - Count total contacts
   - Identify contacts without complete information (missing email, phone, company)
   - Look for potential duplicates (similar names or emails)
3. **Email**: Search recent sent emails to find new people you've been communicating with.
4. For each new person not in contacts:
   - Create a new contact with their name and email
5. Cross-reference contacts with social media:
   - Search LinkedIn for professional context on key contacts
   - Note any social media profiles found
6. Compile a contact health report:
   - 👥 **Total Contacts**: Count and breakdown
   - ➕ **New Contacts Added**: From recent emails
   - ⚠️ **Incomplete Profiles**: Contacts missing info
   - 🔄 **Potential Duplicates**: Contacts that might be the same person
   - 🌐 **Social Enrichment**: LinkedIn profiles found
   - 🎯 **VIP Contacts**: Most frequently contacted people
7. Save as a note titled "Contact Manager Report [date]".

Do NOT delete contacts without permission.`,
    requiredConnections: ["gmail"],
  },

  // ═══════════════════════════════════════════════════════
  // NEW GOOGLE SERVICES WORKFLOWS
  // ═══════════════════════════════════════════════════════

  "task-master": {
    id: "task-master",
    goal: `You are running the Task Master workflow. Organize the user's day through Google Tasks:

1. **Tasks**: List all task lists to find the user's default list.
2. **Tasks**: List all pending tasks (not completed) in the default list.
3. **Calendar**: Get today's events to cross-reference with tasks.
4. **Email**: Search for emails containing action items from the last 24 hours (look for phrases like "please", "can you", "need to", "action required").
5. For each email action item not already in Tasks:
   - Create a new Google Task with the action item as the title, email context as notes, and a reasonable due date.
6. Review completed tasks and clear them.
7. Compile a task overview:
   - ✅ **Completed Today**: Tasks marked done
   - 📋 **Active Tasks**: Current to-do list with due dates
   - ➕ **New Tasks Added**: From email action items
   - 📅 **Calendar Alignment**: Tasks that relate to today's meetings
   - 🎯 **Priority Recommendation**: Suggest top 3 tasks to focus on
8. Save as a note titled "Task Master Report [date]".`,
    requiredConnections: ["tasks"],
  },

  "auto-report-generator": {
    id: "auto-report-generator",
    goal: `You are running the Auto Report Generator workflow. Create a professional report as a Google Doc:

1. **Email**: Search for important business-related emails from the past week.
2. **Calendar**: Get this week's completed and upcoming events.
3. **Analytics** (if connected): Pull website traffic data for the past 7 days.
4. **Social Media** (if connected): Get engagement stats from any connected platforms.
5. **Docs**: Create a new Google Doc titled "Weekly Business Report - [date range]".
6. **Docs**: Append a structured report with these sections:
   - **📈 Executive Summary**: 2-3 sentence overview of the week
   - **📧 Key Communications**: Important email threads and outcomes
   - **📅 Meetings & Events**: Summary of meetings attended/scheduled
   - **🌐 Website Performance**: Traffic, top pages, trends (if Analytics connected)
   - **📱 Social Media**: Engagement highlights (if social connected)
   - **🎯 Action Items**: Tasks carried forward into next week
   - **💡 Recommendations**: Data-driven suggestions for improvement
7. Share the Google Doc link.
8. Save the doc URL as a note titled "Weekly Report Doc [date]".`,
    requiredConnections: ["docs"],
  },

  "review-guardian": {
    id: "review-guardian",
    goal: `You are running the Review Guardian workflow. Monitor and respond to Google Business reviews:

1. **Business Profile**: List the user's business accounts.
2. **Business Profile**: List locations for each account.
3. **Business Profile**: Get reviews for each location.
4. Analyze all new reviews (last 48 hours):
   - Categorize by sentiment: Positive (4-5 stars), Neutral (3 stars), Negative (1-2 stars)
   - Identify common themes in feedback
5. For each UNREPLIED review:
   - **Positive**: Craft a warm, personalized thank-you reply mentioning specifics from their review
   - **Negative**: Craft an empathetic, professional response acknowledging their concern, apologizing, and offering to make it right (suggest contacting directly)
   - **Neutral**: Thank them and ask how you could improve
6. **Business Profile**: Post replies to all un-replied reviews.
7. **Email**: Send the business owner a digest of new reviews.
8. Compile a review health report:
   - ⭐ **Average Rating**: Overall and trend
   - 📊 **Review Volume**: Count by star rating
   - 💬 **Replies Sent**: Summary of responses posted
   - ⚠️ **Concerns Flagged**: Recurring negative themes
   - 🎯 **Recommendations**: How to improve ratings
9. Save as a note titled "Review Guardian Report [date]".`,
    requiredConnections: ["business"],
  },

  "website-performance": {
    id: "website-performance",
    goal: `You are running the Website Performance workflow. Analyze Google Analytics data:

1. **Analytics**: List all GA4 properties to find the user's website.
2. **Analytics**: Run a report for the last 30 days with:
   - Dimensions: pagePath, country, deviceCategory, sessionSource
   - Metrics: screenPageViews, sessions, activeUsers, bounceRate, averageSessionDuration
3. **Analytics**: Run a comparison report (last 30 days vs previous 30 days) for overall trends.
4. **Analytics**: Get real-time active users right now.
5. Analyze the data:
   - Top 10 pages by views
   - Traffic by device (mobile vs desktop vs tablet)
   - Top traffic sources (organic, direct, social, referral)
   - Geographic distribution
   - Bounce rate analysis
6. **Sheets** (if connected): Log this week's key metrics to a tracking spreadsheet.
7. Compile a performance report:
   - 👥 **Active Now**: Real-time visitors
   - 📊 **Traffic Summary**: Total views, sessions, users (with % change)
   - 🏆 **Top Pages**: Best-performing content
   - 📱 **Device Split**: Mobile vs Desktop breakdown
   - 🌍 **Geographic Reach**: Top countries
   - 🔗 **Traffic Sources**: Where visitors come from
   - 📈 **Trends**: Up or down vs previous period
   - 🎯 **Recommendations**: SEO and content suggestions
8. Save as a note titled "Website Performance [date]".`,
    requiredConnections: ["analytics"],
  },

  "survey-creator": {
    id: "survey-creator",
    goal: `You are running the Survey Creator workflow. Build and distribute a customer feedback form:

1. Ask yourself: What kind of survey does the business likely need? (Customer satisfaction, NPS, product feedback, event feedback)
2. **Forms**: Create a new Google Form titled "Customer Feedback Survey - [Business Name]".
3. **Forms**: Add these questions:
   - Q1: "How would you rate your overall experience?" (SCALE 1-5)
   - Q2: "What did we do well?" (PARAGRAPH)
   - Q3: "How could we improve?" (PARAGRAPH)
   - Q4: "How likely are you to recommend us?" (SCALE 1-10, NPS)
   - Q5: "Which of our services did you use?" (MULTIPLE_CHOICE with relevant options)
   - Q6: "Would you like us to follow up?" (MULTIPLE_CHOICE: Yes/No)
   - Q7: "Your email (optional)" (SHORT_ANSWER)
4. **Forms**: Get the form to confirm structure and get the share URL.
5. **Email**: Draft a polished email inviting customers to complete the survey, including the form URL.
6. Share the form URL and draft email.
7. Save form details as a note titled "Survey - [date]".

Note: Do NOT send the email without user approval. Just draft it.`,
    requiredConnections: ["forms"],
  },

  "pitch-deck-builder": {
    id: "pitch-deck-builder",
    goal: `You are running the Pitch Deck Builder workflow. Create a professional presentation EFFICIENTLY.

IMPORTANT: Be fast — create the presentation, add ALL slides first, THEN insert text into each. Do NOT search the web unless absolutely necessary. Use info from user memory.

1. Create a new presentation titled "[Business Name] - Overview".
2. Add exactly 4 slides (use layout TITLE_AND_BODY for all).
3. Insert text for each slide:
   - Slide 1: Problem & Solution — what pain point you solve and your approach
   - Slide 2: Key Features — top 3-5 differentiators with bullet points
   - Slide 3: Market & Business Model — target market size and how you make money
   - Slide 4: Contact & Next Steps — call to action
4. Share the presentation URL with the user.

Be concise in slide text. Use bullet points. Complete this as fast as possible.`,
    requiredConnections: ["slides"],
  },

  "meeting-minutes-doc": {
    id: "meeting-minutes-doc",
    goal: `You are running the Meeting Minutes Doc workflow. Auto-create Google Docs for meetings:

1. **Calendar**: Get today's events.
2. For each meeting that has already occurred or is currently happening:
   - **Docs**: Create a new Google Doc titled "[Meeting Name] - Minutes [date]"
   - **Docs**: Append a structured template:
     ## Meeting: [Name]
     **Date**: [date and time]
     **Attendees**: [from calendar event]
     **Agenda**: [from event description if available]
     
     ### Discussion Notes
     [placeholder for notes]
     
     ### Action Items
     - [ ] [placeholder]
     
     ### Decisions Made
     - [placeholder]
     
     ### Next Steps
     - [placeholder]
3. **Email**: Send each meeting's attendees the doc link.
4. **Tasks**: Create follow-up tasks from the action items template.
5. Compile summary of docs created.
6. Save links as a note titled "Meeting Docs [date]".`,
    requiredConnections: ["docs", "calendar"],
  },

  "client-feedback-analyzer": {
    id: "client-feedback-analyzer",
    goal: `You are running the Client Feedback Analyzer workflow:

1. **Forms**: Check for any connected forms and get recent responses.
2. **Business Profile** (if connected): Get recent Google reviews.
3. **Email**: Search for emails containing feedback keywords (feedback, review, suggest, complaint, love, hate, improve).
4. Analyze ALL feedback sources:
   - Sentiment distribution (positive/neutral/negative)
   - Top recurring themes
   - Most requested improvements
   - Biggest strengths mentioned
5. **Docs**: Create a Google Doc titled "Client Feedback Analysis - [date]" with:
   - Executive summary
   - Sentiment breakdown with percentages
   - Theme analysis
   - Verbatim quotes (top 5 positive, top 5 negative)
   - Actionable recommendations
6. **Sheets** (if connected): Log sentiment scores to a tracking spreadsheet.
7. Share the analysis doc link.
8. Save as a note titled "Feedback Analysis [date]".`,
    requiredConnections: ["forms"],
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
