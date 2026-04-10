import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.includes("PLACEHOLDER")) {
    return NextResponse.json(
      { error: "Stripe not configured — add STRIPE_SECRET_KEY to .env.local" },
      { status: 503 }
    );
  }

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(key, { apiVersion: "2025-02-24.acacia" as any });
  const { userId, email, employeeName, avatar, isOnboarding } = await request.json();

  if (!userId || !email) {
    return NextResponse.json({ error: "Missing userId or email" }, { status: 400 });
  }

  // Check founding count to determine which price to use
  let priceId: string;
  let plan: string;

  try {
    const pricingDoc = await adminDb.doc("config/pricing").get();
    const foundingCount = pricingDoc.exists ? (pricingDoc.data()?.foundingCount ?? 0) : 0;
    const foundingLimit = pricingDoc.exists ? (pricingDoc.data()?.foundingLimit ?? 100) : 100;

    if (foundingCount < foundingLimit) {
      priceId = process.env.STRIPE_FOUNDING_PRICE_ID || "";
      plan = "founding";
    } else {
      priceId = process.env.STRIPE_REGULAR_PRICE_ID || "";
      plan = "regular";
    }
  } catch (err) {
    console.error("Failed to check founding count:", err);
    // Default to regular price if config can't be read
    priceId = process.env.STRIPE_REGULAR_PRICE_ID || "";
    plan = "regular";
  }

  if (!priceId) {
    console.error(`Missing Price ID for plan: ${plan}`);
    return NextResponse.json(
      { error: "Price ID not configured for this plan" },
      { status: 400 }
    );
  }

  const origin = request.headers.get("origin") || "https://employeezero.app";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/chat?success=true&plan=${plan}`,
      cancel_url: isOnboarding ? `${origin}/onboarding` : `${origin}/chat`,
      metadata: {
        userId,
        plan,
        // Pass employee details so the webhook can create the agent with the right name/avatar
        ...(employeeName && { employeeName }),
        ...(avatar && { avatar }),
        ...(isOnboarding && { isOnboarding: "true" }),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Stripe checkout error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
