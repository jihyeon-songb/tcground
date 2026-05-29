import {
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@tcground/ui';

export default function LeftExample() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant='outline'>모바일 메뉴</Button>
      </SheetTrigger>
      <SheetContent side='left'>
        <SheetHeader>
          <SheetTitle>탐색</SheetTitle>
          <SheetDescription>작은 화면에서 주요 페이지를 빠르게 이동합니다.</SheetDescription>
        </SheetHeader>
        <nav
          aria-label='문서 예시 메뉴'
          style={{ display: 'grid', gap: '0.25rem', padding: '0 1rem' }}
        >
          {['홈', '카테고리', '인기 카드', '관심 카드'].map((item) => (
            <a key={item} href='#' style={{ color: 'var(--foreground)', padding: '0.5rem 0' }}>
              {item}
            </a>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
