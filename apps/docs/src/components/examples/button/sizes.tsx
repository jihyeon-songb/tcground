import {Button} from '@tcground/headless-ui';

export default function SizesExample() {
  return (
    <div style={{alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: '0.75rem'}}>
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  );
}
