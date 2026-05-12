import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { loadUserSOUL, saveUserSOUL } from "@/lib/soulAdmin";

export async function GET(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (auth.error) return auth.error;
  const soul = await loadUserSOUL(auth.userId!);
  return NextResponse.json({ soul });
}

export async function POST(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (auth.error) return auth.error;
  const body = await req.json();
  await saveUserSOUL(auth.userId!, body);
  return NextResponse.json({ ok: true });
}
