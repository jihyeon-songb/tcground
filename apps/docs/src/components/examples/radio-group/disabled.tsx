import { Label, RadioGroup, RadioGroupItem } from '@tcground/ui';

export default function DisabledExample() {
  return (
    <RadioGroup
      defaultValue='a'
      disabled
      style={{ display: 'grid', gap: '0.75rem', width: '16rem' }}
    >
      <Label style={{ alignItems: 'center', display: 'flex', gap: '0.5rem' }}>
        <RadioGroupItem value='a' /> 옵션 A
      </Label>
      <Label style={{ alignItems: 'center', display: 'flex', gap: '0.5rem' }}>
        <RadioGroupItem value='b' /> 옵션 B
      </Label>
    </RadioGroup>
  );
}
