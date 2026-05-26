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
    const { userId, plan, employeeName, avatar, isOnboarding } = session.metadata || {};

    if (!userId || !plan) {
      console.error("Missing metadata in checkout session completion event.");
      return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
    }

    console.log(`Processing subscription for user ${userId}, plan ${plan}, onboarding: ${isOnboarding || "false"}`);

    try {
      // Determine agent name and status based on whether this is from onboarding or in-app
      const agentName = employeeName || "New Agent";
      const agentAvatar = avatar || "robot";
      // If onboarding provided the name, agent is ready to go. Otherwise pending_setup.
      const agentStatus = employeeName ? "active" : "pending_setup";

      // 1. Create a new agent document in the user's agents subcollection
      const agentRef = await adminDb.collection(`users/${userId}/agents`).add({
        name: agentName,
        avatar: agentAvatar,
        status: agentStatus,
        plan,
        stripeSubscriptionId: session.subscription as string,
        createdAt: new Date().toISOString(),
      });

      console.log(`Created ${agentStatus} agent "${agentName}" (${agentRef.id}) for user ${userId}`);

      // Send telegram notification to admin
      try {
        const { sendAdminNotification } = await import("@/lib/telegram");
        const userEmail = session.customer_details?.email || "Unknown Email";
        const message = `🎉 <b>New Upgrade!</b>\nUser ${userEmail} (${userId}) just provisioned a <b>${plan.toUpperCase()}</b> agent (Name: ${agentName}).`;
        await sendAdminNotification(message);
      } catch (notifyErr) {
        console.error("Failed to send telegram upgrade notification:", notifyErr);
      }

      // 2. Update the user document
      const userUpdate: Record<string, any> = {
        agentCount: FieldValue.increment(1),
      };

      // If this is the first agent (onboarding), also update the user's plan
      if (isOnboarding === "true") {
        userUpdate.plan = plan;
      }

      await adminDb.doc(`users/${userId}`).set(userUpdate, { merge: true });

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
  } else if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as import("stripe").Stripe.Subscription;
    const subscriptionId = subscription.id;
    const status = subscription.status; // 'active', 'canceled', 'unpaid', 'past_due', etc.

    console.log(`Processing subscription update for ${subscriptionId}, status: ${status}`);

    try {
      // Find the agent with this subscription ID
      const agentsSnapshot = await adminDb
        .collectionGroup("agents")
        .where("stripeSubscriptionId", "==", subscriptionId)
        .get();

      if (agentsSnapshot.empty) {
        console.error(`No agent found with subscription ID ${subscriptionId}`);
      } else {
        for (const doc of agentsSnapshot.docs) {
          const currentStatus = doc.data().status;
          
          // Determine the new agent status
          let newStatus = currentStatus;
          if (event.type === "customer.subscription.deleted" || status === "canceled" || status === "unpaid" || status === "past_due") {
            newStatus = "inactive";
          } else if (status === "active" || status === "trialing") {
            // Only re-activate if it was previously marked inactive due to billing.
            // Don't auto-activate if it's 'pending_setup'
            if (currentStatus === "inactive") {
              newStatus = "active";
            }
          }

          await doc.ref.update({
            stripeStatus: status,
            status: newStatus,
            updatedAt: new Date().toISOString()
          });

          console.log(`Updated agent ${doc.id} stripeStatus to ${status} and agent status to ${newStatus}`);
        }
      }
    } catch (err: any) {
      console.error(`Failed to process subscription update: ${err.message}`);
      return NextResponse.json({ error: "Database update failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
