import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';

const meta = {
  title: 'UI/Dialog',
  component: Dialog,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant='outline'>알림 채널 추가</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>알림 채널 추가</DialogTitle>
          <DialogDescription>가격 알림을 받을 이메일 주소를 입력해 주세요.</DialogDescription>
        </DialogHeader>
        <div className='grid gap-2'>
          <Label htmlFor='email'>이메일</Label>
          <Input id='email' placeholder='you@example.com' />
        </div>
        <DialogFooter showCloseButton>
          <Button>추가</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};
