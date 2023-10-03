import React from 'react';

export default async function Cover() {
  return (
    <>
      <html className="h-full">
        <body className="bg-slate-900 flex h-full">
          <div className="max-w-[50rem] flex flex-col mx-auto w-full h-full">
            {/* ========== MAIN CONTENT ========== */}
            <main id="content" role="main" className="flex flex-col justify-center items-center h-full">
            <div className="text-center">
                <h1 className="block text-2xl font-bold text-white-500 sm:text-4xl">
                OptimaFlo - Coming Soon
                </h1>
                <p className="mt-3 text-lg text-gray-300">
                Our website is under construction.
                </p>
            </div>
            </main>
            {/* ========== END MAIN CONTENT ========== */}
          </div>
        </body>
      </html>
    </>
  );
}
