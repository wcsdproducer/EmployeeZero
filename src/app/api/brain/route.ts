import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/admin";
import {
  testOpenRouterConnection,
  saveUserLLMConfig,
  clearUserLLMConfig,
  loadUserLLMConfig,
} from "@/lib/llmProvider";

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  const decoded = await verifyAuthToken(token || "");
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await loadUserLLMConfig(decoded.uid);
  return NextResponse.json({ config: config || null });
}

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  const decoded = await verifyAuthToken(token || "");
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action, apiKey, model, modelLabel } = await req.json();

  if (action === "test") {
    const result = await testOpenRouterConnection(apiKey, model);
    return NextResponse.json(result);
  }

  if (action === "save") {
    if (!apiKey || !model || !modelLabel) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    // Verify connection before saving
    const test = await testOpenRouterConnection(apiKey, model);
    if (!test.ok) {
      return NextResponse.json({ error: test.error }, { status: 400 });
    }
    await saveUserLLMConfig(decoded.uid, {
      apiKey,
      model,
      modelLabel,
      connectedAt: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "disconnect") {
    await clearUserLLMConfig(decoded.uid);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
