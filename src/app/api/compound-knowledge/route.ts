/**
 * POST /api/compound-knowledge
 *
 * Triggers knowledge compounding for the authenticated user.
 * Synthesizes scattered memories into structured topic summaries
 * to keep the memory store lean while preserving all knowledge.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { adminDb } from "@/lib/admin";
import { compoundKnowledge } from "@/lib/knowledgeCompounding";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // 1. Verify authentication
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;
    const userId = auth.userId;

    // 2. Get the user's Gemini API key from Firestore
    const apiDoc = await adminDb.doc(`users/${userId}/settings/api`).get();
    const apiKey = apiDoc.exists ? apiDoc.data()?.geminiKey : undefined;

    if (!apiKey) {
      return NextResponse.json(
        { error: "No Gemini API key configured. Add one in Settings → API." },
        { status: 400 }
      );
    }

    // 3. Run knowledge compounding
    const result = await compoundKnowledge(userId, apiKey);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    console.error("[compound-knowledge] Error:", err.message);
    return NextResponse.json(
      { error: err.message || "Knowledge compounding failed" },
      { status: 500 }
    );
  }
}
