'use client';

import React, { useEffect } from 'react';

const OpenTabs = ({ urls }) => {
  useEffect(() => {
    if (urls && urls.length > 0) {
      const openInNewTab = (url) => {
        window.open(url, '_blank');
      };

      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      const openUrls = async () => {
        for (const url of urls) {
          openInNewTab(url);
          await delay(500); // Adjust the delay as needed
        }
      };

      openUrls();
    }
  }, [urls]);

  return (
    <div>
      <p>Opening tabs...</p>
    </div>
  );
};

export default OpenTabs;
