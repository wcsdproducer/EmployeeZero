import { adminDb } from "@/lib/admin";
import { GoogleGenAI, Type } from "@google/genai";
import {
  listEmails, getEmail, sendEmail, replyToEmail,
  getUnreadCount, archiveEmail, trashEmail,
} from "@/lib/gmail";
import { browseUrl, clickUrl, submitForm, webSearch } from "@/lib/browser";
import {
  listEvents, getEvent, createEvent, updateEvent,
  deleteEvent, findFreeSlots,
} from "@/lib/calendar";
import {
  listFiles, getFile, readFileContent, uploadFile, createFolder,
} from "@/lib/drive";
import {
  listSpreadsheets, readSheet, writeSheet, appendRows, createSpreadsheet,
} from "@/lib/sheets";
import {
  listChannels, listVideos, getVideoAnalytics, searchYouTube,
  listPlaylists as listYouTubePlaylists,
  addToPlaylist as addToYouTubePlaylist,
  getVideoComments as getYouTubeComments,
  replyToComment as replyToYouTubeComment,
} from "@/lib/youtube";
import {
  getProfile as getLinkedInProfile,
  createPost as createLinkedInPost,
  createPostWithLink as createLinkedInPostWithLink,
  getPosts as getLinkedInPosts,
  deletePost as deleteLinkedInPost,
  createImagePost as createLinkedInImagePost,
  commentOnPost as commentOnLinkedInPost,
  reactToPost as reactToLinkedInPost,
} from "@/lib/linkedin";
import {
  getProfile as getTwitterProfile,
  getTimeline as getTwitterTimeline,
  createTweet,
  searchTweets,
  deleteTweet,
  replyToTweet,
  retweet,
  undoRetweet,
  likeTweet,
  unlikeTweet,
  getMentions as getTwitterMentions,
  getFollowers as getTwitterFollowers,
  bookmarkTweet,
  getBookmarks as getTwitterBookmarks,
  getLikedTweets as getTwitterLikedTweets,
  followUser as followTwitterUser,
  unfollowUser as unfollowTwitterUser,
  muteUser as muteTwitterUser,
  blockUser as blockTwitterUser,
} from "@/lib/twitter";
import {
  getProfile as getInstagramProfile,
  getRecentMedia as getInstagramMedia,
  createPost as createInstagramPost,
  getPostComments as getInstagramComments,
  replyToComment as replyToInstagramComment,
  createCarouselPost as createInstagramCarousel,
  createReel as createInstagramReel,
  getPostInsights as getInstagramPostInsights,
  getAccountInsights as getInstagramAccountInsights,
  getStories as getInstagramStories,
  searchHashtag as searchInstagramHashtag,
  deletePost as deleteInstagramPost,
  createStory as createInstagramStory,
  getStoryInsights as getInstagramStoryInsights,
  getTaggedMedia as getInstagramTaggedMedia,
} from "@/lib/instagram";
import {
  getProfile as getFacebookProfile,
  getPages as getFacebookPages,
  getPagePosts as getFacebookPagePosts,
  createPagePost as createFacebookPagePost,
  getPageInsights as getFacebookPageInsights,
  getPostComments as getFacebookPostComments,
  replyToComment as replyToFacebookComment,
  deletePagePost as deleteFacebookPost,
  createPagePhotoPost as createFacebookPhotoPost,
  schedulePagePost as scheduleFacebookPost,
  uploadPageVideo as uploadFacebookVideo,
  createPageReel as createFacebookReel,
  getScheduledPosts as getFacebookScheduledPosts,
  cancelScheduledPost as cancelFacebookScheduledPost,
} from "@/lib/facebook";
import {
  getProfile as getTikTokProfile,
} from "@/lib/tiktok";
import {
  listContacts,
  getContact,
  createContact,
  deleteContact,
} from "@/lib/contacts";
import {
  createNote,
  listNotes,
  getNote,
  updateNote,
  deleteNote,
  searchNotes,
} from "@/lib/notes";
import {
  listTaskLists,
  listTasks,
  createTask as createGoogleTask,
  completeTask,
  deleteTask as deleteGoogleTask,
  clearCompleted,
} from "@/lib/tasks";
import {
  createDocument,
  getDocument,
  appendText,
} from "@/lib/docs";
import {
  listAccounts as listBusinessAccounts,
  listLocations,
  getReviews,
  replyToReview,
  createLocalPost,
} from "@/lib/businessProfile";
import {
  listProperties,
  runReport,
  getRealtimeData,
} from "@/lib/analytics";
import {
  createForm,
  addQuestion,
  getForm,
  getResponses,
} from "@/lib/forms";
import {
  createPresentation,
  getPresentation,
  addSlide,
  insertSlideText,
} from "@/lib/slides";

/* ─── Types ─── */

export interface TaskStep {
  action: string;
  toolName?: string;
  args?: Record<string, any>;
  result?: any;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface Task {
  id: string;
  userId: string;
  conversationId?: string;
  goal: string;
  status: "planning" | "running" | "completed" | "failed" | "waiting_input";
  plan?: string;
  steps: TaskStep[];
  result?: string;
  question?: string;
  savedContents?: any[];
  tokensUsed: number;
  createdAt: string;
  updatedAt: string;
}

/* ─── Constants ─── */

const MAX_STEPS = 25;
const MAX_RETRIES_PER_STEP = 2;

/* ─── Tool Declaration Groups ─── */

const META_TOOLS = [
  {
    name: "report_progress",
    description: "Report what you've accomplished so far to the user. Use this after completing significant steps.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING, description: "Progress update for the user" },
      },
      required: ["summary"],
    },
  },
  {
    name: "task_complete",
    description: "Mark the task as complete and provide the FULL detailed report to the user. The result MUST contain the complete, formatted report — not a summary like 'Done'. Include all data, findings, recommendations, and actionable items with proper markdown formatting, headers, emoji sections, and bullet points. This is what the user will see.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        result: { type: Type.STRING, description: "The COMPLETE formatted report with all findings, data, recommendations, and actionable items. Use markdown with headers, bullet points, and emoji. This is displayed directly to the user." },
      },
      required: ["result"],
    },
  },
];

const GMAIL_TOOLS = [
  {
    name: "search_emails",
    description: "Search or list emails in Gmail. Use Gmail search syntax.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: "Gmail search query" },
        max_results: { type: Type.NUMBER, description: "Max emails to return (1-20)" },
      },
    },
  },
  {
    name: "read_email",
    description: "Read full content of a specific email by message ID.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        message_id: { type: Type.STRING, description: "Gmail message ID" },
      },
      required: ["message_id"],
    },
  },
  {
    name: "send_email",
    description: "Send a new email.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        to: { type: Type.STRING, description: "Recipient email" },
        subject: { type: Type.STRING, description: "Subject line" },
        body: { type: Type.STRING, description: "Email body" },
      },
      required: ["to", "subject", "body"],
    },
  },
  {
    name: "reply_to_email",
    description: "Reply to an email thread.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        message_id: { type: Type.STRING, description: "Message ID to reply to" },
        body: { type: Type.STRING, description: "Reply body" },
      },
      required: ["message_id", "body"],
    },
  },
  {
    name: "get_unread_count",
    description: "Get count of unread inbox emails.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "archive_email",
    description: "Archive an email (remove from inbox).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        message_id: { type: Type.STRING, description: "Message ID to archive" },
      },
      required: ["message_id"],
    },
  },
  {
    name: "trash_email",
    description: "Move an email to trash.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        message_id: { type: Type.STRING, description: "Message ID to trash" },
      },
      required: ["message_id"],
    },
  },
];

const CALENDAR_TOOLS = [
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
      properties: { event_id: { type: Type.STRING, description: "Calendar event ID" } },
      required: ["event_id"],
    },
  },
  {
    name: "create_event",
    description: "Create a new calendar event",
    parameters: {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING, description: "Event title" },
        start_time: { type: Type.STRING, description: "Start time (ISO 8601)" },
        end_time: { type: Type.STRING, description: "End time (ISO 8601)" },
        description: { type: Type.STRING, description: "Event description" },
        attendees: { type: Type.STRING, description: "Comma-separated email addresses" },
        location: { type: Type.STRING, description: "Event location" },
      },
      required: ["summary", "start_time", "end_time"],
    },
  },
  {
    name: "find_free_slots",
    description: "Check availability / free time on a specific date (8 AM - 6 PM)",
    parameters: {
      type: Type.OBJECT,
      properties: { date: { type: Type.STRING, description: "Date to check (YYYY-MM-DD)" } },
      required: ["date"],
    },
  },
];

const BROWSER_TOOLS = [
  {
    name: "browse_url",
    description: "Fetch and read the content of any web page. Returns the page title, extracted text, and optionally all links.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        url: { type: Type.STRING, description: "The URL to browse" },
        extract_links: { type: Type.BOOLEAN, description: "Set true to also extract all links on the page" },
      },
      required: ["url"],
    },
  },
  {
    name: "click_url",
    description: "Navigate to / click a URL. Makes a GET request and follows redirects.",
    parameters: {
      type: Type.OBJECT,
      properties: { url: { type: Type.STRING, description: "The URL to click/navigate to" } },
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
        data: { type: Type.STRING, description: "JSON string of key-value pairs to submit" },
        content_type: { type: Type.STRING, description: "'form' (default) or 'json'" },
      },
      required: ["url", "data"],
    },
  },
  {
    name: "web_search",
    description: "Search the web for information. Returns a list of results with titles, URLs, and snippets.",
    parameters: {
      type: Type.OBJECT,
      properties: { query: { type: Type.STRING, description: "Search query" } },
      required: ["query"],
    },
  },
];

const NOTES_TOOLS = [
  { name: "create_note", description: "Create a note for the user.", parameters: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, content: { type: Type.STRING }, tags: { type: Type.STRING, description: "Comma-separated tags" } }, required: ["title", "content"] } },
  { name: "list_notes", description: "List the user's saved notes.", parameters: { type: Type.OBJECT, properties: { tag: { type: Type.STRING }, max_results: { type: Type.NUMBER } } } },
  { name: "get_note", description: "Get a note by ID.", parameters: { type: Type.OBJECT, properties: { note_id: { type: Type.STRING } }, required: ["note_id"] } },
  { name: "update_note", description: "Update a note.", parameters: { type: Type.OBJECT, properties: { note_id: { type: Type.STRING }, title: { type: Type.STRING }, content: { type: Type.STRING }, tags: { type: Type.STRING } }, required: ["note_id"] } },
  { name: "delete_note", description: "Delete a note.", parameters: { type: Type.OBJECT, properties: { note_id: { type: Type.STRING } }, required: ["note_id"] } },
  { name: "search_notes", description: "Search notes by keyword.", parameters: { type: Type.OBJECT, properties: { query: { type: Type.STRING }, max_results: { type: Type.NUMBER } }, required: ["query"] } },
];

const DRIVE_TOOLS = [
  { name: "list_drive_files", description: "List/search files in Google Drive.", parameters: { type: Type.OBJECT, properties: { query: { type: Type.STRING }, max_results: { type: Type.NUMBER } } } },
  { name: "get_drive_file", description: "Get file metadata.", parameters: { type: Type.OBJECT, properties: { file_id: { type: Type.STRING } }, required: ["file_id"] } },
  { name: "read_drive_file", description: "Read file content.", parameters: { type: Type.OBJECT, properties: { file_id: { type: Type.STRING } }, required: ["file_id"] } },
  { name: "upload_drive_file", description: "Upload/create a file.", parameters: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, content: { type: Type.STRING }, mime_type: { type: Type.STRING }, folder_id: { type: Type.STRING } }, required: ["name", "content"] } },
  { name: "create_drive_folder", description: "Create a folder.", parameters: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, parent_id: { type: Type.STRING } }, required: ["name"] } },
];

const SHEETS_TOOLS = [
  { name: "list_spreadsheets", description: "List spreadsheets.", parameters: { type: Type.OBJECT, properties: { max_results: { type: Type.NUMBER } } } },
  { name: "read_sheet", description: "Read sheet data (A1 notation).", parameters: { type: Type.OBJECT, properties: { spreadsheet_id: { type: Type.STRING }, range: { type: Type.STRING } }, required: ["spreadsheet_id", "range"] } },
  { name: "write_sheet", description: "Write to cells.", parameters: { type: Type.OBJECT, properties: { spreadsheet_id: { type: Type.STRING }, range: { type: Type.STRING }, values: { type: Type.STRING, description: "JSON array of arrays" } }, required: ["spreadsheet_id", "range", "values"] } },
  { name: "append_to_sheet", description: "Append rows.", parameters: { type: Type.OBJECT, properties: { spreadsheet_id: { type: Type.STRING }, range: { type: Type.STRING }, values: { type: Type.STRING, description: "JSON array of arrays" } }, required: ["spreadsheet_id", "range", "values"] } },
  { name: "create_spreadsheet", description: "Create a new spreadsheet.", parameters: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, sheet_names: { type: Type.STRING, description: "Comma-separated sheet names" } }, required: ["title"] } },
];

const YOUTUBE_TOOLS = [
  { name: "list_youtube_channels", description: "List user's YouTube channels.", parameters: { type: Type.OBJECT, properties: {} } },
  { name: "list_youtube_videos", description: "List videos on a channel.", parameters: { type: Type.OBJECT, properties: { channel_id: { type: Type.STRING }, max_results: { type: Type.NUMBER } } } },
  { name: "get_youtube_analytics", description: "Get video analytics.", parameters: { type: Type.OBJECT, properties: { video_id: { type: Type.STRING } }, required: ["video_id"] } },
  { name: "search_youtube", description: "Search YouTube.", parameters: { type: Type.OBJECT, properties: { query: { type: Type.STRING }, max_results: { type: Type.NUMBER } }, required: ["query"] } },
  { name: "get_youtube_comments", description: "Get comments on a video.", parameters: { type: Type.OBJECT, properties: { video_id: { type: Type.STRING }, max_results: { type: Type.NUMBER } }, required: ["video_id"] } },
  { name: "reply_to_youtube_comment", description: "Reply to a YouTube comment.", parameters: { type: Type.OBJECT, properties: { comment_id: { type: Type.STRING }, text: { type: Type.STRING } }, required: ["comment_id", "text"] } },
];

const CONTACTS_TOOLS = [
  { name: "list_contacts", description: "List contacts.", parameters: { type: Type.OBJECT, properties: { search: { type: Type.STRING }, max_results: { type: Type.NUMBER } } } },
  { name: "create_contact", description: "Create a contact.", parameters: { type: Type.OBJECT, properties: { first_name: { type: Type.STRING }, last_name: { type: Type.STRING }, email: { type: Type.STRING }, phone: { type: Type.STRING }, company: { type: Type.STRING }, title: { type: Type.STRING } }, required: ["first_name"] } },
];

const LINKEDIN_TOOLS = [
  { name: "get_linkedin_profile", description: "Get LinkedIn profile.", parameters: { type: Type.OBJECT, properties: {} } },
  { name: "create_linkedin_post", description: "Create a LinkedIn post.", parameters: { type: Type.OBJECT, properties: { text: { type: Type.STRING } }, required: ["text"] } },
  { name: "get_linkedin_posts", description: "Get recent LinkedIn posts.", parameters: { type: Type.OBJECT, properties: { count: { type: Type.NUMBER } } } },
];

const TWITTER_TOOLS = [
  { name: "get_twitter_profile", description: "Get X/Twitter profile.", parameters: { type: Type.OBJECT, properties: {} } },
  { name: "get_twitter_timeline", description: "Get recent tweets.", parameters: { type: Type.OBJECT, properties: { max_results: { type: Type.NUMBER } } } },
  { name: "create_tweet", description: "Post a tweet.", parameters: { type: Type.OBJECT, properties: { text: { type: Type.STRING } }, required: ["text"] } },
  { name: "search_tweets", description: "Search tweets.", parameters: { type: Type.OBJECT, properties: { query: { type: Type.STRING }, max_results: { type: Type.NUMBER } }, required: ["query"] } },
  { name: "get_twitter_mentions", description: "Get mentions.", parameters: { type: Type.OBJECT, properties: { max_results: { type: Type.NUMBER } } } },
  { name: "like_tweet", description: "Like a tweet.", parameters: { type: Type.OBJECT, properties: { tweet_id: { type: Type.STRING } }, required: ["tweet_id"] } },
  { name: "reply_to_tweet", description: "Reply to a tweet.", parameters: { type: Type.OBJECT, properties: { tweet_id: { type: Type.STRING }, text: { type: Type.STRING } }, required: ["tweet_id", "text"] } },
];

const INSTAGRAM_TOOLS = [
  { name: "get_instagram_profile", description: "Get Instagram profile.", parameters: { type: Type.OBJECT, properties: {} } },
  { name: "get_instagram_media", description: "Get recent posts.", parameters: { type: Type.OBJECT, properties: { max_results: { type: Type.NUMBER } } } },
  { name: "get_instagram_comments", description: "Get comments on a post.", parameters: { type: Type.OBJECT, properties: { media_id: { type: Type.STRING } }, required: ["media_id"] } },
  { name: "reply_to_instagram_comment", description: "Reply to a comment.", parameters: { type: Type.OBJECT, properties: { media_id: { type: Type.STRING }, comment_id: { type: Type.STRING }, text: { type: Type.STRING } }, required: ["media_id", "comment_id", "text"] } },
  { name: "get_instagram_post_insights", description: "Get post insights.", parameters: { type: Type.OBJECT, properties: { media_id: { type: Type.STRING } }, required: ["media_id"] } },
  { name: "get_instagram_account_insights", description: "Get account insights.", parameters: { type: Type.OBJECT, properties: { period: { type: Type.STRING }, days: { type: Type.NUMBER } } } },
];

const FACEBOOK_TOOLS = [
  { name: "get_facebook_pages", description: "List Facebook pages.", parameters: { type: Type.OBJECT, properties: {} } },
  { name: "get_facebook_page_posts", description: "Get page posts.", parameters: { type: Type.OBJECT, properties: { page_id: { type: Type.STRING }, max_results: { type: Type.NUMBER } }, required: ["page_id"] } },
  { name: "create_facebook_page_post", description: "Create a page post.", parameters: { type: Type.OBJECT, properties: { page_id: { type: Type.STRING }, message: { type: Type.STRING }, link: { type: Type.STRING } }, required: ["page_id", "message"] } },
  { name: "get_facebook_post_comments", description: "Get comments on a post.", parameters: { type: Type.OBJECT, properties: { post_id: { type: Type.STRING } }, required: ["post_id"] } },
  { name: "reply_to_facebook_comment", description: "Reply to a comment.", parameters: { type: Type.OBJECT, properties: { comment_id: { type: Type.STRING }, message: { type: Type.STRING } }, required: ["comment_id", "message"] } },
  { name: "get_facebook_page_insights", description: "Get page insights.", parameters: { type: Type.OBJECT, properties: { page_id: { type: Type.STRING }, period: { type: Type.STRING }, days: { type: Type.NUMBER } }, required: ["page_id"] } },
];

const TIKTOK_TOOLS = [
  { name: "get_tiktok_profile", description: "Get TikTok profile stats.", parameters: { type: Type.OBJECT, properties: {} } },
];

const DOCS_TOOLS = [
  { name: "create_document", description: "Create a Google Doc.", parameters: { type: Type.OBJECT, properties: { title: { type: Type.STRING } }, required: ["title"] } },
  { name: "get_document", description: "Get document content.", parameters: { type: Type.OBJECT, properties: { document_id: { type: Type.STRING } }, required: ["document_id"] } },
  { name: "append_doc_text", description: "Append text to a doc.", parameters: { type: Type.OBJECT, properties: { document_id: { type: Type.STRING }, text: { type: Type.STRING } }, required: ["document_id", "text"] } },
];

const TASKS_TOOLS = [
  { name: "list_task_lists", description: "List Google Task lists.", parameters: { type: Type.OBJECT, properties: {} } },
  { name: "list_google_tasks", description: "List tasks in a list.", parameters: { type: Type.OBJECT, properties: { task_list_id: { type: Type.STRING }, show_completed: { type: Type.BOOLEAN } } } },
  { name: "create_google_task", description: "Create a task.", parameters: { type: Type.OBJECT, properties: { task_list_id: { type: Type.STRING }, title: { type: Type.STRING }, notes: { type: Type.STRING }, due: { type: Type.STRING } }, required: ["task_list_id", "title"] } },
  { name: "complete_google_task", description: "Complete a task.", parameters: { type: Type.OBJECT, properties: { task_list_id: { type: Type.STRING }, task_id: { type: Type.STRING } }, required: ["task_list_id", "task_id"] } },
];

const BUSINESS_TOOLS = [
  { name: "list_business_accounts", description: "List Google Business accounts.", parameters: { type: Type.OBJECT, properties: {} } },
  { name: "list_business_locations", description: "List business locations.", parameters: { type: Type.OBJECT, properties: { account_id: { type: Type.STRING } }, required: ["account_id"] } },
  { name: "get_business_reviews", description: "Get reviews.", parameters: { type: Type.OBJECT, properties: { location_name: { type: Type.STRING } }, required: ["location_name"] } },
  { name: "reply_to_business_review", description: "Reply to a review.", parameters: { type: Type.OBJECT, properties: { review_name: { type: Type.STRING }, comment: { type: Type.STRING } }, required: ["review_name", "comment"] } },
];

const ANALYTICS_TOOLS_DECL = [
  { name: "list_analytics_properties", description: "List GA4 properties.", parameters: { type: Type.OBJECT, properties: {} } },
  { name: "run_analytics_report", description: "Run a GA4 report.", parameters: { type: Type.OBJECT, properties: { property_id: { type: Type.STRING }, start_date: { type: Type.STRING }, end_date: { type: Type.STRING }, dimensions: { type: Type.STRING }, metrics: { type: Type.STRING } }, required: ["property_id", "start_date", "end_date", "metrics"] } },
  { name: "get_realtime_analytics", description: "Get real-time visitors.", parameters: { type: Type.OBJECT, properties: { property_id: { type: Type.STRING } }, required: ["property_id"] } },
];

const FORMS_TOOLS = [
  { name: "create_google_form", description: "Create a Google Form.", parameters: { type: Type.OBJECT, properties: { title: { type: Type.STRING } }, required: ["title"] } },
  { name: "add_form_question", description: "Add a question to a form.", parameters: { type: Type.OBJECT, properties: { form_id: { type: Type.STRING }, title: { type: Type.STRING }, question_type: { type: Type.STRING }, options: { type: Type.STRING } }, required: ["form_id", "title", "question_type"] } },
  { name: "get_google_form", description: "Get form details.", parameters: { type: Type.OBJECT, properties: { form_id: { type: Type.STRING } }, required: ["form_id"] } },
  { name: "get_form_responses", description: "Get form responses.", parameters: { type: Type.OBJECT, properties: { form_id: { type: Type.STRING } }, required: ["form_id"] } },
];

const SLIDES_TOOLS = [
  { name: "create_presentation", description: "Create a Google Slides presentation.", parameters: { type: Type.OBJECT, properties: { title: { type: Type.STRING } }, required: ["title"] } },
  { name: "add_presentation_slide", description: "Add a slide.", parameters: { type: Type.OBJECT, properties: { presentation_id: { type: Type.STRING }, layout: { type: Type.STRING } }, required: ["presentation_id"] } },
  { name: "insert_slide_text", description: "Insert text into a slide.", parameters: { type: Type.OBJECT, properties: { presentation_id: { type: Type.STRING }, slide_id: { type: Type.STRING }, text: { type: Type.STRING } }, required: ["presentation_id", "slide_id", "text"] } },
];

/* ─── Tool Executor ─── */

async function executeTool(
  userId: string,
  toolName: string,
  args: Record<string, any>
): Promise<any> {
  switch (toolName) {
    // Gmail
    case "search_emails":
      return await listEmails(userId, args.query, args.max_results || 10);
    case "read_email":
      return await getEmail(userId, args.message_id);
    case "send_email":
      return await sendEmail(userId, args.to, args.subject, args.body);
    case "reply_to_email":
      return await replyToEmail(userId, args.message_id, args.body);
    case "get_unread_count":
      return { unread_count: await getUnreadCount(userId) };
    case "archive_email":
      await archiveEmail(userId, args.message_id);
      return { success: true, action: "archived" };
    case "trash_email":
      await trashEmail(userId, args.message_id);
      return { success: true, action: "trashed" };
    // Browser
    case "browse_url":
      return await browseUrl(args.url, { extractLinks: args.extract_links });
    case "click_url":
      return await clickUrl(args.url);
    case "submit_form": {
      const formData = typeof args.data === "string" ? JSON.parse(args.data) : args.data;
      return await submitForm(args.url, formData, args.content_type);
    }
    case "web_search":
      return await webSearch(args.query);
    // Calendar
    case "list_events":
      return await listEvents(userId, args.time_min, args.time_max, args.max_results || 10);
    case "get_event":
      return await getEvent(userId, args.event_id);
    case "create_event": {
      const attendeeList = args.attendees ? args.attendees.split(",").map((e: string) => e.trim()) : undefined;
      return await createEvent(userId, args.summary, args.start_time, args.end_time, args.description, attendeeList, args.location);
    }
    case "update_event":
      return await updateEvent(userId, args.event_id, {
        summary: args.summary, description: args.description,
        startTime: args.start_time, endTime: args.end_time, location: args.location,
      });
    case "delete_event":
      return await deleteEvent(userId, args.event_id);
    case "find_free_slots":
      return await findFreeSlots(userId, args.date);
    // Drive
    case "list_drive_files":
      return await listFiles(userId, args.query, args.max_results || 10);
    case "get_drive_file":
      return await getFile(userId, args.file_id);
    case "read_drive_file":
      return await readFileContent(userId, args.file_id);
    case "upload_drive_file":
      return await uploadFile(userId, args.name, args.content, args.mime_type, args.folder_id);
    case "create_drive_folder":
      return await createFolder(userId, args.name, args.parent_id);
    // Sheets
    case "list_spreadsheets":
      return await listSpreadsheets(userId, args.max_results || 10);
    case "read_sheet":
      return await readSheet(userId, args.spreadsheet_id, args.range);
    case "write_sheet": {
      const vals = typeof args.values === "string" ? JSON.parse(args.values) : args.values;
      return await writeSheet(userId, args.spreadsheet_id, args.range, vals);
    }
    case "append_to_sheet": {
      const appendVals = typeof args.values === "string" ? JSON.parse(args.values) : args.values;
      return await appendRows(userId, args.spreadsheet_id, args.range, appendVals);
    }
    case "create_spreadsheet": {
      const sheetNames = args.sheet_names ? args.sheet_names.split(",").map((s: string) => s.trim()) : undefined;
      return await createSpreadsheet(userId, args.title, sheetNames);
    }
    // YouTube
    case "list_youtube_channels":
      return await listChannels(userId);
    case "list_youtube_videos":
      return await listVideos(userId, args.channel_id, args.max_results || 10);
    case "get_youtube_analytics":
      return await getVideoAnalytics(userId, args.video_id);
    case "search_youtube":
      return await searchYouTube(userId, args.query, args.max_results || 5);
    case "list_youtube_playlists":
      return await listYouTubePlaylists(userId);
    case "add_to_youtube_playlist":
      return await addToYouTubePlaylist(userId, args.playlist_id, args.video_id);
    case "get_youtube_comments":
      return await getYouTubeComments(userId, args.video_id, args.max_results || 10);
    case "reply_to_youtube_comment":
      return await replyToYouTubeComment(userId, args.comment_id, args.text);
    // LinkedIn
    case "get_linkedin_profile":
      return await getLinkedInProfile(userId);
    case "create_linkedin_post":
      return await createLinkedInPost(userId, args.text);
    case "create_linkedin_post_with_link":
      return await createLinkedInPostWithLink(userId, args.text, args.url, args.title);
    case "get_linkedin_posts":
      return await getLinkedInPosts(userId, args.count || 10);
    case "delete_linkedin_post":
      return await deleteLinkedInPost(userId, args.post_id);
    case "create_linkedin_image_post":
      return await createLinkedInImagePost(userId, args.text, args.image_url);
    case "comment_on_linkedin_post":
      return await commentOnLinkedInPost(userId, args.post_urn, args.text);
    case "react_to_linkedin_post":
      return await reactToLinkedInPost(userId, args.post_urn, args.reaction_type || "LIKE");
    // Twitter
    case "get_twitter_profile":
      return await getTwitterProfile(userId);
    case "get_twitter_timeline":
      return await getTwitterTimeline(userId, args.max_results || 10);
    case "create_tweet":
      return await createTweet(userId, args.text);
    case "search_tweets":
      return await searchTweets(userId, args.query, args.max_results || 10);
    case "delete_tweet":
      return await deleteTweet(userId, args.tweet_id);
    case "reply_to_tweet":
      return await replyToTweet(userId, args.tweet_id, args.text);
    case "retweet":
      return await retweet(userId, args.tweet_id);
    case "undo_retweet":
      return await undoRetweet(userId, args.tweet_id);
    case "like_tweet":
      return await likeTweet(userId, args.tweet_id);
    case "unlike_tweet":
      return await unlikeTweet(userId, args.tweet_id);
    case "get_twitter_mentions":
      return await getTwitterMentions(userId, args.max_results || 10);
    case "get_twitter_followers":
      return await getTwitterFollowers(userId, args.max_results || 20);
    case "bookmark_tweet":
      return await bookmarkTweet(userId, args.tweet_id);
    case "get_twitter_bookmarks":
      return await getTwitterBookmarks(userId, args.max_results || 10);
    case "get_twitter_liked_tweets":
      return await getTwitterLikedTweets(userId, args.max_results || 10);
    case "follow_twitter_user":
      return await followTwitterUser(userId, args.target_user_id);
    case "unfollow_twitter_user":
      return await unfollowTwitterUser(userId, args.target_user_id);
    case "mute_twitter_user":
      return await muteTwitterUser(userId, args.target_user_id);
    case "block_twitter_user":
      return await blockTwitterUser(userId, args.target_user_id);
    // Instagram
    case "get_instagram_profile":
      return await getInstagramProfile(userId);
    case "get_instagram_media":
      return await getInstagramMedia(userId, args.max_results || 10);
    case "create_instagram_post":
      return await createInstagramPost(userId, args.image_url, args.caption);
    case "get_instagram_comments":
      return await getInstagramComments(userId, args.media_id);
    case "reply_to_instagram_comment":
      return await replyToInstagramComment(userId, args.media_id, args.comment_id, args.text);
    case "create_instagram_carousel":
      return await createInstagramCarousel(userId, args.image_urls, args.caption);
    case "create_instagram_reel":
      return await createInstagramReel(userId, args.video_url, args.caption);
    case "get_instagram_post_insights":
      return await getInstagramPostInsights(userId, args.media_id);
    case "get_instagram_account_insights":
      return await getInstagramAccountInsights(userId, args.period || "day", args.days || 7);
    case "get_instagram_stories":
      return await getInstagramStories(userId);
    case "search_instagram_hashtag":
      return await searchInstagramHashtag(userId, args.hashtag);
    case "delete_instagram_post":
      return await deleteInstagramPost(userId, args.media_id);
    case "create_instagram_story":
      return await createInstagramStory(userId, args.media_url, args.media_type || "IMAGE");
    case "get_instagram_story_insights":
      return await getInstagramStoryInsights(userId, args.story_id);
    case "get_instagram_tagged_media":
      return await getInstagramTaggedMedia(userId);
    // Facebook
    case "get_facebook_profile":
      return await getFacebookProfile(userId);
    case "get_facebook_pages":
      return await getFacebookPages(userId);
    case "get_facebook_page_posts":
      return await getFacebookPagePosts(userId, args.page_id, args.max_results || 10);
    case "create_facebook_page_post":
      return await createFacebookPagePost(userId, args.page_id, args.message, args.link);
    case "get_facebook_page_insights":
      return await getFacebookPageInsights(userId, args.page_id, args.period || "day", args.days || 7);
    case "get_facebook_post_comments":
      return await getFacebookPostComments(userId, args.post_id);
    case "reply_to_facebook_comment":
      return await replyToFacebookComment(userId, args.comment_id, args.message);
    case "delete_facebook_post":
      return await deleteFacebookPost(userId, args.post_id);
    case "create_facebook_photo_post":
      return await createFacebookPhotoPost(userId, args.page_id, args.image_url, args.caption);
    case "schedule_facebook_post":
      return await scheduleFacebookPost(userId, args.page_id, args.message, args.scheduled_time, args.link);
    case "upload_facebook_video":
      return await uploadFacebookVideo(userId, args.page_id, args.video_url, args.title, args.description);
    case "create_facebook_reel":
      return await createFacebookReel(userId, args.page_id, args.video_url, args.description);
    case "get_facebook_scheduled_posts":
      return await getFacebookScheduledPosts(userId, args.page_id);
    case "cancel_facebook_scheduled_post":
      return await cancelFacebookScheduledPost(userId, args.post_id);
    // TikTok
    case "get_tiktok_profile":
      return await getTikTokProfile(userId);
    // Contacts
    case "list_contacts":
      return await listContacts(userId, args.search, args.max_results || 20);
    case "get_contact":
      return await getContact(userId, args.resource_name);
    case "create_contact":
      return await createContact(userId, args.first_name, args.last_name, args.email, args.phone, args.company, args.title);
    case "delete_contact":
      return await deleteContact(userId, args.resource_name);
    // Notes
    case "create_note": {
      const tags = args.tags ? (typeof args.tags === "string" ? args.tags.split(",").map((t: string) => t.trim()) : args.tags) : [];
      return await createNote(userId, args.title, args.content, tags);
    }
    case "list_notes":
      return await listNotes(userId, args.tag, args.max_results || 20);
    case "get_note":
      return await getNote(userId, args.note_id);
    case "update_note":
      return await updateNote(userId, args.note_id, { title: args.title, content: args.content, tags: args.tags });
    case "delete_note":
      return await deleteNote(userId, args.note_id);
    case "search_notes":
      return await searchNotes(userId, args.query, args.max_results || 10);
    // Google Tasks
    case "list_task_lists":
      return await listTaskLists(userId);
    case "list_google_tasks":
      return await listTasks(userId, args.task_list_id, args.show_completed || false);
    case "create_google_task":
      return await createGoogleTask(userId, args.task_list_id, args.title, args.notes, args.due);
    case "complete_google_task":
      return await completeTask(userId, args.task_list_id, args.task_id);
    case "delete_google_task":
      return await deleteGoogleTask(userId, args.task_list_id, args.task_id);
    case "clear_completed_tasks":
      return await clearCompleted(userId, args.task_list_id);
    // Google Docs
    case "create_document":
      return await createDocument(userId, args.title);
    case "get_document":
      return await getDocument(userId, args.document_id);
    case "append_doc_text":
      return await appendText(userId, args.document_id, args.text);
    // Business Profile
    case "list_business_accounts":
      return await listBusinessAccounts(userId);
    case "list_business_locations":
      return await listLocations(userId, args.account_id);
    case "get_business_reviews":
      return await getReviews(userId, args.location_name);
    case "reply_to_business_review":
      return await replyToReview(userId, args.review_name, args.comment);
    case "create_business_post": {
      const cta = args.cta_type ? { actionType: args.cta_type, url: args.cta_url } : undefined;
      return await createLocalPost(userId, args.location_name, args.summary, cta);
    }
    // Analytics
    case "list_analytics_properties":
      return await listProperties(userId);
    case "run_analytics_report": {
      const dims = args.dimensions ? args.dimensions.split(",").map((d: string) => d.trim()) : [];
      const mets = args.metrics.split(",").map((m: string) => m.trim());
      return await runReport(userId, args.property_id, args.start_date, args.end_date, dims, mets);
    }
    case "get_realtime_analytics":
      return await getRealtimeData(userId, args.property_id);
    // Forms
    case "create_google_form":
      return await createForm(userId, args.title);
    case "add_form_question": {
      const opts = args.options ? args.options.split(",").map((o: string) => o.trim()) : undefined;
      return await addQuestion(userId, args.form_id, args.title, args.question_type, opts);
    }
    case "get_google_form":
      return await getForm(userId, args.form_id);
    case "get_form_responses":
      return await getResponses(userId, args.form_id);
    // Slides
    case "create_presentation":
      return await createPresentation(userId, args.title);
    case "get_presentation":
      return await getPresentation(userId, args.presentation_id);
    case "add_presentation_slide":
      return await addSlide(userId, args.presentation_id, args.layout || "TITLE_AND_BODY");
    case "insert_slide_text":
      return await insertSlideText(userId, args.presentation_id, args.slide_id, args.text);
    // Meta tools
    case "report_progress":
      return { acknowledged: true };
    case "task_complete":
      return { acknowledged: true };
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

/* ─── Firestore Helpers ─── */

async function updateTask(taskId: string, updates: Partial<Task>) {
  await adminDb.doc(`tasks/${taskId}`).update({
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

async function addStep(taskId: string, step: TaskStep, steps: TaskStep[]) {
  steps.push(step);
  await updateTask(taskId, { steps });
}

async function updateStep(
  taskId: string,
  steps: TaskStep[],
  index: number,
  updates: Partial<TaskStep>
) {
  steps[index] = { ...steps[index], ...updates };
  await updateTask(taskId, { steps });
}

/* ─── API Key Helper ─── */

async function getApiKey(userId: string): Promise<string> {
  const platformKey = process.env.GOOGLE_GENAI_API_KEY?.trim() || "";
  try {
    const brainSnap = await adminDb.doc(`users/${userId}/settings/brain`).get();
    if (brainSnap.exists) {
      const brain = brainSnap.data() as { apiKey?: string };
      if (
        brain.apiKey &&
        brain.apiKey.length > 20 &&
        !brain.apiKey.includes("dummy") &&
        !brain.apiKey.includes("placeholder") &&
        !brain.apiKey.includes("your-api-key")
      ) {
        return brain.apiKey;
      }
    }
  } catch {}
  return platformKey;
}

/* ─── User Context Helpers ─── */

async function loadMemories(userId: string): Promise<string[]> {
  try {
    const snap = await adminDb
      .collection(`users/${userId}/memories`)
      .limit(50)
      .get();
    return snap.docs.map((d) => d.data().content as string);
  } catch {
    return [];
  }
}

async function loadUserTimezone(userId: string): Promise<string> {
  try {
    const snap = await adminDb.doc(`users/${userId}/settings/preferences`).get();
    return snap.exists ? (snap.data()?.timezone || "America/New_York") : "America/New_York";
  } catch {
    return "America/New_York";
  }
}

/* ─── Connections Helper ─── */

async function getAvailableTools(userId: string) {
  try {
    const snap = await adminDb.doc(`users/${userId}/settings/connections`).get();
    const connections = snap.exists ? (snap.data() as Record<string, any>) : {};
    const tools: any[] = [];
    const services: string[] = [];

    // Gmail
    if (connections.gmail?.connected) {
      tools.push(...GMAIL_TOOLS);
      services.push("Gmail");
    }
    // Calendar
    if (connections.calendar?.connected) {
      tools.push(...CALENDAR_TOOLS);
      services.push("Google Calendar");
    }
    // Drive
    if (connections.drive?.connected) {
      tools.push(...DRIVE_TOOLS);
      services.push("Google Drive");
    }
    // Sheets
    if (connections.sheets?.connected) {
      tools.push(...SHEETS_TOOLS);
      services.push("Google Sheets");
    }
    // YouTube
    if (connections.youtube?.connected) {
      tools.push(...YOUTUBE_TOOLS);
      services.push("YouTube");
    }
    // LinkedIn
    if (connections.linkedin?.connected) {
      tools.push(...LINKEDIN_TOOLS);
      services.push("LinkedIn");
    }
    // Twitter/X
    if (connections.twitter?.connected) {
      tools.push(...TWITTER_TOOLS);
      services.push("X/Twitter");
    }
    // Instagram
    if (connections.instagram?.connected) {
      tools.push(...INSTAGRAM_TOOLS);
      services.push("Instagram");
    }
    // Facebook
    if (connections.facebook?.connected) {
      tools.push(...FACEBOOK_TOOLS);
      services.push("Facebook");
    }
    // TikTok
    if (connections.tiktok?.connected) {
      tools.push(...TIKTOK_TOOLS);
      services.push("TikTok");
    }
    // Contacts (use any Google connection)
    if (connections.gmail?.connected || connections.calendar?.connected || connections.drive?.connected) {
      tools.push(...CONTACTS_TOOLS);
      services.push("Google Contacts");
    }
    // Google Tasks
    if (connections.tasks?.connected) {
      tools.push(...TASKS_TOOLS);
      services.push("Google Tasks");
    }
    // Google Docs
    if (connections.docs?.connected) {
      tools.push(...DOCS_TOOLS);
      services.push("Google Docs");
    }
    // Business Profile
    if (connections.business?.connected) {
      tools.push(...BUSINESS_TOOLS);
      services.push("Google Business Profile");
    }
    // Analytics
    if (connections.analytics?.connected) {
      tools.push(...ANALYTICS_TOOLS_DECL);
      services.push("Google Analytics");
    }
    // Forms
    if (connections.forms?.connected) {
      tools.push(...FORMS_TOOLS);
      services.push("Google Forms");
    }
    // Slides
    if (connections.slides?.connected) {
      tools.push(...SLIDES_TOOLS);
      services.push("Google Slides");
    }

    // Always include: meta-tools, browser, notes
    tools.push(...META_TOOLS);
    tools.push(...BROWSER_TOOLS);
    tools.push(...NOTES_TOOLS);
    services.push("Web Browsing", "Notes");

    return { tools, services, connections };
  } catch {
    return {
      tools: [...META_TOOLS, ...BROWSER_TOOLS, ...NOTES_TOOLS],
      services: ["Web Browsing", "Notes"],
      connections: {},
    };
  }
}

/* ─── Main Engine ─── */

export async function createTask(
  userId: string,
  goal: string,
  conversationId?: string,
  apiKey?: string
): Promise<string> {
  const now = new Date().toISOString();
  const taskRef = adminDb.collection("tasks").doc();
  const task: Omit<Task, "id"> & { apiKey?: string } = {
    userId,
    conversationId,
    goal,
    status: "planning",
    steps: [],
    tokensUsed: 0,
    createdAt: now,
    updatedAt: now,
  };
  // Store API key temporarily in task doc so executeTask can use it
  if (apiKey) (task as any)._apiKey = apiKey;
  await taskRef.set(task);
  return taskRef.id;
}

export async function executeTask(taskId: string, overrideApiKey?: string): Promise<string> {
  const taskSnap = await adminDb.doc(`tasks/${taskId}`).get();
  if (!taskSnap.exists) throw new Error("Task not found");

  const taskData = taskSnap.data() as any;
  const task = { id: taskId, ...taskData } as Task;
  const { userId, goal } = task;

  // Use override key, then task-stored key, then resolve from user/platform
  let apiKey = overrideApiKey || taskData._apiKey || "";
  if (!apiKey) apiKey = await getApiKey(userId);
  
  // Clean up the stored key from Firestore
  if (taskData._apiKey) {
    await adminDb.doc(`tasks/${taskId}`).update({ _apiKey: null });
  }
  if (!apiKey) {
    await updateTask(taskId, { status: "failed", result: "No API key configured." });
    return "No API key configured.";
  }

  const { tools, services } = await getAvailableTools(userId);
  const ai = new GoogleGenAI({ apiKey });

  // Load user context for personalized execution
  const [memories, userTimezone] = await Promise.all([
    loadMemories(userId),
    loadUserTimezone(userId),
  ]);

  // Build system prompt — strongly emphasize reporting
  let systemPrompt = `You are an autonomous AI employee executing a workflow task. You have access to tools and must complete the given goal step by step.

## Available Services: ${services.length > 0 ? services.join(", ") : "None"}

## Current Date & Time
Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: userTimezone })}. Current time: ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short', timeZone: userTimezone })}. User timezone: ${userTimezone}.

## Rules
1. Break the goal into logical steps and execute them one at a time using your tools.
2. After each significant milestone, use report_progress to update the user.
3. If a tool call fails, try a different approach (up to ${MAX_RETRIES_PER_STEP} retries per step).
4. Be efficient — minimize unnecessary tool calls.
5. Never send emails without the content being explicitly specified in the goal.
6. You can browse any website, follow links, search the web, and submit forms.
7. You can save notes using create_note for persistent storage.
8. If the goal asks you to ask the user a question, respond with ONLY the question text — do NOT call task_complete. The system will deliver your question and pause until the user responds.

## CRITICAL: Reporting Requirements
When the goal is accomplished, you MUST call task_complete with the FULL, DETAILED REPORT as the result.
- The result parameter MUST contain the complete formatted report with ALL data, findings, and recommendations.
- Use proper markdown formatting: headers (##), bullet points, emoji sections, bold text, horizontal rules.
- NEVER just say "Done" or "Task completed" — the user needs the actual report.
- Include specific data points, numbers, names, and actionable next steps.
- The report should be comprehensive enough to stand on its own without the user needing to ask follow-up questions.
- Think of this as delivering a professional briefing to a busy executive.`;

  // Inject user memories for context
  if (memories.length > 0) {
    systemPrompt += `\n\n## User Context (from memory)\nThese are facts about the user that may help you execute the task:\n${memories.map((m, i) => `${i + 1}. ${m}`).join("\n")}`;
  }

  const contents: any[] = [
    { role: "user", parts: [{ text: `Execute this task:\n\n${goal}` }] },
  ];

  await updateTask(taskId, { status: "running" });

  const steps: TaskStep[] = [];
  let stepCount = 0;
  let finalResult = "";
  let consecutiveErrors = 0;

  while (stepCount < MAX_STEPS) {
    // Call Gemini
    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents,
        config: {
          systemInstruction: systemPrompt,
          tools: [{ functionDeclarations: tools }],
        },
      });
    } catch (err: any) {
      console.error(`[TaskEngine] Gemini error at step ${stepCount}:`, err.message);
      await updateTask(taskId, {
        status: "failed",
        result: `AI error: ${err.message}`,
        steps,
      });
      return `Task failed: ${err.message}`;
    }

    const candidate = response.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    // Check for function call
    const fnCallPart = parts.find((p: any) => p.functionCall);

    if (!fnCallPart?.functionCall) {
      // No function call — model gave a text response
      const textResponse = response.text || "";

      // If the model is asking a question (not calling task_complete),
      // pause the task and write the question to the conversation
      if (textResponse && task.conversationId) {
        // Save state for resumption
        await updateTask(taskId, {
          status: "waiting_input",
          question: textResponse,
          savedContents: contents,
          steps,
        });

        // Write the question to the conversation
        const convRef = adminDb.doc(`conversations/${task.conversationId}`);
        const convSnap = await convRef.get();
        const existingMsgs = convSnap.exists ? (convSnap.data()?.messages || []) : [];
        const now = new Date().toISOString();
        await convRef.update({
          messages: [
            ...existingMsgs,
            { role: "model", content: textResponse, timestamp: now },
          ],
          status: "idle",
          updatedAt: now,
          pendingTaskId: taskId,
        });

        return `__WAITING_INPUT__`;
      }

      finalResult = textResponse || "Task completed — no report generated.";
      break;
    }

    const { name: toolName, args } = fnCallPart.functionCall;
    stepCount++;

    // Handle task_complete
    if (toolName === "task_complete") {
      finalResult = (args as any)?.result || "Task completed — no report generated.";
      await addStep(taskId, {
        action: "Task completed",
        toolName: "task_complete",
        status: "completed",
        completedAt: new Date().toISOString(),
      }, steps);
      break;
    }

    // Handle report_progress
    if (toolName === "report_progress") {
      await addStep(taskId, {
        action: (args as any)?.summary || "Progress update",
        toolName: "report_progress",
        status: "completed",
        completedAt: new Date().toISOString(),
      }, steps);

      contents.push({
        role: "model",
        parts: [{ functionCall: { name: toolName, args } }],
      });
      contents.push({
        role: "user",
        parts: [{ functionResponse: { name: toolName, response: { acknowledged: true } } } as any],
      });
      continue;
    }

    // Execute regular tool
    const step: TaskStep = {
      action: `${toolName}(${JSON.stringify(args)})`,
      toolName: toolName!,
      args: args as Record<string, any>,
      status: "running",
      startedAt: new Date().toISOString(),
    };
    await addStep(taskId, step, steps);
    const stepIdx = steps.length - 1;

    let toolResult: any;
    let retries = 0;

    while (retries <= MAX_RETRIES_PER_STEP) {
      try {
        toolResult = await executeTool(userId, toolName!, args as Record<string, any>);
        consecutiveErrors = 0;
        break;
      } catch (err: any) {
        retries++;
        console.warn(`[TaskEngine] Tool ${toolName} failed (attempt ${retries}):`, err.message);
        if (retries > MAX_RETRIES_PER_STEP) {
          toolResult = { error: err.message };
          consecutiveErrors++;
          await updateStep(taskId, steps, stepIdx, {
            status: "failed",
            error: err.message,
            completedAt: new Date().toISOString(),
          });
        }
      }
    }

    if (!toolResult?.error) {
      await updateStep(taskId, steps, stepIdx, {
        status: "completed",
        result: typeof toolResult === "string" ? toolResult : JSON.stringify(toolResult).substring(0, 500),
        completedAt: new Date().toISOString(),
      });
    }

    // Bail if too many consecutive errors
    if (consecutiveErrors >= 3) {
      finalResult = "Task stopped: too many consecutive tool failures.";
      await updateTask(taskId, { status: "failed", result: finalResult, steps });
      return finalResult;
    }

    // Feed result back to Gemini — response MUST be an object (not array)
    const safeResult = Array.isArray(toolResult)
      ? { results: toolResult }
      : (typeof toolResult === "object" && toolResult !== null)
        ? toolResult
        : { value: toolResult };
    contents.push({
      role: "model",
      parts: [{ functionCall: { name: toolName!, args: args as Record<string, any> } } as any],
    });
    contents.push({
      role: "user",
      parts: [
        { functionResponse: { name: toolName!, response: safeResult } } as any,
      ],
    });
  }

  // Finalize
  await updateTask(taskId, {
    status: "completed",
    result: finalResult,
    steps,
  });

  return finalResult;
}

/**
 * Resume a paused task after receiving user input.
 * Rebuilds the conversation context and continues execution.
 */
export async function resumeTask(taskId: string, userInput: string, overrideApiKey?: string): Promise<string> {
  const taskSnap = await adminDb.doc(`tasks/${taskId}`).get();
  if (!taskSnap.exists) throw new Error("Task not found");

  const taskData = taskSnap.data() as any;
  if (taskData.status !== "waiting_input") {
    throw new Error(`Task is not waiting for input (status: ${taskData.status})`);
  }

  const task = { id: taskId, ...taskData } as Task;
  const { userId, goal } = task;

  let apiKey = overrideApiKey || "";
  if (!apiKey) apiKey = await getApiKey(userId);
  if (!apiKey) {
    await updateTask(taskId, { status: "failed", result: "No API key configured." });
    return "No API key configured.";
  }

  const { tools, services } = await getAvailableTools(userId);
  const ai = new GoogleGenAI({ apiKey });

  const [memories, userTimezone] = await Promise.all([
    loadMemories(userId),
    loadUserTimezone(userId),
  ]);

  // Rebuild system prompt (same as executeTask)
  let systemPrompt = `You are an autonomous AI employee executing a workflow task. You have access to tools and must complete the given goal step by step.

## Available Services: ${services.length > 0 ? services.join(", ") : "None"}

## Current Date & Time
Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: userTimezone })}. Current time: ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short', timeZone: userTimezone })}. User timezone: ${userTimezone}.

## Rules
1. Break the goal into logical steps and execute them one at a time using your tools.
2. After each significant milestone, use report_progress to update the user.
3. If a tool call fails, try a different approach (up to ${MAX_RETRIES_PER_STEP} retries per step).
4. Be efficient — minimize unnecessary tool calls.
5. Never send emails without the content being explicitly specified in the goal.
6. You can browse any website, follow links, search the web, and submit forms.
7. You can save notes using create_note for persistent storage.
8. If the goal asks you to ask the user a question, respond with ONLY the question text — do NOT call task_complete. The system will deliver your question and pause until the user responds.

## CRITICAL: Reporting Requirements
When the goal is accomplished, you MUST call task_complete with the FULL, DETAILED REPORT as the result.
- The result parameter MUST contain the complete formatted report with ALL data, findings, and recommendations.
- Use proper markdown formatting: headers (##), bullet points, emoji sections, bold text, horizontal rules.
- NEVER just say "Done" or "Task completed" — the user needs the actual report.
- Include specific data points, numbers, names, and actionable next steps.
- The report should be comprehensive enough to stand on its own without the user needing to ask follow-up questions.
- Think of this as delivering a professional briefing to a busy executive.`;

  if (memories.length > 0) {
    systemPrompt += `\n\n## User Context (from memory)\nThese are facts about the user that may help you execute the task:\n${memories.map((m, i) => `${i + 1}. ${m}`).join("\n")}`;
  }

  // Rebuild contents from saved state + add user's answer
  const contents: any[] = task.savedContents || [
    { role: "user", parts: [{ text: `Execute this task:\n\n${goal}` }] },
  ];

  // Add the model's question and user's answer
  contents.push({
    role: "model",
    parts: [{ text: task.question || "What input do you need?" }],
  });
  contents.push({
    role: "user",
    parts: [{ text: userInput }],
  });

  await updateTask(taskId, {
    status: "running",
    savedContents: undefined,
    question: undefined,
  });

  const steps: TaskStep[] = task.steps || [];
  let stepCount = steps.length;
  let finalResult = "";
  let consecutiveErrors = 0;

  while (stepCount < MAX_STEPS) {
    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents,
        config: {
          systemInstruction: systemPrompt,
          tools: [{ functionDeclarations: tools }],
        },
      });
    } catch (err: any) {
      console.error(`[TaskEngine:Resume] Gemini error at step ${stepCount}:`, err.message);
      await updateTask(taskId, { status: "failed", result: `AI error: ${err.message}`, steps });
      return `Task failed: ${err.message}`;
    }

    const candidate = response.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    const fnCallPart = parts.find((p: any) => p.functionCall);

    if (!fnCallPart?.functionCall) {
      const textResponse = response.text || "";

      // Check if the model is asking ANOTHER question
      if (textResponse && task.conversationId && !textResponse.includes("task_complete")) {
        // Could be another question — check if it looks like a question
        const looksLikeQuestion = textResponse.includes("?") && textResponse.length < 500;
        if (looksLikeQuestion) {
          await updateTask(taskId, {
            status: "waiting_input",
            question: textResponse,
            savedContents: contents,
            steps,
          });

          const convRef = adminDb.doc(`conversations/${task.conversationId}`);
          const convSnap = await convRef.get();
          const existingMsgs = convSnap.exists ? (convSnap.data()?.messages || []) : [];
          const now = new Date().toISOString();
          await convRef.update({
            messages: [
              ...existingMsgs,
              { role: "model", content: textResponse, timestamp: now },
            ],
            status: "idle",
            updatedAt: now,
            pendingTaskId: taskId,
          });

          return `__WAITING_INPUT__`;
        }
      }

      finalResult = textResponse || "Task completed — no report generated.";
      break;
    }

    const { name: toolName, args } = fnCallPart.functionCall;
    stepCount++;

    if (toolName === "task_complete") {
      finalResult = (args as any)?.result || "Task completed — no report generated.";
      await addStep(taskId, {
        action: "Task completed",
        toolName: "task_complete",
        status: "completed",
        completedAt: new Date().toISOString(),
      }, steps);
      break;
    }

    if (toolName === "report_progress") {
      await addStep(taskId, {
        action: (args as any)?.summary || "Progress update",
        toolName: "report_progress",
        status: "completed",
        completedAt: new Date().toISOString(),
      }, steps);
      contents.push({ role: "model", parts: [{ functionCall: { name: toolName, args } }] });
      contents.push({ role: "user", parts: [{ functionResponse: { name: toolName, response: { acknowledged: true } } } as any] });
      continue;
    }

    // Execute regular tool
    const step: TaskStep = {
      action: `${toolName}(${JSON.stringify(args)})`,
      toolName: toolName!,
      args: args as Record<string, any>,
      status: "running",
      startedAt: new Date().toISOString(),
    };
    await addStep(taskId, step, steps);
    const stepIdx = steps.length - 1;

    let toolResult: any;
    let retries = 0;
    while (retries <= MAX_RETRIES_PER_STEP) {
      try {
        toolResult = await executeTool(userId, toolName!, args as Record<string, any>);
        consecutiveErrors = 0;
        break;
      } catch (err: any) {
        retries++;
        if (retries > MAX_RETRIES_PER_STEP) {
          toolResult = { error: err.message };
          consecutiveErrors++;
          await updateStep(taskId, steps, stepIdx, {
            status: "failed",
            error: err.message,
            completedAt: new Date().toISOString(),
          });
        }
      }
    }

    if (!toolResult?.error) {
      await updateStep(taskId, steps, stepIdx, {
        status: "completed",
        result: typeof toolResult === "string" ? toolResult : JSON.stringify(toolResult).substring(0, 500),
        completedAt: new Date().toISOString(),
      });
    }

    if (consecutiveErrors >= 3) {
      finalResult = "Task stopped: too many consecutive tool failures.";
      await updateTask(taskId, { status: "failed", result: finalResult, steps });
      return finalResult;
    }

    const safeResult = Array.isArray(toolResult)
      ? { results: toolResult }
      : (typeof toolResult === "object" && toolResult !== null)
        ? toolResult
        : { value: toolResult };
    contents.push({
      role: "model",
      parts: [{ functionCall: { name: toolName!, args: args as Record<string, any> } } as any],
    });
    contents.push({
      role: "user",
      parts: [{ functionResponse: { name: toolName!, response: safeResult } } as any],
    });
  }

  await updateTask(taskId, { status: "completed", result: finalResult, steps });
  return finalResult;
}
