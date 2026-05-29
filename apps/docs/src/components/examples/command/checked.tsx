import { BellIcon, StarIcon } from 'lucide-react';
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@tcground/ui';

export default function CheckedExample() {
  return (
    <Command style={{ maxWidth: '28rem', width: '100%' }}>
      <CommandInput placeholder='작업 검색...' />
      <CommandList>
        <CommandGroup heading='카드 작업'>
          <CommandItem data-checked='true'>
            <StarIcon /> 관심 카드 저장
            <CommandShortcut>⌘S</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <BellIcon /> 가격 알림 설정
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
