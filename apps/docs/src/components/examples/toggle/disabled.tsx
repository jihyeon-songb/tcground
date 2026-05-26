import {Toggle} from '@tcground/headless-ui';

export default function DisabledExample() {
  return (
    <div style={{display: 'flex', flexWrap: 'wrap', gap: '0.5rem'}}>
      <Toggle disabled>비활성 (off)</Toggle>
      <Toggle defaultPressed disabled>
        비활성 (on)
      </Toggle>
    </div>
  );
}
