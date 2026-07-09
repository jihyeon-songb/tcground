import { SegmentedControl, SegmentedControlItem } from '@tcground/ui';

export default function AccessibleSegmentedControlExample() {
  return (
    <SegmentedControl defaultValue='6m' aria-label='차트 기간'>
      <SegmentedControlItem value='3m'>3개월</SegmentedControlItem>
      <SegmentedControlItem value='6m'>6개월</SegmentedControlItem>
      <SegmentedControlItem value='1y'>1년</SegmentedControlItem>
    </SegmentedControl>
  );
}
