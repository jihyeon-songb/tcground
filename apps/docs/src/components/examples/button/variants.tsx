import {Button} from '@tcground/headless-ui';

export default function VariantsExample() {
  return (
    <div style={{display: 'flex', flexWrap: 'wrap', gap: '0.75rem'}}>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
    </div>
  );
}
