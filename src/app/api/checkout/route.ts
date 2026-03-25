import { NextResponse } from "next/server";

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
  const { userId, email, plan, metadata: clientMetadata } = await request.json();

  let priceId = "";
  if (plan === "founding-100") {
    priceId = process.env.NEXT_PUBLIC_STRIPE_FOUNDING_100_PRICE_ID || "";
  } else if (plan === "specialist") {
    const specialistId = clientMetadata?.specialistId;
    if (specialistId === "argos") priceId = process.env.STRIPE_ARGOS_PRICE_ID || "";
    if (specialistId === "spectre") priceId = process.env.STRIPE_SPECTRE_PRICE_ID || "";
    if (specialistId === "fixer") priceId = process.env.STRIPE_FIXER_PRICE_ID || "";

    // Fallback to generic specialist price ID
    if (!priceId) {
      priceId = process.env.NEXT_PUBLIC_STRIPE_SPECIALIST_PRICE_ID || "";
    }
  }

  if (!priceId) {
    console.error(`Missing Price ID for plan: ${plan}`);
    return NextResponse.json(
      { error: "Price ID not configured for this plan" },
      { status: 400 }
    );
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${request.headers.get("origin")}/dashboard?success=true`,
      cancel_url: `${request.headers.get("origin")}${plan === "founding-100" ? "/hiring-hall" : "/specialists"}`,
      metadata: { 
        userId, 
        plan,
        specialistId: clientMetadata?.specialistId || "" 
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Stripe checkout error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
