import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { apiKey } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ error: "Missing API Key" }, { status: 400 });
    }

    const response = await fetch("https://api.elevenlabs.io/v1/voices", {
      method: "GET",
      headers: {
        "xi-api-key": apiKey,
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: "Failed to fetch voices: " + errText }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ voices: data.voices });
  } catch (error: any) {
    console.error("Fetch voices error", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
