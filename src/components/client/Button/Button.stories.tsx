import { Meta, StoryObj } from '@storybook/react';
import { ButtonPrim } from './Button';
import { fn } from '@storybook/test';


export default {
  title: 'OptimaFlo/Button',
  component: ButtonPrim,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    onClick: { action: 'clicked' }, // For logging clicks in the Actions panel
    variant: {
      options: [
        'primary', 'secondary', 'tertiary',
        'success', 'info', 'warning',
        'error', 'disable', 'loading', 'toggle',
      ],
      control: { type: 'select' },
    },
    text: { control: 'text' },
  },
} satisfies Meta<typeof ButtonPrim>;

// General story for Button with default args
export const ButtonGeneral: StoryObj<typeof ButtonPrim> = {
  args: {
    variant: 'primary',
    text: 'Button',
    onClick: fn(), // Explicit mock function for testing
  },
};

/* 
export const Primary = {
  args: {
    primary: true,
    ariaLabel: '',
    role: '',
    text: 'Button',
    url: '',

  },
};

export const Secondary = {
  args: {
    type: 'secondary',
    ariaLabel: '',
    role: '',
    text: 'Button',
    url: '',
  },
};

export const Tertiary = {
  args: {
    type: 'tertiary',
    ariaLabel: '',
    role: '',
    text: 'Button',
    url: '',
  },
};

export const Success = {
  args: {
    type: 'success',
    ariaLabel: '',
    role: '',
    text: 'Button',
    url: '',
  },
};

export const Info = {
  args: {
    type: 'info',
    ariaLabel: '',
    role: '',
    text: 'Button',
    url: '',
  },
};

export const Warning = {
  args: {
    type: 'warning',
    ariaLabel: '',
    role: '',
    text: 'Button',
    url: '',
  },
};

export const Error = {
  args: {
    type: 'error',
    ariaLabel: '',
    role: '',
    text: 'Button',
    url: '',
  },
};

export const Disable = {
  args: {
    type: 'disable',
    ariaLabel: '',
    role: '',
    text: 'Button',
    url: '',
  },
};

export const Loading = {
  args: {
    type: 'loading',
    ariaLabel: '',
    role: '',
    text: 'Button',
    url: '',
  },
};

export const Toggle = {
  args: {
    type: 'toggle',
    ariaLabel: '',
    role: '',
    text: 'Button',
    url: '',
  },
};


*/
