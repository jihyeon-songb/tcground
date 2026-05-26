import {Button} from '@tcground/headless-ui';

export default function DisabledExample() {
  return (
    <div style={{display: 'flex', flexWrap: 'wrap', gap: '0.75rem'}}>
      <Button disabled>Primary</Button>
      <Button disabled variant="secondary">
        Secondary
      </Button>
      <Button disabled variant="ghost">
        Ghost
      </Button>
    </div>
  );
}
