import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(req: Request) {
  try {
    const { business, industry, location } = await req.json();

    if (!business || !industry) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI service not configured" }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are a senior business analyst. Generate a competitive analysis report.

BUSINESS: ${business}
INDUSTRY: ${industry}
${location ? `TARGET MARKET: ${location}` : ""}

Generate a report with these sections:

1. MARKET OVERVIEW
Brief overview of the competitive landscape in this industry.

2. TOP 5 COMPETITORS
For each competitor, provide:
- Name and brief description
- Key strengths
- Key weaknesses
- Approximate pricing (if applicable)
- Target audience

3. COMPETITIVE POSITIONING
Where this business sits relative to competitors (premium/mid/budget, niche/broad, etc.)

4. OPPORTUNITIES
3-5 specific market gaps or opportunities this business could exploit.

5. THREATS
3-5 competitive threats to watch.

6. STRATEGIC RECOMMENDATIONS
3-5 actionable recommendations based on the analysis.

RULES:
- Be specific and actionable, not generic
- Use real company names where possible
- Keep sections concise but substantive
- No markdown headers — use plain text with clear section labels
- Format using line breaks and dashes for readability`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    return NextResponse.json({ report: response.text || "Unable to generate report." });
  } catch (error: unknown) {
    console.error("Competitor research error:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
