import { Skeleton } from '@tcground/ui';

export default function BlockExample() {
  return (
    <div style={{ display: 'grid', gap: '0.75rem', maxWidth: '24rem', width: '100%' }}>
      <Skeleton style={{ height: '8rem', width: '100%' }} />
      <Skeleton style={{ height: '1rem', width: '75%' }} />
      <Skeleton style={{ height: '1rem', width: '50%' }} />
    </div>
  );
}
