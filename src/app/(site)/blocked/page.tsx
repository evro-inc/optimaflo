import React, { Suspense } from 'react';

export default function Blocked() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div>
        <main>
          <h3>Access blocked.</h3>
        </main>
      </div>
    </Suspense>
  );
}