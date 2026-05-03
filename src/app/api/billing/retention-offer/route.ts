import { NextResponse } from "next/server";
import { adminDb } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const { userId } = await request.json();
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const couponId = process.env.STRIPE_RETENTION_COUPON_ID;
  if (!couponId) {
    return NextResponse.json({ error: "Retention coupon not configured" }, { status: 500 });
  }

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(key, { apiVersion: "2025-02-24.acacia" as any });

  try {
    // Find the user's active subscription ID from Firestore agents
    const agentsSnap = await adminDb
      .collection(`users/${userId}/agents`)
      .where("status", "==", "active")
      .limit(1)
      .get();

    if (agentsSnap.empty) {
      return NextResponse.json({ error: "No active subscription found" }, { status: 404 });
    }

    const agent = agentsSnap.docs[0].data();
    const subscriptionId = agent.stripeSubscriptionId;

    if (!subscriptionId) {
      return NextResponse.json({ error: "No subscription ID on record" }, { status: 404 });
    }

    // Apply the retention coupon — valid for 1 month then reverts
    // Using 'discounts' array per Stripe API 2025+ (coupon is deprecated)
    await (stripe.subscriptions.update as any)(subscriptionId, {
      discounts: [{ coupon: couponId }],
    });

    // Record that this user accepted the retention offer (to avoid offering again)
    await adminDb.doc(`users/${userId}`).set(
      { retentionOfferAccepted: true, retentionOfferAcceptedAt: new Date().toISOString() },
      { merge: true }
    );

    console.log(`Retention offer applied for user ${userId}, subscription ${subscriptionId}`);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Retention offer error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
