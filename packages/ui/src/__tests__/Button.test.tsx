import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Button } from '../components/Button';

describe('Button', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders an accessible native button by default', () => {
    render(<Button>Catch Pokemon</Button>);

    const button = screen.getByRole('button', { name: 'Catch Pokemon' });

    expect(button.getAttribute('type')).toBe('button');
    expect(button.getAttribute('data-variant')).toBe('primary');
  });

  it('supports asChild without firing disabled actions', () => {
    const handleClick = vi.fn();

    render(
      <Button asChild disabled onClick={handleClick}>
        <a href='/docs'>Docs</a>
      </Button>,
    );

    const link = screen.getByRole('link', { name: 'Docs' });
    fireEvent.click(link);

    expect(link.getAttribute('aria-disabled')).toBe('true');
    expect(link.getAttribute('tabindex')).toBe('-1');
    expect(handleClick).not.toHaveBeenCalled();
  });
});
