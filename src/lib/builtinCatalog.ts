/**
 * Built-in Catalog
 *
 * Pre-installed, fully trained and tested Tools, Skills, and Workflows
 * available to ALL users. Hard-coded — cannot be edited or deleted by users.
 * Distinct from user's Custom items stored in Firestore.
 *
 * Covers 12 Google product areas:
 * Gmail · Drive · Docs · Sheets · Slides · Calendar · Forms · Tasks ·
 * Analytics · Meet · Maps · Chrome/Browser
 */

export interface BuiltinTool {
  id: string;
  name: string;
  description: string;
  toolNames: string[];
  requiredConnections: string[];
  category:
    | "email" | "sheets" | "research" | "calendar" | "docs" | "social"
    | "drive" | "slides" | "forms" | "tasks" | "analytics" | "maps" | "meet" | "ai";
  icon: string;
}

export interface BuiltinSkill {
  id: string;
  name: string;
  description: string;
  toolIds: string[];
  requiredConnections: string[];
  category:
    | "productivity" | "sales" | "content" | "research" | "reporting"
    | "docs" | "sheets" | "slides" | "forms" | "tasks" | "analytics"
    | "email" | "drive" | "calendar" | "maps" | "meet";
  icon: string;
}

export interface BuiltinWorkflow {
  id: string;
  name: string;
  description: string;
  workflowDefinitionId: string;
  requiredConnections: string[];
  category:
    | "daily" | "email" | "social" | "sales" | "reporting" | "content"
    | "calendar" | "docs" | "analytics" | "onboarding" | "project";
  icon: string;
}

// ─── BUILT-IN TOOLS ──────────────────────────────────────────────────────────

export const BUILTIN_TOOLS: BuiltinTool[] = [
  // Gmail
  { id: "builtin-search-gmail", name: "Search Gmail Inbox", description: "Search for emails by keyword, sender, subject, or date range.", toolNames: ["search_emails"], requiredConnections: ["gmail"], category: "email", icon: "📧" },
  { id: "builtin-send-email", name: "Send Email", description: "Compose and send an email via Gmail. Supports To, CC, Subject, body, and reply-to-thread.", toolNames: ["send_email", "reply_to_email"], requiredConnections: ["gmail"], category: "email", icon: "📤" },
  { id: "builtin-read-email", name: "Read & Summarize Email", description: "Read the full content of an email and produce a concise summary with action items.", toolNames: ["get_email"], requiredConnections: ["gmail"], category: "email", icon: "📨" },
  { id: "builtin-email-triage", name: "Email Triage", description: "List unread emails, categorize by urgency, and mark as read.", toolNames: ["list_emails", "get_unread_count", "mark_as_read", "archive_email"], requiredConnections: ["gmail"], category: "email", icon: "📬" },
  // Drive
  { id: "builtin-search-drive", name: "Search Google Drive", description: "Search for files and documents in Google Drive by name, type, or keyword.", toolNames: ["list_files", "get_file"], requiredConnections: ["drive"], category: "drive", icon: "🗂️" },
  { id: "builtin-drive-organizer", name: "Drive Organizer", description: "Create folders, move files, and rename items to organize your Google Drive structure.", toolNames: ["create_folder", "move_file", "rename_file", "copy_file"], requiredConnections: ["drive"], category: "drive", icon: "📁" },
  { id: "builtin-drive-sharer", name: "Share Files & Set Permissions", description: "Share Drive files or folders with specific people or make them public.", toolNames: ["share_file", "get_file"], requiredConnections: ["drive"], category: "drive", icon: "🔗" },
  { id: "builtin-drive-uploader", name: "Upload to Drive", description: "Upload files to Google Drive and get a shareable link.", toolNames: ["upload_file", "share_file"], requiredConnections: ["drive"], category: "drive", icon: "⬆️" },
  // Docs
  { id: "builtin-create-doc", name: "Create Google Doc", description: "Create a new Google Doc with formatted content.", toolNames: ["create_document"], requiredConnections: ["docs"], category: "docs", icon: "📄" },
  { id: "builtin-read-doc", name: "Read & Analyze Document", description: "Read a Google Doc's full content including underlined fields, and analyze or summarize it.", toolNames: ["get_document"], requiredConnections: ["docs"], category: "docs", icon: "🔍" },
  { id: "builtin-edit-doc", name: "Edit Document Content", description: "Find and replace text, append content, prepend content, or rewrite a Google Doc entirely.", toolNames: ["get_document", "replace_doc_text", "append_doc_text", "prepend_doc_text", "write_document"], requiredConnections: ["docs"], category: "docs", icon: "✏️" },
  { id: "builtin-fill-template", name: "Fill Template Fields", description: "Detect underlined placeholder fields in a template document and replace them with real data.", toolNames: ["get_document", "replace_underlined_text", "replace_doc_text"], requiredConnections: ["docs"], category: "docs", icon: "📝" },
  { id: "builtin-create-pdf", name: "Create PDF Report", description: "Generate a formatted PDF document and save it to Google Drive with a shareable link.", toolNames: ["create_pdf"], requiredConnections: [], category: "docs", icon: "📑" },
  // Sheets
  { id: "builtin-read-sheet", name: "Read Google Sheet", description: "Read data from a Google Sheets tab. Returns all rows and columns as structured data.", toolNames: ["read_sheet", "get_spreadsheet_info"], requiredConnections: ["sheets"], category: "sheets", icon: "📊" },
  { id: "builtin-write-sheet", name: "Write to Google Sheet", description: "Write or update data in a Google Sheet. Overwrites a range or appends new rows.", toolNames: ["write_sheet", "append_rows"], requiredConnections: ["sheets"], category: "sheets", icon: "✏️" },
  { id: "builtin-format-sheet", name: "Format Google Sheet", description: "Apply formatting — bold headers, colors, freeze rows, resize columns, merge cells.", toolNames: ["format_row", "format_cells", "freeze_rows", "freeze_columns", "auto_resize_columns", "set_column_width"], requiredConnections: ["sheets"], category: "sheets", icon: "🎨" },
  { id: "builtin-create-sheet", name: "Create Spreadsheet", description: "Create a brand new Google Sheets file with one or more named tabs.", toolNames: ["create_spreadsheet", "add_sheet"], requiredConnections: ["sheets"], category: "sheets", icon: "📋" },
  { id: "builtin-sheet-manager", name: "Manage Sheet Tabs", description: "Add, delete, rename, duplicate, or sort sheets within a Google Sheets file.", toolNames: ["add_sheet", "delete_sheet", "rename_sheet", "duplicate_sheet", "sort_range"], requiredConnections: ["sheets"], category: "sheets", icon: "🗂️" },
  // Slides
  { id: "builtin-create-presentation", name: "Create Presentation", description: "Create a new Google Slides presentation and add slides with layouts and content.", toolNames: ["create_presentation", "add_presentation_slide", "insert_slide_text"], requiredConnections: ["slides"], category: "slides", icon: "🎯" },
  { id: "builtin-read-presentation", name: "Read Presentation", description: "Read an existing Google Slides presentation structure, slide count, and content.", toolNames: ["get_presentation"], requiredConnections: ["slides"], category: "slides", icon: "👁️" },
  // Calendar
  { id: "builtin-search-calendar", name: "Search Calendar Events", description: "Find upcoming calendar events. Filter by date range, keyword, or attendee.", toolNames: ["list_events", "get_event"], requiredConnections: ["calendar"], category: "calendar", icon: "📅" },
  { id: "builtin-create-event", name: "Create Calendar Event", description: "Schedule a new event with title, date/time, location, attendees, and recurrence.", toolNames: ["create_event"], requiredConnections: ["calendar"], category: "calendar", icon: "➕" },
  { id: "builtin-calendar-manager", name: "Manage Calendar Events", description: "Update, delete, or find free time slots on Google Calendar.", toolNames: ["update_event", "delete_event", "find_free_slots"], requiredConnections: ["calendar"], category: "calendar", icon: "🗓️" },
  // Forms
  { id: "builtin-create-form", name: "Create Google Form", description: "Build a Google Form with multiple question types: short answer, multiple choice, checkboxes, scales.", toolNames: ["create_google_form", "add_form_question"], requiredConnections: ["forms"], category: "forms", icon: "📋" },
  { id: "builtin-read-form", name: "Read Form & Responses", description: "Read a Google Form's questions and collect all submitted responses for analysis.", toolNames: ["get_google_form", "get_form_responses"], requiredConnections: ["forms"], category: "forms", icon: "📥" },
  // Analytics
  { id: "builtin-analytics-report", name: "Run Analytics Report", description: "Pull Google Analytics 4 data: sessions, page views, bounce rate, conversions by date range.", toolNames: ["list_analytics_properties", "run_analytics_report"], requiredConnections: ["analytics"], category: "analytics", icon: "📈" },
  { id: "builtin-realtime-analytics", name: "Real-Time Analytics", description: "Check how many people are on your website right now with live GA4 data.", toolNames: ["get_realtime_analytics"], requiredConnections: ["analytics"], category: "analytics", icon: "⚡" },
  // Research / Browser
  { id: "builtin-web-search", name: "Web Search", description: "Quick factual web search. Returns titles, URLs, and snippets from top results.", toolNames: ["web_search"], requiredConnections: [], category: "research", icon: "🔍" },
  { id: "builtin-deep-research", name: "Deep Research", description: "Comprehensive multi-source research. Runs 5+ parallel searches, reads pages, and produces a detailed report.", toolNames: ["deep_research"], requiredConnections: [], category: "research", icon: "🧠" },
  { id: "builtin-browse-url", name: "Browse Web Page", description: "Read the content of a specific URL. Extracts text from any publicly accessible web page.", toolNames: ["browse_url"], requiredConnections: [], category: "research", icon: "🌐" },
  // Social
  { id: "builtin-post-linkedin", name: "Post to LinkedIn", description: "Publish a post to the user's LinkedIn profile. Supports text up to 3,000 characters.", toolNames: ["create_linkedin_post"], requiredConnections: ["linkedin"], category: "social", icon: "💼" },
  { id: "builtin-post-twitter", name: "Post to Twitter / X", description: "Publish a tweet to the user's Twitter/X account. Supports up to 280 characters.", toolNames: ["post_tweet"], requiredConnections: ["twitter"], category: "social", icon: "🐦" },
  { id: "builtin-post-instagram", name: "Post to Instagram", description: "Publish a caption and image to the user's Instagram account.", toolNames: ["create_instagram_post"], requiredConnections: ["instagram"], category: "social", icon: "📸" },
];

// ─── BUILT-IN SKILLS ─────────────────────────────────────────────────────────

export const BUILTIN_SKILLS: BuiltinSkill[] = [
  // Gmail
  { id: "builtin-skill-draft-send-email", name: "Draft & Send Professional Email", description: "Compose a polished, professional email from a brief or talking points and send it immediately.", toolIds: ["builtin-send-email"], requiredConnections: ["gmail"], category: "email", icon: "✍️" },
  { id: "builtin-skill-email-triage", name: "Email Triage & Prioritize", description: "Scan the inbox, categorize emails by urgency (Urgent / Action / FYI / Noise), and surface what needs attention now.", toolIds: ["builtin-email-triage", "builtin-read-email"], requiredConnections: ["gmail"], category: "email", icon: "📬" },
  { id: "builtin-skill-email-summary", name: "Email Thread Summary", description: "Read an email thread from start to finish and produce a structured summary with key decisions and action items.", toolIds: ["builtin-read-email", "builtin-search-gmail"], requiredConnections: ["gmail"], category: "email", icon: "📋" },
  { id: "builtin-skill-follow-up", name: "Follow-Up Email", description: "Search for a prior email thread, understand the context, and draft a professional follow-up.", toolIds: ["builtin-search-gmail", "builtin-read-email", "builtin-send-email"], requiredConnections: ["gmail"], category: "email", icon: "🔄" },
  { id: "builtin-skill-email-campaign", name: "Personalized Email Campaign", description: "Search Gmail for context on a recipient, draft a personalized message, and send it.", toolIds: ["builtin-search-gmail", "builtin-read-email", "builtin-send-email"], requiredConnections: ["gmail"], category: "sales", icon: "📬" },
  { id: "builtin-skill-meeting-invite-email", name: "Meeting Request Email", description: "Draft and send a professional meeting request email with proposed times, agenda, and location.", toolIds: ["builtin-search-calendar", "builtin-send-email"], requiredConnections: ["gmail", "calendar"], category: "email", icon: "📆" },
  // Drive
  { id: "builtin-skill-file-finder", name: "File Finder", description: "Search Google Drive for a document or file by name, type, or keyword and return the link.", toolIds: ["builtin-search-drive"], requiredConnections: ["drive"], category: "drive", icon: "🔍" },
  { id: "builtin-skill-folder-creator", name: "Folder Structure Creator", description: "Create a structured folder hierarchy in Google Drive for a project, client, or department.", toolIds: ["builtin-drive-organizer"], requiredConnections: ["drive"], category: "drive", icon: "📁" },
  { id: "builtin-skill-file-organizer", name: "File Organization Sprint", description: "Audit a Drive folder, rename files to a consistent format, and move them into the right subfolders.", toolIds: ["builtin-search-drive", "builtin-drive-organizer"], requiredConnections: ["drive"], category: "drive", icon: "🗂️" },
  { id: "builtin-skill-share-files", name: "Share & Permissions Manager", description: "Share specific Drive files or folders with a person or group and set appropriate access levels.", toolIds: ["builtin-drive-sharer"], requiredConnections: ["drive"], category: "drive", icon: "🔗" },
  { id: "builtin-skill-file-inventory", name: "File Inventory & Audit", description: "List all files in a Drive folder, summarize their types and sizes, and flag anything unusual.", toolIds: ["builtin-search-drive"], requiredConnections: ["drive"], category: "drive", icon: "📦" },
  // Docs
  { id: "builtin-skill-template-filler", name: "Template Field Replacer", description: "Open a document, detect all underlined placeholder fields, and replace them with provided data. Works on contracts, agreements, and forms.", toolIds: ["builtin-fill-template"], requiredConnections: ["docs"], category: "docs", icon: "📝" },
  { id: "builtin-skill-doc-writer", name: "Document Writer", description: "Draft a complete, well-structured document from a brief or outline. Creates the doc and writes full content.", toolIds: ["builtin-create-doc", "builtin-edit-doc"], requiredConnections: ["docs"], category: "docs", icon: "✍️" },
  { id: "builtin-skill-doc-summarizer", name: "Document Summarizer", description: "Read a Google Doc and produce a structured executive summary with key points and action items.", toolIds: ["builtin-read-doc"], requiredConnections: ["docs"], category: "docs", icon: "📋" },
  { id: "builtin-skill-contract-filler", name: "Contract & Agreement Filler", description: "Open a contract or legal document, identify fill-in fields, and populate them with the provided party details.", toolIds: ["builtin-fill-template", "builtin-read-doc"], requiredConnections: ["docs"], category: "docs", icon: "📜" },
  { id: "builtin-skill-report-doc", name: "Report Generator", description: "Create a formatted report document with a title, executive summary, numbered sections, and conclusion.", toolIds: ["builtin-create-doc", "builtin-edit-doc"], requiredConnections: ["docs"], category: "docs", icon: "📄" },
  { id: "builtin-skill-doc-editor", name: "Document Editor & Proofreader", description: "Read a document, identify areas for improvement, and rewrite or edit sections for clarity and professionalism.", toolIds: ["builtin-read-doc", "builtin-edit-doc"], requiredConnections: ["docs"], category: "docs", icon: "✏️" },
  // Sheets
  { id: "builtin-skill-data-entry", name: "Data Entry & Logging", description: "Structure provided data into rows and write it to a specified Google Sheet with proper column headers.", toolIds: ["builtin-write-sheet", "builtin-format-sheet"], requiredConnections: ["sheets"], category: "sheets", icon: "🗃️" },
  { id: "builtin-skill-sheet-reader", name: "Sheet Reader & Summarizer", description: "Read a Google Sheet and produce a clear summary of its data, key metrics, and trends.", toolIds: ["builtin-read-sheet"], requiredConnections: ["sheets"], category: "sheets", icon: "📊" },
  { id: "builtin-skill-report-sheet", name: "Report Sheet Builder", description: "Create a formatted, professional report spreadsheet with bold headers, data, auto-sized columns, and totals.", toolIds: ["builtin-create-sheet", "builtin-write-sheet", "builtin-format-sheet"], requiredConnections: ["sheets"], category: "sheets", icon: "📈" },
  { id: "builtin-skill-dashboard", name: "Dashboard Creator", description: "Build a multi-tab Google Sheets dashboard with a summary tab, raw data tab, and formatted sections.", toolIds: ["builtin-create-sheet", "builtin-write-sheet", "builtin-format-sheet", "builtin-sheet-manager"], requiredConnections: ["sheets"], category: "sheets", icon: "🖥️" },
  { id: "builtin-skill-data-validator", name: "Data Validator & Cleaner", description: "Read a sheet's data and identify blank cells, inconsistent formats, duplicates, or errors.", toolIds: ["builtin-read-sheet"], requiredConnections: ["sheets"], category: "sheets", icon: "✅" },
  { id: "builtin-skill-lookup-update", name: "Row Finder & Updater", description: "Find a specific row in a sheet by a key value (name, ID, email) and update one or more cells.", toolIds: ["builtin-read-sheet", "builtin-write-sheet"], requiredConnections: ["sheets"], category: "sheets", icon: "🔎" },
  { id: "builtin-skill-sheet-to-email", name: "Sheet to Email Summary", description: "Read a Google Sheet, summarize the data into a formatted email, and send it to specified recipients.", toolIds: ["builtin-read-sheet", "builtin-send-email"], requiredConnections: ["sheets", "gmail"], category: "reporting", icon: "📧" },
  { id: "builtin-skill-spreadsheet-report", name: "Spreadsheet Reporter", description: "Read a Google Sheet, format the header row, auto-resize columns, then email the sheet as a report.", toolIds: ["builtin-read-sheet", "builtin-format-sheet", "builtin-send-email"], requiredConnections: ["sheets", "gmail"], category: "reporting", icon: "📈" },
  // Slides
  { id: "builtin-skill-presentation-builder", name: "Presentation Builder", description: "Create a multi-slide Google Slides presentation from an outline or brief. Includes title, content slides, and closing.", toolIds: ["builtin-create-presentation"], requiredConnections: ["slides"], category: "slides", icon: "🎯" },
  { id: "builtin-skill-pitch-deck", name: "Pitch Deck Creator", description: "Build a professional business pitch deck with Problem, Solution, Market, Team, Traction, and Ask slides.", toolIds: ["builtin-create-presentation"], requiredConnections: ["slides"], category: "slides", icon: "🚀" },
  { id: "builtin-skill-meeting-deck", name: "Meeting Deck Creator", description: "Create an agenda and status presentation for a team meeting with agenda, updates, decisions, and next steps slides.", toolIds: ["builtin-create-presentation", "builtin-search-calendar"], requiredConnections: ["slides", "calendar"], category: "slides", icon: "📊" },
  { id: "builtin-skill-slide-updater", name: "Slide Updater", description: "Open an existing presentation and add new slides or update existing content.", toolIds: ["builtin-read-presentation", "builtin-create-presentation"], requiredConnections: ["slides"], category: "slides", icon: "✏️" },
  // Calendar
  { id: "builtin-skill-meeting-scheduler", name: "Meeting Scheduler", description: "Find available time slots and create a calendar event with attendees, location, and agenda.", toolIds: ["builtin-calendar-manager", "builtin-create-event"], requiredConnections: ["calendar"], category: "calendar", icon: "📅" },
  { id: "builtin-skill-week-planner", name: "Week Planner", description: "Review the upcoming week's calendar events and produce a structured day-by-day schedule summary.", toolIds: ["builtin-search-calendar"], requiredConnections: ["calendar"], category: "calendar", icon: "🗓️" },
  { id: "builtin-skill-event-creator", name: "Event Creator", description: "Create a detailed calendar event from a brief — sets title, time, location, description, and invites.", toolIds: ["builtin-create-event"], requiredConnections: ["calendar"], category: "calendar", icon: "➕" },
  { id: "builtin-skill-availability-checker", name: "Availability Checker", description: "Check a calendar for free time windows during business hours and suggest the best slots for a meeting.", toolIds: ["builtin-calendar-manager"], requiredConnections: ["calendar"], category: "calendar", icon: "🕐" },
  { id: "builtin-skill-meeting-notes-prep", name: "Meeting Notes Preparer", description: "Read upcoming meeting details and draft an agenda + blank notes template in a Google Doc.", toolIds: ["builtin-search-calendar", "builtin-create-doc"], requiredConnections: ["calendar", "docs"], category: "calendar", icon: "🤝" },
  // Forms
  { id: "builtin-skill-survey-builder", name: "Survey Builder", description: "Create a multi-question Google Form survey from a topic brief with rating scales and open text questions.", toolIds: ["builtin-create-form"], requiredConnections: ["forms"], category: "forms", icon: "📋" },
  { id: "builtin-skill-intake-form", name: "Intake Form Creator", description: "Build a structured intake or onboarding form with contact info, preferences, and custom questions.", toolIds: ["builtin-create-form"], requiredConnections: ["forms"], category: "forms", icon: "📥" },
  { id: "builtin-skill-response-collector", name: "Response Collector & Analyzer", description: "Read all responses submitted to a Google Form and produce a summary of results with key insights.", toolIds: ["builtin-read-form"], requiredConnections: ["forms"], category: "forms", icon: "📊" },
  { id: "builtin-skill-quiz-creator", name: "Quiz Creator", description: "Build a scored knowledge quiz in Google Forms with multiple choice questions and answer options.", toolIds: ["builtin-create-form"], requiredConnections: ["forms"], category: "forms", icon: "❓" },
  // Analytics
  { id: "builtin-skill-traffic-report", name: "Traffic Report", description: "Pull Google Analytics data for sessions, users, page views, and bounce rate for a specified period.", toolIds: ["builtin-analytics-report"], requiredConnections: ["analytics"], category: "analytics", icon: "📊" },
  { id: "builtin-skill-top-pages", name: "Top Pages Analysis", description: "Identify the best-performing pages on the website by sessions, time on page, and conversion events.", toolIds: ["builtin-analytics-report"], requiredConnections: ["analytics"], category: "analytics", icon: "🏆" },
  { id: "builtin-skill-audience-report", name: "Audience Breakdown", description: "Analyze visitor demographics, device breakdown, geography, and behavior patterns from GA4.", toolIds: ["builtin-analytics-report"], requiredConnections: ["analytics"], category: "analytics", icon: "👥" },
  { id: "builtin-skill-analytics-dashboard", name: "Analytics Performance Dashboard", description: "Pull key GA4 metrics and compile them into a readable weekly or monthly performance summary.", toolIds: ["builtin-analytics-report", "builtin-realtime-analytics", "builtin-write-sheet"], requiredConnections: ["analytics", "sheets"], category: "analytics", icon: "📈" },
  // Research & Browser
  { id: "builtin-skill-lead-research", name: "Lead Research", description: "Research a lead: web search their company, search Gmail for prior contact, and log findings to a Google Sheet.", toolIds: ["builtin-web-search", "builtin-search-gmail", "builtin-write-sheet"], requiredConnections: ["gmail", "sheets"], category: "sales", icon: "🎯" },
  { id: "builtin-skill-competitor-research", name: "Competitor Intelligence", description: "Deep research a competitor, browse their website, and log findings to a Google Sheet.", toolIds: ["builtin-deep-research", "builtin-browse-url", "builtin-write-sheet"], requiredConnections: ["sheets"], category: "research", icon: "🔭" },
  { id: "builtin-skill-web-research", name: "Web Research Sprint", description: "Research a topic across multiple sources, browse key pages, and produce a structured research report.", toolIds: ["builtin-deep-research", "builtin-browse-url"], requiredConnections: [], category: "research", icon: "🧠" },
  { id: "builtin-skill-page-summarizer", name: "Web Page Summarizer", description: "Open a URL and produce a structured summary of the page content, key points, and important data.", toolIds: ["builtin-browse-url"], requiredConnections: [], category: "research", icon: "🌐" },
  // Cross-product Productivity
  { id: "builtin-skill-morning-briefing", name: "Morning Briefing Prep", description: "Check today's calendar events, scan Gmail for urgent emails, and search for priority news.", toolIds: ["builtin-search-calendar", "builtin-search-gmail", "builtin-web-search"], requiredConnections: ["calendar", "gmail"], category: "productivity", icon: "☀️" },
  { id: "builtin-skill-meeting-prep", name: "Meeting Preparation", description: "Search calendar for upcoming meetings, research attendees in Gmail, and compile a meeting brief document.", toolIds: ["builtin-search-calendar", "builtin-search-gmail", "builtin-deep-research", "builtin-create-doc"], requiredConnections: ["calendar", "gmail", "docs"], category: "productivity", icon: "🤝" },
  { id: "builtin-skill-content-publishing", name: "Content Publishing", description: "Research a topic, then publish platform-specific posts to LinkedIn, Twitter/X, and Instagram.", toolIds: ["builtin-deep-research", "builtin-post-linkedin", "builtin-post-twitter", "builtin-post-instagram"], requiredConnections: ["linkedin", "twitter", "instagram"], category: "content", icon: "📢" },
];

// ─── BUILT-IN WORKFLOWS ───────────────────────────────────────────────────────

export const BUILTIN_WORKFLOWS: BuiltinWorkflow[] = [
  { id: "builtin-wf-morning-briefing", name: "Morning Briefing", description: "Scan unread emails, check today's calendar, surface priority news, and present a daily briefing with suggested priorities.", workflowDefinitionId: "morning-briefing", requiredConnections: ["gmail", "calendar"], category: "daily", icon: "☀️" },
  { id: "builtin-wf-eod-wrapup", name: "End-of-Day Wrap-Up", description: "Comprehensive daily summary across all connected services — emails, meetings, tasks, and progress.", workflowDefinitionId: "eod-wrapup", requiredConnections: ["gmail"], category: "daily", icon: "🌙" },
  { id: "builtin-wf-inbox-commander", name: "Inbox Commander", description: "Categorize all unread emails as Urgent / Action Needed / FYI / Noise with recommended next steps.", workflowDefinitionId: "inbox-commander", requiredConnections: ["gmail"], category: "email", icon: "📥" },
  { id: "builtin-wf-revenue-tracker", name: "Revenue Tracker", description: "Search Gmail for invoice and payment emails, extract amounts and dates, and update a revenue sheet.", workflowDefinitionId: "revenue-tracker", requiredConnections: ["gmail", "sheets"], category: "email", icon: "💰" },
  { id: "builtin-wf-meeting-prep", name: "Meeting Prep", description: "Research upcoming meetings, review past email threads with attendees, and generate briefing notes in a Doc.", workflowDefinitionId: "meeting-prep", requiredConnections: ["gmail", "calendar", "docs"], category: "calendar", icon: "📋" },
  { id: "builtin-wf-meeting-follow-up", name: "Meeting Follow-Up", description: "After a meeting, draft follow-up emails, create action item lists, and schedule next steps.", workflowDefinitionId: "meeting-follow-up", requiredConnections: ["gmail", "calendar"], category: "calendar", icon: "✅" },
  { id: "builtin-wf-week-planner", name: "Week Planner", description: "Review next week's calendar, identify scheduling conflicts, and send a week plan summary email.", workflowDefinitionId: "week-planner", requiredConnections: ["calendar", "gmail"], category: "calendar", icon: "🗓️" },
  { id: "builtin-wf-contract-prep", name: "Contract Preparation", description: "Find a template in Drive, open it, fill all underlined placeholder fields with party details, and email for review.", workflowDefinitionId: "contract-prep", requiredConnections: ["drive", "docs", "gmail"], category: "docs", icon: "📜" },
  { id: "builtin-wf-document-review-loop", name: "Document Review Loop", description: "Read a document in Drive, provide structured feedback and edits, then email the revised version for approval.", workflowDefinitionId: "document-review", requiredConnections: ["docs", "gmail"], category: "docs", icon: "🔄" },
  { id: "builtin-wf-report-generator", name: "Report Generator", description: "Gather data from a Sheet or Analytics, write a formatted report Doc, and email it as a summary.", workflowDefinitionId: "report-generator", requiredConnections: ["docs", "gmail"], category: "docs", icon: "📄" },
  { id: "builtin-wf-weekly-report", name: "Weekly Business Report", description: "Summarize the week's email activity, key decisions, and milestones into a structured report.", workflowDefinitionId: "weekly-report", requiredConnections: ["gmail"], category: "reporting", icon: "📊" },
  { id: "builtin-wf-business-pulse", name: "Business Pulse", description: "A full business health check — emails, social, analytics, and a web intelligence pulse report.", workflowDefinitionId: "business-pulse", requiredConnections: ["gmail"], category: "reporting", icon: "💼" },
  { id: "builtin-wf-analytics-report", name: "Analytics Weekly Report", description: "Pull GA4 traffic data for the past 7 days, write it to a Sheet dashboard, and email a summary report.", workflowDefinitionId: "analytics-report", requiredConnections: ["analytics", "sheets", "gmail"], category: "analytics", icon: "📈" },
  { id: "builtin-wf-lead-tracker", name: "Lead Tracker", description: "Search Gmail for sales leads, extract contact info and deal status, and log to a tracking sheet.", workflowDefinitionId: "lead-tracker", requiredConnections: ["gmail", "sheets"], category: "sales", icon: "🎯" },
  { id: "builtin-wf-competitor-intel", name: "Competitor Intelligence", description: "Research competitors, monitor their public activity, and compile an intelligence report.", workflowDefinitionId: "competitor-intel", requiredConnections: [], category: "reporting", icon: "🔭" },
  { id: "builtin-wf-client-onboarding", name: "Client Onboarding Pipeline", description: "Collect intake via Google Form, create a client folder in Drive, generate a welcome document, and send a welcome email.", workflowDefinitionId: "client-onboarding", requiredConnections: ["forms", "drive", "docs", "gmail"], category: "onboarding", icon: "🤝" },
  { id: "builtin-wf-new-employee-setup", name: "New Employee Setup", description: "Create a Drive folder for a new team member, draft a welcome email with access links, and schedule an intro meeting.", workflowDefinitionId: "new-employee-setup", requiredConnections: ["drive", "gmail", "calendar"], category: "onboarding", icon: "👋" },
  { id: "builtin-wf-project-kickoff", name: "Project Kickoff", description: "Create a project task list, schedule a kickoff meeting, create a project folder in Drive, and invite team via email.", workflowDefinitionId: "project-kickoff", requiredConnections: ["gmail", "calendar", "drive"], category: "project", icon: "🚀" },
  { id: "builtin-wf-data-collection-report", name: "Data Collection & Report", description: "Collect form responses, organize them in a spreadsheet, and email a summary report to stakeholders.", workflowDefinitionId: "data-collection-report", requiredConnections: ["forms", "sheets", "gmail"], category: "reporting", icon: "📋" },
  { id: "builtin-wf-social-autopilot", name: "Social Autopilot", description: "Check trending topics, draft platform-specific posts, and publish across all connected social networks.", workflowDefinitionId: "social-autopilot", requiredConnections: ["linkedin", "twitter", "instagram"], category: "social", icon: "📱" },
  { id: "builtin-wf-content-calendar", name: "Content Calendar", description: "Generate a week of content ideas, draft posts for each platform, and organize in a spreadsheet.", workflowDefinitionId: "content-calendar", requiredConnections: ["sheets"], category: "content", icon: "🗓️" },
];

// ─── CATEGORY LABELS ──────────────────────────────────────────────────────────

export const TOOL_CATEGORIES: Record<string, string> = {
  email: "Email", sheets: "Spreadsheets", research: "Research", calendar: "Calendar",
  docs: "Documents", social: "Social Media", drive: "Drive", slides: "Slides",
  forms: "Forms", tasks: "Tasks", analytics: "Analytics", maps: "Maps", meet: "Meet", ai: "AI",
};

export const SKILL_CATEGORIES: Record<string, string> = {
  productivity: "Productivity", sales: "Sales & CRM", content: "Content",
  research: "Research", reporting: "Reporting", docs: "Documents", sheets: "Spreadsheets",
  slides: "Slides", forms: "Forms", tasks: "Tasks", analytics: "Analytics",
  email: "Email", drive: "Drive", calendar: "Calendar", maps: "Maps", meet: "Meet",
};

export const WORKFLOW_CATEGORIES: Record<string, string> = {
  daily: "Daily Routines", email: "Email", social: "Social Media", sales: "Sales & CRM",
  reporting: "Reporting", content: "Content", calendar: "Calendar", docs: "Documents",
  analytics: "Analytics", onboarding: "Onboarding", project: "Project Management",
};
