import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@tcground/ui';

export default function BasicExample() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>다이얼로그 열기</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle style={{ margin: '0 0 0.5rem' }}>관심 카드에 추가</DialogTitle>
        <DialogDescription style={{ margin: '0 0 1.25rem' }}>
          선택한 카드를 관심 목록에 저장합니다. 언제든 다시 해제할 수 있습니다.
        </DialogDescription>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <DialogClose asChild>
            <Button variant='ghost'>취소</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button>저장</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
