import {Toggle} from '@tcground/headless-ui';
import {useState} from 'react';

export default function ControlledExample() {
  const [pressed, setPressed] = useState(false);

  return (
    <div style={{display: 'flex', alignItems: 'center', flexDirection: 'column', gap: '0.5rem'}}>
      <Toggle onPressedChange={setPressed} pressed={pressed}>
        알림
      </Toggle>
      <span style={{color: 'var(--pokemon-disabled-foreground)', fontSize: '0.875rem'}}>
        pressed = {String(pressed)}
      </span>
    </div>
  );
}
