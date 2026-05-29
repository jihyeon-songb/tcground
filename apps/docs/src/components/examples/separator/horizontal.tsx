import { Separator } from '@tcground/ui';

export default function HorizontalExample() {
  return (
    <div style={{ display: 'grid', gap: '0.75rem', maxWidth: '24rem' }}>
      <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>최근 본 카드</div>
      <Separator />
      <div style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>관심 카드 목록</div>
    </div>
  );
}
