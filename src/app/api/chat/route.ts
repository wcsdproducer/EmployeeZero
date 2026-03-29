import { NextResponse } from "next/server";
import { adminDb } from "@/lib/admin";
import { verifyAuth, checkRateLimit, rateLimitResponse } from "@/lib/auth";
import { GoogleGenAI, Type } from "@google/genai";
import {
  listEmails,
  getEmail,
  sendEmail,
  replyToEmail,
  getUnreadCount,
  archiveEmail,
  trashEmail,
} from "@/lib/gmail";
import { createTask, executeTask } from "@/lib/taskEngine";
import { browseUrl, clickUrl, submitForm, webSearch } from "@/lib/browser";
import {
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  findFreeSlots,
} from "@/lib/calendar";
import {
  createCustomWorkflow,
  listCustomWorkflows,
  deleteCustomWorkflow,
} from "@/lib/customWorkflows";
import {
  listFiles,
  getFile,
  readFileContent,
  uploadFile,
  createFolder,
} from "@/lib/drive";
import {
  listSpreadsheets,
  readSheet,
  writeSheet,
  appendRows,
  createSpreadsheet,
} from "@/lib/sheets";
import {
  listChannels,
  listVideos,
  getVideoAnalytics,
  searchYouTube,
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
  deleteTask,
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

/**
 * Chat API — conversation-based, with persistent memory + tool use.
 *
 * Accepts a conversationId + new user message.
 * Loads the conversation's existing messages, connections, memories, and calls Gemini.
 * Supports function calling for Gmail (and future services).
 */

// ── Types ───────────────────────────────────────────────────────

interface ChatMessage {
  role: "user" | "model";
  content: string;
  timestamp: string;
}

// ── Memory helpers ──────────────────────────────────────────────

async function loadMemories(userId: string): Promise<string[]> {
  try {
    const snap = await adminDb
      .collection(`users/${userId}/memories`)
      .limit(50)
      .get();
    return snap.docs.map((d) => d.data().content as string);
  } catch (err) {
    console.warn("Failed to load memories:", err);
    return [];
  }
}

async function storeMemories(userId: string, agentId: string, facts: string[]) {
  const batch = adminDb.batch();
  for (const fact of facts) {
    const ref = adminDb.collection(`users/${userId}/memories`).doc();
    batch.set(ref, {
      agentId,
      content: fact,
      createdAt: new Date().toISOString(),
    });
  }
  await batch.commit();
}

// ── Connections helper ──────────────────────────────────────────

async function loadConnections(userId: string): Promise<Record<string, any>> {
  try {
    const snap = await adminDb.doc(`users/${userId}/settings/connections`).get();
    return snap.exists ? (snap.data() as Record<string, any>) : {};
  } catch {
    return {};
  }
}

async function loadUserTimezone(userId: string): Promise<string> {
  try {
    const snap = await adminDb.doc(`users/${userId}/settings/preferences`).get();
    return snap.exists ? (snap.data()?.timezone || "UTC") : "UTC";
  } catch {
    return "UTC";
  }
}

// ── Conversation window + summarization ─────────────────────────

const MAX_CONTEXT_MESSAGES = 20; // Send at most 20 recent messages to Gemini
const SUMMARIZE_THRESHOLD = 24; // Summarize when total exceeds this

async function summarizeOldMessages(
  apiKey: string,
  messages: ChatMessage[],
  existingSummary?: string
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });

  const transcript = messages
    .map((m) => `${m.role === "user" ? "User" : "Agent"}: ${m.content.substring(0, 300)}`)
    .join("\n");

  const prompt = existingSummary
    ? `You have a previous conversation summary:\n"${existingSummary}"\n\nHere are additional older messages to incorporate:\n${transcript}\n\nWrite a concise updated summary (max 200 words) capturing all important context, decisions, facts, and action items. Preserve names, dates, and specific details.`
    : `Summarize this conversation excerpt concisely (max 200 words). Capture important context, decisions, facts, and action items. Preserve names, dates, and specific details.\n\n${transcript}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  return response.text || existingSummary || "";
}

// ── Tool declarations ───────────────────────────────────────────

const GMAIL_TOOLS = [
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
      properties: {
        event_id: { type: Type.STRING, description: "The calendar event ID" },
      },
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
    name: "update_event",
    description: "Update an existing calendar event",
    parameters: {
      type: Type.OBJECT,
      properties: {
        event_id: { type: Type.STRING, description: "The event ID to update" },
        summary: { type: Type.STRING, description: "New title" },
        start_time: { type: Type.STRING, description: "New start time" },
        end_time: { type: Type.STRING, description: "New end time" },
        description: { type: Type.STRING, description: "New description" },
        location: { type: Type.STRING, description: "New location" },
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

const BROWSER_TOOLS = [
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
];

const WORKFLOW_TOOLS = [
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
];

const DRIVE_TOOLS = [
  {
    name: "list_drive_files",
    description: "Search and list files in Google Drive. Returns file names, types, and links.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: "Search query to filter files by name. Leave empty for recent files." },
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

const SHEETS_TOOLS = [
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
    description: "Read data from a range in a Google Sheets spreadsheet",
    parameters: {
      type: Type.OBJECT,
      properties: {
        spreadsheet_id: { type: Type.STRING, description: "The spreadsheet ID" },
        range: { type: Type.STRING, description: "A1 notation range (e.g. 'Sheet1!A1:D10')" },
      },
      required: ["spreadsheet_id", "range"],
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

const YOUTUBE_TOOLS = [
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

const LINKEDIN_TOOLS = [
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

const TWITTER_TOOLS = [
  {
    name: "get_twitter_profile",
    description: "Get the user's X/Twitter profile (name, handle, followers, tweet count)",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "get_twitter_timeline",
    description: "Get the user's recent tweets with engagement stats",
    parameters: {
      type: Type.OBJECT,
      properties: {
        max_results: { type: Type.NUMBER, description: "Max tweets to return (default 10, max 100)" },
      },
    },
  },
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
    name: "search_tweets",
    description: "Search recent tweets on X/Twitter",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: "Search query" },
        max_results: { type: Type.NUMBER, description: "Max results (default 10)" },
      },
      required: ["query"],
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
    description: "Reply to a tweet. Always confirm reply content with user.",
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
    description: "Like a tweet",
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
  {
    name: "get_twitter_mentions",
    description: "Get recent tweets that mention the user",
    parameters: {
      type: Type.OBJECT,
      properties: {
        max_results: { type: Type.NUMBER, description: "Max results (default 10)" },
      },
    },
  },
  {
    name: "get_twitter_followers",
    description: "Get a list of the user's X/Twitter followers with their profile info",
    parameters: {
      type: Type.OBJECT,
      properties: {
        max_results: { type: Type.NUMBER, description: "Max followers to return (default 20, max 100)" },
      },
    },
  },
  {
    name: "bookmark_tweet",
    description: "Bookmark a tweet for later",
    parameters: {
      type: Type.OBJECT,
      properties: {
        tweet_id: { type: Type.STRING, description: "Tweet ID to bookmark" },
      },
      required: ["tweet_id"],
    },
  },
  {
    name: "get_twitter_bookmarks",
    description: "Get your saved/bookmarked tweets",
    parameters: {
      type: Type.OBJECT,
      properties: {
        max_results: { type: Type.NUMBER, description: "Max results (default 10)" },
      },
    },
  },
  {
    name: "get_twitter_liked_tweets",
    description: "Get tweets you have liked",
    parameters: {
      type: Type.OBJECT,
      properties: {
        max_results: { type: Type.NUMBER, description: "Max results (default 10)" },
      },
    },
  },
  {
    name: "follow_twitter_user",
    description: "Follow a user on X/Twitter",
    parameters: {
      type: Type.OBJECT,
      properties: {
        target_user_id: { type: Type.STRING, description: "User ID to follow" },
      },
      required: ["target_user_id"],
    },
  },
  {
    name: "unfollow_twitter_user",
    description: "Unfollow a user on X/Twitter",
    parameters: {
      type: Type.OBJECT,
      properties: {
        target_user_id: { type: Type.STRING, description: "User ID to unfollow" },
      },
      required: ["target_user_id"],
    },
  },
  {
    name: "mute_twitter_user",
    description: "Mute a user on X/Twitter (hide their tweets)",
    parameters: {
      type: Type.OBJECT,
      properties: {
        target_user_id: { type: Type.STRING, description: "User ID to mute" },
      },
      required: ["target_user_id"],
    },
  },
  {
    name: "block_twitter_user",
    description: "Block a user on X/Twitter",
    parameters: {
      type: Type.OBJECT,
      properties: {
        target_user_id: { type: Type.STRING, description: "User ID to block" },
      },
      required: ["target_user_id"],
    },
  },
];

const INSTAGRAM_TOOLS = [
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

const FACEBOOK_TOOLS = [
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

const TIKTOK_TOOLS = [
  {
    name: "get_tiktok_profile",
    description: "Get the user's TikTok profile (display name, followers, video count, likes)",
    parameters: { type: Type.OBJECT, properties: {} },
  },
];



const CONTACTS_TOOLS = [
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

const NOTES_TOOLS = [
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

const TASKS_TOOLS = [
  { name: "list_task_lists", description: "List all Google Task lists", parameters: { type: Type.OBJECT, properties: {} } },
  { name: "list_google_tasks", description: "List tasks in a task list", parameters: { type: Type.OBJECT, properties: { task_list_id: { type: Type.STRING, description: "Task list ID (use list_task_lists to find)" }, show_completed: { type: Type.BOOLEAN, description: "Include completed tasks (default false)" } }, required: ["task_list_id"] } },
  { name: "create_google_task", description: "Create a new task in a task list", parameters: { type: Type.OBJECT, properties: { task_list_id: { type: Type.STRING, description: "Task list ID" }, title: { type: Type.STRING, description: "Task title" }, notes: { type: Type.STRING, description: "Optional notes/details" }, due: { type: Type.STRING, description: "Due date (RFC 3339, e.g. 2026-04-01T00:00:00Z)" } }, required: ["task_list_id", "title"] } },
  { name: "complete_google_task", description: "Mark a task as completed", parameters: { type: Type.OBJECT, properties: { task_list_id: { type: Type.STRING, description: "Task list ID" }, task_id: { type: Type.STRING, description: "Task ID to complete" } }, required: ["task_list_id", "task_id"] } },
  { name: "delete_google_task", description: "Delete a task", parameters: { type: Type.OBJECT, properties: { task_list_id: { type: Type.STRING, description: "Task list ID" }, task_id: { type: Type.STRING, description: "Task ID to delete" } }, required: ["task_list_id", "task_id"] } },
  { name: "clear_completed_tasks", description: "Clear all completed tasks from a list", parameters: { type: Type.OBJECT, properties: { task_list_id: { type: Type.STRING, description: "Task list ID" } }, required: ["task_list_id"] } },
];

const DOCS_TOOLS = [
  { name: "create_document", description: "Create a new Google Doc and return its URL", parameters: { type: Type.OBJECT, properties: { title: { type: Type.STRING, description: "Document title" } }, required: ["title"] } },
  { name: "get_document", description: "Get a Google Doc's content (title and text)", parameters: { type: Type.OBJECT, properties: { document_id: { type: Type.STRING, description: "Document ID" } }, required: ["document_id"] } },
  { name: "append_doc_text", description: "Append text to the end of a Google Doc", parameters: { type: Type.OBJECT, properties: { document_id: { type: Type.STRING, description: "Document ID" }, text: { type: Type.STRING, description: "Text to append" } }, required: ["document_id", "text"] } },
];

const BUSINESS_PROFILE_TOOLS = [
  { name: "list_business_accounts", description: "List Google Business Profile accounts", parameters: { type: Type.OBJECT, properties: {} } },
  { name: "list_business_locations", description: "List locations for a business account", parameters: { type: Type.OBJECT, properties: { account_id: { type: Type.STRING, description: "Account ID (e.g. accounts/123)" } }, required: ["account_id"] } },
  { name: "get_business_reviews", description: "Get Google reviews for a business location", parameters: { type: Type.OBJECT, properties: { location_name: { type: Type.STRING, description: "Location name (e.g. accounts/123/locations/456)" } }, required: ["location_name"] } },
  { name: "reply_to_business_review", description: "Reply to a Google review", parameters: { type: Type.OBJECT, properties: { review_name: { type: Type.STRING, description: "Full review name path" }, comment: { type: Type.STRING, description: "Reply text" } }, required: ["review_name", "comment"] } },
  { name: "create_business_post", description: "Create a Google Business post/update", parameters: { type: Type.OBJECT, properties: { location_name: { type: Type.STRING, description: "Location name" }, summary: { type: Type.STRING, description: "Post text (max 1500 chars)" }, cta_type: { type: Type.STRING, description: "Call-to-action type: BOOK, ORDER, LEARN_MORE, SIGN_UP, CALL (optional)" }, cta_url: { type: Type.STRING, description: "CTA URL (required if cta_type set)" } }, required: ["location_name", "summary"] } },
];

const ANALYTICS_TOOLS = [
  { name: "list_analytics_properties", description: "List GA4 properties the user has access to", parameters: { type: Type.OBJECT, properties: {} } },
  { name: "run_analytics_report", description: "Run a Google Analytics report with custom dimensions and metrics", parameters: { type: Type.OBJECT, properties: { property_id: { type: Type.STRING, description: "GA4 property ID (number only)" }, start_date: { type: Type.STRING, description: "Start date (YYYY-MM-DD or '30daysAgo')" }, end_date: { type: Type.STRING, description: "End date (YYYY-MM-DD or 'today')" }, dimensions: { type: Type.STRING, description: "Comma-separated dimensions (e.g. 'pagePath,country')" }, metrics: { type: Type.STRING, description: "Comma-separated metrics (e.g. 'screenPageViews,sessions,activeUsers')" } }, required: ["property_id", "start_date", "end_date", "metrics"] } },
  { name: "get_realtime_analytics", description: "Get real-time active users on the website right now", parameters: { type: Type.OBJECT, properties: { property_id: { type: Type.STRING, description: "GA4 property ID" } }, required: ["property_id"] } },
];

const FORMS_TOOLS = [
  { name: "create_google_form", description: "Create a new Google Form and return its URL", parameters: { type: Type.OBJECT, properties: { title: { type: Type.STRING, description: "Form title" } }, required: ["title"] } },
  { name: "add_form_question", description: "Add a question to a Google Form", parameters: { type: Type.OBJECT, properties: { form_id: { type: Type.STRING, description: "Form ID" }, title: { type: Type.STRING, description: "Question text" }, question_type: { type: Type.STRING, description: "Type: SHORT_ANSWER, PARAGRAPH, MULTIPLE_CHOICE, CHECKBOX, DROPDOWN, SCALE" }, options: { type: Type.STRING, description: "Comma-separated options (for MULTIPLE_CHOICE, CHECKBOX, DROPDOWN)" } }, required: ["form_id", "title", "question_type"] } },
  { name: "get_google_form", description: "Get a Google Form's structure and questions", parameters: { type: Type.OBJECT, properties: { form_id: { type: Type.STRING, description: "Form ID" } }, required: ["form_id"] } },
  { name: "get_form_responses", description: "Get all responses submitted to a Google Form", parameters: { type: Type.OBJECT, properties: { form_id: { type: Type.STRING, description: "Form ID" } }, required: ["form_id"] } },
];

const SLIDES_TOOLS = [
  { name: "create_presentation", description: "Create a new Google Slides presentation", parameters: { type: Type.OBJECT, properties: { title: { type: Type.STRING, description: "Presentation title" } }, required: ["title"] } },
  { name: "get_presentation", description: "Get a presentation's metadata and slide list", parameters: { type: Type.OBJECT, properties: { presentation_id: { type: Type.STRING, description: "Presentation ID" } }, required: ["presentation_id"] } },
  { name: "add_presentation_slide", description: "Add a new slide to a presentation", parameters: { type: Type.OBJECT, properties: { presentation_id: { type: Type.STRING, description: "Presentation ID" }, layout: { type: Type.STRING, description: "Slide layout: BLANK, TITLE, TITLE_AND_BODY, TITLE_AND_TWO_COLUMNS, SECTION_HEADER (default TITLE_AND_BODY)" } }, required: ["presentation_id"] } },
  { name: "insert_slide_text", description: "Insert text into a slide's placeholder", parameters: { type: Type.OBJECT, properties: { presentation_id: { type: Type.STRING, description: "Presentation ID" }, slide_id: { type: Type.STRING, description: "Slide object ID" }, text: { type: Type.STRING, description: "Text to insert" } }, required: ["presentation_id", "slide_id", "text"] } },
];

// ── Tool executor ───────────────────────────────────────────────

async function executeTool(
  userId: string,
  toolName: string,
  args: Record<string, any>
): Promise<any> {
  switch (toolName) {
    case "search_emails":
      return await listEmails(userId, args.query, args.max_results || 10);
    case "read_email":
      return await getEmail(userId, args.message_id);
    case "send_email":
      return await sendEmail(userId, args.to, args.subject, args.body);
    case "reply_to_email":
      return await replyToEmail(userId, args.message_id, args.body);
    case "get_unread_count": {
      const count = await getUnreadCount(userId);
      return { unread_count: count };
    }
    case "archive_email":
      await archiveEmail(userId, args.message_id);
      return { success: true, action: "archived" };
    case "trash_email":
      await trashEmail(userId, args.message_id);
      return { success: true, action: "trashed" };
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
    // Calendar tools
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
    // Drive tools
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
    // Sheets tools
    case "list_spreadsheets":
      return await listSpreadsheets(userId, args.max_results || 10);
    case "read_sheet":
      return await readSheet(userId, args.spreadsheet_id, args.range);
    case "write_sheet": {
      const values = typeof args.values === "string" ? JSON.parse(args.values) : args.values;
      return await writeSheet(userId, args.spreadsheet_id, args.range, values);
    }
    case "append_to_sheet": {
      const appendValues = typeof args.values === "string" ? JSON.parse(args.values) : args.values;
      return await appendRows(userId, args.spreadsheet_id, args.range, appendValues);
    }
    case "create_spreadsheet": {
      const sheetNames = args.sheet_names ? args.sheet_names.split(",").map((s: string) => s.trim()) : undefined;
      return await createSpreadsheet(userId, args.title, sheetNames);
    }
    // YouTube tools
    case "list_youtube_channels":
      return await listChannels(userId);
    case "list_youtube_videos":
      return await listVideos(userId, args.channel_id, args.max_results || 10);
    case "get_youtube_analytics":
      return await getVideoAnalytics(userId, args.video_id);
    case "search_youtube":
      return await searchYouTube(userId, args.query, args.max_results || 5);
    // Workflow tools
    case "create_workflow": {
      const wfConnections = args.required_connections
        ? args.required_connections.split(",").map((c: string) => c.trim()).filter(Boolean)
        : [];
      return await createCustomWorkflow(userId, {
        name: args.name,
        description: args.description,
        goal: args.goal,
        requiredConnections: wfConnections,
      });
    }
    case "list_my_workflows":
      return await listCustomWorkflows(userId);
    case "delete_workflow":
      return await deleteCustomWorkflow(userId, args.workflow_id);
    // LinkedIn tools
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
    // Twitter/X tools
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
    // Instagram tools
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
    // Facebook tools
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
    // New Facebook tools
    case "upload_facebook_video":
      return await uploadFacebookVideo(userId, args.page_id, args.video_url, args.title, args.description);
    case "create_facebook_reel":
      return await createFacebookReel(userId, args.page_id, args.video_url, args.description);
    case "get_facebook_scheduled_posts":
      return await getFacebookScheduledPosts(userId, args.page_id);
    case "cancel_facebook_scheduled_post":
      return await cancelFacebookScheduledPost(userId, args.post_id);
    // TikTok tools
    case "get_tiktok_profile":
      return await getTikTokProfile(userId);
    // New YouTube tools
    case "list_youtube_playlists":
      return await listYouTubePlaylists(userId);
    case "add_to_youtube_playlist":
      return await addToYouTubePlaylist(userId, args.playlist_id, args.video_id);
    case "get_youtube_comments":
      return await getYouTubeComments(userId, args.video_id, args.max_results || 10);
    case "reply_to_youtube_comment":
      return await replyToYouTubeComment(userId, args.comment_id, args.text);
    // New Twitter tools
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
    // New Instagram tools
    case "create_instagram_story":
      return await createInstagramStory(userId, args.media_url, args.media_type || "IMAGE");
    case "get_instagram_story_insights":
      return await getInstagramStoryInsights(userId, args.story_id);
    case "get_instagram_tagged_media":
      return await getInstagramTaggedMedia(userId);

    // Contacts tools
    case "list_contacts":
      return await listContacts(userId, args.search, args.max_results || 20);
    case "get_contact":
      return await getContact(userId, args.resource_name);
    case "create_contact":
      return await createContact(
        userId,
        args.first_name,
        args.last_name,
        args.email,
        args.phone,
        args.company,
        args.title
      );
    case "delete_contact":
      return await deleteContact(userId, args.resource_name);
    // Notes tools
    case "create_note":
      return await createNote(userId, args.title, args.content, args.tags || []);
    case "list_notes":
      return await listNotes(userId, args.tag, args.max_results || 20);
    case "get_note":
      return await getNote(userId, args.note_id);
    case "update_note":
      return await updateNote(userId, args.note_id, {
        title: args.title,
        content: args.content,
        tags: args.tags,
      });
    case "delete_note":
      return await deleteNote(userId, args.note_id);
    case "search_notes":
      return await searchNotes(userId, args.query, args.max_results || 10);

    // Google Tasks tools
    case "list_task_lists":
      return await listTaskLists(userId);
    case "list_google_tasks":
      return await listTasks(userId, args.task_list_id, args.show_completed || false);
    case "create_google_task":
      return await createGoogleTask(userId, args.task_list_id, args.title, args.notes, args.due);
    case "complete_google_task":
      return await completeTask(userId, args.task_list_id, args.task_id);
    case "delete_google_task":
      return await deleteTask(userId, args.task_list_id, args.task_id);
    case "clear_completed_tasks":
      return await clearCompleted(userId, args.task_list_id);

    // Google Docs tools
    case "create_document":
      return await createDocument(userId, args.title);
    case "get_document":
      return await getDocument(userId, args.document_id);
    case "append_doc_text":
      return await appendText(userId, args.document_id, args.text);

    // Google Business Profile tools
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

    // Google Analytics tools
    case "list_analytics_properties":
      return await listProperties(userId);
    case "run_analytics_report": {
      const dims = args.dimensions ? args.dimensions.split(",").map((d: string) => d.trim()) : [];
      const mets = args.metrics.split(",").map((m: string) => m.trim());
      return await runReport(userId, args.property_id, args.start_date, args.end_date, dims, mets);
    }
    case "get_realtime_analytics":
      return await getRealtimeData(userId, args.property_id);

    // Google Forms tools
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

    // Google Slides tools
    case "create_presentation":
      return await createPresentation(userId, args.title);
    case "get_presentation":
      return await getPresentation(userId, args.presentation_id);
    case "add_presentation_slide":
      return await addSlide(userId, args.presentation_id, args.layout || "TITLE_AND_BODY");
    case "insert_slide_text":
      return await insertSlideText(userId, args.presentation_id, args.slide_id, args.text);

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

// ── Main handler ────────────────────────────────────────────────

export async function POST(request: Request) {
  // ── Auth: Verify Firebase ID token ──
  const auth = await verifyAuth(request);
  if (auth.error) return auth.error;
  const verifiedUserId = auth.userId;

  // ── Rate limit: generous for real users, blocks bots ──
  const rateCheck = checkRateLimit(verifiedUserId);
  if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfter!);

  let parsedBody: {
    conversationId?: string;
    message?: string;
    agentName?: string;
  } = {};

  try {
    parsedBody = await request.json();
    const { conversationId, message, agentName } = parsedBody;
    // Use verified userId from token — never trust client body
    const userId = verifiedUserId;

    if (!conversationId || !message) {
      return NextResponse.json(
        { error: "Missing conversationId or message" },
        { status: 400 }
      );
    }

    // 1. Get API key — platform key first, user override only if valid + different
    const platformKey = process.env.GOOGLE_GENAI_API_KEY?.trim() || "";
    let apiKey = platformKey;
    let provider = "gemini";

    const brainSnap = await adminDb.doc(`users/${userId}/settings/brain`).get();
    if (brainSnap.exists) {
      const brain = brainSnap.data() as { provider: string; apiKey: string };
      if (brain.provider) provider = brain.provider;
      // Only use user key if it looks real (not a dummy/placeholder)
      if (
        brain.apiKey &&
        brain.apiKey.length > 20 &&
        !brain.apiKey.includes("dummy") &&
        !brain.apiKey.includes("placeholder") &&
        !brain.apiKey.includes("your-api-key")
      ) {
        apiKey = brain.apiKey;
      }
    }

    if (!apiKey) {
      apiKey = platformKey;
      provider = "gemini";
    }

    console.log(
      `[Chat] Using ${apiKey === platformKey ? "platform" : "user"} API key for user ${userId}`
    );

    if (!apiKey) {
      return NextResponse.json(
        { error: "No API key configured. Please add your Gemini API key in Connections." },
        { status: 400 }
      );
    }

    // 1b. Intent detection — route complex tasks to the task engine
    const complexPatterns = [
      /\b(clean up|organize|triage|sort through|go through)\b.*\b(inbox|emails|mail|gmail)\b/i,
      /\b(archive|delete|trash)\b.*\b(all|every|older than|from last)\b/i,
      /\b(draft|write|compose)\b.*\b(replies|responses)\b.*\b(all|each|every)\b/i,
      /\b(morning briefing|daily summary|end.of.day|weekly report)\b/i,
      /\b(run|execute|start|trigger)\b.*\b(workflow|automation|briefing)\b/i,
      /\b(follow up|reach out)\b.*\b(all|each|every|batch)\b/i,
      /\b(unsubscribe|opt.out)\b.*\b(from|all|every|emails)\b/i,
      /\b(build|create|make|set up)\b.*\b(workflow|automation|process|routine)\b/i,
      /\b(scan|check|review|audit)\b.*\b(inbox|emails|gmail|mail)\b.*\b(and|then|,)\b/i,
      /\b(clean|purge|clear)\b.*\b(spam|junk|gmail|inbox|promotions)\b/i,
    ];
    const isComplexTask = complexPatterns.some((p) => p.test(message));

    if (isComplexTask) {
      // Create a task and execute it — pass the already-resolved apiKey
      const taskId = await createTask(userId, message, conversationId, apiKey);

      // Start execution in background
      const executionPromise = executeTask(taskId, apiKey).then(async (result) => {
        // Write result back to conversation (user message already exists from client)
        const convRef = adminDb.doc(`conversations/${conversationId}`);
        const convSnap = await convRef.get();
        const existingMsgs = convSnap.exists ? (convSnap.data()?.messages || []) : [];
        const now = new Date().toISOString();
        await convRef.update({
          messages: [
            ...existingMsgs,
            { role: "model", content: `🔄 **Task Completed**\n\n${result}\n\n_Task ID: ${taskId}_`, timestamp: now },
          ],
          status: "idle",
          updatedAt: now,
        });
      }).catch(async (err) => {
        const convRef = adminDb.doc(`conversations/${conversationId}`);
        const convSnap = await convRef.get();
        const existingMsgs = convSnap.exists ? (convSnap.data()?.messages || []) : [];
        const now = new Date().toISOString();
        await convRef.update({
          messages: [
            ...existingMsgs,
            { role: "model", content: `⚠️ Task failed: ${err.message}`, timestamp: now },
          ],
          status: "error",
          updatedAt: now,
        });
      });

      // Update conversation status to running immediately
      await adminDb.doc(`conversations/${conversationId}`).update({
        status: "running",
      });

      return NextResponse.json({
        status: "task_started",
        taskId,
        result: `🧠 **Working on it...**\n\nI'm executing this as a multi-step task. I'll update this conversation when complete.\n\n_Task ID: ${taskId}_`,
      });
    }

    // 2. Load conversation doc to get existing messages (simple chat path)
    const convRef = adminDb.doc(`conversations/${conversationId}`);
    const convSnap = await convRef.get();
    const convData = convSnap.exists ? convSnap.data() : null;
    let allMessages: ChatMessage[] = convData?.messages || [];
    let conversationSummary: string = convData?.summary || "";

    // 3. Update status to running
    await convRef.update({ status: "running" });

    // 4. Load memories + connections + preferences
    const [memories, connections, userTimezone] = await Promise.all([
      loadMemories(userId),
      loadConnections(userId),
      loadUserTimezone(userId),
    ]);

    // 4b. Sliding window + rolling summarization
    //     If conversation is long, summarize old messages and only send recent ones
    if (allMessages.length > SUMMARIZE_THRESHOLD) {
      const cutoff = allMessages.length - MAX_CONTEXT_MESSAGES;
      const oldMessages = allMessages.slice(0, cutoff);

      try {
        conversationSummary = await summarizeOldMessages(
          apiKey,
          oldMessages,
          conversationSummary
        );
        // Trim stored messages — keep only recent ones
        allMessages = allMessages.slice(cutoff);
        console.log(
          `[Chat] Summarized ${oldMessages.length} old messages, keeping ${allMessages.length} recent`
        );
      } catch (err) {
        console.warn("[Chat] Summarization failed, using full history:", err);
        // Fall through — use full history if summarization fails
      }
    }

    // Messages to send to Gemini (windowed)
    const contextMessages = allMessages.slice(-MAX_CONTEXT_MESSAGES);

    // 5. Build system prompt with connection awareness
    const name = agentName || "Employee Zero";
    let systemPrompt = `You are ${name}, an elite AI employee. You are direct, strategic, and action-oriented. You provide clear, actionable intelligence. Format your responses with markdown when appropriate. Be concise but thorough.

You have persistent memory. You remember everything the user has told you across all conversations.

## Current Date & Time
Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: userTimezone })}. The current time is ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short', timeZone: userTimezone })}. The user's timezone is ${userTimezone}. Always use this timezone for scheduling unless the user specifies otherwise.`;

    // Connection awareness
    const connectedServices: string[] = [];
    if (connections.gmail?.connected) connectedServices.push("Gmail");
    if (connections.calendar?.connected) connectedServices.push("Google Calendar");
    if (connections.drive?.connected) connectedServices.push("Google Drive");
    if (connections.sheets?.connected) connectedServices.push("Google Sheets");
    if (connections.youtube?.connected) connectedServices.push("YouTube");
    if (connections.linkedin?.connected) connectedServices.push("LinkedIn");
    if (connections.twitter?.connected) connectedServices.push("X/Twitter");
    if (connections.instagram?.connected) connectedServices.push("Instagram");
    if (connections.facebook?.connected) connectedServices.push("Facebook");
    if (connections.tiktok?.connected) connectedServices.push("TikTok");

    if (connectedServices.length > 0) {
      systemPrompt += `\n\n## Connected Services\nYou have access to the following services: ${connectedServices.join(", ")}.\n`;

      if (connections.gmail?.connected) {
        systemPrompt += `\n### Gmail Access\nYou can search, read, send, reply to, archive, and trash emails using the user's connected Gmail account. Use the provided tools to interact with Gmail. When the user asks about emails, proactively use the search_emails or get_unread_count tools.\n\n**Autonomous Mode:** When the user explicitly asks you to perform an action (e.g., "clean up my inbox", "unsubscribe from spam", "archive old emails"), execute it immediately using your tools. Do NOT ask for permission or confirmation for each step — the user already authorized the action by requesting it. Only confirm before sending NEW emails to external recipients.\n\n**Unsubscribe Flow:** When asked to unsubscribe from emails, read the email to find unsubscribe links, then use browse_url to find the link and click_url to follow it. If there's a form, use submit_form.`;
      }

      if (connections.calendar?.connected) {
        systemPrompt += `\n\n### Google Calendar Access\nYou can list, create, update, and delete calendar events, and check free/busy availability. When scheduling events, use ISO 8601 datetime with timezone offset (e.g., "2026-03-29T14:00:00-04:00" for 2 PM Eastern). Always include the timezone offset based on the user's timezone. When the user asks about their schedule, proactively use the list_events tool. Don't ask the user for the current date — you already know it.`;
      }

      if (connections.drive?.connected) {
        systemPrompt += `\n\n### Google Drive Access\nYou can list, search, read, upload files and create folders in the user's Google Drive. Use list_drive_files to search, read_drive_file to read document contents, and upload_drive_file to create files.`;
      }

      if (connections.sheets?.connected) {
        systemPrompt += `\n\n### Google Sheets Access\nYou can list spreadsheets, read/write cell data, append rows, and create new spreadsheets. Use read_sheet with A1 notation ranges (e.g. 'Sheet1!A1:D10'). For writing, pass values as a JSON array of arrays.`;
      }

      if (connections.youtube?.connected) {
        systemPrompt += `\n\n### YouTube Access\nYou can list the user's YouTube channels, view their videos with analytics (views, likes, comments), and search YouTube. Use this to help with content strategy and performance tracking.`;
      }

      if (connections.linkedin?.connected) {
        systemPrompt += `\n\n### LinkedIn Access\nYou can view the user's LinkedIn profile and create posts (text or with links). Always confirm post content with the user before publishing.`;
      }

      if (connections.twitter?.connected) {
        systemPrompt += `\n\n### X/Twitter Access\nYou can view the user's X profile, read their recent tweets with engagement stats, post new tweets, and search recent tweets. Always confirm tweet content with the user before posting.`;
      }

      if (connections.instagram?.connected) {
        systemPrompt += `\n\n### Instagram Access\nYou can view the user's Instagram profile and recent posts with engagement stats (likes, comments). You can publish image posts with captions. Always confirm before posting.`;
      }

      if (connections.facebook?.connected) {
        systemPrompt += `\n\n### Facebook Access\nYou can list the user's Facebook Pages, view page posts with engagement stats, and create new page posts. Use get_facebook_pages first to find page IDs. Always confirm before posting.`;
      }

      if (connections.tiktok?.connected) {
        systemPrompt += `\n\n### TikTok Access\nYou can view the user's TikTok profile with follower count and video stats. Posting is not yet available (pending API approval).`;
      }
    } else {
      systemPrompt += `\n\n## Services\nNo external services are connected yet. If the user asks about emails, calendar, or other integrations, let them know they can connect services in the **Connections** page.`;
    }

    // Browser capabilities (always available)
    systemPrompt += `\n\n### Web Browsing\nYou can browse any website, read web pages, follow links (like unsubscribe URLs), submit forms, and search the web. Use browse_url to read pages, click_url to follow action links, submit_form for form submissions, and web_search to find information.`;

    systemPrompt += `\n\n### Custom Workflows\nYou have workflow management tools: create_workflow, list_my_workflows, delete_workflow.\n\n**IMPORTANT:** When the user asks to "create a workflow", "set up an automation", or "build a routine", use the **create_workflow** tool to SAVE a workflow definition. Do NOT actually execute the workflow steps — just save the definition so the user can run it later from their Workflows page.\n\nThe "goal" field should contain detailed, step-by-step instructions for another AI agent to follow when the workflow is eventually executed. Include specific tool names (like search_emails, list_events, web_search) and formatting requirements.\n\nExample: If the user says "create a workflow that checks my email every morning", save it with create_workflow — don't start scanning emails.`;

    // Inject conversation summary for long conversations
    if (conversationSummary) {
      systemPrompt += `\n\n## Earlier Conversation Context\nSummary of earlier parts of this conversation (older messages have been condensed to save processing):\n${conversationSummary}`;
    }

    if (memories.length > 0) {
      systemPrompt += `\n\n## Your Memories\nThese are facts you've learned about the user and important context from past conversations:\n${memories.map((m, i) => `${i + 1}. ${m}`).join("\n")}`;
    }

    systemPrompt += `\n\n## Memory Instructions
When the user tells you something important about themselves (their name, preferences, role, company, goals, instructions for you, etc.), you MUST extract those facts so they can be saved to your long-term memory.

In your response, if there are facts to remember, end your visible response, then on a new line add a section exactly like this:

<memory_extract>
- fact 1
- fact 2
</memory_extract>

The memory_extract section will be automatically processed and NOT shown to the user. Only include genuinely important, persistent facts — not ephemeral details about the current task.`;

    // 6. Build Gemini contents from windowed history + new message
    const contents = [
      ...contextMessages.map((m) => ({
        role: m.role as "user" | "model",
        parts: [{ text: m.content }],
      })),
      { role: "user" as const, parts: [{ text: message }] },
    ];

    // 7. Call Gemini
    let result: string;

    if (provider === "gemini") {
      const hasGmailTools = connections.gmail?.connected;

      const callGemini = async (key: string) => {
        const ai = new GoogleGenAI({ apiKey: key });

        // Config with optional tools
        const config: any = {
          systemInstruction: systemPrompt,
        };
        // Always include browser + workflow tools, add Gmail/Calendar if connected
        const allTools: any[] = [...BROWSER_TOOLS, ...WORKFLOW_TOOLS];
        if (hasGmailTools) {
          allTools.push(...GMAIL_TOOLS);
        }
        if (connections.calendar?.connected) {
          allTools.push(...CALENDAR_TOOLS);
        }
        if (connections.drive?.connected) {
          allTools.push(...DRIVE_TOOLS);
        }
        if (connections.sheets?.connected) {
          allTools.push(...SHEETS_TOOLS);
        }
        if (connections.youtube?.connected) {
          allTools.push(...YOUTUBE_TOOLS);
        }
        if (connections.linkedin?.connected) {
          allTools.push(...LINKEDIN_TOOLS);
        }
        if (connections.twitter?.connected) {
          allTools.push(...TWITTER_TOOLS);
        }
        if (connections.instagram?.connected) {
          allTools.push(...INSTAGRAM_TOOLS);
        }
        if (connections.facebook?.connected) {
          allTools.push(...FACEBOOK_TOOLS);
        }
        if (connections.tiktok?.connected) {
          allTools.push(...TIKTOK_TOOLS);
        }
        // Contacts: use any Google connection
        if (connections.gmail?.connected || connections.calendar?.connected || connections.drive?.connected) {
          allTools.push(...CONTACTS_TOOLS);
        }
        // New Google services
        if (connections.tasks?.connected) {
          allTools.push(...TASKS_TOOLS);
        }
        if (connections.docs?.connected) {
          allTools.push(...DOCS_TOOLS);
        }
        if (connections.business?.connected) {
          allTools.push(...BUSINESS_PROFILE_TOOLS);
        }
        if (connections.analytics?.connected) {
          allTools.push(...ANALYTICS_TOOLS);
        }
        if (connections.forms?.connected) {
          allTools.push(...FORMS_TOOLS);
        }
        if (connections.slides?.connected) {
          allTools.push(...SLIDES_TOOLS);
        }
        // Image generation & notes — always available (no connection needed)
        allTools.push(...NOTES_TOOLS);
        config.tools = [{ functionDeclarations: allTools }];

        let response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents,
          config,
        });

        // Tool execution loop — max 5 rounds to prevent infinite loops
        let rounds = 0;
        while (rounds < 5) {
          const candidate = response.candidates?.[0];
          const parts = candidate?.content?.parts || [];

          // Check if there's a function call
          const fnCall = parts.find((p: any) => p.functionCall);
          if (!fnCall?.functionCall) break; // No function call — we're done

          const { name: toolName, args } = fnCall.functionCall;
          console.log(`[Chat] Tool call: ${toolName}(${JSON.stringify(args)})`);

          let toolResult: any;
          try {
            toolResult = await executeTool(userId, toolName!, args as Record<string, any>);
          } catch (err: any) {
            toolResult = { error: err.message };
            console.error(`[Chat] Tool error:`, err.message);
          }

          // Feed tool result back to Gemini — response MUST be a plain object
          const safeResult = Array.isArray(toolResult)
            ? { results: toolResult }
            : (typeof toolResult === "object" && toolResult !== null)
              ? toolResult
              : { value: toolResult };
          contents.push({
            role: "model" as const,
            parts: [{ functionCall: { name: toolName!, args: args as Record<string, any> } } as any],
          });
          contents.push({
            role: "user" as const,
            parts: [
              {
                functionResponse: {
                  name: toolName!,
                  response: safeResult,
                },
              } as any,
            ],
          });

          response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents,
            config,
          });

          rounds++;
        }

        // Extract text from the final response after tool loop
        const finalCandidate = response.candidates?.[0];
        const finalParts = finalCandidate?.content?.parts || [];
        const textParts = finalParts
          .filter((p: any) => p.text)
          .map((p: any) => p.text)
          .join("");

        return (
          textParts ||
          response.text ||
          "Done — I completed the action. Let me know if you need anything else."
        );
      };

      try {
        result = await callGemini(apiKey);
      } catch (err: any) {
        if (apiKey !== platformKey && platformKey) {
          console.warn(`[Chat] User key failed (${err.message}), retrying with platform key`);
          result = await callGemini(platformKey);
        } else {
          throw err;
        }
      }
    } else {
      result = `⚠️ ${provider} is not yet supported. Please switch to Gemini in your Connections settings.`;
    }

    // 8. Extract and store memories
    const memoryMatch = result.match(/<memory_extract>([\s\S]*?)<\/memory_extract>/);
    if (memoryMatch) {
      const facts = memoryMatch[1]
        .split("\n")
        .map((line) => line.replace(/^-\s*/, "").trim())
        .filter((line) => line.length > 0);
      if (facts.length > 0) await storeMemories(userId, "primary", facts);
      result = result.replace(/<memory_extract>[\s\S]*?<\/memory_extract>/, "").trim();
    }

    // 9. Append messages to conversation doc
    //    The client may have already added the user message — avoid duplicating it
    const now = new Date().toISOString();
    const lastMsg = allMessages[allMessages.length - 1];
    const userAlreadyAdded = lastMsg?.role === "user" && lastMsg?.content === message;
    const updatedMessages: ChatMessage[] = [
      ...allMessages,
      ...(userAlreadyAdded ? [] : [{ role: "user" as const, content: message, timestamp: now }]),
      { role: "model" as const, content: result, timestamp: now },
    ];

    const updatePayload: Record<string, any> = {
      messages: updatedMessages,
      status: "idle",
      updatedAt: now,
    };
    // Persist summary if we generated/updated one
    if (conversationSummary) {
      updatePayload.summary = conversationSummary;
    }

    await convRef.update(updatePayload);

    return NextResponse.json({ status: "completed", result });
  } catch (err: any) {
    console.error("Chat API error:", err);

    try {
      if (parsedBody.conversationId) {
        const convRef = adminDb.doc(`conversations/${parsedBody.conversationId}`);
        const snap = await convRef.get();
        if (snap.exists) {
          await convRef.update({
            status: "error",
            lastError: err.message || "Unknown error",
          });
        }
      }
    } catch {}

    return NextResponse.json(
      { error: err.message || "Chat processing failed" },
      { status: 500 }
    );
  }
}
