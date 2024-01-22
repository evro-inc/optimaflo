import { openSans } from '@/src/lib/fonts';
import '../../styles/globals.css';
import '../../styles/tailwind.css';

import { ReduxProvider } from '../providers';
import React from 'react';
import Footer from '@/src/components/server/Footer/Footer';
import Navbar from '@/src/components/client/Navbar/Navbar';
import { Alert, AlertDescription, AlertTitle } from '@/src/components/ui/alert';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { ClerkProvider } from '@clerk/nextjs';

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
      <html
        lang="en"
        suppressHydrationWarning
        className={`${openSans.className}`}
      >
        <ClerkProvider>
          <body>
            <ReduxProvider>
              <Alert variant="destructive">
                <ExclamationTriangleIcon className="h-4 w-4" />
                <AlertTitle>Warning!!</AlertTitle>
                <AlertDescription>
                  This app, as of now, is solely for demo purposes. You may
                  experience some bugs and errors. This is still a work in
                  progress.
                </AlertDescription>
              </Alert>

              <Navbar />
              {children}
              <Footer />
            </ReduxProvider>
          </body>
        </ClerkProvider>
      </html>
    </>
  );
}
