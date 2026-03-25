import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // Lazy imports to avoid build-time crashes
  const Stripe = (await import("stripe")).default;
  const Database = (await import("better-sqlite3")).default;
  const path = await import("path");

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

  // Path to gravity.db (one level up from employee-zero root)
  const DB_PATH = path.join(process.cwd(), "..", "gravity.db");
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  // Ensure user_subscriptions table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      specialist_id TEXT,
      status TEXT NOT NULL,
      stripe_subscription_id TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as import("stripe").Stripe.Checkout.Session;
    const { userId, plan, specialistId } = session.metadata || {};

    if (!userId || !plan) {
      console.error("Missing metadata in checkout session completion event.");
      db.close();
      return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
    }

    console.log(`Processing subscription for user ${userId}, plan ${plan}`);

    try {
      const stmt = db.prepare(`
        INSERT INTO user_subscriptions (user_id, plan_id, specialist_id, status, stripe_subscription_id)
        VALUES (?, ?, ?, ?, ?)
      `);
      stmt.run(userId, plan, specialistId || null, "active", session.subscription as string);

      try {
        const settingsStmt = db.prepare(`
          INSERT INTO settings (key, value)
          VALUES (?, ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value
        `);
        
        if (plan === "founding-100") {
          settingsStmt.run(`subscription:${userId}`, "founding-100");
        } else if (plan === "specialist" && specialistId) {
          settingsStmt.run(`specialist:${userId}:${specialistId}`, "active");
        }
      } catch (err: any) {
        console.warn("Failed to update settings table, but subscription was recorded.", err.message);
      }

      console.log(`Successfully provisioned ${plan} for user ${userId}`);
    } catch (err: any) {
      console.error("Database update failed:", err.message);
      db.close();
      return NextResponse.json({ error: "Database update failed" }, { status: 500 });
    }
  }

  db.close();
  return NextResponse.json({ received: true });
}
