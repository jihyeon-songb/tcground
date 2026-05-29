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

export default function RightExample() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant='outline'>필터 열기</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>필터</SheetTitle>
          <SheetDescription>가격대, 세트, 상태로 검색 결과를 좁혀보세요.</SheetDescription>
        </SheetHeader>
        <div style={{ display: 'grid', gap: '0.75rem', padding: '0 1rem' }}>
          <span>카테고리: 포켓몬</span>
          <span>상태: Near Mint</span>
          <span>기간: 최근 30일</span>
        </div>
        <SheetFooter>
          <Button>적용</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
