import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from './select';

const meta = {
  title: 'UI/Select',
  component: Select,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Select>
      <SelectTrigger className='w-56'>
        <SelectValue placeholder='카테고리 선택' />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>TCG</SelectLabel>
          <SelectItem value='pokemon'>포켓몬</SelectItem>
          <SelectItem value='magic'>매직: 더 개더링</SelectItem>
          <SelectItem value='yugioh'>유희왕</SelectItem>
          <SelectItem value='one-piece'>원피스 카드</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>옵션</SelectLabel>
          <SelectItem value='all'>전체 보기</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
};

export const Small: Story = {
  render: () => (
    <Select>
      <SelectTrigger size='sm' className='w-40'>
        <SelectValue placeholder='정렬' />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value='recent'>최신순</SelectItem>
        <SelectItem value='price-asc'>가격 낮은순</SelectItem>
        <SelectItem value='price-desc'>가격 높은순</SelectItem>
      </SelectContent>
    </Select>
  ),
};
