import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@tcground/ui';
import { useState } from 'react';

export default function ControlledExample() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'column', gap: '0.5rem' }}>
      <DropdownMenu onOpenChange={setOpen} open={open}>
        <DropdownMenuTrigger asChild>
          <Button variant='outline'>정렬: {selected ?? '선택 안 함'}</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {(['이름순', '발매일순', '가격순'] as const).map((label) => (
            <DropdownMenuItem key={label} onClick={() => setSelected(label)}>
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <span style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
        open = {String(open)}
      </span>
    </div>
  );
}
