import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
} from './alert-dialog';

function renderAlert() {
  return render(
    <AlertDialog defaultOpen>
      <AlertDialogPortal>
        <AlertDialogOverlay data-testid='overlay' />
        <AlertDialogContent>
          <AlertDialogTitle>삭제할까요?</AlertDialogTitle>
          <AlertDialogDescription>되돌릴 수 없습니다.</AlertDialogDescription>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction>삭제</AlertDialogAction>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialog>,
  );
}

describe('AlertDialog', () => {
  afterEach(() => {
    cleanup();
  });

  it('uses the alertdialog role', async () => {
    renderAlert();
    expect(await screen.findByRole('alertdialog')).toBeTruthy();
  });

  it('does not dismiss when the overlay is clicked', async () => {
    renderAlert();
    await screen.findByRole('alertdialog');

    const overlay = screen.getByTestId('overlay');
    fireEvent.mouseDown(overlay);

    expect(screen.queryByRole('alertdialog')).toBeTruthy();
  });

  it('closes on Escape and from the cancel/action buttons', async () => {
    renderAlert();
    const dialog = await screen.findByRole('alertdialog');

    fireEvent.keyDown(dialog, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
  });

  it('closes when the action button is pressed', async () => {
    renderAlert();
    await screen.findByRole('alertdialog');

    fireEvent.click(screen.getByRole('button', { name: '삭제' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
  });
});
