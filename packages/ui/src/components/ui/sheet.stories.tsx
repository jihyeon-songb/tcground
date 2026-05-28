import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './sheet';
import { Button } from './button';

const meta = {
  title: 'UI/Sheet',
  component: Sheet,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Sheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Right: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant='outline'>필터 열기</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>필터</SheetTitle>
          <SheetDescription>가격대, 세트, 상태로 결과를 좁혀보세요.</SheetDescription>
        </SheetHeader>
        <SheetFooter>
          <Button>적용</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
};

export const Left: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant='outline'>메뉴</Button>
      </SheetTrigger>
      <SheetContent side='left'>
        <SheetHeader>
          <SheetTitle>탐색</SheetTitle>
          <SheetDescription>모바일 내비게이션 예시</SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  ),
};
