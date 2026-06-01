import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@tcground/ui';

export default function AccessibleDialogExample() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>관심 카드에서 삭제</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle style={{ margin: '0 0 0.5rem' }}>관심 카드에서 삭제할까요?</DialogTitle>
        <DialogDescription style={{ margin: '0 0 1.25rem' }}>
          이 카드를 관심 목록에서 제거합니다. 언제든 다시 추가할 수 있습니다.
        </DialogDescription>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <DialogClose asChild>
            <Button variant='ghost'>취소</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button>삭제</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
