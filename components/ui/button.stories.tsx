import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { HeartIcon, ArrowRightIcon } from 'lucide-react';
import { Button } from './button';

const meta = {
  title: 'UI/Button',
  component: Button,
  parameters: { layout: 'centered' },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'outline', 'secondary', 'ghost', 'destructive', 'link'],
    },
    size: {
      control: 'select',
      options: ['default', 'xs', 'sm', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg'],
    },
  },
  args: { children: '버튼' },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Variants: Story = {
  render: () => (
    <div className='flex flex-wrap items-center gap-2'>
      <Button>Default</Button>
      <Button variant='outline'>Outline</Button>
      <Button variant='secondary'>Secondary</Button>
      <Button variant='ghost'>Ghost</Button>
      <Button variant='destructive'>Destructive</Button>
      <Button variant='link'>Link</Button>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className='flex flex-wrap items-center gap-2'>
      <Button size='xs'>xs</Button>
      <Button size='sm'>sm</Button>
      <Button>default</Button>
      <Button size='lg'>lg</Button>
    </div>
  ),
};

export const WithIcon: Story = {
  render: () => (
    <div className='flex flex-wrap items-center gap-2'>
      <Button>
        <HeartIcon />
        좋아요
      </Button>
      <Button variant='outline'>
        다음으로
        <ArrowRightIcon />
      </Button>
      <Button size='icon' aria-label='좋아요'>
        <HeartIcon />
      </Button>
    </div>
  ),
};

export const Disabled: Story = { args: { disabled: true } };
