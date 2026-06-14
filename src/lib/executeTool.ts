import { NextResponse } from "next/server";
import { adminDb } from "@/lib/admin";
import { verifyAuth, checkRateLimit, rateLimitResponse } from "@/lib/auth";
import { GoogleGenAI, Type } from "@google/genai";
import { FieldValue } from "firebase-admin/firestore";
import { deepResearch } from "@/lib/research";
import { createPDF } from "@/lib/pdf";
import { embedText } from "@/lib/embeddings";
import {
  listEmails,
  getEmail,
  sendEmail,
  replyToEmail,
  getUnreadCount,
  archiveEmail,
  trashEmail,
  markAsRead,
  spamEmail,
  markAsUnread,
  unarchiveEmail,
} from "@/lib/gmail";
import { createTask, executeTask, resumeTask } from "@/lib/taskEngine";
import { getWorkflowGoal, WORKFLOW_DEFINITIONS } from "@/lib/workflowDefinitions";
import { BUILTIN_TOOLS, BUILTIN_SKILLS, BUILTIN_WORKFLOWS } from "@/lib/builtinCatalog";
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
  updateCustomWorkflow,
} from "@/lib/customWorkflows";
import {
  createCustomTool,
  listCustomTools,
  updateCustomTool,
  deleteCustomTool,
} from "@/lib/customTools";
import {
  createCustomSkill,
  listCustomSkills,
  updateCustomSkill,
  deleteCustomSkill,
} from "@/lib/customSkills";
import {
  listFiles,
  getFile,
  readFileContent,
  uploadFile,
  createFolder,
  copyFile,
  moveFile,
  shareFile,
  renameFile,
  trashFile,
} from "@/lib/drive";
import {
  listSpreadsheets,
  readSheet,
  writeSheet,
  appendRows,
  createSpreadsheet,
  getSpreadsheetInfo,
  addSheet,
  deleteSheet,
  renameSheet,
  clearSheet,
  duplicateSheet,
  formatCells,
  formatRow,
  freezeRows,
  freezeColumns,
  setColumnWidth,
  setRowHeight,
  autoResizeColumns,
  mergeCells,
  sortRange,
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
    case "mark_as_read":
      await markAsRead(userId, args.message_id);
      return { success: true, action: "marked_as_read" };
    case "trash_email":
      await trashEmail(userId, args.message_id);
      return { success: true, action: "trashed" };
    case "spam_email":
      await spamEmail(userId, args.message_id);
      return { success: true, action: "marked_as_spam" };
    case "mark_as_unread":
      await markAsUnread(userId, args.message_id);
      return { success: true, action: "marked_as_unread" };
    case "unarchive_email":
      await unarchiveEmail(userId, args.message_id);
      return { success: true, action: "unarchived" };
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
    case "deep_research": {
      const researchResult = await deepResearch(args.topic);
      // Auto-save research as a note for institutional knowledge
      try {
        const sourceList = researchResult.sources.map((s: any) => s.title || s.domain).filter(Boolean).join(", ");
        await createNote(
          userId,
          `[Research] ${args.topic}`,
          `${researchResult.report}\n\n---\nSources: ${sourceList}\nResearched: ${new Date().toISOString().split('T')[0]}`,
          ["auto-research", ...args.topic.toLowerCase().split(/\s+/).slice(0, 3)]
        );
        console.log(`[Knowledge] Auto-saved research on "${args.topic}" as note`);
      } catch (err) {
        console.warn("[Knowledge] Failed to auto-save research:", err);
      }
      return researchResult;
    }
    case "create_pdf":
      return await createPDF(userId, { title: args.title, content: args.content, author: args.author });
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
      const calResult = await createEvent(userId, args.summary, args.start_time, args.end_time, args.description, attendeeList, args.location, recurrence, args.reminder_minutes);
      console.log(`[Calendar] create_event result:`, JSON.stringify(calResult));
      return calResult;
    }
    case "update_event":
      return await updateEvent(userId, args.event_id, {
        summary: args.summary, description: args.description,
        startTime: args.start_time, endTime: args.end_time, location: args.location,
        reminderMinutes: args.reminder_minutes,
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
      return await uploadFile(userId, args.name, args.content, args.mime_type, args.folder_id, args.source_url);
    case "create_drive_folder":
      return await createFolder(userId, args.name, args.parent_id);
    case "copy_drive_file":
      return await copyFile(userId, args.file_id, args.name, args.folder_id);
    case "move_drive_file":
      return await moveFile(userId, args.file_id, args.folder_id);
    case "share_drive_file":
      return await shareFile(userId, args.file_id, args.role, args.type, args.email_address);
    case "rename_drive_file":
      return await renameFile(userId, args.file_id, args.new_name);
    case "trash_drive_file":
      return await trashFile(userId, args.file_id);
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
    case "get_spreadsheet_info":
      return await getSpreadsheetInfo(userId, args.spreadsheet_id);
    case "add_sheet_tab":
      return await addSheet(userId, args.spreadsheet_id, args.sheet_title, args.index);
    case "delete_sheet_tab":
      return await deleteSheet(userId, args.spreadsheet_id, args.sheet_title);
    case "rename_sheet_tab":
      return await renameSheet(userId, args.spreadsheet_id, args.current_title, args.new_title);
    case "clear_sheet_tab":
      return await clearSheet(userId, args.spreadsheet_id, args.sheet_title);
    case "duplicate_sheet_tab":
      return await duplicateSheet(userId, args.spreadsheet_id, args.source_title, args.new_title, args.insert_index);
    // ── Formatting tools ──────────────────────────────────────────────────
    case "format_cells": {
      const fmtOpts: any = {};
      if (args.bold !== undefined) fmtOpts.bold = args.bold;
      if (args.italic !== undefined) fmtOpts.italic = args.italic;
      if (args.underline !== undefined) fmtOpts.underline = args.underline;
      if (args.strikethrough !== undefined) fmtOpts.strikethrough = args.strikethrough;
      if (args.font_size !== undefined) fmtOpts.fontSize = args.font_size;
      if (args.font_family !== undefined) fmtOpts.fontFamily = args.font_family;
      if (args.foreground_color !== undefined) fmtOpts.foregroundColor = args.foreground_color;
      if (args.background_color !== undefined) fmtOpts.backgroundColor = args.background_color;
      if (args.horizontal_alignment !== undefined) fmtOpts.horizontalAlignment = args.horizontal_alignment;
      if (args.vertical_alignment !== undefined) fmtOpts.verticalAlignment = args.vertical_alignment;
      if (args.wrap_strategy !== undefined) fmtOpts.wrapStrategy = args.wrap_strategy;
      if (args.number_format_type !== undefined) fmtOpts.numberFormat = { type: args.number_format_type, pattern: args.number_format_pattern || "" };
      return await formatCells(userId, args.spreadsheet_id, args.tab_name, args.range, fmtOpts);
    }
    case "format_row": {
      const rowFmtOpts: any = {};
      if (args.bold !== undefined) rowFmtOpts.bold = args.bold;
      if (args.italic !== undefined) rowFmtOpts.italic = args.italic;
      if (args.underline !== undefined) rowFmtOpts.underline = args.underline;
      if (args.font_size !== undefined) rowFmtOpts.fontSize = args.font_size;
      if (args.font_family !== undefined) rowFmtOpts.fontFamily = args.font_family;
      if (args.foreground_color !== undefined) rowFmtOpts.foregroundColor = args.foreground_color;
      if (args.background_color !== undefined) rowFmtOpts.backgroundColor = args.background_color;
      if (args.horizontal_alignment !== undefined) rowFmtOpts.horizontalAlignment = args.horizontal_alignment;
      return await formatRow(userId, args.spreadsheet_id, args.tab_name, args.row_number, rowFmtOpts);
    }
    case "freeze_rows":
      return await freezeRows(userId, args.spreadsheet_id, args.tab_name, args.row_count);
    case "freeze_columns":
      return await freezeColumns(userId, args.spreadsheet_id, args.tab_name, args.column_count);
    case "set_column_width":
      return await setColumnWidth(userId, args.spreadsheet_id, args.tab_name, args.start_column_index, args.end_column_index, args.pixel_size);
    case "set_row_height":
      return await setRowHeight(userId, args.spreadsheet_id, args.tab_name, args.start_row_index, args.end_row_index, args.pixel_size);
    case "auto_resize_columns":
      return await autoResizeColumns(userId, args.spreadsheet_id, args.tab_name, args.start_column_index ?? 0, args.end_column_index ?? 26);
    case "merge_cells":
      return await mergeCells(userId, args.spreadsheet_id, args.tab_name, args.range, args.merge_type || "MERGE_ALL", args.unmerge || false);
    case "sort_sheet_range":
      return await sortRange(userId, args.spreadsheet_id, args.tab_name, args.range, [{ dimensionIndex: args.sort_column, sortOrder: args.sort_order || "ASCENDING" }]);
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
    case "edit_workflow": {
      const updates: Record<string, any> = {};
      if (args.name) updates.name = args.name;
      if (args.description !== undefined) updates.description = args.description;
      if (args.goal) updates.goal = args.goal;
      if (args.schedule !== undefined) updates.schedule = args.schedule || null;
      if (args.required_connections !== undefined) {
        updates.requiredConnections = args.required_connections
          ? args.required_connections.split(",").map((c: string) => c.trim()).filter(Boolean)
          : [];
      }
      const ok = await updateCustomWorkflow(userId, args.workflow_id, updates);
      return ok ? { success: true, message: "Workflow updated successfully." } : { success: false, message: "Workflow not found." };
    }
    // Tool management
    case "create_tool": {
      const toolConns = args.required_connections
        ? args.required_connections.split(",").map((c: string) => c.trim()).filter(Boolean)
        : [];
      return await createCustomTool(userId, {
        name: args.name,
        description: args.description || "",
        instruction: args.instruction,
        requiredConnections: toolConns,
        agentId: args.agent_id || agentId || "company",
      });
    }
    case "list_my_tools":
      return await listCustomTools(userId);
    case "edit_tool": {
      const toolUpdates: Record<string, any> = {};
      if (args.name) toolUpdates.name = args.name;
      if (args.description !== undefined) toolUpdates.description = args.description;
      if (args.instruction) toolUpdates.instruction = args.instruction;
      if (args.required_connections !== undefined) {
        toolUpdates.requiredConnections = args.required_connections
          ? args.required_connections.split(",").map((c: string) => c.trim()).filter(Boolean)
          : [];
      }
      const toolOk = await updateCustomTool(userId, args.tool_id, toolUpdates);
      return toolOk ? { success: true, message: "Tool updated." } : { success: false, message: "Tool not found." };
    }
    case "delete_tool": {
      const toolDel = await deleteCustomTool(userId, args.tool_id);
      return toolDel ? { success: true, message: "Tool deleted." } : { success: false, message: "Tool not found." };
    }
    // Skill management
    case "create_skill": {
      const toolIds = args.tool_ids
        ? args.tool_ids.split(",").map((id: string) => id.trim()).filter(Boolean)
        : [];
      return await createCustomSkill(userId, {
        name: args.name,
        description: args.description || "",
        toolIds,
        agentId: args.agent_id || agentId || "company",
      });
    }
    case "list_my_skills":
      return await listCustomSkills(userId);
    case "edit_skill": {
      const skillUpdates: Record<string, any> = {};
      if (args.name) skillUpdates.name = args.name;
      if (args.description !== undefined) skillUpdates.description = args.description;
      if (args.tool_ids !== undefined) {
        skillUpdates.toolIds = args.tool_ids
          ? args.tool_ids.split(",").map((id: string) => id.trim()).filter(Boolean)
          : [];
      }
      const skillOk = await updateCustomSkill(userId, args.skill_id, skillUpdates);
      return skillOk ? { success: true, message: "Skill updated." } : { success: false, message: "Skill not found." };
    }
    case "delete_skill": {
      const skillDel = await deleteCustomSkill(userId, args.skill_id);
      return skillDel ? { success: true, message: "Skill deleted." } : { success: false, message: "Skill not found." };
    }
    // Scheduled job / cron tools
    case "schedule_workflow": {
      const { workflow_id, schedule, name: jobName } = args;
      // Resolve a human-readable name
      let resolvedName = jobName;
      if (!resolvedName) {
        // Try built-in workflows
        const builtIn = WORKFLOW_DEFINITIONS[workflow_id];
        if (builtIn) {
          resolvedName = workflow_id.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
        } else {
          // Try custom workflows
          const customs = await listCustomWorkflows(userId);
          const custom = customs.find(w => w.id === workflow_id);
          resolvedName = custom?.name || workflow_id;
        }
      }
      const cronHumanMap: Record<string, string> = {
        "0 8 * * *": "Daily 8 AM", "0 9 * * *": "Daily 9 AM", "0 18 * * *": "Daily 6 PM",
        "0 * * * *": "Hourly", "*/15 * * * *": "Every 15 min", "*/30 * * * *": "Every 30 min",
        "0 */2 * * *": "Every 2 hours", "0 9 * * 1-5": "Weekdays 9 AM", "0 8 * * 1-5": "Weekdays 8 AM",
        "0 9 * * 1": "Mon 9 AM", "0 20 * * 0": "Sun 8 PM",
      };
      const humanSchedule = cronHumanMap[schedule] || schedule;
      const newJob = {
        id: `${workflow_id}-${Date.now()}`,
        workflowId: workflow_id,
        name: resolvedName,
        schedule: humanSchedule,
        cronExpression: schedule,
        enabled: true,
        createdAt: new Date().toISOString(),
      };
      const cronRef = adminDb.doc(`users/${userId}/settings/cron`);
      const cronSnap = await cronRef.get();
      if (cronSnap.exists) {
        const existing = cronSnap.data()?.jobs || [];
        await cronRef.update({ jobs: [...existing, newJob] });
      } else {
        await cronRef.set({ jobs: [newJob] });
      }
      return { success: true, message: `Scheduled "${resolvedName}" to run ${humanSchedule}`, job: newJob };
    }
    case "list_scheduled_jobs": {
      const cronRef2 = adminDb.doc(`users/${userId}/settings/cron`);
      const cronSnap2 = await cronRef2.get();
      if (!cronSnap2.exists) return { jobs: [], message: "No scheduled jobs found." };
      const jobs = cronSnap2.data()?.jobs || [];
      return { jobs, message: `Found ${jobs.length} scheduled job(s).` };
    }
    case "pause_scheduled_job": {
      const cronRef3 = adminDb.doc(`users/${userId}/settings/cron`);
      const cronSnap3 = await cronRef3.get();
      if (!cronSnap3.exists) return { error: "No scheduled jobs found." };
      const jobs3 = (cronSnap3.data()?.jobs || []).map((j: any) =>
        j.id === args.job_id ? { ...j, enabled: false } : j
      );
      await cronRef3.update({ jobs: jobs3 });
      const paused = jobs3.find((j: any) => j.id === args.job_id);
      return { success: true, message: `Paused "${paused?.name || args.job_id}".` };
    }
    case "resume_scheduled_job": {
      const cronRef4 = adminDb.doc(`users/${userId}/settings/cron`);
      const cronSnap4 = await cronRef4.get();
      if (!cronSnap4.exists) return { error: "No scheduled jobs found." };
      const jobs4 = (cronSnap4.data()?.jobs || []).map((j: any) =>
        j.id === args.job_id ? { ...j, enabled: true } : j
      );
      await cronRef4.update({ jobs: jobs4 });
      const resumed = jobs4.find((j: any) => j.id === args.job_id);
      return { success: true, message: `Resumed "${resumed?.name || args.job_id}".` };
    }
    case "delete_scheduled_job": {
      const cronRef5 = adminDb.doc(`users/${userId}/settings/cron`);
      const cronSnap5 = await cronRef5.get();
      if (!cronSnap5.exists) return { error: "No scheduled jobs found." };
      const before = cronSnap5.data()?.jobs || [];
      const after = before.filter((j: any) => j.id !== args.job_id);
      await cronRef5.update({ jobs: after });
      const deleted = before.find((j: any) => j.id === args.job_id);
      return { success: true, message: `Deleted scheduled job "${deleted?.name || args.job_id}".` };
    }
    case "get_automation_details": {
      const q = (args.id || "").toLowerCase().replace(/-/g, " ");
      if (args.type === "tool" || args.type === "skill" || args.type === "workflow") {
        // Search built-in catalog first
        if (args.type === "tool") {
          const found = BUILTIN_TOOLS.find(t =>
            t.id.toLowerCase().includes(q) ||
            t.name.toLowerCase().includes(q) ||
            q.includes(t.name.toLowerCase())
          );
          if (found) return {
            id: found.id, name: found.name, type: "tool", source: "built-in",
            description: found.description,
            toolFunctions: found.toolNames,
            requiredConnections: found.requiredConnections,
            category: found.category,
          };
          // Fall through to custom tools
          try {
            const customTools = await listCustomTools(userId);
            const ct = customTools.find((t: any) =>
              (t.id || "").toLowerCase().includes(q) ||
              (t.name || "").toLowerCase().includes(q)
            );
            if (ct) return {
              id: ct.id, name: ct.name, type: "tool", source: "custom",
              description: ct.description,
              instruction: ct.instruction,
              requiredConnections: ct.requiredConnections || [],
            };
          } catch {}
          return { error: `No tool found matching '${args.id}'.` };
        }
        if (args.type === "skill") {
          const found = BUILTIN_SKILLS.find(s =>
            s.id.toLowerCase().includes(q) ||
            s.name.toLowerCase().includes(q) ||
            q.includes(s.name.toLowerCase())
          );
          if (found) {
            const toolDetails = found.toolIds.map((tid, i) => {
              const t = BUILTIN_TOOLS.find(bt => bt.id === tid);
              return t ? `${i + 1}. ${t.icon} ${t.name} — ${t.description}` : `${i + 1}. ${tid}`;
            });
            return {
              id: found.id, name: found.name, type: "skill", source: "built-in",
              description: found.description,
              requiredConnections: found.requiredConnections,
              category: found.category,
              steps: toolDetails,
              toolIds: found.toolIds,
            };
          }
          // Fall through to custom skills
          try {
            const customSkills = await listCustomSkills(userId);
            const cs = customSkills.find((s: any) =>
              (s.id || "").toLowerCase().includes(q) ||
              (s.name || "").toLowerCase().includes(q)
            );
            if (cs) return {
              id: cs.id, name: cs.name, type: "skill", source: "custom",
              description: cs.description,
              toolIds: cs.toolIds || [],
              requiredConnections: cs.requiredConnections || [],
            };
          } catch {}
          return { error: `No skill found matching '${args.id}'.` };
        }
        if (args.type === "workflow") {
          // Check built-in workflows first
          const found = BUILTIN_WORKFLOWS.find(w =>
            w.id.toLowerCase().includes(q) ||
            w.name.toLowerCase().includes(q) ||
            w.workflowDefinitionId.toLowerCase().replace(/-/g, " ").includes(q)
          );
          if (found) {
            const wfDef = WORKFLOW_DEFINITIONS[found.workflowDefinitionId];
            return {
              id: found.id, name: found.name, type: "workflow", source: "built-in",
              description: found.description,
              requiredConnections: found.requiredConnections,
              category: found.category,
              goal: wfDef?.goal || "No goal defined.",
              workflowDefinitionId: found.workflowDefinitionId,
            };
          }
          // Also check WORKFLOW_DEFINITIONS directly by key
          for (const [wfId, wfDef] of Object.entries(WORKFLOW_DEFINITIONS)) {
            const normalized = wfId.replace(/-/g, " ");
            if (wfId.includes(q.replace(/ /g, "-")) || normalized.includes(q)) {
              return {
                id: wfId, name: normalized.replace(/\b\w/g, c => c.toUpperCase()),
                type: "workflow", source: "built-in",
                goal: wfDef.goal,
                requiredConnections: wfDef.requiredConnections,
              };
            }
          }
          // Fall through to custom workflows
          try {
            const customWfs = await listCustomWorkflows(userId);
            const cw = customWfs.find((w: any) =>
              (w.id || "").toLowerCase().includes(q) ||
              (w.name || "").toLowerCase().includes(q)
            );
            if (cw) return {
              id: cw.id, name: cw.name, type: "workflow", source: "custom",
              description: cw.description,
              goal: cw.goal,
              requiredConnections: cw.requiredConnections || [],
              schedule: cw.schedule || null,
            };
          } catch {}
          return { error: `No workflow found matching '${args.id}'.` };
        }
      }
      return { error: "Invalid type. Must be 'tool', 'skill', or 'workflow'." };
    }
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
      
      // Generate embeddings for semantic search (get API key from user settings)
      let apiKey = "";
      try {
        const settingsDoc = await adminDb.doc(`users/${userId}/settings/api`).get();
        apiKey = settingsDoc.data()?.geminiKey || "";
      } catch {}
      
      const batch = adminDb.batch();
      for (const fact of facts) {
        const ref = adminDb.collection(`users/${userId}/memories`).doc();
        const memoryData: any = {
          content: fact,
          agentId: "company",
          source: "voice",
          createdAt: FieldValue.serverTimestamp(),
        };
        // Generate embedding if API key available
        if (apiKey) {
          try {
            const embedding = await embedText(apiKey, fact);
            if (embedding.length > 0) memoryData.embedding = embedding;
          } catch {}
        }
        batch.set(ref, memoryData);
      }
      await batch.commit();
      return { status: "saved", count: facts.length, facts };
    }
    case "search_conversations": {
      const query = (args.query || args.search_query || args.searchTerm || args.q || "").toLowerCase().trim();
      const maxResults = args.max_results || 5;
      
      let convSnap;
      try {
        convSnap = await adminDb
          .collection("conversations")
          .where("userId", "==", userId)
          .orderBy("createdAt", "desc")
          .limit(500)
          .get();
      } catch {
        // Fallback if composite index doesn't exist yet
        convSnap = await adminDb
          .collection("conversations")
          .where("userId", "==", userId)
          .limit(500)
          .get();
      }
      
      const matches: any[] = [];
      for (const doc of convSnap.docs) {
        const data = doc.data();
        const messages = data.messages || [];
        
        // If there's no query, we match all conversations (returns most recent ones)
        const allText = messages.map((m: any) => m.content || "").join(" ").toLowerCase();
        const matchesQuery = !query || allText.includes(query);
        
        if (matchesQuery) {
          // Extract relevant message excerpts matching the query
          const relevant = messages
            .filter((m: any) => !query || (m.content || "").toLowerCase().includes(query))
            .slice(0, 3)
            .map((m: any) => ({ role: m.role, content: (m.content || "").substring(0, 300) }));
          
          // Generate a clean transcript snippet of the last 5 messages for easy model reading
          const transcriptSnippet = messages
            .slice(-5)
            .map((m: any) => `${m.role === "user" ? "User" : "Assistant"}: "${m.content || ""}"`)
            .join("\n");
          
          matches.push({
            id: doc.id,
            title: data.title || "Untitled",
            date: data.createdAt?.toDate?.()?.toISOString?.() || data.createdAt || "unknown",
            messageCount: messages.length,
            matchingExcerpts: relevant,
            transcriptSnippet,
          });
          
          if (matches.length >= maxResults) break;
        }
      }
      
      return {
        results: matches,
        message: query
          ? `Found ${matches.length} conversation(s) matching "${query}".`
          : `Returned ${matches.length} most recent conversation(s) (no search query was provided).`,
      };
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
    case "prepend_doc_text":
      return await prependText(userId, args.document_id, args.text);
    case "replace_doc_text":
      return await replaceText(userId, args.document_id, args.find_text, args.replace_with);
    case "delete_doc_text":
      return await deleteText(userId, args.document_id, args.find_text);
    case "clear_document":
      return await clearDocument(userId, args.document_id);
    case "write_document":
      return await writeDocument(userId, args.document_id, args.content);
    case "update_doc_title":
      return await updateDocTitle(userId, args.document_id, args.title);

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



    default:
      // Universal MCP Connector — route mcp_ prefixed tools to MCP servers
      if (toolName.startsWith("mcp_")) {
        return await executeMcpTool(userId, toolName, args);
      }
      return { error: `Unknown tool: ${toolName}` };
  }
}

