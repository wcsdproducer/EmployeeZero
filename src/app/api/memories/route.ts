import { NextResponse } from "next/server";
import { storeMemory, searchMemories } from "@/lib/memory";

export async function POST(req: Request) {
  try {
    const { userId, content, embedding, action, queryVector } = await req.json();

    if (action === "store") {
      if (!userId || !content || !embedding) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
      }
      await storeMemory(userId, content, embedding);
      return NextResponse.json({ success: true, message: "Memory stored." });
    }

    if (action === "search") {
      if (!userId || !queryVector) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
      }
      const results = await searchMemories(userId, queryVector);
      return NextResponse.json({ results });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("Memory API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
