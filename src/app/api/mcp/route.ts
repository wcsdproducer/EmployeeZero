import { NextResponse } from "next/server";
import { adminDb } from "@/lib/admin";
import { verifyAuth } from "@/lib/auth";
import {
  testMcpConnection,
  saveMcpConnection,
  loadMcpConnections,
  deleteMcpConnection,
} from "@/lib/mcpClient";

/**
 * GET — List all MCP connections for the user
 */
export async function GET(request: Request) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const connections = await loadMcpConnections(auth.userId);
    return NextResponse.json({ connections });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST — Test and add a new MCP connection
 * Body: { name: string, url: string }
 */
export async function POST(request: Request) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, url } = await request.json();
    if (!name || !url) {
      return NextResponse.json({ error: "Missing name or url" }, { status: 400 });
    }

    // Validate URL
    try { new URL(url); } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Test connection and discover tools
    const tools = await testMcpConnection(url);

    // Save to Firestore
    const connectionId = await saveMcpConnection(auth.userId, name, url, tools);

    return NextResponse.json({
      id: connectionId,
      name,
      url,
      toolCount: tools.length,
      tools: tools.map(t => ({ name: t.name, description: t.description })),
    });
  } catch (err: any) {
    console.error("[MCP] Connection failed:", err.message);
    return NextResponse.json(
      { error: `Failed to connect: ${err.message}` },
      { status: 500 }
    );
  }
}

/**
 * DELETE — Remove an MCP connection
 * Body: { connectionId: string }
 */
export async function DELETE(request: Request) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { connectionId } = await request.json();
    if (!connectionId) {
      return NextResponse.json({ error: "Missing connectionId" }, { status: 400 });
    }

    await deleteMcpConnection(auth.userId, connectionId);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
