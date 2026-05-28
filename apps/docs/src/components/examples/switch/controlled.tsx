import { Switch } from '@tcground/ui';
import { useState } from 'react';

export default function ControlledExample() {
  const [checked, setChecked] = useState(false);

  return (
    <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'column', gap: '0.5rem' }}>
      <Switch checked={checked} onCheckedChange={setChecked} aria-label='알림' />
      <span style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
        checked = {String(checked)}
      </span>
    </div>
  );
}
