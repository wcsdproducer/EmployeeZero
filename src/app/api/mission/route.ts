import { NextResponse } from "next/server";

export const dynamic = "force-static";

/**
 * Mission API — proxies all mission operations to the GravityClaw bridge server.
 *
 * POST: Submit a new mission (proxied to bridge)
 * GET:  Retrieve mission status/results (proxied to bridge)
 */

const BRIDGE_URL = process.env.GRAVITYCLAW_API_URL || "http://localhost:3002";
const BRIDGE_KEY = process.env.GRAVITYCLAW_API_KEY || "ez-bridge-dev-key";

export async function POST(request: Request) {
  const body = await request.json();
  const { userId, task, workspace } = body;

  if (!task || !userId) {
    return NextResponse.json({ error: "Missing task or userId" }, { status: 400 });
  }

  try {
    const res = await fetch(`${BRIDGE_URL}/api/mission`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${BRIDGE_KEY}`,
      },
      body: JSON.stringify({
        missionId: `mission_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        task,
        workspace: workspace || "gravityclaw",
        userId,
      }),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    console.error("Mission proxy error:", err.message);
    return NextResponse.json(
      { error: `Bridge connection failed: ${err.message}` },
      { status: 503 }
    );
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  const missionId = url.searchParams.get("id");

  const params = new URLSearchParams();
  if (userId) params.set("userId", userId);
  if (missionId) params.set("id", missionId);

  try {
    const res = await fetch(`${BRIDGE_URL}/api/mission?${params.toString()}`, {
      headers: { Authorization: `Bearer ${BRIDGE_KEY}` },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    console.error("Mission status proxy error:", err.message);
    return NextResponse.json(
      { error: `Bridge connection failed: ${err.message}` },
      { status: 503 }
    );
  }
}
