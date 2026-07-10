import { SegmentedControl, SegmentedControlItem } from '@tcground/ui';
import { useState } from 'react';

export default function ControlledExample() {
  const [value, setValue] = useState('6m');

  return (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      <SegmentedControl value={value} onValueChange={setValue} aria-label='차트 기간'>
        <SegmentedControlItem value='3m'>3개월</SegmentedControlItem>
        <SegmentedControlItem value='6m'>6개월</SegmentedControlItem>
        <SegmentedControlItem value='1y'>1년</SegmentedControlItem>
      </SegmentedControl>
      <span style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
        value = {value}
      </span>
    </div>
  );
}
