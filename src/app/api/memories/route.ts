import { NextResponse } from "next/server";
import { storeMemory, searchMemories } from "@/lib/memory";

export const dynamic = "force-dynamic";

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
      
      // Parallel fetch for agent-specific, company-wide, and legacy memories
      const [agentResults, companyResults, primaryResults] = await Promise.all([
        searchMemories(tenantId, agentId, query).catch(() => []),
        searchMemories(tenantId, "company", query).catch(() => []),
        searchMemories(tenantId, "primary", query).catch(() => [])
      ]);

      // Merge and deduplicate by content or ID
      const seen = new Set<string>();
      const combinedResults: any[] = [];
      
      for (const item of [...agentResults, ...companyResults, ...primaryResults]) {
        const uniqueKey = item.id || item.content;
        if (uniqueKey && !seen.has(uniqueKey)) {
          seen.add(uniqueKey);
          combinedResults.push(item);
        }
      }

      return NextResponse.json({ results: combinedResults.slice(0, 15) });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("Memory API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
