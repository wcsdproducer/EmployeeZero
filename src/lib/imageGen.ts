/**
 * Image Generation tools for the agent.
 * Uses Google Gemini / Imagen via @google/genai.
 */

import { GoogleGenAI } from "@google/genai";

const genai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY! });

/* ─── Generate Image ─── */

export async function generateImage(
  prompt: string,
  options?: { aspectRatio?: string; style?: string }
): Promise<{
  success: boolean;
  imageBase64?: string;
  mimeType?: string;
  revisedPrompt?: string;
  error?: string;
}> {
  try {
    const fullPrompt = options?.style
      ? `${options.style} style: ${prompt}`
      : prompt;

    const response = await genai.models.generateImages({
      model: "imagen-3.0-generate-002",
      prompt: fullPrompt,
      config: {
        numberOfImages: 1,
        aspectRatio: (options?.aspectRatio as "1:1" | "16:9" | "9:16" | "3:4" | "4:3") || "1:1",
      },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
      const img = response.generatedImages[0];
      return {
        success: true,
        imageBase64: img.image?.imageBytes
          ? Buffer.from(img.image.imageBytes).toString("base64")
          : undefined,
        mimeType: "image/png",
        revisedPrompt: fullPrompt,
      };
    }

    return { success: false, error: "No images generated" };
  } catch (err: any) {
    return { success: false, error: err.message || "Image generation failed" };
  }
}

/* ─── Edit Image with Text Prompt ─── */

export async function describeImage(
  imageBase64: string,
  mimeType: string = "image/png",
  question: string = "Describe this image in detail."
): Promise<{ description: string }> {
  try {
    const response = await genai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                data: imageBase64,
                mimeType,
              },
            },
            { text: question },
          ],
        },
      ],
    });

    return {
      description:
        response.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Could not describe the image.",
    };
  } catch (err: any) {
    return { description: `Error: ${err.message}` };
  }
}
