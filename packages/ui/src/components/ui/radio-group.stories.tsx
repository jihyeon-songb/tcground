import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { RadioGroup, RadioGroupItem } from './radio-group';
import { Label } from './label';

const meta = {
  title: 'UI/RadioGroup',
  component: RadioGroup,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <RadioGroup defaultValue='kr' className='max-w-xs'>
      <Label className='flex items-center gap-2'>
        <RadioGroupItem value='kr' /> 한국판
      </Label>
      <Label className='flex items-center gap-2'>
        <RadioGroupItem value='jp' /> 일본판
      </Label>
      <Label className='flex items-center gap-2'>
        <RadioGroupItem value='en' /> 영문판
      </Label>
    </RadioGroup>
  ),
};

export const Disabled: Story = {
  render: () => (
    <RadioGroup defaultValue='a' disabled className='max-w-xs'>
      <Label className='flex items-center gap-2'>
        <RadioGroupItem value='a' /> 옵션 A
      </Label>
      <Label className='flex items-center gap-2'>
        <RadioGroupItem value='b' /> 옵션 B
      </Label>
    </RadioGroup>
  ),
};
