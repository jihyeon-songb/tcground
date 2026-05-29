import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
} from '@tcground/ui';

export default function ControlledExample() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ display: 'grid', gap: '0.75rem', justifyItems: 'center' }}>
      <Button variant='outline' onClick={() => setOpen(true)}>
        외부 버튼으로 열기
      </Button>
      <span style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
        open = {String(open)}
      </span>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>제어된 Alert Dialog</AlertDialogTitle>
            <AlertDialogDescription>
              상위 컴포넌트가 확인 창의 open 상태를 직접 관리합니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction>확인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
