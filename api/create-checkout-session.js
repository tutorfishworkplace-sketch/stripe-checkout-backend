import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");

  const { studentRecordId, quantity, parentEmail } = req.body || {};
  if (!studentRecordId || !quantity) return res.status(400).json({ error: "Missing studentRecordId or quantity" });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: Number(quantity) }],
    customer_email: parentEmail || undefined,
    success_url: `${process.env.SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: process.env.CANCEL_URL,
    metadata: {
      studentRecordId,
      quantity: String(quantity),
      parentEmail: parentEmail || "",
    },
  });

  return res.status(200).json({ url: session.url });
}
