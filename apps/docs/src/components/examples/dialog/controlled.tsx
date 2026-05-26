import {Button, Dialog} from '@tcground/headless-ui';
import {useState} from 'react';

export default function ControlledExample() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem'}}>
      <Button onClick={() => setOpen(true)}>외부 트리거로 열기</Button>
      <span style={{color: 'var(--pokemon-disabled-foreground)', fontSize: '0.875rem'}}>
        open = {String(open)}
      </span>
      <Dialog.Root onOpenChange={setOpen} open={open}>
        <Dialog.Overlay />
        <Dialog.Content>
          <Dialog.Title style={{margin: '0 0 0.5rem'}}>제어된 다이얼로그</Dialog.Title>
          <Dialog.Description style={{margin: '0 0 1.25rem'}}>
            상위 컴포넌트가 open 상태를 직접 관리합니다.
          </Dialog.Description>
          <Dialog.Close asChild>
            <Button>닫기</Button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Root>
    </div>
  );
}
