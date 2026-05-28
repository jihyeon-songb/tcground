import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Separator } from './separator';

const meta = {
  title: 'UI/Separator',
  component: Separator,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  render: () => (
    <div className='max-w-sm space-y-3'>
      <div className='text-sm font-medium'>최근 본 카드</div>
      <Separator />
      <div className='text-muted-foreground text-sm'>관심 카드 목록</div>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className='flex h-10 items-center gap-3 text-sm'>
      <span>홈</span>
      <Separator orientation='vertical' />
      <span>카테고리</span>
      <Separator orientation='vertical' />
      <span>인기</span>
    </div>
  ),
};
