import { NextResponse } from "next/server";
import { verifyAuth, checkRateLimit, rateLimitResponse } from "@/lib/auth";
import {
  listCustomWorkflows,
  createCustomWorkflow,
  deleteCustomWorkflow,
  updateCustomWorkflow,
} from "@/lib/customWorkflows";

export const dynamic = "force-dynamic";

/**
 * GET — List all custom workflows for the authenticated user
 */
export async function GET(request: Request) {
  const auth = await verifyAuth(request);
  if (auth.error) return auth.error;
  const userId = auth.userId;

  try {
    const workflows = await listCustomWorkflows(userId);
    return NextResponse.json({ workflows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST — Create a new custom workflow
 * Body: { name, description, goal, requiredConnections?, schedule? }
 */
export async function POST(request: Request) {
  const auth = await verifyAuth(request);
  if (auth.error) return auth.error;
  const userId = auth.userId;

  const rateCheck = checkRateLimit(userId);
  if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfter!);

  try {
    const body = await request.json();
    const { name, description, goal, requiredConnections, schedule } = body;

    if (!name || !goal) {
      return NextResponse.json(
        { error: "Missing required fields: name, goal" },
        { status: 400 }
      );
    }

    const workflow = await createCustomWorkflow(userId, {
      name,
      description: description || "",
      goal,
      requiredConnections: requiredConnections || [],
      schedule: schedule || null,
    });

    return NextResponse.json({ workflow }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE — Delete a custom workflow
 * Body: { workflowId }
 */
export async function DELETE(request: Request) {
  const auth = await verifyAuth(request);
  if (auth.error) return auth.error;
  const userId = auth.userId;

  try {
    const body = await request.json();
    const { workflowId } = body;

    if (!workflowId) {
      return NextResponse.json(
        { error: "Missing workflowId" },
        { status: 400 }
      );
    }

    const deleted = await deleteCustomWorkflow(userId, workflowId);
    if (!deleted) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PATCH — Update a custom workflow
 * Body: { workflowId, ...updates }
 */
export async function PATCH(request: Request) {
  const auth = await verifyAuth(request);
  if (auth.error) return auth.error;
  const userId = auth.userId;

  try {
    const body = await request.json();
    const { workflowId, ...updates } = body;

    if (!workflowId) {
      return NextResponse.json(
        { error: "Missing workflowId" },
        { status: 400 }
      );
    }

    const updated = await updateCustomWorkflow(userId, workflowId, updates);
    if (!updated) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
