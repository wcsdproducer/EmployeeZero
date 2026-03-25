export const PLANS = {
  founding100: {
    id: "founding-100",
    name: "Founding 100",
    price: 29,
    interval: "month" as const,
    description: "Lifetime locked rate. Full access to one AI employee.",
    features: [
      "1 AI Employee — works 24/7",
      "Unlimited missions",
      "Trend scouting & viral analysis",
      "Content creation pipeline",
      "Priority execution queue",
      "Founding member badge",
    ],
    slots: 100,
  },
} as const;

export async function createCheckoutSession(userId: string, email: string) {
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, email, plan: "founding100" }),
  });
  if (!res.ok) throw new Error("Failed to create checkout session");
  const data = await res.json();
  return data.url as string;
}
