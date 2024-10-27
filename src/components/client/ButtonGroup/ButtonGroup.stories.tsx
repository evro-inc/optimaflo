/* eslint-disable import/no-anonymous-default-export */
import { Meta, StoryObj } from '@storybook/react';
import { ButtonGroup } from './ButtonGroup';
import { fn } from '@storybook/test';

export default {
  title: 'OptimaFlo/ButtonGroup',
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
    text: { control: 'text' }, // Ensure the `text` prop is properly defined in the component's props
  },
} satisfies Meta<typeof ButtonGroup>;

// General story for ButtonGroup with default args
export const ButtonGroupGeneral: StoryObj<typeof ButtonGroup> = {
  args: {
    variant: 'primary',
    text: 'Button', // Text is properly defined in the ButtonGroup props
    onClick: fn(), // Using fn() for testing
  },
};
