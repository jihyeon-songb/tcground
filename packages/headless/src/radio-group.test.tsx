import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RadioGroup, RadioGroupIndicator, RadioGroupItem } from './radio-group';

function renderGroup(props?: ComponentProps<typeof RadioGroup>) {
  return render(
    <RadioGroup aria-label='언어판' {...props}>
      <RadioGroupItem value='kr'>
        <RadioGroupIndicator data-testid='kr-indicator' />
      </RadioGroupItem>
      <RadioGroupItem value='jp' />
      <RadioGroupItem value='en' />
    </RadioGroup>,
  );
}

describe('RadioGroup', () => {
  afterEach(() => {
    cleanup();
  });

  it('selects an item on click and exposes ARIA state', () => {
    const onValueChange = vi.fn();
    renderGroup({ onValueChange });

    const radios = screen.getAllByRole('radio');
    expect(screen.getByRole('radiogroup', { name: '언어판' })).toBeTruthy();
    expect(screen.queryByTestId('kr-indicator')).toBeNull();

    fireEvent.click(radios[0]);

    expect(onValueChange).toHaveBeenCalledWith('kr');
    expect(radios[0].getAttribute('aria-checked')).toBe('true');
    expect(radios[0].hasAttribute('data-checked')).toBe(true);
    expect(screen.getByTestId('kr-indicator')).toBeTruthy();
  });

  it('moves focus and selects with arrow keys', () => {
    const onValueChange = vi.fn();
    renderGroup({ defaultValue: 'kr', onValueChange });

    const radios = screen.getAllByRole('radio');
    radios[0].focus();
    fireEvent.keyDown(radios[0], { key: 'ArrowDown' });

    expect(document.activeElement).toBe(radios[1]);
    expect(onValueChange).toHaveBeenCalledWith('jp');

    fireEvent.keyDown(radios[1], { key: 'ArrowUp' });
    expect(document.activeElement).toBe(radios[0]);
  });

  it('keeps only the selected radio in the tab order', () => {
    renderGroup({ defaultValue: 'jp' });

    const radios = screen.getAllByRole('radio');
    expect(radios[0].getAttribute('tabindex')).toBe('-1');
    expect(radios[1].getAttribute('tabindex')).toBe('0');
    expect(radios[2].getAttribute('tabindex')).toBe('-1');
  });
});
