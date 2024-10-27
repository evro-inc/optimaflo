/* eslint-disable import/no-anonymous-default-export */
import { Meta } from '@storybook/react';
import { LinkBody } from './Links'; // Ensure the import matches the actual component name

export default {
  title: 'OptimaFlo/Links',
  component: LinkBody,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered'
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
        'toggle'
      ],
      control: { type: 'select' }
    },

    text: { control: 'text' }
  }
} satisfies Meta<typeof LinkBody>;

export const LinkGeneral = {
  args: {
    variant: 'primary',
    text: 'Link',
    href: '#'
  }
};
