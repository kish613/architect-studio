import Stripe from 'stripe';

// Load environment variables in development
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('STRIPE_SECRET_KEY environment variable is required');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-04-30.basil',
});

async function seedProducts() {
  console.log('Creating Architect Studio subscription products...\n');

  // Check if products already exist
  const existingProducts = await stripe.products.search({ query: "name:'Starter Plan UK'" });
  if (existingProducts.data.length > 0) {
    console.log('Products already exist. Skipping seed.');
    console.log('\nExisting products:');
    const allProducts = await stripe.products.list({ active: true });
    for (const product of allProducts.data) {
      const prices = await stripe.prices.list({ product: product.id, active: true });
      console.log(`- ${product.name} (${product.id})`);
      for (const price of prices.data) {
        const amount = price.unit_amount ? (price.unit_amount / 100).toFixed(2) : '0';
        const interval = price.recurring?.interval || 'one-time';
        const currencySymbol = price.currency === 'gbp' ? '£' : '$';
        console.log(`  Price: ${currencySymbol}${amount}/${interval} (${price.id})`);
      }
    }
    return;
  }

  // Starter Plan - £7/month, 5 generations
  const starterProduct = await stripe.products.create({
    name: 'Starter Plan UK',
    description: '5 floorplan-to-3D generations per month',
    metadata: {
      plan: 'starter',
      generations_limit: '5',
    },
  });

  const starterPrice = await stripe.prices.create({
    product: starterProduct.id,
    unit_amount: 700, // £7.00
    currency: 'gbp',
    recurring: { interval: 'month' },
  });
  console.log(`Created: ${starterProduct.name} - £7/month (${starterPrice.id})`);

  // Pro Plan - £23/month, 20 generations
  const proProduct = await stripe.products.create({
    name: 'Pro Plan UK',
    description: '20 floorplan-to-3D generations per month',
    metadata: {
      plan: 'pro',
      generations_limit: '20',
    },
  });

  const proPrice = await stripe.prices.create({
    product: proProduct.id,
    unit_amount: 2300, // £23.00
    currency: 'gbp',
    recurring: { interval: 'month' },
  });
  console.log(`Created: ${proProduct.name} - £23/month (${proPrice.id})`);

  // Studio Plan - £63/month, 60 generations
  const studioProduct = await stripe.products.create({
    name: 'Studio Plan UK',
    description: '60 floorplan-to-3D generations per month',
    metadata: {
      plan: 'studio',
      generations_limit: '60',
    },
  });

  const studioPrice = await stripe.prices.create({
    product: studioProduct.id,
    unit_amount: 6300, // £63.00
    currency: 'gbp',
    recurring: { interval: 'month' },
  });
  console.log(`Created: ${studioProduct.name} - £63/month (${studioPrice.id})`);

  // Pay-per-use - £2.50 per generation
  const payPerUseProduct = await stripe.products.create({
    name: 'Additional Generation UK',
    description: 'Single floorplan-to-3D generation credit',
    metadata: {
      plan: 'pay_per_use',
      generations_per_unit: '1',
    },
  });

  const payPerUsePrice = await stripe.prices.create({
    product: payPerUseProduct.id,
    unit_amount: 250, // £2.50
    currency: 'gbp',
  });
  console.log(`Created: ${payPerUseProduct.name} - £2.50 each (${payPerUsePrice.id})`);

  console.log('\nAll products created successfully!');
}

seedProducts().catch(console.error);
