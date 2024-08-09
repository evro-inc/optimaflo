'use client';
import React from 'react';
import { Button } from '@/src/components/ui/button';

interface ButtonConfig {
  text: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  form?: string;
  // Add any other props you might need
}

interface ButtonGroupFourProps {
  buttons: ButtonConfig[];
}

/**
 * Primary UI component for user interaction
 */
export const ButtonGroup: React.FC<ButtonGroupFourProps> = ({ buttons = [], ...props }) => {
  return (
    <>
      {buttons.map((button, index) => (
        <Button
          key={index}
          type={button.type || 'button'}
          onClick={button.onClick}
          form={button.form}
          {...props}
        >
          {button.text}
        </Button>
      ))}
    </>
  );
};
