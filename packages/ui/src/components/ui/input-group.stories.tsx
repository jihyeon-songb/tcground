import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { SearchIcon, MailIcon } from 'lucide-react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from './input-group';

const meta = {
  title: 'UI/InputGroup',
  component: InputGroup,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof InputGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithIcon: Story = {
  render: () => (
    <InputGroup className='w-72'>
      <InputGroupAddon>
        <SearchIcon />
      </InputGroupAddon>
      <InputGroupInput placeholder='카드 검색' />
    </InputGroup>
  ),
};

export const WithSuffixButton: Story = {
  render: () => (
    <InputGroup className='w-72'>
      <InputGroupAddon>
        <MailIcon />
      </InputGroupAddon>
      <InputGroupInput placeholder='이메일 주소' />
      <InputGroupAddon align='inline-end'>
        <InputGroupButton variant='default'>등록</InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  ),
};

export const WithText: Story = {
  render: () => (
    <InputGroup className='w-72'>
      <InputGroupAddon>
        <InputGroupText>₩</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput placeholder='0' inputMode='numeric' />
    </InputGroup>
  ),
};
