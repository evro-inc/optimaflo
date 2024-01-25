'use server';
import React from 'react';
import { ProductWithPrice } from '@/src/lib/types/types';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '../../ui/table';
import PricingCards from './Cards';

interface Props {
  products: ProductWithPrice[];
}

export default async function PricingTable({ products = [] }: Props) {
  const gtmTierLimits = [
    {
      id: '1',
      description: 'Tags',
      analyst: '30',
      consultant: '60',
      enterprise: 'unlimited',
    },
    {
      id: '2',
      description: 'Triggers',
      analyst: '40',
      consultant: '120',
      enterprise: 'unlimited',
    },
    {
      id: '3',
      description: 'Variables',
      analyst: '40',
      consultant: '180',
      enterprise: 'unlimited',
    },
    {
      id: '4',
      description: 'Containers',
      analyst: '3',
      consultant: '10',
      enterprise: 'unlimited',
    },
    {
      id: '5',
      description: 'Workspaces',
      analyst: '10',
      consultant: '30',
      enterprise: 'unlimited',
    },
    {
      id: '6',
      description: 'Built-In Variables',
      analyst: '150',
      consultant: '450',
      enterprise: 'unlimited',
    },
    {
      id: '7',
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

      <section className="flex justify-center my-28">
        <div className="md:w-3/5">
          <h2 className="text-3xl font-bold text-center pb-5">
            Compare Plan Limits
          </h2>
          <Table>
            <TableHeader>
              <TableRow className="bg-primary">
                <TableHead className="font-bold text-lg text-secondary">
                  Plan
                </TableHead>
                <TableHead className="font-bold text-lg text-secondary">
                  Analyst
                </TableHead>
                <TableHead className="font-bold text-lg text-secondary">
                  Consultancy
                </TableHead>
                <TableHead className="font-bold text-lg text-secondary">
                  Enterprise
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="bg-muted font-bold">
                <TableCell colSpan={4}>GTM</TableCell>
              </TableRow>
              {gtmTierLimits.map((data) => (
                <TableRow key={data.id}>
                  <TableCell>{data.description}</TableCell>
                  <TableCell className="font-medium">{data.analyst}</TableCell>
                  <TableCell>{data.consultant}</TableCell>
                  <TableCell>{data.enterprise}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  New features are added regularly. If you need a custom plan,
                  please contact us.
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </section>
    </>
  );
}
