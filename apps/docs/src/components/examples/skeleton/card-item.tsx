import { Skeleton } from '@tcground/ui';

export default function CardItemExample() {
  return (
    <div
      style={{
        alignItems: 'center',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        display: 'flex',
        gap: '1rem',
        maxWidth: '24rem',
        padding: '1rem',
      }}
    >
      <Skeleton style={{ borderRadius: '9999px', height: '3rem', width: '3rem' }} />
      <div style={{ display: 'grid', flex: 1, gap: '0.5rem' }}>
        <Skeleton style={{ height: '1rem', width: '66%' }} />
        <Skeleton style={{ height: '0.75rem', width: '33%' }} />
      </div>
    </div>
  );
}
