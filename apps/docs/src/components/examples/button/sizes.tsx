import { Button } from '@tcground/ui';

export default function SizesExample() {
  return (
    <div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
      <Button size='sm'>Small</Button>
      <Button>Default</Button>
      <Button size='lg'>Large</Button>
      <Button size='search'>검색</Button>
      <Button size='auth' style={{ maxWidth: '12rem' }}>
        로그인
      </Button>
      <Button size='cta'>관심 카드 추가</Button>
      <Button size='tab' variant='outline'>
        90일
      </Button>
    </div>
  );
}
