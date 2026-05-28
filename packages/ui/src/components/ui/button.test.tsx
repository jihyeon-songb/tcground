import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { FormEvent } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button } from './button';

describe('Button', () => {
  afterEach(() => {
    cleanup();
  });

  it('uses type button by default inside forms', () => {
    const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
    });

    render(
      <form onSubmit={onSubmit}>
        <Button>기본 버튼</Button>
      </form>,
    );

    fireEvent.click(screen.getByRole('button', { name: '기본 버튼' }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits forms when type submit is explicit', () => {
    const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
    });

    render(
      <form onSubmit={onSubmit}>
        <Button type='submit'>제출 버튼</Button>
      </form>,
    );

    fireEvent.click(screen.getByRole('button', { name: '제출 버튼' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('exposes TCG size and variant data attributes', () => {
    render(<Button size='search'>검색</Button>);

    const button = screen.getByRole('button', { name: '검색' });

    expect(button.getAttribute('data-variant')).toBe('default');
    expect(button.getAttribute('data-size')).toBe('search');
  });
});
