import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Switch } from './switch';
import { Label } from './label';

const meta = {
  title: 'UI/Switch',
  component: Switch,
  parameters: { layout: 'centered' },
  argTypes: { size: { control: 'inline-radio', options: ['default', 'sm'] } },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Checked: Story = { args: { defaultChecked: true } };

export const Disabled: Story = { args: { disabled: true } };

export const Sizes: Story = {
  render: () => (
    <div className='flex items-center gap-4'>
      <Switch size='sm' defaultChecked />
      <Switch defaultChecked />
    </div>
  ),
};

export const WithLabel: Story = {
  render: () => (
    <Label className='flex items-center gap-2'>
      <Switch defaultChecked /> 이메일 알림
    </Label>
  ),
};
