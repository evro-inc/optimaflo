'use server';
import React from 'react';
import { ProductWithPrice } from '@/src/lib/types/types';
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '../../ui/table';
import PricingCards from './cards';
import { getTierLimit } from '@/src/lib/fetch/feature';
import { notFound } from 'next/navigation';
import { currentUser } from '@clerk/nextjs';
import { getSubscription } from '@/src/lib/fetch/subscriptions';

interface Props {
  products: ProductWithPrice[];
}



export default async function PricingTable({ products = [] }: Props) {


 const tierLimits = [
  {
    feature: '1',
    description: 'Tags',
    analyst: '30',
    consultant: '60',
    enterprise: 'unlimited',
  },
  {
    feature: '2',
    description: 'Triggers',
    analyst: '40',
    consultant: '120',
    enterprise: 'unlimited',
  },
  {
    feature: '3',
    description: 'Variables',
    analyst: '40',
    consultant: '180',
    enterprise: 'unlimited',
  },
  {
    feature: '4',
    description: 'Containers',
    analyst: '3',
    consultant: '10',
    enterprise: 'unlimited',
  },
  {
    feature: '5',
    description: 'Workspaces',
    analyst: '10',
    consultant: '30',
    enterprise: 'unlimited',
  },
  {
    feature: '6',
    description: 'Built-In Variables',
    analyst: '150',
    consultant: '450',
    enterprise: 'unlimited',
  },
  {
    feature: '7',
    description: 'Versions',
    analyst: '50',
    consultant: '150',
    enterprise: 'unlimited',
  },
];

  // sort products by price
  const sortedProducts = products.sort((a, b) => {
    const aPrice: any = a.Price.find((p) => p.interval === 'month');
    const bPrice: any = b.Price.find((p) => p.interval === 'month');
    if (!aPrice || !bPrice) return 0;
    return aPrice.unitAmount - bPrice.unitAmount;
  });

  return (
    <>


      <section>
        {/* Hero */}
        <div>
          <div className="max-w-[85rem] px-4 pt-10 sm:px-6 lg:px-8 lg:pt-14 mx-auto">
            {/* Title */}
            <div className="max-w-2xl mx-auto text-center mb-10">
              <h1 className="text-3xl leading-tight font-bold md:text-4xl md:leading-tight lg:text-5xl lg:leading-tight">
                Choose the Plan That&#39;s Right for Your Business
              </h1>
              <p className="mt-2 lg:text-lg">
                Whatever your status, our offers evolve according to your needs.
              </p>
            </div>
            {/* End Title */}
          </div>
        </div>

        {/* End Grid */}

        <PricingCards products={sortedProducts} />

        {/* End Hero */}
      </section>

<section className='flex justify-center'>
  <div className='md:w-3/5'>
    <h2 className='text-3xl font-bold text-center'>Compare Plan Limits</h2>
      <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Plan</TableHead>
          <TableHead>Analyst</TableHead>
          <TableHead>Consultancy</TableHead>
          <TableHead>Enterprise</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tierLimits.map((data) => (
          <TableRow key={data.feature}>
            <TableCell>{data.description}</TableCell>
            <TableCell className="font-medium">{data.analyst}</TableCell>
            <TableCell>{data.consultant}</TableCell>
            <TableCell>{data.enterprise}</TableCell>
          </TableRow>
        ))}
      </TableBody>

    </Table>
  </div>


</section>
    </>
  );
}
