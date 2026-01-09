import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function airtableCreateLedgerRow(fields) {
  const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${encodeURIComponent(process.env.AIRTABLE_CREDIT_TABLE)}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ records: [{ fields }] }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Airtable error: ${resp.status} ${text}`);
  }
}

export const config = {
  api: { bodyParser: false }, // required for Stripe signature verification
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");

  const sig = req.headers["stripe-signature"];
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const rawBody = Buffer.concat(chunks);

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook signature verification failed.`);
  }

  if (event.type === "checkout.session.completed") {
    const s = event.data.object;

    const studentRecordId = s.metadata?.studentRecordId;
    const qty = Number(s.metadata?.quantity || 0);

    // Write ledger row (credits become real here)
    await airtableCreateLedgerRow({
      Student: [studentRecordId],                 // linked record expects array
      "Sessions Purchased": qty,
      "Parent Email": s.customer_details?.email || s.metadata?.parentEmail || "",
      "Stripe Session ID": s.id,
      "Stripe Payment Intent ID": s.payment_intent || "",
      "Amount Paid": (s.amount_total || 0) / 100,
      Currency: (s.currency || "").toUpperCase(),
      "Purchased At": new Date(s.created * 1000).toISOString(),
      Status: "Paid",
    });
  }

  return res.status(200).json({ received: true });
}
