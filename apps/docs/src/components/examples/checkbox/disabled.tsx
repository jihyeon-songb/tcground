import { Checkbox, Label } from '@tcground/ui';

export default function DisabledExample() {
  return (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      <Label style={{ alignItems: 'center', display: 'flex', gap: '0.5rem' }}>
        <Checkbox disabled /> 비활성 off
      </Label>
      <Label style={{ alignItems: 'center', display: 'flex', gap: '0.5rem' }}>
        <Checkbox defaultChecked disabled /> 비활성 on
      </Label>
    </div>
  );
}
