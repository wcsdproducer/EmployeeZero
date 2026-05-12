import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { testOpenRouterConnection } from "@/lib/llmProvider";
import {
  saveUserLLMConfig,
  clearUserLLMConfig,
  loadUserLLMConfig,
} from "@/lib/llmProviderAdmin";

export async function GET(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (auth.error) return auth.error;

  const config = await loadUserLLMConfig(auth.userId!);
  return NextResponse.json({ config: config || null });
}

export async function POST(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (auth.error) return auth.error;

  const { action, apiKey, model, modelLabel } = await req.json();

  if (action === "test") {
    const result = await testOpenRouterConnection(apiKey, model);
    return NextResponse.json(result);
  }

  if (action === "save") {
    if (!apiKey || !model || !modelLabel) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const test = await testOpenRouterConnection(apiKey, model);
    if (!test.ok) {
      return NextResponse.json({ error: test.error }, { status: 400 });
    }
    await saveUserLLMConfig(auth.userId!, {
      apiKey,
      model,
      modelLabel,
      connectedAt: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "disconnect") {
    await clearUserLLMConfig(auth.userId!);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
