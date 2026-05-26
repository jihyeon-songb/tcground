import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Toggle } from '../components/Toggle';

describe('Toggle', () => {
  afterEach(() => {
    cleanup();
  });

  it('announces pressed state and supports controlled change callbacks', () => {
    const handlePressedChange = vi.fn();

    render(<Toggle onPressedChange={handlePressedChange}>Bold</Toggle>);

    const toggle = screen.getByRole('button', { name: 'Bold' });
    expect(toggle.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(toggle);

    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(handlePressedChange).toHaveBeenCalledWith(true);
  });
});
