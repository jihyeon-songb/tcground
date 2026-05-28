import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@tcground/ui';
import { useState } from 'react';

export default function ControlledExample() {
  const [value, setValue] = useState('recent');

  return (
    <div style={{ display: 'grid', gap: '0.75rem', justifyItems: 'center' }}>
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger style={{ width: '12rem' }}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='recent'>최신순</SelectItem>
          <SelectItem value='price-asc'>가격 낮은순</SelectItem>
          <SelectItem value='price-desc'>가격 높은순</SelectItem>
        </SelectContent>
      </Select>
      <span style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
        value = {value}
      </span>
    </div>
  );
}
