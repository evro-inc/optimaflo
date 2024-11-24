'use server';

import React from 'react';
import '../../../../../styles/globals.css';
import NavApp from '@/src/components/client/Navbar/NavApp';
import SideBar from '@/src/components/client/Navbar/SideBar';

import { notFound } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';

export default async function PropertiesLayout({
  children,
  streams,
  index,
  dimensions,
  metrics,
  conversions,
  keyEvents,
}: {
  children: React.ReactNode;
  streams: React.ReactNode;
  index: React.ReactNode;
  dimensions: React.ReactNode;
  metrics: React.ReactNode;
  conversions: React.ReactNode;
  keyEvents: React.ReactNode;
}) {
  const user = await currentUser();
  if (!user) return notFound();

  return (
    <>
      <NavApp />

      <SideBar />

      {/* Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden pt-16 bg-secondary/10 pb-1">
        {/* Page Heading */}
        {children}
        {index}
        {streams}
        {dimensions}
        {metrics}
        {conversions}
        {keyEvents}
      </div>
    </>
  );
}
