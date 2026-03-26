import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const Stripe = (await import("stripe")).default;

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    console.error("Missing STRIPE_SECRET_KEY");
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: "2025-02-24.acacia" as any,
  });

  const body = await req.text();
  const signature = req.headers.get("stripe-signature") as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("Missing STRIPE_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  let event: import("stripe").Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as import("stripe").Stripe.Checkout.Session;
    const { userId, plan } = session.metadata || {};

    if (!userId || !plan) {
      console.error("Missing metadata in checkout session completion event.");
      return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
    }

    console.log(`Processing subscription for user ${userId}, plan ${plan}`);

    try {
      // 1. Create a new agent document in the user's agents subcollection
      //    The agent starts as "pending" — user will name it on return
      const agentRef = await adminDb.collection(`users/${userId}/agents`).add({
        name: "New Agent",
        avatar: "robot",
        status: "pending_setup",
        plan,
        stripeSubscriptionId: session.subscription as string,
        createdAt: new Date().toISOString(),
      });

      console.log(`Created pending agent ${agentRef.id} for user ${userId}`);

      // 2. Increment the user's agent count
      await adminDb.doc(`users/${userId}`).set(
        { agentCount: FieldValue.increment(1) },
        { merge: true }
      );

      // 3. If founding plan, increment the global founding count
      if (plan === "founding") {
        await adminDb.doc("config/pricing").update({
          foundingCount: FieldValue.increment(1),
        });
        console.log(`Incremented founding count for user ${userId}`);
      }

      console.log(`Successfully provisioned ${plan} agent for user ${userId}`);
    } catch (err: any) {
      console.error("Firestore update failed:", err.message);
      return NextResponse.json({ error: "Database update failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
