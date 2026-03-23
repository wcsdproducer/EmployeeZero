import { NextResponse } from "next/server";
import { storeMemory, searchMemories } from "@/lib/memory";

export async function POST(req: Request) {
  try {
    const { tenantId, agentId, content, action, query } = await req.json();

    if (action === "store") {
      if (!tenantId || !agentId || !content) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
      }
      await storeMemory(tenantId, agentId, content);
      return NextResponse.json({ success: true, message: "Memory stored." });
    }

    if (action === "search") {
      if (!tenantId || !agentId || !query) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
      }
      const results = await searchMemories(tenantId, agentId, query);
      return NextResponse.json({ results });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("Memory API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
