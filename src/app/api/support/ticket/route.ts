import { NextRequest, NextResponse } from "next/server";

// Mission Control submit endpoint
const MC_SUBMIT_URL =
  process.env.NODE_ENV === "production"
    ? "https://mission-control--gravity-claw-brain-1773939330.us-central1.hosted.app/api/support/submit"
    : "http://localhost:3000/api/support/submit";

interface TicketMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId = "anonymous",
      userEmail = "",
      userName = "",
      subject = "Support Request",
      messages = [],
      category = "general",
    } = body as {
      userId?: string;
      userEmail?: string;
      userName?: string;
      subject?: string;
      messages?: TicketMessage[];
      category?: string;
    };

    // Forward to Mission Control (gravity-claw-brain Firestore)
    const chatHistory = messages.map((m: TicketMessage) => ({
      role: m.role === "user" ? "user" : "bot",
      message: m.content,
      timestamp: new Date().toISOString(),
    }));

    const res = await fetch(MC_SUBMIT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspace: "employee-zero",
        userId,
        userEmail,
        userName: userName || userEmail.split("@")[0] || "Anonymous",
        subject,
        description: `Category: ${category}`,
        chatHistory,
      }),
    });

    const data = await res.json();

    if (data.success) {
      console.log(`[EZ Support] Ticket ${data.ticketId} created for ${userId}`);
      return NextResponse.json({
        ticketId: data.ticketId,
        message:
          "Your support ticket has been created. Our team will review it within 24 hours.",
      });
    } else {
      throw new Error(data.error || "Failed to create ticket");
    }
  } catch (err) {
    console.error("[EZ Support Ticket] Error:", err);
    return NextResponse.json(
      {
        error:
          "Failed to create ticket. Please email john@t3kniq.com directly.",
      },
      { status: 500 }
    );
  }
}
