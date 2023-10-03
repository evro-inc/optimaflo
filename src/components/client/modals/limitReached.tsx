import React from 'react';

export function LimitReached({ onClose }) {
  return (
    <div className="fixed top-0 left-0 w-full h-full bg-black-500 bg-opacity-50 z-50 flex justify-center items-center">
      <div className="relative flex flex-col bg-white-500 shadow-lg rounded-xl dark:bg-gray-800 p-4 sm:p-10">
        <div className="absolute top-2 right-2">
          <button
            type="button"
            className="inline-flex flex-shrink-0 justify-center items-center h-8 w-8 rounded-md text-gray-500 hover:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-white transition-all text-sm dark:focus:ring-gray-700 dark:focus:ring-offset-gray-800"
            onClick={onClose}
          >
            <span className="sr-only">Close</span>
            {/* SVG for close button */}
          </button>
        </div>
        <div className="p-4 sm:p-10 text-center overflow-y-auto">
          {/* Your icon and message */}
          <h3 className="mb-2 text-2xl font-bold text-gray-800 dark:text-gray-200">
            Feature Limit Reached
          </h3>
          <p className="text-gray-500">
            You have reached the limit for this feature. Upgrade now to continue
            enjoying all the features.
          </p>
          <div className="mt-6 flex justify-center gap-x-4">
            <button
              type="button"
              className="py-2.5 px-4 inline-flex justify-center items-center gap-2 rounded-md border font-medium bg-white text-gray-700 shadow-sm align-middle hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-blue-600 transition-all text-sm dark:bg-gray-800 dark:hover:bg-slate-800 dark:border-gray-700 dark:text-gray-400 dark:hover:text-white dark:focus:ring-offset-gray-800"
              onClick={() => (window.location.href = '/pricing')}
            >
              Upgrade
            </button>
            <button
              type="button"
              className="py-2.5 px-4 inline-flex justify-center items-center gap-2 rounded-md border font-medium bg-white text-gray-700 shadow-sm align-middle hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-blue-600 transition-all text-sm dark:bg-gray-800 dark:hover:bg-slate-800 dark:border-gray-700 dark:text-gray-400 dark:hover:text-white dark:focus:ring-offset-gray-800"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
