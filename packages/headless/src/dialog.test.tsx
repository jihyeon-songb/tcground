import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from './dialog';

describe('Dialog', () => {
  afterEach(() => {
    cleanup();
  });

  it('opens with connected dialog semantics and restores focus on escape', async () => {
    render(
      <Dialog>
        <DialogTrigger>열기</DialogTrigger>
        <DialogPortal>
          <DialogContent>
            <DialogTitle>관심 카드</DialogTitle>
            <DialogDescription>관심 목록에 저장합니다.</DialogDescription>
            <input aria-label='메모' />
          </DialogContent>
        </DialogPortal>
      </Dialog>,
    );

    const trigger = screen.getByRole('button', { name: '열기' });
    fireEvent.click(trigger);

    const dialog = await screen.findByRole('dialog');
    const title = screen.getByText('관심 카드');
    const description = screen.getByText('관심 목록에 저장합니다.');

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe(title.id);
    expect(dialog.getAttribute('aria-describedby')).toBe(description.id);

    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('메모')));

    fireEvent.keyDown(dialog, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it('traps tab focus inside the dialog content', async () => {
    render(
      <Dialog defaultOpen>
        <DialogTrigger>열기</DialogTrigger>
        <DialogPortal>
          <DialogContent>
            <DialogTitle>작업 선택</DialogTitle>
            <DialogDescription>원하는 작업을 선택합니다.</DialogDescription>
            <button type='button'>첫 번째</button>
            <button type='button'>두 번째</button>
          </DialogContent>
        </DialogPortal>
      </Dialog>,
    );

    const dialog = await screen.findByRole('dialog');
    const firstButton = screen.getByRole('button', { name: '첫 번째' });
    const secondButton = screen.getByRole('button', { name: '두 번째' });

    secondButton.focus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(document.activeElement).toBe(firstButton);

    firstButton.focus();
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(secondButton);
  });

  it('closes from DialogClose', async () => {
    render(
      <Dialog defaultOpen>
        <DialogPortal>
          <DialogContent>
            <DialogTitle>닫기 테스트</DialogTitle>
            <DialogDescription>닫기 버튼을 누릅니다.</DialogDescription>
            <DialogClose>확인</DialogClose>
          </DialogContent>
        </DialogPortal>
      </Dialog>,
    );

    fireEvent.click(await screen.findByRole('button', { name: '확인' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
