import { adminDb } from "@/lib/admin";

/* ─── Types ─── */
interface DiscordMessage {
  id: string;
  content: string;
  author: { id: string; username: string; bot: boolean };
  timestamp: string;
  channel_id: string;
}

interface DiscordChannel {
  id: string;
  name: string;
  type: number;
  topic?: string;
  position: number;
  parent_id?: string;
}

interface DiscordGuild {
  id: string;
  name: string;
  icon?: string;
  member_count?: number;
  owner_id: string;
}

interface DiscordMember {
  user: { id: string; username: string; discriminator: string };
  nick?: string;
  roles: string[];
  joined_at: string;
}

/* ─── Token Management ─── */

async function getDiscordToken(userId: string): Promise<string> {
  const snap = await adminDb.doc(`users/${userId}/settings/connections`).get();
  if (!snap.exists) throw new Error("No connections found — connect Discord first");

  const data = snap.data() as Record<string, any>;
  const discord = data?.discord;

  if (!discord?.connected || !discord?.apiKey) {
    throw new Error("Discord is not connected. Go to Connections and add your Bot Token.");
  }

  return discord.apiKey;
}

/* ─── API Helper ─── */

const DISCORD_API = "https://discord.com/api/v10";

async function discordFetch(
  token: string,
  path: string,
  options: { method?: string; body?: any } = {}
): Promise<any> {
  const res = await fetch(`${DISCORD_API}${path}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "Unknown error");
    throw new Error(`Discord API error ${res.status}: ${errText}`);
  }

  if (res.status === 204) return { success: true };
  return res.json();
}

/* ─── Guild Operations ─── */

export async function listGuilds(userId: string): Promise<DiscordGuild[]> {
  const token = await getDiscordToken(userId);
  const guilds = await discordFetch(token, "/users/@me/guilds");
  return guilds.map((g: any) => ({
    id: g.id,
    name: g.name,
    icon: g.icon,
    member_count: g.approximate_member_count,
    owner_id: g.owner_id || "",
  }));
}

export async function getGuildInfo(
  userId: string,
  guildId: string
): Promise<DiscordGuild & { channels: DiscordChannel[] }> {
  const token = await getDiscordToken(userId);
  const [guild, channels] = await Promise.all([
    discordFetch(token, `/guilds/${guildId}?with_counts=true`),
    discordFetch(token, `/guilds/${guildId}/channels`),
  ]);

  return {
    id: guild.id,
    name: guild.name,
    icon: guild.icon,
    member_count: guild.approximate_member_count,
    owner_id: guild.owner_id,
    channels: channels.map((c: any) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      topic: c.topic,
      position: c.position,
      parent_id: c.parent_id,
    })),
  };
}

/* ─── Channel Operations ─── */

export async function listChannels(
  userId: string,
  guildId: string
): Promise<DiscordChannel[]> {
  const token = await getDiscordToken(userId);
  const channels = await discordFetch(token, `/guilds/${guildId}/channels`);
  return channels.map((c: any) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    topic: c.topic,
    position: c.position,
    parent_id: c.parent_id,
  }));
}

export async function createChannel(
  userId: string,
  guildId: string,
  name: string,
  type: number = 0,
  topic?: string,
  parentId?: string
): Promise<DiscordChannel> {
  const token = await getDiscordToken(userId);
  const body: any = { name, type };
  if (topic) body.topic = topic;
  if (parentId) body.parent_id = parentId;

  const ch = await discordFetch(token, `/guilds/${guildId}/channels`, {
    method: "POST",
    body,
  });
  return { id: ch.id, name: ch.name, type: ch.type, topic: ch.topic, position: ch.position, parent_id: ch.parent_id };
}

export async function deleteChannel(
  userId: string,
  channelId: string
): Promise<{ success: boolean }> {
  const token = await getDiscordToken(userId);
  await discordFetch(token, `/channels/${channelId}`, { method: "DELETE" });
  return { success: true };
}

/* ─── Message Operations ─── */

export async function getMessages(
  userId: string,
  channelId: string,
  limit: number = 20
): Promise<DiscordMessage[]> {
  const token = await getDiscordToken(userId);
  const messages = await discordFetch(token, `/channels/${channelId}/messages?limit=${Math.min(limit, 50)}`);
  return messages.map((m: any) => ({
    id: m.id,
    content: m.content,
    author: { id: m.author.id, username: m.author.username, bot: m.author.bot || false },
    timestamp: m.timestamp,
    channel_id: m.channel_id,
  }));
}

export async function sendMessage(
  userId: string,
  channelId: string,
  content: string,
  replyToId?: string
): Promise<DiscordMessage> {
  const token = await getDiscordToken(userId);
  const body: any = { content };
  if (replyToId) {
    body.message_reference = { message_id: replyToId };
  }

  const msg = await discordFetch(token, `/channels/${channelId}/messages`, {
    method: "POST",
    body,
  });
  return {
    id: msg.id,
    content: msg.content,
    author: { id: msg.author.id, username: msg.author.username, bot: msg.author.bot || false },
    timestamp: msg.timestamp,
    channel_id: msg.channel_id,
  };
}

export async function deleteMessage(
  userId: string,
  channelId: string,
  messageId: string
): Promise<{ success: boolean }> {
  const token = await getDiscordToken(userId);
  await discordFetch(token, `/channels/${channelId}/messages/${messageId}`, { method: "DELETE" });
  return { success: true };
}

export async function searchMessages(
  userId: string,
  guildId: string,
  query: string,
  limit: number = 10
): Promise<any> {
  const token = await getDiscordToken(userId);
  const results = await discordFetch(
    token,
    `/guilds/${guildId}/messages/search?content=${encodeURIComponent(query)}&limit=${Math.min(limit, 25)}`
  );
  return {
    total_results: results.total_results,
    messages: (results.messages || []).map((group: any) => {
      const m = group[0];
      return {
        id: m.id,
        content: m.content,
        author: m.author?.username || "unknown",
        channel_id: m.channel_id,
        timestamp: m.timestamp,
      };
    }),
  };
}

/* ─── Reaction Operations ─── */

export async function addReaction(
  userId: string,
  channelId: string,
  messageId: string,
  emoji: string
): Promise<{ success: boolean }> {
  const token = await getDiscordToken(userId);
  const encodedEmoji = encodeURIComponent(emoji);
  await discordFetch(token, `/channels/${channelId}/messages/${messageId}/reactions/${encodedEmoji}/@me`, {
    method: "PUT",
  });
  return { success: true };
}

/* ─── Member Operations ─── */

export async function listMembers(
  userId: string,
  guildId: string,
  limit: number = 20
): Promise<DiscordMember[]> {
  const token = await getDiscordToken(userId);
  const members = await discordFetch(token, `/guilds/${guildId}/members?limit=${Math.min(limit, 100)}`);
  return members.map((m: any) => ({
    user: { id: m.user.id, username: m.user.username, discriminator: m.user.discriminator },
    nick: m.nick,
    roles: m.roles,
    joined_at: m.joined_at,
  }));
}

/* ─── Role Operations ─── */

export async function listRoles(
  userId: string,
  guildId: string
): Promise<{ id: string; name: string; color: number; position: number }[]> {
  const token = await getDiscordToken(userId);
  const roles = await discordFetch(token, `/guilds/${guildId}/roles`);
  return roles.map((r: any) => ({
    id: r.id,
    name: r.name,
    color: r.color,
    position: r.position,
  }));
}

export async function assignRole(
  userId: string,
  guildId: string,
  memberId: string,
  roleId: string
): Promise<{ success: boolean }> {
  const token = await getDiscordToken(userId);
  await discordFetch(token, `/guilds/${guildId}/members/${memberId}/roles/${roleId}`, {
    method: "PUT",
  });
  return { success: true };
}

export async function removeRole(
  userId: string,
  guildId: string,
  memberId: string,
  roleId: string
): Promise<{ success: boolean }> {
  const token = await getDiscordToken(userId);
  await discordFetch(token, `/guilds/${guildId}/members/${memberId}/roles/${roleId}`, {
    method: "DELETE",
  });
  return { success: true };
}

/* ─── Thread Operations ─── */

export async function createThread(
  userId: string,
  channelId: string,
  name: string,
  messageId?: string
): Promise<{ id: string; name: string }> {
  const token = await getDiscordToken(userId);

  let thread;
  if (messageId) {
    // Create thread from existing message
    thread = await discordFetch(token, `/channels/${channelId}/messages/${messageId}/threads`, {
      method: "POST",
      body: { name, auto_archive_duration: 1440 },
    });
  } else {
    // Create standalone thread
    thread = await discordFetch(token, `/channels/${channelId}/threads`, {
      method: "POST",
      body: { name, type: 11, auto_archive_duration: 1440 },
    });
  }
  return { id: thread.id, name: thread.name };
}

/* ─── Kick / Ban ─── */

export async function kickMember(
  userId: string,
  guildId: string,
  memberId: string,
  reason?: string
): Promise<{ success: boolean }> {
  const token = await getDiscordToken(userId);
  const headers: Record<string, string> = {
    Authorization: `Bot ${token}`,
    "Content-Type": "application/json",
  };
  if (reason) headers["X-Audit-Log-Reason"] = reason;

  const res = await fetch(`${DISCORD_API}/guilds/${guildId}/members/${memberId}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) throw new Error(`Discord API error ${res.status}`);
  return { success: true };
}

export async function banMember(
  userId: string,
  guildId: string,
  memberId: string,
  reason?: string,
  deleteMessageDays: number = 0
): Promise<{ success: boolean }> {
  const token = await getDiscordToken(userId);
  await discordFetch(token, `/guilds/${guildId}/bans/${memberId}`, {
    method: "PUT",
    body: { delete_message_days: deleteMessageDays, ...(reason ? {} : {}) },
  });
  return { success: true };
}
