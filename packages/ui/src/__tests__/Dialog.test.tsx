import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Dialog } from '../components/Dialog';

describe('Dialog', () => {
  afterEach(() => {
    cleanup();
    document.body.style.overflow = '';
  });

  it('opens with dialog semantics and closes with Escape', async () => {
    const handleOpenChange = vi.fn();

    render(
      <Dialog.Root onOpenChange={handleOpenChange}>
        <Dialog.Trigger>Open dialog</Dialog.Trigger>
        <Dialog.Overlay />
        <Dialog.Content>
          <Dialog.Title>Card detail</Dialog.Title>
          <Dialog.Description>Choose a card action.</Dialog.Description>
          <button type='button'>Focusable action</button>
        </Dialog.Content>
      </Dialog.Root>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open dialog' }));

    const dialog = screen.getByRole('dialog', { name: 'Card detail' });

    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-describedby')).toBeTruthy();
    expect(document.body.style.overflow).toBe('hidden');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Focusable action' })).toBe(document.activeElement);
    });

    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(handleOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('traps tab focus inside the content', async () => {
    render(
      <Dialog.Root defaultOpen>
        <Dialog.Trigger>Open</Dialog.Trigger>
        <Dialog.Content>
          <Dialog.Title>Actions</Dialog.Title>
          <Dialog.Description>Two focusable buttons.</Dialog.Description>
          <button type='button'>First</button>
          <button type='button'>Second</button>
        </Dialog.Content>
      </Dialog.Root>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Actions' });
    const first = screen.getByRole('button', { name: 'First' });
    const second = screen.getByRole('button', { name: 'Second' });

    await waitFor(() => {
      expect(first).toBe(document.activeElement);
    });

    second.focus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(first).toBe(document.activeElement);
  });
});
