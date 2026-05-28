import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { CircleAlertIcon, InfoIcon } from 'lucide-react';
import { Alert, AlertAction, AlertDescription, AlertTitle } from './alert';
import { Button } from './button';

const meta = {
  title: 'UI/Alert',
  component: Alert,
  parameters: { layout: 'padded' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['default', 'destructive'] },
  },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Alert {...args} className='max-w-md'>
      <InfoIcon />
      <AlertTitle>새 카드가 등록되었습니다.</AlertTitle>
      <AlertDescription>최근 추가된 한국판 포켓몬 카드를 확인해 보세요.</AlertDescription>
    </Alert>
  ),
};

export const Destructive: Story = {
  args: { variant: 'destructive' },
  render: (args) => (
    <Alert {...args} className='max-w-md'>
      <CircleAlertIcon />
      <AlertTitle>요청을 처리할 수 없습니다.</AlertTitle>
      <AlertDescription>네트워크 상태를 확인한 뒤 다시 시도해 주세요.</AlertDescription>
    </Alert>
  ),
};

export const WithAction: Story = {
  render: () => (
    <Alert className='max-w-md'>
      <InfoIcon />
      <AlertTitle>가격 알림이 도착했습니다.</AlertTitle>
      <AlertDescription>리자몽 ex 151 SAR 시세가 5% 하락했습니다.</AlertDescription>
      <AlertAction>
        <Button size='xs' variant='outline'>
          보기
        </Button>
      </AlertAction>
    </Alert>
  ),
};
