import { NextResponse } from "next/server";
import { adminDb } from "@/lib/admin";

// GET — get single task status + steps
export async function GET(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const snap = await adminDb.doc(`tasks/${taskId}`).get();

    if (!snap.exists) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ id: snap.id, ...snap.data() });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
