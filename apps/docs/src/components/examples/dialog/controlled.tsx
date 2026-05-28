import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@tcground/ui';
import { useState } from 'react';

export default function ControlledExample() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      <Button onClick={() => setOpen(true)}>외부 트리거로 열기</Button>
      <span style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
        open = {String(open)}
      </span>
      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent>
          <DialogTitle style={{ margin: '0 0 0.5rem' }}>제어된 다이얼로그</DialogTitle>
          <DialogDescription style={{ margin: '0 0 1.25rem' }}>
            상위 컴포넌트가 open 상태를 직접 관리합니다.
          </DialogDescription>
          <DialogClose asChild>
            <Button>닫기</Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </div>
  );
}
