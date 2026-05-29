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
} from '@tcground/ui';

export default function DefaultExample() {
  return (
    <Command style={{ maxWidth: '28rem', width: '100%' }}>
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
  );
}
