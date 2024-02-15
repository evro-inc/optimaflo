import { openSans } from '@/src/utils/fonts';
import '../../styles/globals.css';
import '../../styles/tailwind.css';

import React from 'react';
import { ReduxProvider } from '../providers';

export default function BlockLayout({
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
        <body>
          <ReduxProvider>{children}</ReduxProvider>
        </body>
      </html>
    </>
  );
}
