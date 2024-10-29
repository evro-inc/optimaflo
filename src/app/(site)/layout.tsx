import { openSans } from '@/src/utils/fonts';
import '../../styles/globals.css';
import '../../styles/tailwind.css';

import { ReduxProvider } from '../providers';
import React from 'react';
import Navbar from '@/src/components/client/Navbar/Navbar';
import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from 'sonner';
import Footer from '@/src/components/server/Footer';

export default function RootLayout({
  // Layouts must accept a children prop.
  // This will be populated with nested layouts or pages
  children,
}: {
  children: React.ReactNode;
}) {
  // added suppressHydrationWarning to html tag to prevent hydration mismatch error
  return (
    <>
      <html lang="en" suppressHydrationWarning className={`${openSans.className}`}>
        <ClerkProvider dynamic>
          <body>
            <ReduxProvider>
              <Navbar />
              {children}
              <Toaster />
              <Footer />
            </ReduxProvider>
          </body>
        </ClerkProvider>
      </html>
    </>
  );
}
