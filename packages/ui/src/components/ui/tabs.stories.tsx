import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';

const meta = {
  title: 'UI/Tabs',
  component: Tabs,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue='summary' className='w-96'>
      <TabsList>
        <TabsTrigger value='summary'>요약</TabsTrigger>
        <TabsTrigger value='price'>가격</TabsTrigger>
        <TabsTrigger value='history'>이력</TabsTrigger>
      </TabsList>
      <TabsContent value='summary'>카드 기본 정보와 카테고리 요약입니다.</TabsContent>
      <TabsContent value='price'>최근 30일 거래 시세를 보여줍니다.</TabsContent>
      <TabsContent value='history'>장기 가격 이력 차트가 표시됩니다.</TabsContent>
    </Tabs>
  ),
};

export const LineVariant: Story = {
  render: () => (
    <Tabs defaultValue='all' className='w-96'>
      <TabsList variant='line'>
        <TabsTrigger value='all'>전체</TabsTrigger>
        <TabsTrigger value='kr'>한국판</TabsTrigger>
        <TabsTrigger value='jp'>일본판</TabsTrigger>
      </TabsList>
      <TabsContent value='all'>전체 카드 결과</TabsContent>
      <TabsContent value='kr'>한국판 카드 결과</TabsContent>
      <TabsContent value='jp'>일본판 카드 결과</TabsContent>
    </Tabs>
  ),
};
