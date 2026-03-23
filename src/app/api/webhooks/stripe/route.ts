import { NextResponse } from "next/server";
import Stripe from "stripe";
import Database from "better-sqlite3";
import path from "path";

// Initialize the Stripe instance
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia" as any,
});

// Path to gravity.db (one level up from employee-zero root)
const DB_PATH = path.join(process.cwd(), "..", "gravity.db");

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature") as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("Missing STRIPE_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

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
    const session = event.data.object as Stripe.Checkout.Session;
    const { userId, plan, specialistId } = session.metadata || {};

    if (!userId || !plan) {
      console.error("Missing metadata in checkout session completion event.");
      return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
    }

    console.log(`Processing subscription for user ${userId}, plan ${plan}`);

    try {
      // Update user_subscriptions
      const stmt = db.prepare(`
        INSERT INTO user_subscriptions (user_id, plan_id, specialist_id, status, stripe_subscription_id)
        VALUES (?, ?, ?, ?, ?)
      `);
      stmt.run(userId, plan, specialistId || null, "active", session.subscription as string);

      // Also update settings table if it exists (for compatibility)
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
      return NextResponse.json({ error: "Database update failed" }, { status: 500 });
    }
  }

  db.close();
  return NextResponse.json({ received: true });
}
