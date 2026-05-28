import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Textarea } from './textarea';
import { Label } from './label';

const meta = {
  title: 'UI/Textarea',
  component: Textarea,
  parameters: { layout: 'padded' },
  args: { placeholder: '메모를 입력하세요' },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => <Textarea {...args} className='w-80' />,
};

export const WithLabel: Story = {
  render: () => (
    <div className='grid w-80 gap-2'>
      <Label htmlFor='note'>카드 메모</Label>
      <Textarea id='note' placeholder='보유 카드 상태, 매입가 등을 메모하세요' />
    </div>
  ),
};

export const Disabled: Story = { args: { disabled: true, defaultValue: '읽기 전용 메모' } };
