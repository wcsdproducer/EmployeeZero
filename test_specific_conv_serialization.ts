import { adminDb } from "./src/lib/admin";
import { NextResponse } from "next/server";

async function main() {
  const docId = "dPx91eOv0RIXRGRwIIAm";
  const doc = await adminDb.collection("conversations").doc(docId).get();
  const data = doc.data()!;
  
  const dateValue = data.createdAt?.toDate?.()?.toISOString?.() || data.createdAt || "unknown";
  console.log("Raw dateValue type:", typeof dateValue);
  console.log("Raw dateValue:", dateValue);
  console.log("Raw dateValue constructor:", dateValue?.constructor?.name);

  const match = {
    id: doc.id,
    title: data.title,
    date: dateValue,
  };

  try {
    const res = NextResponse.json({ results: [match] });
    const text = await res.text();
    console.log("NextResponse.json succeeded! length:", text.length);
    console.log("Content:", text);
  } catch (err: any) {
    console.error("NextResponse.json FAILED:", err.message);
  }
}

main().catch(console.error);
