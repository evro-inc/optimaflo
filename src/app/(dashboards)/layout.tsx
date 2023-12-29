'use server';
import React from 'react';
import '../../styles/globals.css';
import NavApp from '@/src/components/client/Navbar/NavApp';
import { Providers, ReduxProvider } from '../providers';
import SideBar from '@/src/components/client/Navbar/SideBar';
import { Toaster } from 'react-hot-toast';
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
          <body className="bg-gray-50">
            {/* ========== HEADER ========== */}
            <NavApp />
            {/* ========== END HEADER ========== */}

            {/* ========== MAIN CONTENT ========== */}
            <SideBar />

            {/* Content */}
            <div className="w-full pt-10 px-4 sm:px-6 md:px-8 lg:pl-72">
              {/* Page Heading */}
              {children}
              <Toaster
                position="top-right"
                reverseOrder={false}
                toastOptions={{
                  className: 'z-50',
                }}
              />
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
