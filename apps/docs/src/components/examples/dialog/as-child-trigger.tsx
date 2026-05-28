import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@tcground/ui';

export default function AsChildTriggerExample() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant='secondary'>Button 컴포넌트로 트리거</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle style={{ margin: '0 0 0.5rem' }}>asChild 트리거</DialogTitle>
        <DialogDescription style={{ margin: '0 0 1.25rem' }}>
          Dialog.Trigger 가 자식 요소에 aria 와 onClick 을 머지합니다.
        </DialogDescription>
        <DialogClose asChild>
          <Button>확인</Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
