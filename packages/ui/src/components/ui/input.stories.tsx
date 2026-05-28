import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Input } from './input';

const meta = {
  title: 'UI/Input',
  component: Input,
  parameters: { layout: 'padded' },
  args: { placeholder: '카드 이름을 입력하세요' },
  argTypes: {
    type: { control: 'select', options: ['text', 'email', 'password', 'number', 'search'] },
  },
  render: (args) => (
    <div className='w-72'>
      <Input {...args} />
    </div>
  ),
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = { args: { disabled: true, value: '읽기 전용' } };

export const Invalid: Story = { args: { 'aria-invalid': true, defaultValue: 'invalid' } };

export const Email: Story = { args: { type: 'email', placeholder: 'you@example.com' } };
