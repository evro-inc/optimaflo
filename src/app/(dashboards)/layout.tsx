'use server';

import React from 'react';
import '../../styles/globals.css';
import NavApp from '@/src/components/client/Navbar/NavApp';
import { Providers, ReduxProvider } from '../providers';
import SideBar from '@/src/components/client/Navbar/SideBar';
import { Toaster } from '@/src/components/ui/sonner';

import { notFound } from 'next/navigation';
import { currentUser } from '@clerk/nextjs';

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
      <Providers>
        <html lang="en">
          <body className="flex h-screen border-collapse overflow-hidden">
            {/* ========== HEADER ========== */}
            <NavApp />
            {/* ========== END HEADER ========== */}

            {/* ========== MAIN CONTENT ========== */}
            <SideBar />

            {/* Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden pt-16 bg-secondary/10 pb-1">
              {/* Page Heading */}
              {children}
              <Toaster />
              {/* End Page Heading */}
            </div>
            {/* End Content */}
            {/* ========== END MAIN CONTENT ========== */}
          </body>
        </html>
      </Providers>
    </ReduxProvider>
  );
}
