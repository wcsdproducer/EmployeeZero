import { NextResponse } from "next/server";
import { executeTool } from "@/lib/executeTool";
import { verifyAuth } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const auth = await verifyAuth(req as any);
    if (auth.error || !auth.userId) {
      return auth.error || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, arguments: args, agentId } = body;

    if (!name) {
      return NextResponse.json({ error: "Missing tool name" }, { status: 400 });
    }

    console.log(`[Gemini Live Tool] Executing tool ${name} for user ${auth.userId}`);

    const result = await executeTool(auth.userId, name, args || {}, agentId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[Gemini Live Tool] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
