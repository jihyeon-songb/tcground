import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { CalendarIcon, SettingsIcon, UserIcon } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from './command';

const meta = {
  title: 'UI/Command',
  component: Command,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Command>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Command className='ring-foreground/10 max-w-md rounded-xl ring-1'>
      <CommandInput placeholder='명령 또는 카드를 검색...' />
      <CommandList>
        <CommandEmpty>일치하는 결과가 없습니다.</CommandEmpty>
        <CommandGroup heading='제안'>
          <CommandItem>
            <CalendarIcon /> 가격 알림 설정
          </CommandItem>
          <CommandItem>
            <UserIcon /> 내 계정
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading='설정'>
          <CommandItem>
            <SettingsIcon /> 환경설정
            <CommandShortcut>⌘,</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
};
