import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './card';
import { Button } from './button';

const meta = {
  title: 'UI/Card',
  component: Card,
  parameters: { layout: 'padded' },
  argTypes: { size: { control: 'inline-radio', options: ['default', 'sm'] } },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Card {...args} className='max-w-sm'>
      <CardHeader>
        <CardTitle>리자몽 ex 151 SAR</CardTitle>
        <CardDescription>한국판 / SV 강화확장팩</CardDescription>
      </CardHeader>
      <CardContent>
        <p className='text-muted-foreground'>최근 30일 평균 거래가가 12% 상승했습니다.</p>
      </CardContent>
      <CardFooter>
        <Button variant='outline'>상세보기</Button>
      </CardFooter>
    </Card>
  ),
};

export const WithAction: Story = {
  render: () => (
    <Card className='max-w-sm'>
      <CardHeader>
        <CardTitle>관심 카드</CardTitle>
        <CardDescription>최근 가격 변동을 한눈에 확인하세요.</CardDescription>
        <CardAction>
          <Button size='sm' variant='ghost'>
            관리
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className='text-muted-foreground'>등록된 카드 12개</p>
      </CardContent>
    </Card>
  ),
};

export const Small: Story = {
  args: { size: 'sm' },
  render: (args) => (
    <Card {...args} className='max-w-xs'>
      <CardHeader>
        <CardTitle>Small Card</CardTitle>
        <CardDescription>컴팩트 배치에 적합한 사이즈입니다.</CardDescription>
      </CardHeader>
      <CardContent>본문 영역</CardContent>
    </Card>
  ),
};
