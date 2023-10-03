// 'use client';
import React from 'react';
import { toast } from 'react-hot-toast';

export interface ToastProps {
  variant?: 'loading' | 'success' | 'error' | 'warning' | 'promise' | 'info';
  message: string;
  error?: string;
}

export const showToast: React.FC<ToastProps> = ({
  variant = 'info',
  message,
  error,
}) => {
  switch (variant) {
    case 'info':
      return toast(message);
    case 'loading':
      return toast.loading(message);
    case 'success':
      return toast.success(message);
    case 'error':
      return toast.error(message);
    case 'warning':
      return toast.custom(() => (
        <div>
          <p>{message}</p>
        </div>
      ));
    case 'promise':
      return toast.promise(
        new Promise((resolve) => setTimeout(resolve, 2000)),
        {
          loading: 'Loading',
          success: message,
          error: error || 'An error occurred',
        }
      );
    default:
      return toast(message);
  }
};
