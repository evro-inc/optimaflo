import { Meta } from '@storybook/react';
import Image from 'next/image';

export default {
  title: 'OptimaFlo/Image',
  component: Image,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    onClick: { action: 'clicked' },
  },
} satisfies Meta<typeof Image>;

export const ImageGeneral = {
  args: {
    onClick: () => {},
  },
};
