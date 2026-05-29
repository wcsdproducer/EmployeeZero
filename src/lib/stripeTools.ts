import { adminDb } from "@/lib/admin";
import Stripe from "stripe";

async function getStripeClient(userId: string): Promise<Stripe> {
  const snap = await adminDb.doc(`users/${userId}/integrations/stripe`).get();
  if (!snap.exists) {
    throw new Error("Stripe integration is not connected.");
  }
  const data = snap.data();
  if (!data || !data.key) {
    throw new Error("Stripe API key is missing.");
  }
  return new Stripe(data.key, { apiVersion: "2026-02-25.clover" });
}

export async function getStripeBalance(userId: string) {
  try {
    const stripe = await getStripeClient(userId);
    const balance = await stripe.balance.retrieve();
    return { success: true, balance };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function listStripeCharges(userId: string, limit: number = 10) {
  try {
    const stripe = await getStripeClient(userId);
    const charges = await stripe.charges.list({ limit });
    return { success: true, charges: charges.data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getStripeMetrics(userId: string) {
  try {
    const stripe = await getStripeClient(userId);
    // Simple metric approximation
    // Let's get active subscriptions for an MRR estimate
    const subscriptions = await stripe.subscriptions.list({ status: "active", limit: 100 });
    let mrr = 0;
    subscriptions.data.forEach((sub) => {
      sub.items.data.forEach((item) => {
        if (item.plan && item.plan.interval === "month" && item.plan.amount) {
          mrr += item.plan.amount * item.quantity;
        } else if (item.plan && item.plan.interval === "year" && item.plan.amount) {
          mrr += (item.plan.amount / 12) * item.quantity;
        }
      });
    });

    const balance = await stripe.balance.retrieve();
    
    return { 
      success: true, 
      mrr_cents: mrr, 
      active_subscriptions: subscriptions.data.length,
      balance 
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
