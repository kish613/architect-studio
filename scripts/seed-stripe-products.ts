import { getUncachableStripeClient } from '../server/stripeClient';

async function seedProducts() {
  const stripe = await getUncachableStripeClient();
  
  console.log('Creating Architect Studio subscription products...\n');

  // Check if products already exist
  const existingProducts = await stripe.products.search({ query: "name:'Starter Plan'" });
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
        console.log(`  Price: $${amount}/${interval} (${price.id})`);
      }
    }
    return;
  }

  // Starter Plan - $9/month, 5 generations
  const starterProduct = await stripe.products.create({
    name: 'Starter Plan',
    description: '5 floorplan-to-3D generations per month',
    metadata: {
      plan_type: 'starter',
      generations_limit: '5',
    },
  });
  
  const starterPrice = await stripe.prices.create({
    product: starterProduct.id,
    unit_amount: 900, // $9.00
    currency: 'usd',
    recurring: { interval: 'month' },
  });
  console.log(`Created: ${starterProduct.name} - $9/month (${starterPrice.id})`);

  // Pro Plan - $29/month, 20 generations
  const proProduct = await stripe.products.create({
    name: 'Pro Plan',
    description: '20 floorplan-to-3D generations per month',
    metadata: {
      plan_type: 'pro',
      generations_limit: '20',
    },
  });
  
  const proPrice = await stripe.prices.create({
    product: proProduct.id,
    unit_amount: 2900, // $29.00
    currency: 'usd',
    recurring: { interval: 'month' },
  });
  console.log(`Created: ${proProduct.name} - $29/month (${proPrice.id})`);

  // Studio Plan - $79/month, 60 generations
  const studioProduct = await stripe.products.create({
    name: 'Studio Plan',
    description: '60 floorplan-to-3D generations per month',
    metadata: {
      plan_type: 'studio',
      generations_limit: '60',
    },
  });
  
  const studioPrice = await stripe.prices.create({
    product: studioProduct.id,
    unit_amount: 7900, // $79.00
    currency: 'usd',
    recurring: { interval: 'month' },
  });
  console.log(`Created: ${studioProduct.name} - $79/month (${studioPrice.id})`);

  // Pay-per-use - $3 per generation
  const payPerUseProduct = await stripe.products.create({
    name: 'Additional Generation',
    description: 'Single floorplan-to-3D generation credit',
    metadata: {
      plan_type: 'pay_per_use',
      generations_per_unit: '1',
    },
  });
  
  const payPerUsePrice = await stripe.prices.create({
    product: payPerUseProduct.id,
    unit_amount: 300, // $3.00
    currency: 'usd',
  });
  console.log(`Created: ${payPerUseProduct.name} - $3 each (${payPerUsePrice.id})`);

  console.log('\nAll products created successfully!');
}

seedProducts().catch(console.error);
