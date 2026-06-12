import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(req: Request) {
  try {
    const { meetingType, attendees, context, goals } = await req.json();

    if (!context) {
      return NextResponse.json({ error: "Missing context" }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI service not configured" }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    const typeLabels: Record<string, string> = {
      "client-call": "Client Call",
      "sales-pitch": "Sales Pitch",
      "team-standup": "Team Standup",
      "investor-meeting": "Investor Meeting",
      "interview": "Interview",
      "partnership": "Partnership Discussion",
    };

    const prompt = `You are an executive assistant preparing a meeting brief.

MEETING TYPE: ${typeLabels[meetingType] || meetingType}
${attendees ? `ATTENDEES: ${attendees}` : ""}
CONTEXT: ${context}
${goals ? `GOALS: ${goals}` : ""}

Generate a structured meeting prep brief with these sections:

1. MEETING OVERVIEW
One-paragraph summary of what this meeting is about and why it matters.

2. KEY TALKING POINTS
5-7 bullet points of things to bring up or discuss.

3. QUESTIONS TO ASK
4-6 strategic questions to ask during the meeting.

4. POTENTIAL OBJECTIONS & RESPONSES
3-4 likely pushbacks and how to handle them.

5. PREPARATION CHECKLIST
4-5 specific things to prepare or review before the meeting.

6. DESIRED OUTCOME
Clear statement of what a successful meeting looks like.

RULES:
- Be specific to the context provided, not generic
- Make talking points actionable and concrete
- Questions should be strategic, not basic
- No markdown formatting — use plain text with clear labels
- Keep it concise — this should be scannable in 2 minutes`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    return NextResponse.json({ brief: response.text || "Unable to generate brief." });
  } catch (error: unknown) {
    console.error("Meeting prep error:", error);
    return NextResponse.json({ error: "Failed to generate brief" }, { status: 500 });
  }
}
