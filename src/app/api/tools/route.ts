import { NextResponse } from "next/server";
import { verifyAuth, checkRateLimit, rateLimitResponse } from "@/lib/auth";
import {
  listCustomTools,
  createCustomTool,
  updateCustomTool,
  deleteCustomTool,
} from "@/lib/customTools";

export const dynamic = "force-dynamic";

/** GET — List all custom tools */
export async function GET(request: Request) {
  const auth = await verifyAuth(request);
  if (auth.error) return auth.error;
  try {
    const tools = await listCustomTools(auth.userId);
    return NextResponse.json({ tools });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** POST — Create a new custom tool */
export async function POST(request: Request) {
  const auth = await verifyAuth(request);
  if (auth.error) return auth.error;
  const rateCheck = checkRateLimit(auth.userId);
  if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfter!);

  try {
    const body = await request.json();
    const { name, description, instruction, requiredConnections, category, agentId } = body;
    if (!name || !instruction) {
      return NextResponse.json({ error: "Missing required fields: name, instruction" }, { status: 400 });
    }
    const tool = await createCustomTool(auth.userId, {
      name,
      description: description || "",
      instruction,
      requiredConnections: requiredConnections || [],
      category,
      agentId: agentId || "company",
    });
    return NextResponse.json({ tool }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** PATCH — Update a custom tool */
export async function PATCH(request: Request) {
  const auth = await verifyAuth(request);
  if (auth.error) return auth.error;
  try {
    const body = await request.json();
    const { toolId, ...updates } = body;
    if (!toolId) return NextResponse.json({ error: "Missing toolId" }, { status: 400 });
    const ok = await updateCustomTool(auth.userId, toolId, updates);
    if (!ok) return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** DELETE — Delete a custom tool */
export async function DELETE(request: Request) {
  const auth = await verifyAuth(request);
  if (auth.error) return auth.error;
  try {
    const body = await request.json();
    const { toolId } = body;
    if (!toolId) return NextResponse.json({ error: "Missing toolId" }, { status: 400 });
    const ok = await deleteCustomTool(auth.userId, toolId);
    if (!ok) return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
