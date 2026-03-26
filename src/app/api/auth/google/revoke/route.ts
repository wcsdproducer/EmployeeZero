import { NextResponse } from "next/server";
import { adminDb } from "@/lib/admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { userId?: string; service?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { userId, service } = body;
  if (!userId || !service) {
    return NextResponse.json({ error: "Missing userId or service" }, { status: 400 });
  }

  // Read the current token to revoke it
  try {
    const connectionsRef = adminDb.doc(`users/${userId}/settings/connections`);
    const snap = await connectionsRef.get();

    if (snap.exists) {
      const data = snap.data();
      const serviceData = data?.[service];

      // Revoke the token with Google if we have one
      if (serviceData?.accessToken) {
        try {
          await fetch(`https://oauth2.googleapis.com/revoke?token=${serviceData.accessToken}`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
          });
          console.log(`Revoked access token for user ${userId}, service ${service}`);
        } catch (revokeErr: any) {
          // Token may already be expired/revoked — not fatal
          console.warn(`Token revocation request failed (non-fatal): ${revokeErr.message}`);
        }
      }

      // Clear the service entry from Firestore
      await connectionsRef.update({
        [service]: FieldValue.delete(),
      });
    }

    return NextResponse.json({ success: true, service });
  } catch (err: any) {
    console.error("Revoke failed:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
