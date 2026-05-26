import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { sendAdminNotification } from "@/lib/telegram";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // 1. Verify the request comes from an authenticated user
  const auth = await verifyAuth(req);
  if (auth.error) {
    return auth.error;
  }

  const userId = auth.userId;

  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Send the notification
    const message = `👋 <b>New Signup!</b>\nUser ${email} (${userId}) just created an account.`;
    await sendAdminNotification(message);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing signup webhook:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
