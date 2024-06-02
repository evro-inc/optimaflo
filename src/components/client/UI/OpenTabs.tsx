'use client';

import React, { useEffect, useRef } from 'react';

const OpenTabs = ({ urls, onTosAccepted }) => {
  const hasOpenedTabs = useRef(false);

  console.log('urls: ', urls);
  console.log('onTosAccepted: ', onTosAccepted());

  useEffect(() => {
    if (urls && urls.length > 0 && !hasOpenedTabs.current) {
      hasOpenedTabs.current = true;

      const openInNewTab = (url) => {
        window.open(url, '_blank', 'width=800,height=600');
      };

      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      const openUrls = async () => {
        for (const url of urls) {
          openInNewTab(url);
          await delay(500);
        }
        // Call the onTosAccepted callback after opening all tabs
        onTosAccepted();
      };

      openUrls();
    }
  }, [urls, onTosAccepted]);

  return (
    <div>
      <p>Opening tabs...</p>
    </div>
  );
};

export default OpenTabs;
