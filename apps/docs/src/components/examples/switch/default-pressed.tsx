import { Switch } from '@tcground/ui';

export default function DefaultPressedExample() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
      <Switch defaultChecked aria-label='굵게' />
      <Switch aria-label='기울임' />
      <Switch aria-label='밑줄' />
    </div>
  );
}
