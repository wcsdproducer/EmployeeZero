import { NextResponse } from "next/server";
import { verifyAuth, checkRateLimit, rateLimitResponse } from "@/lib/auth";
import {
  listCustomSkills,
  createCustomSkill,
  updateCustomSkill,
  deleteCustomSkill,
} from "@/lib/customSkills";

export const dynamic = "force-dynamic";

/** GET — List all custom skills */
export async function GET(request: Request) {
  const auth = await verifyAuth(request);
  if (auth.error) return auth.error;
  try {
    const skills = await listCustomSkills(auth.userId);
    return NextResponse.json({ skills });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** POST — Create a new custom skill */
export async function POST(request: Request) {
  const auth = await verifyAuth(request);
  if (auth.error) return auth.error;
  const rateCheck = checkRateLimit(auth.userId);
  if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfter!);

  try {
    const body = await request.json();
    const { name, description, toolIds, agentId } = body;
    if (!name) {
      return NextResponse.json({ error: "Missing required field: name" }, { status: 400 });
    }
    const skill = await createCustomSkill(auth.userId, {
      name,
      description: description || "",
      toolIds: toolIds || [],
      agentId: agentId || "company",
    });
    return NextResponse.json({ skill }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** PATCH — Update a custom skill */
export async function PATCH(request: Request) {
  const auth = await verifyAuth(request);
  if (auth.error) return auth.error;
  try {
    const body = await request.json();
    const { skillId, ...updates } = body;
    if (!skillId) return NextResponse.json({ error: "Missing skillId" }, { status: 400 });
    const ok = await updateCustomSkill(auth.userId, skillId, updates);
    if (!ok) return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** DELETE — Delete a custom skill */
export async function DELETE(request: Request) {
  const auth = await verifyAuth(request);
  if (auth.error) return auth.error;
  try {
    const body = await request.json();
    const { skillId } = body;
    if (!skillId) return NextResponse.json({ error: "Missing skillId" }, { status: 400 });
    const ok = await deleteCustomSkill(auth.userId, skillId);
    if (!ok) return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
