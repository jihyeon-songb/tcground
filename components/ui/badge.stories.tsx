import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { CheckIcon } from 'lucide-react';
import { Badge } from './badge';

const meta = {
  title: 'UI/Badge',
  component: Badge,
  parameters: { layout: 'centered' },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'],
    },
  },
  args: { children: 'Badge' },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Variants: Story = {
  render: () => (
    <div className='flex flex-wrap items-center gap-2'>
      <Badge>Default</Badge>
      <Badge variant='secondary'>Secondary</Badge>
      <Badge variant='destructive'>Destructive</Badge>
      <Badge variant='outline'>Outline</Badge>
      <Badge variant='ghost'>Ghost</Badge>
      <Badge variant='link'>Link</Badge>
    </div>
  ),
};

export const WithIcon: Story = {
  render: () => (
    <Badge variant='secondary'>
      <CheckIcon />
      검증 완료
    </Badge>
  ),
};
