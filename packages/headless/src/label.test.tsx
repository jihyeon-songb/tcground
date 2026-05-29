import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Label } from './label';

describe('Label', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders a label element with the data-slot hook', () => {
    render(<Label htmlFor='email'>이메일</Label>);

    const label = screen.getByText('이메일');
    expect(label.tagName).toBe('LABEL');
    expect(label.getAttribute('data-slot')).toBe('label');
    expect(label.getAttribute('for')).toBe('email');
  });

  it('prevents text selection on double-click but not single click', () => {
    render(<Label>약관 동의</Label>);

    const label = screen.getByText('약관 동의');

    const singleClick = fireEvent.mouseDown(label, { detail: 1 });
    expect(singleClick).toBe(true); // not prevented

    const doubleClick = fireEvent.mouseDown(label, { detail: 2 });
    expect(doubleClick).toBe(false); // preventDefault called
  });
});
