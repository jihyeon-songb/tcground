import {
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@tcground/ui';

export default function BottomExample() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant='secondary'>정렬 옵션</Button>
      </SheetTrigger>
      <SheetContent side='bottom' showCloseButton={false}>
        <SheetHeader>
          <SheetTitle>정렬</SheetTitle>
          <SheetDescription>모바일 하단 시트로 짧은 선택지를 제공합니다.</SheetDescription>
        </SheetHeader>
        <SheetFooter>
          <Button variant='outline'>가격 낮은순</Button>
          <Button>최근 거래순</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
