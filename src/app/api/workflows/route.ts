import { NextResponse } from "next/server";
import {
  listCustomWorkflows,
  createCustomWorkflow,
  deleteCustomWorkflow,
  updateCustomWorkflow,
} from "@/lib/customWorkflows";

export const dynamic = "force-dynamic";

/**
 * GET — List all custom workflows for a user
 * Query: ?userId=xxx
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  try {
    const workflows = await listCustomWorkflows(userId);
    return NextResponse.json({ workflows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST — Create a new custom workflow
 * Body: { userId, name, description, goal, requiredConnections?, schedule? }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, name, description, goal, requiredConnections, schedule } = body;

    if (!userId || !name || !goal) {
      return NextResponse.json(
        { error: "Missing required fields: userId, name, goal" },
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
 * Body: { userId, workflowId }
 */
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { userId, workflowId } = body;

    if (!userId || !workflowId) {
      return NextResponse.json(
        { error: "Missing userId or workflowId" },
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
 * Body: { userId, workflowId, ...updates }
 */
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { userId, workflowId, ...updates } = body;

    if (!userId || !workflowId) {
      return NextResponse.json(
        { error: "Missing userId or workflowId" },
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
