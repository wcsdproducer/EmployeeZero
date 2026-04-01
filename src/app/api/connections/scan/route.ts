import { NextResponse } from "next/server";
import { adminDb } from "@/lib/admin";
import { verifyAuth } from "@/lib/auth";
import { listEmails, getUnreadCount } from "@/lib/gmail";
import { listEvents } from "@/lib/calendar";
import { listFiles } from "@/lib/drive";
import { listSpreadsheets } from "@/lib/sheets";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/* ─── Service capability maps ─── */
const SERVICE_CAPABILITIES: Record<string, { capabilities: string[]; examples: string[] }> = {
  gmail: {
    capabilities: [
      "📧 Read & summarize your emails",
      "✏️ Draft and send replies on your behalf",
      "🏷️ Organize your inbox (archive, trash, search)",
      "🔍 Search for any email by topic, sender, or date",
      "📊 Track unread count and urgent threads",
    ],
    examples: [
      "Summarize my unread emails",
      "Reply to the email from John — tell him I'm in",
      "Find the receipt from Amazon last week",
      "How many unread emails do I have?",
    ],
  },
  calendar: {
    capabilities: [
      "📅 Check your schedule and upcoming events",
      "📝 Book new meetings and send invites",
      "🔄 Reschedule or cancel events",
      "⚠️ Catch conflicts and double-bookings",
      "⏰ Find free time slots for scheduling",
    ],
    examples: [
      "What's on my calendar today?",
      "Book a meeting with Sarah for next Tuesday at 2pm",
      "Move my 3pm to Thursday",
      "Do I have any free time tomorrow afternoon?",
    ],
  },
  drive: {
    capabilities: [
      "📁 List and search your files and folders",
      "📄 Read document content",
      "⬆️ Upload new files",
      "📂 Create and organize folders",
      "🔍 Find files by name or type",
    ],
    examples: [
      "What files were shared with me recently?",
      "Find the proposal document I worked on last week",
      "Create a new folder called 'Q2 Reports'",
      "What's in my recent files?",
    ],
  },
  sheets: {
    capabilities: [
      "📊 Read and write spreadsheet data",
      "➕ Append new rows to existing sheets",
      "📋 List all your spreadsheets",
      "🆕 Create new spreadsheets",
      "📈 Pull data for reports and analysis",
    ],
    examples: [
      "List my spreadsheets",
      "Read the data from my Budget sheet",
      "Add a new row to my Expenses tracker",
      "Create a spreadsheet called 'Monthly Report'",
    ],
  },
  youtube: {
    capabilities: [
      "📺 View your channel stats and analytics",
      "🎬 List and search your videos",
      "📋 Manage playlists",
      "💬 Read and reply to comments",
      "📊 Track video performance",
    ],
    examples: [
      "How are my YouTube videos performing?",
      "Show me my latest video comments",
      "What are my most viewed videos?",
      "Reply to the top comment on my latest video",
    ],
  },
  contacts: {
    capabilities: [
      "👤 Search and list your contacts",
      "➕ Create new contacts",
      "🗑️ Remove contacts",
      "🔍 Find contact details quickly",
    ],
    examples: [
      "Find John Smith's phone number",
      "List my contacts",
      "Add a new contact: Jane Doe, jane@example.com",
    ],
  },
  tasks: {
    capabilities: [
      "✅ View and manage your task lists",
      "➕ Create new tasks",
      "✔️ Mark tasks as complete",
      "🗑️ Delete or clear completed tasks",
    ],
    examples: [
      "What's on my to-do list?",
      "Add a task: Follow up with client by Friday",
      "Mark 'Send proposal' as done",
    ],
  },
  docs: {
    capabilities: [
      "📄 Create new Google Docs",
      "📖 Read document content",
      "✏️ Append text to existing documents",
    ],
    examples: [
      "Create a document called 'Meeting Notes'",
      "What's in my latest doc?",
      "Add a paragraph to my project notes",
    ],
  },
  forms: {
    capabilities: [
      "📋 Create Google Forms",
      "❓ Add questions to forms",
      "📊 View form responses",
    ],
    examples: [
      "Create a feedback form",
      "How many responses does my survey have?",
    ],
  },
  slides: {
    capabilities: [
      "📽️ Create presentations",
      "➕ Add slides with content",
      "📖 View presentation details",
    ],
    examples: [
      "Create a presentation called 'Q2 Review'",
      "Add a slide about revenue growth",
    ],
  },
  analytics: {
    capabilities: [
      "📊 View website traffic and performance",
      "📈 Run custom reports",
      "⚡ Check real-time visitor data",
    ],
    examples: [
      "How much traffic did my site get this week?",
      "Show me real-time visitors",
    ],
  },
  business: {
    capabilities: [
      "🏢 Manage your Google Business listing",
      "⭐ Read and reply to reviews",
      "📝 Create business posts",
    ],
    examples: [
      "Do I have any new reviews?",
      "Reply to my latest Google review",
      "Post an update about our holiday hours",
    ],
  },
};

const SERVICE_NAMES: Record<string, string> = {
  gmail: "Gmail",
  calendar: "Google Calendar",
  drive: "Google Drive",
  sheets: "Google Sheets",
  youtube: "YouTube",
  contacts: "Google Contacts",
  tasks: "Google Tasks",
  docs: "Google Docs",
  forms: "Google Forms",
  slides: "Google Slides",
  analytics: "Google Analytics",
  business: "Business Profile",
};

/* ─── Scan Functions ─── */

async function scanGmail(userId: string) {
  try {
    const [unreadCount, recentEmails] = await Promise.all([
      getUnreadCount(userId),
      listEmails(userId, "in:inbox", 5),
    ]);

    const unreadEmails = recentEmails.filter(e => e.unread);

    return {
      success: true,
      findings: [
        `📬 **${unreadCount}** unread emails in your inbox`,
        `📨 **${recentEmails.length}** recent emails loaded`,
        ...(unreadEmails.length > 0
          ? [`⚡ **${unreadEmails.length}** need your attention:`,
             ...unreadEmails.slice(0, 3).map(e => `  • From **${e.from.split('<')[0].trim()}**: "${e.subject}"`)]
          : ["✨ Your inbox looks clean — no urgent items!"]),
      ],
    };
  } catch (err: any) {
    return { success: false, findings: [`⚠️ Couldn't scan Gmail: ${err.message}`] };
  }
}

async function scanCalendar(userId: string) {
  try {
    const now = new Date();
    const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const events = await listEvents(userId, now.toISOString(), weekEnd.toISOString(), 10);

    // Check for conflicts (overlapping events)
    const conflicts: string[] = [];
    for (let i = 0; i < events.length - 1; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const aEnd = new Date(events[i].end);
        const bStart = new Date(events[j].start);
        if (aEnd > bStart) {
          conflicts.push(`"${events[i].summary}" overlaps with "${events[j].summary}"`);
        }
      }
    }

    const today = events.filter(e => {
      const d = new Date(e.start);
      return d.toDateString() === now.toDateString();
    });

    return {
      success: true,
      findings: [
        `📅 **${events.length}** events this week`,
        `📌 **${today.length}** meetings today`,
        ...(conflicts.length > 0
          ? [`⚠️ **${conflicts.length}** scheduling conflict${conflicts.length > 1 ? 's' : ''}:`,
             ...conflicts.slice(0, 2).map(c => `  • ${c}`)]
          : ["✅ No scheduling conflicts found"]),
      ],
    };
  } catch (err: any) {
    return { success: false, findings: [`⚠️ Couldn't scan Calendar: ${err.message}`] };
  }
}

async function scanDrive(userId: string) {
  try {
    const files = await listFiles(userId, undefined, 10);
    const sharedFiles = files.filter((f: any) => f.shared);

    return {
      success: true,
      findings: [
        `📁 **${files.length}** recent files found`,
        ...(sharedFiles.length > 0
          ? [`📤 **${sharedFiles.length}** shared with others`,
             ...sharedFiles.slice(0, 3).map((f: any) => `  • "${f.name}" (${f.mimeType?.split('.').pop() || 'file'})`)]
          : ["📂 Your recent files are organized"]),
      ],
    };
  } catch (err: any) {
    return { success: false, findings: [`⚠️ Couldn't scan Drive: ${err.message}`] };
  }
}

async function scanSheets(userId: string) {
  try {
    const sheets = await listSpreadsheets(userId, 5);
    return {
      success: true,
      findings: [
        `📊 **${sheets.length}** spreadsheet${sheets.length !== 1 ? 's' : ''} found`,
        ...(sheets.length > 0
          ? sheets.slice(0, 3).map((s: any) => `  • "${s.name}"`)
          : ["No spreadsheets yet — I can create one for you!"]),
      ],
    };
  } catch (err: any) {
    return { success: false, findings: [`⚠️ Couldn't scan Sheets: ${err.message}`] };
  }
}

/* ─── Main Handler ─── */

export async function GET(request: Request) {
  const auth = await verifyAuth(request);
  if (auth.error) return auth.error;
  const userId = auth.userId;

  const { searchParams } = new URL(request.url);
  const service = searchParams.get("service");

  if (!service || !SERVICE_CAPABILITIES[service]) {
    return NextResponse.json({ error: "Invalid service" }, { status: 400 });
  }

  const serviceName = SERVICE_NAMES[service] || service;
  const { capabilities, examples } = SERVICE_CAPABILITIES[service];

  // Run service-specific scan
  let scanResult = { success: true, findings: [] as string[] };
  switch (service) {
    case "gmail":
      scanResult = await scanGmail(userId);
      break;
    case "calendar":
      scanResult = await scanCalendar(userId);
      break;
    case "drive":
      scanResult = await scanDrive(userId);
      break;
    case "sheets":
      scanResult = await scanSheets(userId);
      break;
    default:
      // For services without deep scans, just report connected
      scanResult = {
        success: true,
        findings: [`✅ **${serviceName}** is connected and ready to use!`],
      };
  }

  // Build the agent message
  const message = [
    `🔗 **${serviceName} Connected!**\n`,
    `I just scanned your ${serviceName} account. Here's what I found:\n`,
    ...scanResult.findings,
    `\n---\n`,
    `**What I can do with ${serviceName}:**\n`,
    ...capabilities,
    `\n**Try saying:**`,
    ...examples.map(e => `> 💬 *"${e}"*`),
    `\n---\n`,
    `Want me to start with something, or [connect more services](/connections)?`,
  ].join("\n");

  return NextResponse.json({
    service,
    serviceName,
    message,
    capabilities,
    examples,
    findings: scanResult.findings,
    success: scanResult.success,
  });
}
