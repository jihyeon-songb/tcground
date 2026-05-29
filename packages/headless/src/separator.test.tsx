import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Separator } from './separator';

describe('Separator', () => {
  afterEach(() => {
    cleanup();
  });

  it('is decorative (role none) and horizontal by default', () => {
    render(<Separator data-testid='sep' />);

    const separator = screen.getByTestId('sep');
    expect(separator.getAttribute('role')).toBe('none');
    expect(separator.getAttribute('data-slot')).toBe('separator');
    expect(separator.hasAttribute('data-horizontal')).toBe(true);
    expect(separator.hasAttribute('data-vertical')).toBe(false);
  });

  it('exposes separator semantics and orientation when not decorative', () => {
    render(<Separator decorative={false} orientation='vertical' />);

    const separator = screen.getByRole('separator');
    expect(separator.getAttribute('aria-orientation')).toBe('vertical');
    expect(separator.hasAttribute('data-vertical')).toBe(true);
  });

  it('omits aria-orientation for horizontal semantic separators', () => {
    render(<Separator decorative={false} />);

    const separator = screen.getByRole('separator');
    expect(separator.getAttribute('aria-orientation')).toBeNull();
  });
});
