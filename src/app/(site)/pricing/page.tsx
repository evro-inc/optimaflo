import FAQ from '@/src/components/server/FAQ/Faq';
import PricingTable from '@/src/components/client/Pricing/Table';
import { ProductWithPrice } from 'types/types';
import prisma from '@/src/lib/prisma';

const getActiveProductsWithPrices = async (): Promise<ProductWithPrice[]> => {
  'use server';

  // Query the database to retrieve active products with prices
  const products = await prisma.product.findMany({
    where: { active: true },
    include: {
      Price: true,
    },
  });

  // Sort the prices for each product
  products.forEach((product) => {
    if (product.Price && product.Price.length > 0) {
      product.Price.sort((a, b) => a.unitAmount - b.unitAmount);
    }
  });

  return products;
};

export default async function PricingPage() {
  let products = await getActiveProductsWithPrices();

  if (!products.length)
    return (
      <section className="bg-black">
        <div className="max-w-6xl mx-auto py-8 sm:py-24 px-4 sm:px-6 lg:px-8">
          <div className="sm:flex sm:flex-col sm:align-center"></div>
          <p className="text-6xl font-extrabold text-white sm:text-center sm:text-6xl">
            No subscription pricing plans found. Create them in your{' '}
            <a
              className="text-pink-500 underline"
              href="https://dashboard.stripe.com/products"
              rel="noopener noreferrer"
              target="_blank"
            >
              Stripe Dashboard
            </a>
            .
          </p>
        </div>
      </section>
    );

  // Modify the products array to include a prices array for each product
  products = products.map((product) => ({
    ...product,
    prices: product.Price, // assuming product.Price is an array of price objects
  }));

  return (
    <>
      <PricingTable products={products} />

      <FAQ />
    </>
  );
}
