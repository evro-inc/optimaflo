import React, { Suspense } from 'react';

export default function Privacy() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <iframe
        src="https://app.termly.io/document/privacy-policy/0c6fa074-f4b9-44df-9806-eadb4de3d06f"
        width="100%"
        height="900"
      ></iframe>
    </Suspense>
  );
}
