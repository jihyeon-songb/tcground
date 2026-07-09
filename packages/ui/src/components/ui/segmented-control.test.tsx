import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SegmentedControl, SegmentedControlItem } from './segmented-control';

describe('SegmentedControl', () => {
  afterEach(() => {
    cleanup();
  });

  function renderControl(onValueChange = vi.fn()) {
    render(
      <SegmentedControl defaultValue='3m' aria-label='차트 기간' onValueChange={onValueChange}>
        <SegmentedControlItem value='3m'>3개월</SegmentedControlItem>
        <SegmentedControlItem value='6m'>6개월</SegmentedControlItem>
        <SegmentedControlItem value='1y'>1년</SegmentedControlItem>
      </SegmentedControl>,
    );
    return onValueChange;
  }

  it('exposes a radiogroup with the checked item reflected via aria-checked', () => {
    renderControl();

    expect(screen.getByRole('radiogroup', { name: '차트 기간' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: '3개월' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: '6개월' }).getAttribute('aria-checked')).toBe('false');
  });

  it('moves selection with the ArrowRight key', () => {
    const onValueChange = renderControl();
    const first = screen.getByRole('radio', { name: '3개월' });
    first.focus();

    fireEvent.keyDown(first, { key: 'ArrowRight' });

    expect(onValueChange).toHaveBeenCalledWith('6m');
    expect(screen.getByRole('radio', { name: '6개월' }).getAttribute('aria-checked')).toBe('true');
  });

  it('selects on click', () => {
    const onValueChange = renderControl();

    fireEvent.click(screen.getByRole('radio', { name: '1년' }));

    expect(onValueChange).toHaveBeenCalledWith('1y');
  });
});
