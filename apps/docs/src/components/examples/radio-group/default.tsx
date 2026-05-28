import { Label, RadioGroup, RadioGroupItem } from '@tcground/ui';

export default function DefaultExample() {
  return (
    <RadioGroup defaultValue='kr' style={{ display: 'grid', gap: '0.75rem', width: '16rem' }}>
      <Label style={{ alignItems: 'center', display: 'flex', gap: '0.5rem' }}>
        <RadioGroupItem value='kr' /> 한국판
      </Label>
      <Label style={{ alignItems: 'center', display: 'flex', gap: '0.5rem' }}>
        <RadioGroupItem value='jp' /> 일본판
      </Label>
      <Label style={{ alignItems: 'center', display: 'flex', gap: '0.5rem' }}>
        <RadioGroupItem value='en' /> 영문판
      </Label>
    </RadioGroup>
  );
}
