import { NextResponse } from "next/server";
import { executeTool } from "@/lib/executeTool";

export async function POST(req: Request) {
  try {
    // 1. Get userId from query param
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    // 2. Parse Webhook payload from ElevenLabs
    const body = await req.json();
    const toolName = body.tool_name || body.name; // Some webhooks might use different keys, but ElevenLabs docs say `tool_name`
    const args = body.arguments || body.parameters || {};

    if (!toolName) {
      return NextResponse.json({ error: "Missing tool_name" }, { status: 400 });
    }

    console.log(`[ElevenLabs Webhook] Executing tool ${toolName} for user ${userId}`);

    // 3. Execute the tool
    const result = await executeTool(userId, toolName, args);

    // 4. Return result in a format ElevenLabs expects
    // ElevenLabs expects either plain text or a JSON object. We will stringify complex objects.
    let stringResult = "";
    if (typeof result === "string") {
      stringResult = result;
    } else if (result && result.error) {
      stringResult = `Error: ${result.error}`;
    } else {
      stringResult = JSON.stringify(result);
    }

    // Return the response as JSON (ElevenLabs accepts a simple JSON response for webhooks)
    return NextResponse.json({ result: stringResult });
  } catch (error: any) {
    console.error("[ElevenLabs Webhook] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
