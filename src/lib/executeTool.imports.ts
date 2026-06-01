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
import { createTask, executeTask, resumeTask } from "@/lib/taskEngine";
import { getWorkflowGoal, WORKFLOW_DEFINITIONS } from "@/lib/workflowDefinitions";
import { browseUrl, clickUrl, submitForm, webSearch } from "@/lib/browser";
import {
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  findFreeSlots,
} from "@/lib/calendar";
import { getStripeBalance, listStripeCharges, getStripeMetrics } from "@/lib/stripeTools";
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
  createPost as getInstagramPost,
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
  prependText,
  replaceText,
  deleteText,
  clearDocument,
  writeDocument,
  updateDocTitle,
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
import { isCorrection, recordCorrection, loadPreferences } from "@/lib/selfImprove";
import { executeMcpTool, getMcpToolDeclarations } from "@/lib/mcpClient";

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

