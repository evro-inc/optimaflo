async function main() {
  // Create a new user
  const password = await hash('test', 12);
  const user = await prisma.user.upsert({
    where: { email: 'test@test.com' },
    update: {},
    create: {
      id: 'f174ecbe-eb77-11ed-a05b-0242ac120003',
      email: 'test@test.com',
      password,
    },
  });

  // Create a new customer in Stripe
  const stripeCustomer = await stripe.customers.create({
    email: user.email,
    metadata: {
      userId: user.id,
    },
  });

  // Update the user record with the Stripe customer ID
  await prisma.user.update({
    where: { id: user.id },
    data: {
      stripeCustomerId: stripeCustomer.id,
    },
  });

  // Create a new customer in your database
  await prisma.customer.create({
    data: {
      stripeCustomerId: stripeCustomer.id,
      User: {
        connect: {
          id: user.id,
        },
      },
    },
  });

  // Create a new product in Stripe
  const stripeProduct = await stripe.products.create({
    name: 'Test Product',
    description: 'A test product',
  });

  // Create a new price in Stripe
  const stripePrice = await stripe.prices.create({
    product: stripeProduct.id,
    unit_amount: 1000, // $10.00
    currency: 'usd',
    recurring: {
      interval: 'month',
    },
  });

  // Create a new product in your database
  await prisma.product.create({
    data: {
      id: stripeProduct.id,
      active: stripeProduct.active,
      name: stripeProduct.name,
      description: stripeProduct.description,
    },
  });

  // Create a new price in your database
  await prisma.price.create({
    data: {
      id: stripePrice.id,
      productId: stripePrice.product,
      active: stripePrice.active,
      unitAmount: stripePrice.unit_amount,
      currency: stripePrice.currency,
      type: 'recurring',
      interval: 'month',
      intervalCount: 1,
      trialPeriodDays: null,
    },
  });
}
