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
        __html: `<div name="termly-embed" data-id="3d85a5cb-bbd8-4168-88ea-a73baffd136d" data-type="iframe"></div>`,
      }}
    />
  );
}
