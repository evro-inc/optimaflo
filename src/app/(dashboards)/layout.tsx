'use server';

import React from 'react';
import '../../styles/globals.css';
import { ReduxProvider } from '../providers';
import { Toaster } from '@/src/components/ui/sonner';

import { notFound } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import { ClerkProvider } from '@clerk/nextjs';

export default async function DashboardLayout({
  // Layouts must accept a children prop.
  // This will be populated with nested layouts or pages
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  if (!user) return notFound();

  return (
    <ReduxProvider>
      <html lang="en">
        <ClerkProvider>
          <body className="flex h-screen border-collapse overflow-hidden">
            {/* ========== HEADER ========== */}

            {children}
            <Toaster />
            {/* End Page Heading */}

            {/* End Content */}
            {/* ========== END MAIN CONTENT ========== */}
          </body>
        </ClerkProvider>
      </html>
    </ReduxProvider>
  );
}
