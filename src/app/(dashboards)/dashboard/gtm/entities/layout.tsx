'use server';

import React from 'react';
import '../../../../../styles/globals.css';
import NavApp from '@/src/components/client/Navbar/NavApp';
import SideBar from '@/src/components/client/Navbar/SideBar';

import { notFound } from 'next/navigation';
import { currentUser } from '@clerk/nextjs';

export default async function EntityLayout({
  children,
  accounts,
  containers,
  workspaces,
  versions,
}: {
  children: React.ReactNode;
  accounts: React.ReactNode;
  containers: React.ReactNode;
  workspaces: React.ReactNode;
  versions: React.ReactNode;
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
        {accounts}
        {containers}
        {workspaces}
        {versions}
      </div>
    </>
  );
}
