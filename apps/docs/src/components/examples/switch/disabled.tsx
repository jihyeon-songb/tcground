import { Switch } from '@tcground/ui';

export default function DisabledExample() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
      <Switch disabled aria-label='비활성 off' />
      <Switch defaultChecked disabled aria-label='비활성 on' />
    </div>
  );
}
