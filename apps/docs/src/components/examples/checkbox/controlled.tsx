import { Checkbox } from '@tcground/ui';
import { useState } from 'react';

export default function ControlledExample() {
  const [checked, setChecked] = useState(false);

  return (
    <div style={{ display: 'grid', gap: '0.75rem', justifyItems: 'center' }}>
      <Checkbox checked={checked} onCheckedChange={(value) => setChecked(value === true)} />
      <span style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
        checked = {String(checked)}
      </span>
    </div>
  );
}
