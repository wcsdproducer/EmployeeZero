import { Type } from '@google/genai';

export const GMAIL_TOOLS = [
  {
    name: "search_emails",
    description:
      "Search or list emails in the user's Gmail. Use Gmail search syntax for the query (e.g. 'is:unread', 'from:john@example.com', 'subject:invoice', 'newer_than:1d'). Returns a list of email summaries with id, from, subject, snippet, and date.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description:
            "Gmail search query. Examples: 'is:unread', 'from:boss@company.com', 'subject:meeting newer_than:7d', 'in:inbox'. Leave empty for recent inbox emails.",
        },
        max_results: {
          type: Type.NUMBER,
          description: "Maximum number of emails to return (1-20, default 10)",
        },
      },
    },
  },
  {
    name: "read_email",
    description:
      "Read the full content of a specific email by its message ID. Returns from, to, subject, date, body text, and labels.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        message_id: {
          type: Type.STRING,
          description: "The Gmail message ID to read",
        },
      },
      required: ["message_id"],
    },
  },
  {
    name: "send_email",
    description:
      "Send a new email from the user's Gmail account. Always confirm with the user before sending.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        to: {
          type: Type.STRING,
          description: "Recipient email address",
        },
        subject: {
          type: Type.STRING,
          description: "Email subject line",
        },
        body: {
          type: Type.STRING,
          description: "Email body text (plain text)",
        },
      },
      required: ["to", "subject", "body"],
    },
  },
  {
    name: "reply_to_email",
    description:
      "Reply to a specific email thread. The reply will include proper threading headers. Always confirm with the user before sending.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        message_id: {
          type: Type.STRING,
          description: "The Gmail message ID to reply to",
        },
        body: {
          type: Type.STRING,
          description: "Reply body text (plain text)",
        },
      },
      required: ["message_id", "body"],
    },
  },
  {
    name: "get_unread_count",
    description: "Get the count of unread emails in the inbox",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: "archive_email",
    description: "Archive an email (remove from inbox but keep in All Mail)",
    parameters: {
      type: Type.OBJECT,
      properties: {
        message_id: {
          type: Type.STRING,
          description: "The Gmail message ID to archive",
        },
      },
      required: ["message_id"],
    },
  },
  {
    name: "trash_email",
    description: "Move an email to trash",
    parameters: {
      type: Type.OBJECT,
      properties: {
        message_id: {
          type: Type.STRING,
          description: "The Gmail message ID to trash",
        },
      },
      required: ["message_id"],
    },
  },
];

export const CALENDAR_TOOLS = [
  {
    name: "list_events",
    description: "List upcoming calendar events. Defaults to next 7 days.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        time_min: { type: Type.STRING, description: "Start of range (ISO 8601). Defaults to now." },
        time_max: { type: Type.STRING, description: "End of range (ISO 8601). Defaults to 7 days from now." },
        max_results: { type: Type.NUMBER, description: "Max events to return (default 10, max 50)" },
      },
    },
  },
  {
    name: "get_event",
    description: "Get full details of a specific calendar event",
    parameters: {
      type: Type.OBJECT,
      properties: {
        event_id: { type: Type.STRING, description: "The calendar event ID" },
      },
      required: ["event_id"],
    },
  },
  {
    name: "create_event",
    description: "Create a new calendar event. For birthdays and all-day events, use date-only format (YYYY-MM-DD). IMPORTANT: For birthdays, always use the UPCOMING occurrence year (current or next year), NOT the birth year. For example, if today is 2026 and someone's birthday is Dec 5, use '2026-12-05' not '1969-12-05'. Set recurrence to make it annual.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING, description: "Event title" },
        start_time: { type: Type.STRING, description: "Start time. Use ISO 8601 with timezone for timed events (e.g. '2026-12-05T14:00:00-04:00'). Use date-only 'YYYY-MM-DD' for birthdays and all-day events (e.g. '2026-12-05')." },
        end_time: { type: Type.STRING, description: "End time. Use ISO 8601 with timezone for timed events. For all-day events, use same date as start_time or omit." },
        description: { type: Type.STRING, description: "Event description" },
        attendees: { type: Type.STRING, description: "Comma-separated email addresses" },
        location: { type: Type.STRING, description: "Event location" },
        reminder_minutes: { type: Type.NUMBER, description: "Reminder notification in minutes before event (e.g. 10, 30, 60). Overrides default reminder." },
      },
      required: ["summary", "start_time", "end_time"],
    },
  },
  {
    name: "update_event",
    description: "Update an existing calendar event. Returns verified data from the calendar after the update.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        event_id: { type: Type.STRING, description: "The event ID to update" },
        summary: { type: Type.STRING, description: "New title" },
        start_time: { type: Type.STRING, description: "New start time" },
        end_time: { type: Type.STRING, description: "New end time" },
        description: { type: Type.STRING, description: "New description" },
        location: { type: Type.STRING, description: "New location" },
        reminder_minutes: { type: Type.NUMBER, description: "Set reminder notification in minutes before event (e.g. 10, 30, 60)" },
      },
      required: ["event_id"],
    },
  },
  {
    name: "delete_event",
    description: "Delete a calendar event",
    parameters: {
      type: Type.OBJECT,
      properties: {
        event_id: { type: Type.STRING, description: "The event ID to delete" },
      },
      required: ["event_id"],
    },
  },
  {
    name: "find_free_slots",
    description: "Check availability / free time on a specific date (8 AM - 6 PM)",
    parameters: {
      type: Type.OBJECT,
      properties: {
        date: { type: Type.STRING, description: "Date to check (YYYY-MM-DD)" },
      },
      required: ["date"],
    },
  },
];

export const BROWSER_TOOLS = [
  {
    name: "browse_url",
    description: "Fetch and read the content of any web page. Returns page title, text content, and optionally all links.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        url: { type: Type.STRING, description: "The URL to browse" },
        extract_links: { type: Type.BOOLEAN, description: "Set true to also extract all links" },
      },
      required: ["url"],
    },
  },
  {
    name: "click_url",
    description: "Navigate to / click a URL (e.g. unsubscribe link, confirmation link). Makes a GET request and follows redirects.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        url: { type: Type.STRING, description: "The URL to click" },
      },
      required: ["url"],
    },
  },
  {
    name: "submit_form",
    description: "Submit a web form by POSTing data to a URL.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        url: { type: Type.STRING, description: "The form action URL" },
        data: { type: Type.STRING, description: "JSON string of key-value pairs" },
        content_type: { type: Type.STRING, description: "'form' (default) or 'json'" },
      },
      required: ["url", "data"],
    },
  },
  {
    name: "web_search",
    description: "Search the web for information. Returns results with titles, URLs, and snippets.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: "Search query" },
      },
      required: ["query"],
    },
  },
  {
    name: "deep_research",
    description: "Comprehensive multi-source research. Generates multiple search queries, searches them in parallel, browses top source pages for detailed data, and synthesizes a thorough report with specific numbers, data points, and citations. Use this for ANY research question that needs detailed, accurate, multi-source answers (budgets, market analysis, comparisons, cost breakdowns, travel planning, etc.). Much more thorough than web_search.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        topic: { type: Type.STRING, description: "The research topic or question to investigate thoroughly" },
      },
      required: ["topic"],
    },
  },
  {
    name: "create_pdf",
    description: "Generate a formatted PDF document and upload it to Google Drive. Supports markdown-like formatting: # headers, ## subheaders, **bold**, bullet lists (- item), numbered lists (1. item), tables (| col | col |), and horizontal rules (---). The content should be well-structured with headers and sections. Returns a Google Drive link to the PDF.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "PDF document title (appears on the cover)" },
        content: { type: Type.STRING, description: "Document body content using markdown-like formatting. Use # for title, ## for sections, ### for subsections, **bold**, - for bullets, 1. for numbered lists, | col1 | col2 | for tables, --- for horizontal rules." },
        author: { type: Type.STRING, description: "Author name (optional, shown on cover)" },
      },
      required: ["title", "content"],
    },
  },
];

export const STRIPE_TOOLS = [
  {
    name: "get_stripe_balance",
    description: "Fetch current Stripe available and pending balance.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "get_stripe_metrics",
    description: "Fetch Stripe MRR (Monthly Recurring Revenue) approximations and active subscription counts.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "list_stripe_charges",
    description: "List recent Stripe charges or payments.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        limit: { type: Type.NUMBER, description: "Number of charges to retrieve (default 10)" },
      },
    },
  },
];

export const WORKFLOW_TOOLS = [
  {
    name: "create_workflow",
    description: "Create a new custom workflow/automation for the user. The workflow will appear in their Workflows page and can be run on demand or scheduled.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "Short name for the workflow (e.g., 'Morning Inbox Scan')" },
        description: { type: Type.STRING, description: "One-line description of what this workflow does" },
        goal: { type: Type.STRING, description: "Detailed step-by-step instructions for the AI agent to follow when executing this workflow. Be specific and actionable." },
        required_connections: { type: Type.STRING, description: "Comma-separated list of required connections (e.g., 'gmail,calendar'). Leave empty if no connections needed." },
      },
      required: ["name", "description", "goal"],
    },
  },
  {
    name: "list_my_workflows",
    description: "List all custom workflows the user has created",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "delete_workflow",
    description: "Delete a custom workflow by its ID",
    parameters: {
      type: Type.OBJECT,
      properties: {
        workflow_id: { type: Type.STRING, description: "The workflow ID to delete" },
      },
      required: ["workflow_id"],
    },
  },
  {
    name: "schedule_workflow",
    description: "Schedule a workflow to run automatically on a cron schedule. Can schedule both built-in workflows and custom user workflows. Use this when the user asks to turn a workflow into a cron job, set up an automation, or schedule a recurring task.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        workflow_id: { type: Type.STRING, description: "The workflow ID to schedule. For built-in workflows use the kebab-case ID (e.g. 'morning-briefing', 'inbox-cleanup'). For custom workflows, use the workflow ID from list_my_workflows." },
        schedule: { type: Type.STRING, description: "Cron expression for the schedule. Common examples: '0 8 * * *' (daily 8 AM), '0 9 * * 1-5' (weekdays 9 AM), '*/15 * * * *' (every 15 min), '0 */2 * * *' (every 2 hours), '0 9 * * 1' (Mondays 9 AM), '0 18 * * 5' (Fridays 6 PM)" },
        name: { type: Type.STRING, description: "Human-readable name for this scheduled job (e.g. 'Morning Inbox Scan'). If not provided, will use the workflow name." },
      },
      required: ["workflow_id", "schedule"],
    },
  },
  {
    name: "list_scheduled_jobs",
    description: "List all scheduled/cron jobs for the user, including their status (active or paused), schedule, and last run time.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "pause_scheduled_job",
    description: "Pause an active scheduled job so it stops running. The job is not deleted and can be resumed later.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        job_id: { type: Type.STRING, description: "The scheduled job ID to pause" },
      },
      required: ["job_id"],
    },
  },
  {
    name: "resume_scheduled_job",
    description: "Resume a paused scheduled job so it starts running again on its schedule.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        job_id: { type: Type.STRING, description: "The scheduled job ID to resume" },
      },
      required: ["job_id"],
    },
  },
  {
    name: "delete_scheduled_job",
    description: "Permanently delete a scheduled job.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        job_id: { type: Type.STRING, description: "The scheduled job ID to delete" },
      },
      required: ["job_id"],
    },
  },
];

export const DRIVE_TOOLS = [
  {
    name: "list_drive_files",
    description: "Search and list files in Google Drive. Searches both file names and content. Use short keywords for best results (e.g. 'Authorization Release' not full sentences). Returns file names, types, and links.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: "Search keywords to find files. Use 2-3 key terms, not full sentences. Leave empty for recent files." },
        max_results: { type: Type.NUMBER, description: "Max files to return (default 10)" },
      },
    },
  },
  {
    name: "get_drive_file",
    description: "Get metadata for a specific Google Drive file",
    parameters: {
      type: Type.OBJECT,
      properties: {
        file_id: { type: Type.STRING, description: "The Drive file ID" },
      },
      required: ["file_id"],
    },
  },
  {
    name: "read_drive_file",
    description: "Read the text content of a Google Drive file (Google Docs, text files, etc.)",
    parameters: {
      type: Type.OBJECT,
      properties: {
        file_id: { type: Type.STRING, description: "The Drive file ID to read" },
      },
      required: ["file_id"],
    },
  },
  {
    name: "upload_drive_file",
    description: "Upload/create a new file in Google Drive",
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "File name (e.g. 'meeting-notes.txt')" },
        content: { type: Type.STRING, description: "File content (text)" },
        mime_type: { type: Type.STRING, description: "MIME type (default 'text/plain')" },
        folder_id: { type: Type.STRING, description: "Optional folder ID to upload into" },
      },
      required: ["name", "content"],
    },
  },
  {
    name: "create_drive_folder",
    description: "Create a new folder in Google Drive",
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "Folder name" },
        parent_id: { type: Type.STRING, description: "Optional parent folder ID" },
      },
      required: ["name"],
    },
  },
];

export const SHEETS_TOOLS = [
  {
    name: "list_spreadsheets",
    description: "List recent Google Sheets spreadsheets",
    parameters: {
      type: Type.OBJECT,
      properties: {
        max_results: { type: Type.NUMBER, description: "Max spreadsheets to return (default 10)" },
      },
    },
  },
  {
    name: "read_sheet",
    description: "Read data from a Google Sheets spreadsheet. Accepts a spreadsheet ID or a full Google Sheets URL. Range is optional — omit it to read the entire first sheet.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        spreadsheet_id: { type: Type.STRING, description: "The spreadsheet ID or full Google Sheets URL (e.g. https://docs.google.com/spreadsheets/d/abc123/edit)" },
        range: { type: Type.STRING, description: "Optional A1 notation range (e.g. 'Sheet1!A1:D10'). Omit to read the entire first sheet." },
      },
      required: ["spreadsheet_id"],
    },
  },
  {
    name: "write_sheet",
    description: "Write data to a range in a Google Sheets spreadsheet",
    parameters: {
      type: Type.OBJECT,
      properties: {
        spreadsheet_id: { type: Type.STRING, description: "The spreadsheet ID" },
        range: { type: Type.STRING, description: "A1 notation range (e.g. 'Sheet1!A1')" },
        values: { type: Type.STRING, description: "JSON array of arrays, e.g. [[\"Name\",\"Age\"],[\"Jack\",\"30\"]]" },
      },
      required: ["spreadsheet_id", "range", "values"],
    },
  },
  {
    name: "append_to_sheet",
    description: "Append rows to the end of a Google Sheets spreadsheet",
    parameters: {
      type: Type.OBJECT,
      properties: {
        spreadsheet_id: { type: Type.STRING, description: "The spreadsheet ID" },
        range: { type: Type.STRING, description: "Sheet name or range to append to (e.g. 'Sheet1')" },
        values: { type: Type.STRING, description: "JSON array of arrays to append" },
      },
      required: ["spreadsheet_id", "range", "values"],
    },
  },
  {
    name: "create_spreadsheet",
    description: "Create a new Google Sheets spreadsheet",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "Spreadsheet title" },
        sheet_names: { type: Type.STRING, description: "Comma-separated sheet tab names (default 'Sheet1')" },
      },
      required: ["title"],
    },
  },
];

export const YOUTUBE_TOOLS = [
  {
    name: "list_youtube_channels",
    description: "List the user's YouTube channels with subscriber count and stats",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "list_youtube_videos",
    description: "List videos from a YouTube channel with view counts and stats",
    parameters: {
      type: Type.OBJECT,
      properties: {
        channel_id: { type: Type.STRING, description: "YouTube channel ID (leave empty for user's own channel)" },
        max_results: { type: Type.NUMBER, description: "Max videos to return (default 10)" },
      },
    },
  },
  {
    name: "get_youtube_analytics",
    description: "Get detailed analytics for a specific YouTube video",
    parameters: {
      type: Type.OBJECT,
      properties: {
        video_id: { type: Type.STRING, description: "YouTube video ID" },
      },
      required: ["video_id"],
    },
  },
  {
    name: "search_youtube",
    description: "Search YouTube for videos",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: "Search query" },
        max_results: { type: Type.NUMBER, description: "Max results (default 5)" },
      },
      required: ["query"],
    },
  },
  {
    name: "list_youtube_playlists",
    description: "List the user's YouTube playlists",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "add_to_youtube_playlist",
    description: "Add a video to a YouTube playlist",
    parameters: {
      type: Type.OBJECT,
      properties: {
        playlist_id: { type: Type.STRING, description: "YouTube playlist ID" },
        video_id: { type: Type.STRING, description: "YouTube video ID to add" },
      },
      required: ["playlist_id", "video_id"],
    },
  },
  {
    name: "get_youtube_comments",
    description: "Get comments on a YouTube video",
    parameters: {
      type: Type.OBJECT,
      properties: {
        video_id: { type: Type.STRING, description: "YouTube video ID" },
        max_results: { type: Type.NUMBER, description: "Max comments (default 10)" },
      },
      required: ["video_id"],
    },
  },
  {
    name: "reply_to_youtube_comment",
    description: "Reply to a comment on YouTube",
    parameters: {
      type: Type.OBJECT,
      properties: {
        comment_id: { type: Type.STRING, description: "Comment ID to reply to" },
        text: { type: Type.STRING, description: "Reply text" },
      },
      required: ["comment_id", "text"],
    },
  },
];

export const LINKEDIN_TOOLS = [
  {
    name: "get_linkedin_profile",
    description: "Get the user's LinkedIn profile info (name, email, picture)",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "create_linkedin_post",
    description: "Create a text post on the user's LinkedIn. Always confirm content with user before posting.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        text: { type: Type.STRING, description: "The post content text" },
      },
      required: ["text"],
    },
  },
  {
    name: "create_linkedin_post_with_link",
    description: "Share a link with commentary on LinkedIn",
    parameters: {
      type: Type.OBJECT,
      properties: {
        text: { type: Type.STRING, description: "Commentary text" },
        url: { type: Type.STRING, description: "URL to share" },
        title: { type: Type.STRING, description: "Optional title for the link" },
      },
      required: ["text", "url"],
    },
  },
  {
    name: "get_linkedin_posts",
    description: "Get the user's recent LinkedIn posts with text and engagement data",
    parameters: {
      type: Type.OBJECT,
      properties: {
        count: { type: Type.NUMBER, description: "Number of posts to return (default 10)" },
      },
    },
  },
  {
    name: "delete_linkedin_post",
    description: "Delete a LinkedIn post by its ID",
    parameters: {
      type: Type.OBJECT,
      properties: {
        post_id: { type: Type.STRING, description: "The LinkedIn post ID to delete" },
      },
      required: ["post_id"],
    },
  },
  {
    name: "create_linkedin_image_post",
    description: "Create a LinkedIn post with an image. Downloads the image and uploads it to LinkedIn.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        text: { type: Type.STRING, description: "Post caption/text" },
        image_url: { type: Type.STRING, description: "Public URL of the image to upload" },
      },
      required: ["text", "image_url"],
    },
  },
  {
    name: "comment_on_linkedin_post",
    description: "Comment on a LinkedIn post. Use after get_linkedin_posts to get post IDs.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        post_urn: { type: Type.STRING, description: "The LinkedIn post URN/ID to comment on" },
        text: { type: Type.STRING, description: "Comment text" },
      },
      required: ["post_urn", "text"],
    },
  },
  {
    name: "react_to_linkedin_post",
    description: "React to a LinkedIn post (like, celebrate, support, love, insightful, funny)",
    parameters: {
      type: Type.OBJECT,
      properties: {
        post_urn: { type: Type.STRING, description: "The LinkedIn post URN/ID to react to" },
        reaction_type: { type: Type.STRING, description: "Reaction type: LIKE, CELEBRATE, SUPPORT, LOVE, INSIGHTFUL, or FUNNY (default LIKE)" },
      },
      required: ["post_urn"],
    },
  },
];

// NOTE: Twitter/X free tier is WRITE-ONLY. Read endpoints (search, mentions,
// timeline, profile, followers, bookmarks, liked_tweets) return 403 "Credits Depleted".
// Only write operations are available.
export const TWITTER_TOOLS = [
  {
    name: "create_tweet",
    description: "Post a new tweet on X/Twitter. Always confirm content with user before posting.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        text: { type: Type.STRING, description: "Tweet text (max 280 characters)" },
      },
      required: ["text"],
    },
  },
  {
    name: "delete_tweet",
    description: "Delete a tweet by its ID",
    parameters: {
      type: Type.OBJECT,
      properties: {
        tweet_id: { type: Type.STRING, description: "Tweet ID to delete" },
      },
      required: ["tweet_id"],
    },
  },
  {
    name: "reply_to_tweet",
    description: "Reply to a tweet (requires tweet_id from another source). Always confirm reply content with user.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        tweet_id: { type: Type.STRING, description: "Tweet ID to reply to" },
        text: { type: Type.STRING, description: "Reply text (max 280 characters)" },
      },
      required: ["tweet_id", "text"],
    },
  },
  {
    name: "retweet",
    description: "Retweet a tweet",
    parameters: {
      type: Type.OBJECT,
      properties: {
        tweet_id: { type: Type.STRING, description: "Tweet ID to retweet" },
      },
      required: ["tweet_id"],
    },
  },
  {
    name: "undo_retweet",
    description: "Undo a retweet",
    parameters: {
      type: Type.OBJECT,
      properties: {
        tweet_id: { type: Type.STRING, description: "Tweet ID to undo retweet" },
      },
      required: ["tweet_id"],
    },
  },
  {
    name: "like_tweet",
    description: "Like a tweet (requires tweet_id from another source)",
    parameters: {
      type: Type.OBJECT,
      properties: {
        tweet_id: { type: Type.STRING, description: "Tweet ID to like" },
      },
      required: ["tweet_id"],
    },
  },
  {
    name: "unlike_tweet",
    description: "Unlike a tweet",
    parameters: {
      type: Type.OBJECT,
      properties: {
        tweet_id: { type: Type.STRING, description: "Tweet ID to unlike" },
      },
      required: ["tweet_id"],
    },
  },
];

export const INSTAGRAM_TOOLS = [
  {
    name: "get_instagram_profile",
    description: "Get the user's Instagram profile (username, followers, post count, bio)",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "get_instagram_media",
    description: "Get recent Instagram posts with engagement stats (likes, comments)",
    parameters: {
      type: Type.OBJECT,
      properties: {
        max_results: { type: Type.NUMBER, description: "Max posts to return (default 10)" },
      },
    },
  },
  {
    name: "create_instagram_post",
    description: "Publish an image post to Instagram. Requires a public image URL. Always confirm with user before posting.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        image_url: { type: Type.STRING, description: "Public URL of the image to post" },
        caption: { type: Type.STRING, description: "Post caption with hashtags" },
      },
      required: ["image_url", "caption"],
    },
  },
  {
    name: "get_instagram_comments",
    description: "Get comments on an Instagram post (use get_instagram_media first to get media IDs)",
    parameters: {
      type: Type.OBJECT,
      properties: {
        media_id: { type: Type.STRING, description: "Instagram media/post ID" },
      },
      required: ["media_id"],
    },
  },
  {
    name: "reply_to_instagram_comment",
    description: "Reply to a comment on an Instagram post",
    parameters: {
      type: Type.OBJECT,
      properties: {
        media_id: { type: Type.STRING, description: "Instagram media/post ID" },
        comment_id: { type: Type.STRING, description: "Comment ID to reply to" },
        text: { type: Type.STRING, description: "Reply text" },
      },
      required: ["media_id", "comment_id", "text"],
    },
  },
  {
    name: "create_instagram_carousel",
    description: "Create a carousel (multi-image) post on Instagram. Requires 2-10 public image URLs.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        image_urls: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Array of public image URLs (2-10)" },
        caption: { type: Type.STRING, description: "Post caption" },
      },
      required: ["image_urls", "caption"],
    },
  },
  {
    name: "create_instagram_reel",
    description: "Publish a video reel to Instagram. Requires a public video URL. Video will be processed before publishing.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        video_url: { type: Type.STRING, description: "Public URL of the video file" },
        caption: { type: Type.STRING, description: "Reel caption" },
      },
      required: ["video_url", "caption"],
    },
  },
  {
    name: "get_instagram_post_insights",
    description: "Get analytics for an Instagram post (impressions, reach, saves, shares, interactions)",
    parameters: {
      type: Type.OBJECT,
      properties: {
        media_id: { type: Type.STRING, description: "Instagram media/post ID" },
      },
      required: ["media_id"],
    },
  },
  {
    name: "get_instagram_account_insights",
    description: "Get Instagram account analytics (impressions, reach, profile views, follows) over a period",
    parameters: {
      type: Type.OBJECT,
      properties: {
        period: { type: Type.STRING, description: "Period: day, week, or days_28 (default: day)" },
        days: { type: Type.NUMBER, description: "Number of days to look back (default 7)" },
      },
    },
  },
  {
    name: "get_instagram_stories",
    description: "Get the user's currently active Instagram stories",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "search_instagram_hashtag",
    description: "Search Instagram for recent posts with a specific hashtag",
    parameters: {
      type: Type.OBJECT,
      properties: {
        hashtag: { type: Type.STRING, description: "Hashtag to search (without #)" },
      },
      required: ["hashtag"],
    },
  },
  {
    name: "delete_instagram_post",
    description: "Delete an Instagram post by its media ID",
    parameters: {
      type: Type.OBJECT,
      properties: {
        media_id: { type: Type.STRING, description: "Instagram media/post ID to delete" },
      },
      required: ["media_id"],
    },
  },
  {
    name: "create_instagram_story",
    description: "Publish an image or video as an Instagram Story",
    parameters: {
      type: Type.OBJECT,
      properties: {
        media_url: { type: Type.STRING, description: "Public URL of image or video" },
        media_type: { type: Type.STRING, description: "IMAGE or VIDEO (default IMAGE)" },
      },
      required: ["media_url"],
    },
  },
  {
    name: "get_instagram_story_insights",
    description: "Get analytics for an Instagram Story (impressions, reach, exits, taps)",
    parameters: {
      type: Type.OBJECT,
      properties: {
        story_id: { type: Type.STRING, description: "Story media ID" },
      },
      required: ["story_id"],
    },
  },
  {
    name: "get_instagram_tagged_media",
    description: "Get posts that the user has been tagged in",
    parameters: { type: Type.OBJECT, properties: {} },
  },
];

export const FACEBOOK_TOOLS = [
  {
    name: "get_facebook_profile",
    description: "Get the user's Facebook profile info",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "get_facebook_pages",
    description: "List Facebook Pages the user manages (with fan counts)",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "get_facebook_page_posts",
    description: "Get recent posts from a Facebook Page with engagement stats",
    parameters: {
      type: Type.OBJECT,
      properties: {
        page_id: { type: Type.STRING, description: "Facebook Page ID (use get_facebook_pages to find it)" },
        max_results: { type: Type.NUMBER, description: "Max posts to return (default 10)" },
      },
      required: ["page_id"],
    },
  },
  {
    name: "create_facebook_page_post",
    description: "Publish a post to a Facebook Page. Always confirm with user before posting.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        page_id: { type: Type.STRING, description: "Facebook Page ID" },
        message: { type: Type.STRING, description: "Post text content" },
        link: { type: Type.STRING, description: "Optional link to share" },
      },
      required: ["page_id", "message"],
    },
  },
  {
    name: "get_facebook_page_insights",
    description: "Get analytics for a Facebook Page (impressions, engagement, fans, views) over a period",
    parameters: {
      type: Type.OBJECT,
      properties: {
        page_id: { type: Type.STRING, description: "Facebook Page ID" },
        period: { type: Type.STRING, description: "Period: day, week, days_28 (default: day)" },
        days: { type: Type.NUMBER, description: "Days to look back (default 7)" },
      },
      required: ["page_id"],
    },
  },
  {
    name: "get_facebook_post_comments",
    description: "Get comments on a Facebook post",
    parameters: {
      type: Type.OBJECT,
      properties: {
        post_id: { type: Type.STRING, description: "Facebook post ID" },
      },
      required: ["post_id"],
    },
  },
  {
    name: "reply_to_facebook_comment",
    description: "Reply to a comment on a Facebook post",
    parameters: {
      type: Type.OBJECT,
      properties: {
        comment_id: { type: Type.STRING, description: "Comment ID to reply to" },
        message: { type: Type.STRING, description: "Reply text" },
      },
      required: ["comment_id", "message"],
    },
  },
  {
    name: "delete_facebook_post",
    description: "Delete a Facebook post by its ID",
    parameters: {
      type: Type.OBJECT,
      properties: {
        post_id: { type: Type.STRING, description: "Post ID to delete" },
      },
      required: ["post_id"],
    },
  },
  {
    name: "create_facebook_photo_post",
    description: "Post a photo to a Facebook Page. Requires a public image URL. Always confirm before posting.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        page_id: { type: Type.STRING, description: "Facebook Page ID" },
        image_url: { type: Type.STRING, description: "Public URL of the image" },
        caption: { type: Type.STRING, description: "Photo caption" },
      },
      required: ["page_id", "image_url", "caption"],
    },
  },
  {
    name: "schedule_facebook_post",
    description: "Schedule a post on a Facebook Page for a future time",
    parameters: {
      type: Type.OBJECT,
      properties: {
        page_id: { type: Type.STRING, description: "Facebook Page ID" },
        message: { type: Type.STRING, description: "Post text content" },
        scheduled_time: { type: Type.NUMBER, description: "Unix timestamp for when to publish" },
        link: { type: Type.STRING, description: "Optional link to share" },
      },
      required: ["page_id", "message", "scheduled_time"],
    },
  },
  {
    name: "upload_facebook_video",
    description: "Upload a video to a Facebook Page",
    parameters: {
      type: Type.OBJECT,
      properties: {
        page_id: { type: Type.STRING, description: "Facebook Page ID" },
        video_url: { type: Type.STRING, description: "Public URL of the video" },
        title: { type: Type.STRING, description: "Video title" },
        description: { type: Type.STRING, description: "Video description" },
      },
      required: ["page_id", "video_url", "title"],
    },
  },
  {
    name: "create_facebook_reel",
    description: "Publish a Reel on a Facebook Page",
    parameters: {
      type: Type.OBJECT,
      properties: {
        page_id: { type: Type.STRING, description: "Facebook Page ID" },
        video_url: { type: Type.STRING, description: "Public URL of video" },
        description: { type: Type.STRING, description: "Reel description" },
      },
      required: ["page_id", "video_url"],
    },
  },
  {
    name: "get_facebook_scheduled_posts",
    description: "List scheduled (unpublished) posts on a Facebook Page",
    parameters: {
      type: Type.OBJECT,
      properties: {
        page_id: { type: Type.STRING, description: "Facebook Page ID" },
      },
      required: ["page_id"],
    },
  },
  {
    name: "cancel_facebook_scheduled_post",
    description: "Cancel a scheduled Facebook post before it publishes",
    parameters: {
      type: Type.OBJECT,
      properties: {
        post_id: { type: Type.STRING, description: "Post ID to cancel" },
      },
      required: ["post_id"],
    },
  },
];

export const TIKTOK_TOOLS = [
  {
    name: "get_tiktok_profile",
    description: "Get the user's TikTok profile (display name, followers, video count, likes)",
    parameters: { type: Type.OBJECT, properties: {} },
  },
];



export const CONTACTS_TOOLS = [
  {
    name: "list_contacts",
    description: "List the user's Google contacts, optionally searching by name or email",
    parameters: {
      type: Type.OBJECT,
      properties: {
        search: { type: Type.STRING, description: "Optional search query to filter contacts" },
        max_results: { type: Type.NUMBER, description: "Max contacts to return (default 20)" },
      },
    },
  },
  {
    name: "get_contact",
    description: "Get detailed info about a specific Google contact",
    parameters: {
      type: Type.OBJECT,
      properties: {
        resource_name: { type: Type.STRING, description: "Contact resource name (e.g. people/c12345)" },
      },
      required: ["resource_name"],
    },
  },
  {
    name: "create_contact",
    description: "Create a new Google contact",
    parameters: {
      type: Type.OBJECT,
      properties: {
        first_name: { type: Type.STRING, description: "First name" },
        last_name: { type: Type.STRING, description: "Last name" },
        email: { type: Type.STRING, description: "Email address" },
        phone: { type: Type.STRING, description: "Phone number" },
        company: { type: Type.STRING, description: "Company/organization name" },
        title: { type: Type.STRING, description: "Job title" },
      },
      required: ["first_name"],
    },
  },
  {
    name: "delete_contact",
    description: "Delete a Google contact",
    parameters: {
      type: Type.OBJECT,
      properties: {
        resource_name: { type: Type.STRING, description: "Contact resource name to delete" },
      },
      required: ["resource_name"],
    },
  },
];

export const NOTES_TOOLS = [
  {
    name: "create_note",
    description: "Save a note or knowledge item for future reference",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "Note title" },
        content: { type: Type.STRING, description: "Note content (text, ideas, lists, etc.)" },
        tags: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Tags for categorization (e.g. 'meeting', 'idea', 'research')",
        },
      },
      required: ["title", "content"],
    },
  },
  {
    name: "list_notes",
    description: "List saved notes, optionally filtered by tag",
    parameters: {
      type: Type.OBJECT,
      properties: {
        tag: { type: Type.STRING, description: "Filter by tag" },
        max_results: { type: Type.NUMBER, description: "Max notes to return (default 20)" },
      },
    },
  },
  {
    name: "get_note",
    description: "Get a specific note by ID",
    parameters: {
      type: Type.OBJECT,
      properties: {
        note_id: { type: Type.STRING, description: "Note ID" },
      },
      required: ["note_id"],
    },
  },
  {
    name: "update_note",
    description: "Update an existing note",
    parameters: {
      type: Type.OBJECT,
      properties: {
        note_id: { type: Type.STRING, description: "Note ID to update" },
        title: { type: Type.STRING, description: "New title" },
        content: { type: Type.STRING, description: "New content" },
        tags: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "New tags",
        },
      },
      required: ["note_id"],
    },
  },
  {
    name: "delete_note",
    description: "Delete a note",
    parameters: {
      type: Type.OBJECT,
      properties: {
        note_id: { type: Type.STRING, description: "Note ID to delete" },
      },
      required: ["note_id"],
    },
  },
  {
    name: "search_notes",
    description: "Search through saved notes by keyword",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: "Search keyword" },
        max_results: { type: Type.NUMBER, description: "Max results (default 10)" },
      },
      required: ["query"],
    },
  },
];

export const MEMORY_TOOLS = [
  {
    name: "save_memory",
    description: "Save an important fact about the user to long-term memory. Use this when the user tells you personal info, preferences, corrections, or anything you should remember permanently. Examples: their name, company, goals, preferences, important dates, or corrections to previous knowledge.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        facts: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Array of facts to remember. Each fact should be a clear, standalone statement. e.g. [\"User's name is John\", \"User prefers dark mode\"]",
        },
      },
      required: ["facts"],
    },
  },
  {
    name: "search_conversations",
    description: "Search the user's past conversation history. Use this when the user asks about a previous conversation, wants to recall what was discussed, or references something from an earlier session. Searches message content across all past conversations.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: "Search keywords to find in past conversations (e.g. 'LinkedIn post', 'budget report', 'email to Sarah')" },
        max_results: { type: Type.NUMBER, description: "Maximum number of conversations to return (default 5)" },
      },
      required: ["query"],
    },
  },
];

export const TASKS_TOOLS = [
  { name: "list_task_lists", description: "List all Google Task lists", parameters: { type: Type.OBJECT, properties: {} } },
  { name: "list_google_tasks", description: "List tasks in a task list", parameters: { type: Type.OBJECT, properties: { task_list_id: { type: Type.STRING, description: "Task list ID (use list_task_lists to find)" }, show_completed: { type: Type.BOOLEAN, description: "Include completed tasks (default false)" } }, required: ["task_list_id"] } },
  { name: "create_google_task", description: "Create a new task in a task list", parameters: { type: Type.OBJECT, properties: { task_list_id: { type: Type.STRING, description: "Task list ID" }, title: { type: Type.STRING, description: "Task title" }, notes: { type: Type.STRING, description: "Optional notes/details" }, due: { type: Type.STRING, description: "Due date (RFC 3339, e.g. 2026-04-01T00:00:00Z)" } }, required: ["task_list_id", "title"] } },
  { name: "complete_google_task", description: "Mark a task as completed", parameters: { type: Type.OBJECT, properties: { task_list_id: { type: Type.STRING, description: "Task list ID" }, task_id: { type: Type.STRING, description: "Task ID to complete" } }, required: ["task_list_id", "task_id"] } },
  { name: "delete_google_task", description: "Delete a task", parameters: { type: Type.OBJECT, properties: { task_list_id: { type: Type.STRING, description: "Task list ID" }, task_id: { type: Type.STRING, description: "Task ID to delete" } }, required: ["task_list_id", "task_id"] } },
  { name: "clear_completed_tasks", description: "Clear all completed tasks from a list", parameters: { type: Type.OBJECT, properties: { task_list_id: { type: Type.STRING, description: "Task list ID" } }, required: ["task_list_id"] } },
];

export const DOCS_TOOLS = [
  { name: "create_document", description: "Create a new Google Doc and return its URL", parameters: { type: Type.OBJECT, properties: { title: { type: Type.STRING, description: "Document title" } }, required: ["title"] } },
  { name: "get_document", description: "Get a Google Doc's content (title and text). ALWAYS call this before editing to see current content.", parameters: { type: Type.OBJECT, properties: { document_id: { type: Type.STRING, description: "Document ID" } }, required: ["document_id"] } },
  { name: "append_doc_text", description: "Append text to the END of a Google Doc", parameters: { type: Type.OBJECT, properties: { document_id: { type: Type.STRING, description: "Document ID" }, text: { type: Type.STRING, description: "Text to append" } }, required: ["document_id", "text"] } },
  { name: "prepend_doc_text", description: "Insert text at the BEGINNING of a Google Doc (before all existing content)", parameters: { type: Type.OBJECT, properties: { document_id: { type: Type.STRING, description: "Document ID" }, text: { type: Type.STRING, description: "Text to prepend" } }, required: ["document_id", "text"] } },
  { name: "replace_doc_text", description: "Find and replace text in a Google Doc. Replaces ALL occurrences (case-sensitive).", parameters: { type: Type.OBJECT, properties: { document_id: { type: Type.STRING, description: "Document ID" }, find_text: { type: Type.STRING, description: "Exact text to find (case-sensitive)" }, replace_with: { type: Type.STRING, description: "Text to replace it with" } }, required: ["document_id", "find_text", "replace_with"] } },
  { name: "delete_doc_text", description: "Delete specific text from a Google Doc by finding and removing it", parameters: { type: Type.OBJECT, properties: { document_id: { type: Type.STRING, description: "Document ID" }, find_text: { type: Type.STRING, description: "Exact text to delete (case-sensitive)" } }, required: ["document_id", "find_text"] } },
  { name: "clear_document", description: "Clear ALL content from a Google Doc (keeps the document, empties the body)", parameters: { type: Type.OBJECT, properties: { document_id: { type: Type.STRING, description: "Document ID" } }, required: ["document_id"] } },
  { name: "write_document", description: "Replace the entire content of a Google Doc with new text (clears then writes)", parameters: { type: Type.OBJECT, properties: { document_id: { type: Type.STRING, description: "Document ID" }, content: { type: Type.STRING, description: "New content to write" } }, required: ["document_id", "content"] } },
  { name: "update_doc_title", description: "Update/rename the title of a Google Doc", parameters: { type: Type.OBJECT, properties: { document_id: { type: Type.STRING, description: "Document ID" }, title: { type: Type.STRING, description: "New title" } }, required: ["document_id", "title"] } },
];

export const BUSINESS_PROFILE_TOOLS = [
  { name: "list_business_accounts", description: "List Google Business Profile accounts", parameters: { type: Type.OBJECT, properties: {} } },
  { name: "list_business_locations", description: "List locations for a business account", parameters: { type: Type.OBJECT, properties: { account_id: { type: Type.STRING, description: "Account ID (e.g. accounts/123)" } }, required: ["account_id"] } },
  { name: "get_business_reviews", description: "Get Google reviews for a business location", parameters: { type: Type.OBJECT, properties: { location_name: { type: Type.STRING, description: "Location name (e.g. accounts/123/locations/456)" } }, required: ["location_name"] } },
  { name: "reply_to_business_review", description: "Reply to a Google review", parameters: { type: Type.OBJECT, properties: { review_name: { type: Type.STRING, description: "Full review name path" }, comment: { type: Type.STRING, description: "Reply text" } }, required: ["review_name", "comment"] } },
  { name: "create_business_post", description: "Create a Google Business post/update", parameters: { type: Type.OBJECT, properties: { location_name: { type: Type.STRING, description: "Location name" }, summary: { type: Type.STRING, description: "Post text (max 1500 chars)" }, cta_type: { type: Type.STRING, description: "Call-to-action type: BOOK, ORDER, LEARN_MORE, SIGN_UP, CALL (optional)" }, cta_url: { type: Type.STRING, description: "CTA URL (required if cta_type set)" } }, required: ["location_name", "summary"] } },
];

export const ANALYTICS_TOOLS = [
  { name: "list_analytics_properties", description: "List GA4 properties the user has access to", parameters: { type: Type.OBJECT, properties: {} } },
  { name: "run_analytics_report", description: "Run a Google Analytics report with custom dimensions and metrics", parameters: { type: Type.OBJECT, properties: { property_id: { type: Type.STRING, description: "GA4 property ID (number only)" }, start_date: { type: Type.STRING, description: "Start date (YYYY-MM-DD or '30daysAgo')" }, end_date: { type: Type.STRING, description: "End date (YYYY-MM-DD or 'today')" }, dimensions: { type: Type.STRING, description: "Comma-separated dimensions (e.g. 'pagePath,country')" }, metrics: { type: Type.STRING, description: "Comma-separated metrics (e.g. 'screenPageViews,sessions,activeUsers')" } }, required: ["property_id", "start_date", "end_date", "metrics"] } },
  { name: "get_realtime_analytics", description: "Get real-time active users on the website right now", parameters: { type: Type.OBJECT, properties: { property_id: { type: Type.STRING, description: "GA4 property ID" } }, required: ["property_id"] } },
];

export const FORMS_TOOLS = [
  { name: "create_google_form", description: "Create a new Google Form and return its URL", parameters: { type: Type.OBJECT, properties: { title: { type: Type.STRING, description: "Form title" } }, required: ["title"] } },
  { name: "add_form_question", description: "Add a question to a Google Form", parameters: { type: Type.OBJECT, properties: { form_id: { type: Type.STRING, description: "Form ID" }, title: { type: Type.STRING, description: "Question text" }, question_type: { type: Type.STRING, description: "Type: SHORT_ANSWER, PARAGRAPH, MULTIPLE_CHOICE, CHECKBOX, DROPDOWN, SCALE" }, options: { type: Type.STRING, description: "Comma-separated options (for MULTIPLE_CHOICE, CHECKBOX, DROPDOWN)" } }, required: ["form_id", "title", "question_type"] } },
  { name: "get_google_form", description: "Get a Google Form's structure and questions", parameters: { type: Type.OBJECT, properties: { form_id: { type: Type.STRING, description: "Form ID" } }, required: ["form_id"] } },
  { name: "get_form_responses", description: "Get all responses submitted to a Google Form", parameters: { type: Type.OBJECT, properties: { form_id: { type: Type.STRING, description: "Form ID" } }, required: ["form_id"] } },
];

export const SLIDES_TOOLS = [
  { name: "create_presentation", description: "Create a new Google Slides presentation", parameters: { type: Type.OBJECT, properties: { title: { type: Type.STRING, description: "Presentation title" } }, required: ["title"] } },
  { name: "get_presentation", description: "Get a presentation's metadata and slide list", parameters: { type: Type.OBJECT, properties: { presentation_id: { type: Type.STRING, description: "Presentation ID" } }, required: ["presentation_id"] } },
  { name: "add_presentation_slide", description: "Add a new slide to a presentation", parameters: { type: Type.OBJECT, properties: { presentation_id: { type: Type.STRING, description: "Presentation ID" }, layout: { type: Type.STRING, description: "Slide layout: BLANK, TITLE, TITLE_AND_BODY, TITLE_AND_TWO_COLUMNS, SECTION_HEADER (default TITLE_AND_BODY)" } }, required: ["presentation_id"] } },
  { name: "insert_slide_text", description: "Insert text into a slide's placeholder", parameters: { type: Type.OBJECT, properties: { presentation_id: { type: Type.STRING, description: "Presentation ID" }, slide_id: { type: Type.STRING, description: "Slide object ID" }, text: { type: Type.STRING, description: "Text to insert" } }, required: ["presentation_id", "slide_id", "text"] } },
];

// ── Tool executor ───────────────────────────────────────────────

/** Tool Atlas uses to render an interactive chart in the chat UI */
export const CREATE_CHART_TOOL = {
  name: "create_chart",
  description: `Renders a visual chart or graph directly in the chat UI.
Use this whenever the user asks for a chart, graph, visualization, or wants to see data plotted.
You CAN create charts — use this tool. Do not say you cannot create charts.
Supports line charts (trends over time), bar charts (comparisons), and area charts (cumulative trends).`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      type: {
        type: Type.STRING,
        description: "Chart type: 'line', 'bar', or 'area'",
      },
      title: {
        type: Type.STRING,
        description: "Chart title displayed above the chart",
      },
      data: {
        type: Type.STRING,
        description: `JSON array of data points. Each item must have a 'name' (x-axis label) and one numeric value key.\nExamples:\n- Bar: [{"name":"Jan","revenue":4000},{"name":"Feb","revenue":5200}]\n- Line: [{"name":"Week 1","users":120},{"name":"Week 2","users":180}]\n- Area: [{"name":"Mon","sessions":300},{"name":"Tue","sessions":420}]`,
      },
    },
    required: ["type", "data"],
  },
};