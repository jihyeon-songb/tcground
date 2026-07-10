import { SegmentedControl, SegmentedControlItem } from '@tcground/ui';

export default function DisabledExample() {
  return (
    <SegmentedControl defaultValue='3m' aria-label='차트 기간'>
      <SegmentedControlItem value='3m'>3개월</SegmentedControlItem>
      <SegmentedControlItem value='6m' disabled>
        6개월
      </SegmentedControlItem>
      <SegmentedControlItem value='1y'>1년</SegmentedControlItem>
    </SegmentedControl>
  );
}
