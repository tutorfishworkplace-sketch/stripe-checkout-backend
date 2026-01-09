import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");

  const { studentRecordId, quantity, parentEmail } = req.body || {};
  if (!studentRecordId || !quantity) return res.status(400).json({ error: "Missing studentRecordId or quantity" });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
line_items: [
  {
    price: process.env.STRIPE_PRICE_ID,
    quantity: 1,
    adjustable_quantity: {
      enabled: true,
      minimum: 1,
      maximum: 20
    }
  }
],
customer_email: parentEmail || undefined,
success_url: `${process.env.SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
cancel_url: process.env.CANCEL_URL,
metadata: {
  studentRecordId,
  "Contact Email (from Student)": parentEmail || ""
}
  });

  return res.status(200).json({ url: session.url });
}
