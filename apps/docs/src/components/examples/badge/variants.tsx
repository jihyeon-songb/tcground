import { Badge } from '@tcground/ui';

export default function VariantsExample() {
  return (
    <div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
      <Badge>Default</Badge>
      <Badge variant='secondary'>Secondary</Badge>
      <Badge variant='destructive'>Destructive</Badge>
      <Badge variant='outline'>Outline</Badge>
      <Badge variant='ghost'>Ghost</Badge>
      <Badge variant='link'>Link</Badge>
    </div>
  );
}
