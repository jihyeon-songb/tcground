import { useState } from 'react';
import {
  Button,
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@tcground/ui';

export default function ControlledExample() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ display: 'grid', gap: '0.75rem', justifyItems: 'center' }}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant='outline'>제어된 Popover</Button>
        </PopoverTrigger>
        <PopoverContent>
          <PopoverHeader>
            <PopoverTitle>외부 상태와 동기화</PopoverTitle>
            <PopoverDescription>
              open 상태를 부모가 관리하면 다른 패널이나 단축키와 함께 사용할 수 있습니다.
            </PopoverDescription>
          </PopoverHeader>
        </PopoverContent>
      </Popover>
      <span style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
        open = {String(open)}
      </span>
    </div>
  );
}
