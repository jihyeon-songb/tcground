import {DropdownMenu} from '@tcground/headless-ui';
import {useState} from 'react';

export default function ControlledExample() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div style={{display: 'flex', alignItems: 'center', flexDirection: 'column', gap: '0.5rem'}}>
      <DropdownMenu.Root onOpenChange={setOpen} open={open}>
        <DropdownMenu.Trigger className="pui-button" data-variant="primary" data-size="md">
          정렬: {selected ?? '선택 안 함'}
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          {(['이름순', '발매일순', '가격순'] as const).map((label) => (
            <DropdownMenu.Item key={label} onClick={() => setSelected(label)}>
              {label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Root>
      <span style={{color: 'var(--pokemon-disabled-foreground)', fontSize: '0.875rem'}}>
        open = {String(open)}
      </span>
    </div>
  );
}
