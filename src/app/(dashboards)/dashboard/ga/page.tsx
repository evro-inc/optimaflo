import React from 'react';

export default async function GAPage() {
  try {
    const content = (
      <div>
        <h1>GA4 Functionality Coming soon</h1>
      </div>
    );

    return content;
  } catch (error: any) {
    throw new Error(error);
  }
}
