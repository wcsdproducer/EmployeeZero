import { NextResponse } from "next/server";
import { executeTool } from "@/lib/executeTool";
import { verifyAuth } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    console.log("[Gemini Live Tool] Received execute request. Verifying auth...");
    const auth = await verifyAuth(req as any);
    if (auth.error || !auth.userId) {
      console.warn("[Gemini Live Tool] Auth failed:", auth.error ? "Returned error response" : "No userId");
      return auth.error || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    console.log("[Gemini Live Tool] Request body:", JSON.stringify(body, null, 2));

    const { name, arguments: args, agentId } = body;

    if (!name) {
      console.warn("[Gemini Live Tool] Missing tool name in request body");
      return NextResponse.json({ error: "Missing tool name" }, { status: 400 });
    }

    console.log(`[Gemini Live Tool] Executing tool "${name}" for user ${auth.userId} (agentId: ${agentId})`);
    console.log(`[Gemini Live Tool] Arguments:`, JSON.stringify(args, null, 2));

    const result = await executeTool(auth.userId, name, args || {}, agentId);
    console.log(`[Gemini Live Tool] Success executing "${name}". Result summary:`, JSON.stringify(result).substring(0, 500));
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[Gemini Live Tool] Fatal Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
