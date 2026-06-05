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
      options: [
        'default',
        'xs',
        'sm',
        'lg',
        'search',
        'auth',
        'cta',
        'tab',
        'pill',
        'icon',
        'icon-xs',
        'icon-sm',
        'icon-lg',
      ],
    },
  },
  args: { children: 'Save changes' },
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
    <div className='flex max-w-3xl flex-wrap items-center gap-2'>
      <Button size='xs'>xs</Button>
      <Button size='sm'>sm</Button>
      <Button>default</Button>
      <Button size='lg'>lg</Button>
      <Button size='search'>검색</Button>
      <Button size='auth'>로그인</Button>
      <Button size='cta'>관심 카드 추가</Button>
      <Button size='tab' variant='outline'>
        90일
      </Button>
      <Button size='pill' variant='secondary'>
        포켓몬
      </Button>
    </div>
  ),
};

export const TcgUsage: Story = {
  render: () => (
    <div className='flex max-w-3xl flex-col gap-4'>
      <div className='flex flex-wrap items-center gap-2'>
        <Button size='search'>검색</Button>
        <Button size='auth' className='max-w-60'>
          로그인
        </Button>
      </div>
      <div className='flex flex-wrap gap-3'>
        <Button size='cta'>관심 카드 추가</Button>
        <Button size='cta' variant='outline'>
          가격 알림 설정
        </Button>
      </div>
      <div className='bg-muted flex w-fit items-center gap-1 rounded-full p-1'>
        <Button size='tab' variant='ghost'>
          7일
        </Button>
        <Button size='tab' variant='outline' className='bg-card text-foreground'>
          90일
        </Button>
      </div>
    </div>
  ),
};

export const DarkTheme: Story = {
  render: () => (
    <div className='dark bg-background text-foreground rounded-2xl p-6'>
      <div className='flex flex-wrap items-center gap-2'>
        <Button>Default</Button>
        <Button variant='outline'>Outline</Button>
        <Button variant='secondary'>Secondary</Button>
        <Button variant='ghost'>Ghost</Button>
      </div>
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
