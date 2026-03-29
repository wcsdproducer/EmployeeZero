import { google, tasks_v1 } from "googleapis";
import { adminDb } from "@/lib/admin";

/* ─── Auth helper ─── */

async function getAuthenticatedTasks(userId: string): Promise<tasks_v1.Tasks> {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error("Google OAuth not configured on server");

  const snap = await adminDb.doc(`users/${userId}/settings/connections`).get();
  if (!snap.exists) throw new Error("No connections found — connect Google Tasks first");
  const data = snap.data() as Record<string, any>;
  const tasks = data?.tasks;
  if (!tasks?.connected || !tasks?.refreshToken) {
    throw new Error("Google Tasks is not connected. Go to Connections to set it up.");
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({
    access_token: tasks.accessToken,
    refresh_token: tasks.refreshToken,
    expiry_date: tasks.expiryDate,
  });

  oauth2Client.on("tokens", async (tokens) => {
    try {
      const updates: Record<string, any> = {};
      if (tokens.access_token) updates["tasks.accessToken"] = tokens.access_token;
      if (tokens.expiry_date) updates["tasks.expiryDate"] = tokens.expiry_date;
      if (tokens.refresh_token) updates["tasks.refreshToken"] = tokens.refresh_token;
      await adminDb.doc(`users/${userId}/settings/connections`).update(updates);
    } catch (err) {
      console.error("[Tasks] Failed to persist refreshed tokens:", err);
    }
  });

  return google.tasks({ version: "v1", auth: oauth2Client });
}

/* ─── Operations ─── */

export async function listTaskLists(userId: string) {
  const tasks = await getAuthenticatedTasks(userId);
  const res = await tasks.tasklists.list({ maxResults: 20 });
  return res.data.items || [];
}

export async function listTasks(userId: string, taskListId: string, showCompleted = false) {
  const tasks = await getAuthenticatedTasks(userId);
  const res = await tasks.tasks.list({
    tasklist: taskListId,
    maxResults: 50,
    showCompleted,
    showHidden: showCompleted,
  });
  return res.data.items || [];
}

export async function createTask(
  userId: string,
  taskListId: string,
  title: string,
  notes?: string,
  due?: string
) {
  const tasks = await getAuthenticatedTasks(userId);
  const res = await tasks.tasks.insert({
    tasklist: taskListId,
    requestBody: {
      title,
      notes: notes || undefined,
      due: due || undefined,
    },
  });
  return res.data;
}

export async function completeTask(userId: string, taskListId: string, taskId: string) {
  const tasks = await getAuthenticatedTasks(userId);
  const res = await tasks.tasks.patch({
    tasklist: taskListId,
    task: taskId,
    requestBody: {
      status: "completed",
      completed: new Date().toISOString(),
    },
  });
  return res.data;
}

export async function deleteTask(userId: string, taskListId: string, taskId: string) {
  const tasks = await getAuthenticatedTasks(userId);
  await tasks.tasks.delete({ tasklist: taskListId, task: taskId });
  return { success: true, action: "deleted" };
}

export async function clearCompleted(userId: string, taskListId: string) {
  const tasks = await getAuthenticatedTasks(userId);
  await tasks.tasks.clear({ tasklist: taskListId });
  return { success: true, action: "cleared_completed" };
}
