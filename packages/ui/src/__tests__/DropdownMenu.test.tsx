import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DropdownMenu } from '../components/DropdownMenu';

describe('DropdownMenu', () => {
  afterEach(() => {
    cleanup();
  });

  it('opens from the trigger and closes after item activation', () => {
    const handleSelect = vi.fn();

    render(
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>Actions</DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onClick={handleSelect}>Edit</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Actions' }));

    const item = screen.getByRole('menuitem', { name: 'Edit' });
    expect(screen.getByRole('menu')).toBeTruthy();

    fireEvent.click(item);

    expect(handleSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('supports keyboard opening with ArrowDown', () => {
    render(
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>Actions</DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item>First</DropdownMenu.Item>
          <DropdownMenu.Item>Second</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>,
    );

    fireEvent.keyDown(screen.getByRole('button', { name: 'Actions' }), { key: 'ArrowDown' });

    expect(screen.getByRole('menu')).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'First' })).toBe(document.activeElement);
  });
});
