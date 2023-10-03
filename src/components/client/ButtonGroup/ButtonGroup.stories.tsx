/* eslint-disable import/no-anonymous-default-export */
import { Meta } from '@storybook/react';
import { ButtonGroup } from './ButtonGroup';

export default {
  title: 'OptimaFlo/Button',
  component: ButtonGroup,
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
} satisfies Meta<typeof ButtonGroup>;

export const ButtonGroupGeneral = {
  args: {
    variant: 'primary',
    text: 'Button',
    onClick: () => {},
  },
};
