import { useState } from 'react';
import { SearchIcon, StarIcon } from 'lucide-react';
import {
  Button,
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@tcground/ui';

export default function DialogExample() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant='outline' onClick={() => setOpen(true)}>
        명령 팔레트 열기
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} title='카드 검색'>
        <Command>
          <CommandInput placeholder='카드명 또는 작업 검색...' />
          <CommandList>
            <CommandEmpty>일치하는 결과가 없습니다.</CommandEmpty>
            <CommandGroup heading='빠른 작업'>
              <CommandItem>
                <SearchIcon /> 카드 검색
                <CommandShortcut>⌘K</CommandShortcut>
              </CommandItem>
              <CommandItem>
                <StarIcon /> 관심 카드 보기
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
