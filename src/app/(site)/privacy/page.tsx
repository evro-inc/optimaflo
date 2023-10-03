'use client';
import React, { useEffect } from 'react';

export default function Privacy() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://app.termly.io/embed-policy.min.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return (
    <div
      dangerouslySetInnerHTML={{
        __html: `<div name="termly-embed" data-id="eda34601-95c0-4909-89a1-c09ed6d15c8d" data-type="iframe"></div>`,
      }}
    />
  );
}
