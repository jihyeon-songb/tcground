import { Label, RadioGroup, RadioGroupItem } from '@tcground/ui';
import { useState } from 'react';

export default function ControlledExample() {
  const [value, setValue] = useState('price-desc');

  return (
    <div style={{ display: 'grid', gap: '0.75rem', width: '16rem' }}>
      <RadioGroup
        value={value}
        onValueChange={setValue}
        style={{ display: 'grid', gap: '0.75rem' }}
      >
        <Label style={{ alignItems: 'center', display: 'flex', gap: '0.5rem' }}>
          <RadioGroupItem value='price-desc' /> 가격 높은순
        </Label>
        <Label style={{ alignItems: 'center', display: 'flex', gap: '0.5rem' }}>
          <RadioGroupItem value='price-asc' /> 가격 낮은순
        </Label>
      </RadioGroup>
      <span style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
        value = {value}
      </span>
    </div>
  );
}
