/**
 * Universal MCP Connector
 *
 * Allows Employee Zero to connect to ANY remote MCP server via HTTP/SSE.
 * Users paste an MCP server URL, EZ discovers tools, and makes them
 * available to the task engine and chat.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { adminDb } from "@/lib/admin";
import { Type } from "@google/genai";

// ─── Types ───

export interface McpConnection {
  id: string;
  name: string;
  url: string;
  status: "connected" | "error" | "disconnected";
  toolCount: number;
  tools: McpToolInfo[];
  lastConnected?: string;
  error?: string;
}

export interface McpToolInfo {
  name: string;
  description: string;
  inputSchema: any;
}

// ─── Client Cache ───

// Cache active MCP clients per user to avoid reconnecting every request
const clientCache = new Map<string, { client: Client; tools: McpToolInfo[]; expiresAt: number }>();
const CACHE_TTL = 5 * 60_000; // 5 minutes

/**
 * Connect to a remote MCP server and discover its tools.
 */
async function connectToMcpServer(url: string): Promise<{ client: Client; tools: McpToolInfo[] }> {
  const baseUrl = new URL(url);

  let client: Client;
  let transport: any;

  try {
    // Try modern Streamable HTTP transport first
    client = new Client({ name: "employee-zero", version: "1.0.0" });
    transport = new StreamableHTTPClientTransport(baseUrl);
    await client.connect(transport);
  } catch {
    // Fall back to legacy SSE transport
    client = new Client({ name: "employee-zero", version: "1.0.0" });
    transport = new SSEClientTransport(baseUrl);
    await client.connect(transport);
  }

  // Discover all tools (with pagination)
  const allTools: McpToolInfo[] = [];
  let cursor: string | undefined;
  do {
    const { tools, nextCursor } = await client.listTools({ cursor });
    allTools.push(
      ...tools.map((t) => ({
        name: t.name,
        description: t.description ?? "",
        inputSchema: t.inputSchema,
      }))
    );
    cursor = nextCursor;
  } while (cursor);

  return { client, tools: allTools };
}

/**
 * Test an MCP server URL — returns discovered tools or throws.
 */
export async function testMcpConnection(url: string): Promise<McpToolInfo[]> {
  const { client, tools } = await connectToMcpServer(url);
  // Close after testing — we'll reconnect when needed
  try { await client.close(); } catch {}
  return tools;
}

/**
 * Get or create a cached MCP client for a specific connection.
 */
async function getCachedClient(
  connectionId: string,
  url: string
): Promise<{ client: Client; tools: McpToolInfo[] }> {
  const cached = clientCache.get(connectionId);
  if (cached && cached.expiresAt > Date.now()) {
    return { client: cached.client, tools: cached.tools };
  }

  // Clean up old client
  if (cached) {
    try { await cached.client.close(); } catch {}
    clientCache.delete(connectionId);
  }

  const { client, tools } = await connectToMcpServer(url);
  clientCache.set(connectionId, {
    client,
    tools,
    expiresAt: Date.now() + CACHE_TTL,
  });

  return { client, tools };
}

// ─── Firestore CRUD ───

/**
 * Save an MCP connection for a user.
 */
export async function saveMcpConnection(
  userId: string,
  name: string,
  url: string,
  tools: McpToolInfo[]
): Promise<string> {
  const ref = adminDb.collection(`users/${userId}/mcpConnections`);
  const doc = await ref.add({
    name,
    url,
    status: "connected",
    toolCount: tools.length,
    tools: tools.map((t) => ({ name: t.name, description: t.description })),
    lastConnected: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });
  return doc.id;
}

/**
 * Load all MCP connections for a user.
 */
export async function loadMcpConnections(userId: string): Promise<McpConnection[]> {
  try {
    const snap = await adminDb
      .collection(`users/${userId}/mcpConnections`)
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();

    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<McpConnection, "id">),
    }));
  } catch {
    return [];
  }
}

/**
 * Delete an MCP connection.
 */
export async function deleteMcpConnection(userId: string, connectionId: string): Promise<void> {
  const cached = clientCache.get(connectionId);
  if (cached) {
    try { await cached.client.close(); } catch {}
    clientCache.delete(connectionId);
  }
  await adminDb.doc(`users/${userId}/mcpConnections/${connectionId}`).delete();
}

// ─── Tool Bridge ───

/**
 * Convert MCP tool schemas to Gemini function declarations.
 * This bridges MCP's JSON Schema → Google's Type system.
 */
export function mcpToolsToGeminiDeclarations(tools: McpToolInfo[]): any[] {
  return tools.map((tool) => {
    const properties: Record<string, any> = {};
    const required: string[] = [];

    if (tool.inputSchema?.properties) {
      for (const [key, schema] of Object.entries(tool.inputSchema.properties as Record<string, any>)) {
        properties[key] = jsonSchemaToGemini(schema);
      }
    }
    if (tool.inputSchema?.required) {
      required.push(...(tool.inputSchema.required as string[]));
    }

    return {
      name: `mcp_${tool.name}`,
      description: `[MCP] ${tool.description}`,
      parameters: {
        type: Type.OBJECT,
        properties,
        ...(required.length > 0 ? { required } : {}),
      },
    };
  });
}

/**
 * Convert JSON Schema types to Gemini Type equivalents.
 */
function jsonSchemaToGemini(schema: any): any {
  const typeMap: Record<string, any> = {
    string: Type.STRING,
    number: Type.NUMBER,
    integer: Type.NUMBER,
    boolean: Type.BOOLEAN,
    array: Type.ARRAY,
    object: Type.OBJECT,
  };

  const result: any = {
    type: typeMap[schema.type] || Type.STRING,
  };

  if (schema.description) result.description = schema.description;
  if (schema.enum) result.enum = schema.enum;
  if (schema.items) result.items = jsonSchemaToGemini(schema.items);
  if (schema.properties) {
    result.properties = {};
    for (const [k, v] of Object.entries(schema.properties as Record<string, any>)) {
      result.properties[k] = jsonSchemaToGemini(v);
    }
  }

  return result;
}

/**
 * Execute an MCP tool call — routes to the correct MCP server.
 */
export async function executeMcpTool(
  userId: string,
  toolName: string,
  args: Record<string, any>
): Promise<any> {
  // Strip "mcp_" prefix
  const actualToolName = toolName.replace(/^mcp_/, "");

  // Find which MCP connection has this tool
  const connections = await loadMcpConnections(userId);

  for (const conn of connections) {
    const hasThisTool = conn.tools.some((t) => t.name === actualToolName);
    if (!hasThisTool) continue;

    try {
      const { client } = await getCachedClient(conn.id, conn.url);
      const result = await client.callTool(
        { name: actualToolName, arguments: args },
      );

      // Extract text content for LLM
      const textParts = (result.content as any[])
        .filter((c: any) => c.type === "text")
        .map((c: any) => c.text);

      return textParts.length > 0
        ? textParts.join("\n")
        : result.structuredContent || { success: true };
    } catch (err: any) {
      // Update connection status
      await adminDb.doc(`users/${userId}/mcpConnections/${conn.id}`).update({
        status: "error",
        error: err.message,
      });
      return { error: `MCP tool error: ${err.message}` };
    }
  }

  return { error: `No MCP connection found with tool "${actualToolName}"` };
}

/**
 * Load all MCP tools for a user as Gemini function declarations.
 * Used by the task engine and chat route.
 */
export async function getMcpToolDeclarations(userId: string): Promise<{
  declarations: any[];
  serviceNames: string[];
}> {
  const connections = await loadMcpConnections(userId);
  if (connections.length === 0) return { declarations: [], serviceNames: [] };

  const allDeclarations: any[] = [];
  const serviceNames: string[] = [];

  for (const conn of connections) {
    if (conn.status === "connected" && conn.tools.length > 0) {
      const decls = mcpToolsToGeminiDeclarations(conn.tools);
      allDeclarations.push(...decls);
      serviceNames.push(`${conn.name} (MCP: ${conn.toolCount} tools)`);
    }
  }

  return { declarations: allDeclarations, serviceNames };
}
