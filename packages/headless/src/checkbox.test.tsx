import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { FormEvent } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Checkbox, CheckboxIndicator } from './checkbox';

describe('Checkbox', () => {
  afterEach(() => {
    cleanup();
  });

  it('toggles uncontrolled state and exposes ARIA + data hooks', () => {
    const onCheckedChange = vi.fn();

    render(
      <Checkbox aria-label='동의' onCheckedChange={onCheckedChange}>
        <CheckboxIndicator>✓</CheckboxIndicator>
      </Checkbox>,
    );

    const checkbox = screen.getByRole('checkbox', { name: '동의' });
    expect(checkbox.getAttribute('aria-checked')).toBe('false');
    expect(checkbox.hasAttribute('data-unchecked')).toBe(true);
    expect(screen.queryByText('✓')).toBeNull();

    fireEvent.click(checkbox);

    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(checkbox.getAttribute('aria-checked')).toBe('true');
    expect(checkbox.hasAttribute('data-checked')).toBe(true);
    expect(screen.getByText('✓')).toBeTruthy();
  });

  it('renders aria-checked mixed for indeterminate state', () => {
    render(<Checkbox aria-label='부분 선택' checked='indeterminate' />);

    const checkbox = screen.getByRole('checkbox', { name: '부분 선택' });
    expect(checkbox.getAttribute('aria-checked')).toBe('mixed');
    expect(checkbox.hasAttribute('data-indeterminate')).toBe(true);
  });

  it('does not toggle a controlled checkbox internally', () => {
    const onCheckedChange = vi.fn();

    render(<Checkbox aria-label='제어' checked={false} onCheckedChange={onCheckedChange} />);

    const checkbox = screen.getByRole('checkbox', { name: '제어' });
    fireEvent.click(checkbox);

    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(checkbox.getAttribute('aria-checked')).toBe('false');
  });

  it('does not submit a form on Enter', () => {
    const onSubmit = vi.fn((event: FormEvent) => event.preventDefault());

    render(
      <form onSubmit={onSubmit}>
        <Checkbox aria-label='약관' />
      </form>,
    );

    fireEvent.keyDown(screen.getByRole('checkbox', { name: '약관' }), { key: 'Enter' });
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
