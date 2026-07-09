import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { SegmentedControl, SegmentedControlItem } from './segmented-control';

const meta = {
  title: 'UI/SegmentedControl',
  component: SegmentedControl,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof SegmentedControl>;

export default meta;
type Story = StoryObj<typeof meta>;

const periods = (
  <>
    <SegmentedControlItem value='3m'>3개월</SegmentedControlItem>
    <SegmentedControlItem value='6m'>6개월</SegmentedControlItem>
    <SegmentedControlItem value='1y'>1년</SegmentedControlItem>
    <SegmentedControlItem value='all'>전체</SegmentedControlItem>
  </>
);

export const Default: Story = {
  render: () => (
    <SegmentedControl defaultValue='6m' aria-label='차트 기간'>
      {periods}
    </SegmentedControl>
  ),
};

export const DisabledItem: Story = {
  render: () => (
    <SegmentedControl defaultValue='3m' aria-label='차트 기간'>
      <SegmentedControlItem value='3m'>3개월</SegmentedControlItem>
      <SegmentedControlItem value='6m' disabled>
        6개월
      </SegmentedControlItem>
      <SegmentedControlItem value='1y'>1년</SegmentedControlItem>
    </SegmentedControl>
  ),
};
