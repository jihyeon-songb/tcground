import { Checkbox, Label } from '@tcground/ui';

export default function WithLabelExample() {
  return (
    <Label style={{ alignItems: 'center', display: 'flex', gap: '0.5rem' }}>
      <Checkbox defaultChecked /> 가격 알림 받기
    </Label>
  );
}
