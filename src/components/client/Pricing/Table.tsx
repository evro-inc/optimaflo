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
  const GTMtierLimits = [
    {
      id: '1',
      product: 'GTM',
      description: 'Tags',
      analyst: '30',
      consultant: '60',
      enterprise: 'unlimited',
    },
    {
      id: '2',
      product: 'GTM',
      description: 'Triggers',
      analyst: '40',
      consultant: '120',
      enterprise: 'unlimited',
    },
    {
      id: '3',
      product: 'GTM',
      description: 'Variables',
      analyst: '40',
      consultant: '180',
      enterprise: 'unlimited',
    },
    {
      id: '4',
      product: 'GTM',
      description: 'Containers',
      analyst: '3',
      consultant: '10',
      enterprise: 'unlimited',
    },
    {
      id: '5',
      product: 'GTM',
      description: 'Workspaces',
      analyst: '10',
      consultant: '30',
      enterprise: 'unlimited',
    },
    {
      id: '6',
      product: 'GTM',
      description: 'Built-In Variables',
      analyst: '150',
      consultant: '450',
      enterprise: 'unlimited',
    },
    {
      id: '7',
      product: 'GTM',
      description: 'Versions',
      analyst: '50',
      consultant: '150',
      enterprise: 'unlimited',
    },
  ];
  const GA4tierLimits = [
    {
      id: '1',
      product: 'GA4',
      description: 'Accounts',
      analyst: '3',
      consultant: '6',
      enterprise: 'unlimited',
    },
    {
      id: '2',
      product: 'GA4',
      description: 'Properties',
      analyst: '6',
      consultant: '12',
      enterprise: 'unlimited',
    },
    {
      id: 3,
      product: 'GA4',
      description: 'Data Streams',
      analyst: '3',
      consultant: '12',
      enterprise: 'unlimited',
    },
    {
      id: '4',
      product: 'GA4',
      description: 'Conversion Events',
      analyst: '20',
      consultant: '40',
      enterprise: 'unlimited',
    },
    {
      id: '5',
      product: 'GA4',
      description: 'Custom Definitions',
      analyst: '20',
      consultant: '40',
      enterprise: 'unlimited',
    },
    {
      id: '6',
      product: 'GA4',
      description: 'Custom Metrics',
      analyst: '20',
      consultant: '40',
      enterprise: 'unlimited',
    },
    {
      id: '7',
      product: 'GA4',
      description: 'Firebase Links',
      analyst: '2',
      consultant: '6',
      enterprise: 'unlimited',
    },
    {
      id: '8',
      product: 'GA4',
      description: 'GA4 Ad Links',
      analyst: '2',
      consultant: '6',
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
              {GTMtierLimits.map((data) => (
                <TableRow key={data.id}>
                  <TableCell>{data.description}</TableCell>
                  <TableCell className="font-medium">{data.analyst}</TableCell>
                  <TableCell>{data.consultant}</TableCell>
                  <TableCell>{data.enterprise}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted font-bold">
                <TableCell colSpan={4}>GA4</TableCell>
              </TableRow>
              {GA4tierLimits.map((data) => (
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
                  GA4 APIs are still in beta so new features will be added
                  regularly as the API becomes stable.
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </section>
    </>
  );
}
