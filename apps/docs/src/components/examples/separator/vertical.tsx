import { Separator } from '@tcground/ui';

export default function VerticalExample() {
  return (
    <div
      style={{
        alignItems: 'center',
        display: 'flex',
        fontSize: '0.875rem',
        gap: '0.75rem',
        height: '2.5rem',
      }}
    >
      <span>홈</span>
      <Separator orientation='vertical' />
      <span>카테고리</span>
      <Separator orientation='vertical' />
      <span>인기</span>
    </div>
  );
}
