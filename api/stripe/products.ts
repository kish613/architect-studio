import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-12-15.clover",
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Fetch products and prices from Stripe directly
    const products = await stripe.products.list({
      active: true,
      limit: 100,
    });

    const prices = await stripe.prices.list({
      active: true,
      limit: 100,
    });

    // Combine products with their prices
    const productsWithPrices = products.data.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      metadata: product.metadata,
      prices: prices.data
        .filter((price) => price.product === product.id)
        .map((price) => ({
          id: price.id,
          unit_amount: price.unit_amount,
          currency: price.currency,
          recurring: price.recurring,
        })),
    }));

    res.json({ products: productsWithPrices });
  } catch (error) {
    console.error("Error listing products:", error);
    res.status(500).json({ error: "Failed to list products" });
  }
}



