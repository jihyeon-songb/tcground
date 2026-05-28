import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Skeleton } from './skeleton';

const meta = {
  title: 'UI/Skeleton',
  component: Skeleton,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CardItem: Story = {
  render: () => (
    <div className='ring-foreground/10 flex max-w-sm items-center gap-4 rounded-xl p-4 ring-1'>
      <Skeleton className='h-12 w-12 rounded-full' />
      <div className='flex-1 space-y-2'>
        <Skeleton className='h-4 w-2/3' />
        <Skeleton className='h-3 w-1/3' />
      </div>
    </div>
  ),
};

export const Block: Story = {
  render: () => (
    <div className='grid w-full max-w-sm gap-3'>
      <Skeleton className='h-32 w-full' />
      <Skeleton className='h-4 w-3/4' />
      <Skeleton className='h-4 w-1/2' />
    </div>
  ),
};
