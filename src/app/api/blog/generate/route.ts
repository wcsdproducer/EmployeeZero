import { GoogleGenAI } from "@google/genai";
import { generateImage } from "@/lib/imageGen";
import { createBlogPost } from "@/lib/blog";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/admin";
import { getStorage } from "firebase-admin/storage";
import crypto from "crypto";

const genai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY! });
const storage = getStorage();

export async function POST(req: Request) {
  try {
    // 1. Security Check
    const authHeader = req.headers.get("Authorization");
    const secret = process.env.CRON_SECRET || "ez-content-engine-fallback-key";
    
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { topic } = await req.json().catch(() => ({ topic: null }));

    // Create a dynamic prompt that focuses on maximizing Employee Zero
    const strategistPrompt = `
      You are the Head of Scaling Strategy at Employee Zero, an AI Employee Platform. 
      Your mission is to show users how to MAXIMIZE Employee Zero to reclaim their time and grow revenue.
      
      ${topic ? `Write about this specific topic: ${topic}` : `Brainstorm a "Daily Scaling Tip" or "Automated Business Idea" that solved a real pain point using Employee Zero.`}
      
      The post MUST:
      1. Give 3-4 concrete "ideas" on how to use AI employees for this specific use case.
      2. Detail how to "maximize" the ROI (e.g., setting up localized agents, 24/7 coverage, etc.).
      3. Use a high-end, authoritative, and slightly provocative tone.
      
      Return a JSON object with:
      {
        "title": "A sharp, provocative headline",
        "slug": "url-friendly-slug",
        "excerpt": "A 2-sentence value-driven hook",
        "content": "Full markdown content. Approx 800-1000 words. Use H2/H3, bold text. Focus on actionable ROI.",
        "keywords": ["Scaling", "AI Ops", "Automation"],
        "imagePrompt": "A highly detailed Imagen 3 prompt. 3D-isometric or abstract concept, premium dark aesthetic, representing business automation. No text."
      }
    `;

    // 2. Specialized Strategy Prompt
    const result = await genai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: strategistPrompt,
    });
    const responseText = result.text;
    const cleanedJson = responseText.replace(/```json|```/g, "").trim();
    const data = JSON.parse(cleanedJson);

    // 3. Generate High-End Visual
    const imgResult = await generateImage(data.imagePrompt, { aspectRatio: "16:9", style: "premium, sleek, 3D render, minimal" });

    let coverImageUrl = "/blog/ai-employee-hire.png"; // Fallback URL

    if (imgResult.success && imgResult.imageBase64) {
      const bucket = storage.bucket(`${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.appspot.com`);
      const fileName = `blog/${data.slug}-${crypto.randomBytes(4).toString("hex")}.png`;
      const file = bucket.file(fileName);
      
      const buffer = Buffer.from(imgResult.imageBase64, "base64");
      await file.save(buffer, {
        metadata: { contentType: "image/png" },
        public: true,
      });

      coverImageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    }

    // 4. Persistence
    const postPayload = {
      title: data.title,
      slug: data.slug,
      excerpt: data.excerpt,
      content: data.content,
      coverImage: coverImageUrl,
      author: "Employee Zero AI",
      status: "published" as const,
      keywords: data.keywords,
      publishedAt: new Date(),
    };

    const id = await createBlogPost(postPayload);

    return NextResponse.json({ success: true, id, slug: data.slug });

  } catch (error: any) {
    console.error("Content Gen Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
