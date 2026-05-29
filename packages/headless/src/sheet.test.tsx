import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
} from './sheet';

describe('Sheet', () => {
  afterEach(() => {
    cleanup();
  });

  it('opens from the trigger with dialog semantics', async () => {
    render(
      <Sheet>
        <SheetTrigger>열기</SheetTrigger>
        <SheetPortal>
          <SheetContent>
            <SheetTitle>필터</SheetTitle>
            <SheetDescription>옵션을 선택합니다.</SheetDescription>
            <SheetClose>닫기</SheetClose>
          </SheetContent>
        </SheetPortal>
      </Sheet>,
    );

    fireEvent.click(screen.getByRole('button', { name: '열기' }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog.getAttribute('aria-labelledby')).toBe(screen.getByText('필터').id);
  });

  it('dismisses when the overlay is clicked', async () => {
    render(
      <Sheet defaultOpen>
        <SheetPortal>
          <SheetOverlay data-testid='overlay' />
          <SheetContent>
            <SheetTitle>필터</SheetTitle>
            <SheetDescription>옵션을 선택합니다.</SheetDescription>
          </SheetContent>
        </SheetPortal>
      </Sheet>,
    );

    await screen.findByRole('dialog');
    fireEvent.mouseDown(screen.getByTestId('overlay'));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
