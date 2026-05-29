import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Switch, SwitchThumb } from './switch';

describe('Switch', () => {
  afterEach(() => {
    cleanup();
  });

  it('has role switch and toggles uncontrolled state', () => {
    const onCheckedChange = vi.fn();

    render(
      <Switch aria-label='알림' onCheckedChange={onCheckedChange}>
        <SwitchThumb data-testid='thumb' />
      </Switch>,
    );

    const toggle = screen.getByRole('switch', { name: '알림' });
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    expect(toggle.hasAttribute('data-unchecked')).toBe(true);

    fireEvent.click(toggle);

    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    expect(toggle.hasAttribute('data-checked')).toBe(true);
    expect(screen.getByTestId('thumb').hasAttribute('data-checked')).toBe(true);
  });

  it('reflects disabled semantics', () => {
    render(<Switch aria-label='비활성' disabled />);

    const toggle = screen.getByRole('switch', { name: '비활성' });
    expect(toggle.hasAttribute('disabled')).toBe(true);
    expect(toggle.hasAttribute('data-disabled')).toBe(true);
  });
});
