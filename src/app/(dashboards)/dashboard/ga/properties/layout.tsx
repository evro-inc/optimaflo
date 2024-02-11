import React from 'react';

export default async function PropertyLayout({children, index, streams}: {children: React.ReactNode, index: React.ReactNode, streams: React.ReactNode}) {


  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden pt-16 pb-1">
        {children}
        {index}
        {streams}
    </div>
  );
}
