import { NextResponse } from "next/server";
import { adminDb } from "@/lib/admin";
import { verifyAuth, checkRateLimit, rateLimitResponse } from "@/lib/auth";
import { GoogleGenAI, Type } from "@google/genai";
import { FieldValue } from "firebase-admin/firestore";
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

export async function executeTool(
  userId: string,
  toolName: string,
  args: Record<string, any>,
  agentId?: string
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
    // Stripe Tools
    case "get_stripe_balance":
      return await getStripeBalance(userId);
    case "get_stripe_metrics":
      return await getStripeMetrics(userId);
    case "list_stripe_charges":
      return await listStripeCharges(userId, args.limit || 10);
    // Calendar tools
    case "list_events":
      return await listEvents(userId, args.time_min, args.time_max, args.max_results || 10);
    case "get_event":
      return await getEvent(userId, args.event_id);
    case "create_event": {
      const attendeeList = args.attendees ? args.attendees.split(",").map((e: string) => e.trim()) : undefined;
      const recurrence = args.recurrence ? (Array.isArray(args.recurrence) ? args.recurrence : [args.recurrence]) : undefined;
      console.log(`[Calendar] create_event args:`, JSON.stringify({ summary: args.summary, start: args.start_time, end: args.end_time, recurrence }));
      const calResult = await createEvent(userId, args.summary, args.start_time, args.end_time, args.description, attendeeList, args.location, recurrence);
      console.log(`[Calendar] create_event result:`, JSON.stringify(calResult));
      return calResult;
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
        agentId: agentId || "company",
      });
    }
    case "list_my_workflows": {
      const allWfs = await listCustomWorkflows(userId);
      return allWfs.filter(wf => !agentId || wf.agentId === agentId || wf.agentId === "company" || !wf.agentId);
    }
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
      return await getInstagramPost(userId, args.image_url, args.caption);
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

    // Memory tool
    case "save_memory": {
      const facts: string[] = args.facts || [];
      if (facts.length === 0) return { status: "no_facts", message: "No facts provided to save." };
      const batch = adminDb.batch();
      for (const fact of facts) {
        const ref = adminDb.collection(`users/${userId}/memories`).doc();
        batch.set(ref, {
          content: fact,
          agentId: "company",
          source: "voice",
          createdAt: FieldValue.serverTimestamp(),
        });
      }
      await batch.commit();
      return { status: "saved", count: facts.length, facts };
    }

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

    case "create_chart": {
      try {
        const chartData = typeof args.data === "string" ? JSON.parse(args.data) : args.data;
        const spec = { type: args.type || "bar", title: args.title, data: chartData };
        return { __chart: spec, message: `Chart created: ${args.title || args.type}` };
      } catch (e: any) {
        return { error: `Invalid chart data: ${e.message}` };
      }
    }

    case "run_in_background": {
      // Queue a tool to run asynchronously — returns immediately so voice conversation continues
      const innerToolName = args.tool_name;
      const innerArgs = (() => { try { return typeof args.tool_args === "string" ? JSON.parse(args.tool_args) : (args.tool_args || {}); } catch { return {}; } })();
      const taskRef = await adminDb.collection(`users/${userId}/backgroundTasks`).add({
        toolName: innerToolName,
        args: innerArgs,
        agentId: agentId || "primary",
        description: args.description || innerToolName,
        status: "pending",
        notified: false,
        createdAt: FieldValue.serverTimestamp(),
      });
      return { taskId: taskRef.id, status: "queued", description: args.description };
    }
    default:
      // Universal MCP Connector — route mcp_ prefixed tools to MCP servers
      if (toolName.startsWith("mcp_")) {
        return await executeMcpTool(userId, toolName, args);
      }
      return { error: `Unknown tool: ${toolName}` };
  }
}

