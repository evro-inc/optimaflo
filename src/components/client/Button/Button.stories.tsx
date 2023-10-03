/* eslint-disable import/no-anonymous-default-export */
import { Meta } from '@storybook/react';
import { Button } from './Button';

export default {
  title: 'OptimaFlo/Button',
  component: Button,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    onClick: { action: 'clicked' },

    variant: {
      options: [
        'primary',
        'secondary',
        'tertiary',
        'success',
        'info',
        'warning',
        'error',
        'disable',
        'loading',
        'toggle',
      ],
      control: { type: 'select' },
    },

    text: { control: 'text' },
  },
} satisfies Meta<typeof Button>;

export const ButtonGeneral = {
  args: {
    variant: 'primary',
    text: 'Button',
    onClick: () => {},
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
