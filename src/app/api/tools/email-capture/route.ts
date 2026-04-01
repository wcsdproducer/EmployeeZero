import { NextResponse } from "next/server";
import { adminDb } from "@/lib/admin";

export async function POST(req: Request) {
  try {
    const { email, source } = await req.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    // Store in Firestore leads collection
    await adminDb.collection("leads").add({
      email,
      source: source || "unknown",
      capturedAt: new Date().toISOString(),
      converted: false,
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Email capture error:", error);
    return NextResponse.json({ error: "Failed to capture" }, { status: 500 });
  }
}
