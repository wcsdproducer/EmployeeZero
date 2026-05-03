import { NextResponse } from "next/server";
import { adminDb } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const { userId, email, returnUrl } = await request.json();
  if (!userId || !email) {
    return NextResponse.json({ error: "Missing userId or email" }, { status: 400 });
  }

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(key, { apiVersion: "2025-02-24.acacia" as any });

  try {
    // Look up or create the Stripe customer by email
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customerId: string;

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      // Try to get subscription ID from Firestore as fallback
      const agentsSnap = await adminDb
        .collection(`users/${userId}/agents`)
        .where("status", "==", "active")
        .limit(1)
        .get();

      if (!agentsSnap.empty) {
        const subscriptionId = agentsSnap.docs[0].data().stripeSubscriptionId;
        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          customerId = sub.customer as string;
        } else {
          return NextResponse.json({ error: "No customer found" }, { status: 404 });
        }
      } else {
        return NextResponse.json({ error: "No active subscription found" }, { status: 404 });
      }
    }

    const origin = request.headers.get("origin") || "https://employeezero.app";
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl || `${origin}/settings`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Billing portal error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
