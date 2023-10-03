import { Meta, StoryFn } from '@storybook/react';
import { Toaster, toast } from 'react-hot-toast';

interface ToastArgs {
  variant: 'normal' | 'success' | 'error' | 'warning';
  message: string;
}

export default {
  title: 'OptimaFlo/Toast',
  component: Toaster,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    variant: {
      options: ['normal', 'success', 'error', 'warning'],
      control: { type: 'select' },
    },
    message: { control: 'text' },
  },
} as Meta;

const Template: StoryFn<ToastArgs> = (args) => {
  const { variant, message } = args;

  const showToast = () => {
    if (variant === 'normal') {
      toast(message);
    } else if (variant === 'success') {
      toast.success(message);
    } else if (variant === 'error') {
      toast.error(message);
    } else if (variant === 'warning') {
      toast.custom(() => (
        <div>
          <p>{message}</p>
        </div>
      ));
    }
  };

  return (
    <>
      <button onClick={showToast}>Show Toast</button>
      <Toaster />
    </>
  );
};

export const ToastGeneral = Template.bind({});
ToastGeneral.args = {
  variant: 'normal',
  message: 'This is a normal message.',
};
