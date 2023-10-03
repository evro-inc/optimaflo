'use client';
import React, { useMemo } from 'react';

interface ButtonConfig {
  text: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  form?: string;
  // Add any other props you might need
}

interface ButtonGroupFourProps {
  variant?: string;
  buttons: ButtonConfig[];
  // Add any other props you might need
}

const getModeClasses = (variant) => {
  let baseClasses = '';

  switch (variant) {
    case 'primary':
      baseClasses =
        'py-3 px-4 mt-5 inline-flex justify-end gap-2 border font-medium bg-white text-gray-700 align-middle hover:bg-gray-50 focus:z-10 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all text-sm rounded-lg sm:p-4 mr-4 last:mr-0 shadow-md';
      break;

    default:
      baseClasses = '';
  }

  return `${baseClasses}`;
};

const BASE_BUTTON_CLASSES = '';

/**
 * Primary UI component for user interaction
 */
export const ButtonGroup: React.FC<ButtonGroupFourProps> = ({
  variant = 'primary',
  buttons = [],
  ...props
}) => {
  const computedClasses = useMemo(() => {
    const modeClass = getModeClasses(variant);
    return [modeClass].join(' ');
  }, [variant]);

  return (
    <div className="inline-flex rounded-md">
      {buttons.map((button, index) => (
        <button
          key={index}
          type={button.type || 'button'}
          onClick={button.onClick}
          form={button.form}
          className={`${BASE_BUTTON_CLASSES} ${computedClasses}`}
          {...props}
        >
          {button.text}
        </button>
      ))}
    </div>
  );
};
