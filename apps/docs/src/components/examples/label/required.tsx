import { Input, Label } from '@tcground/ui';

export default function RequiredExample() {
  return (
    <div style={{ display: 'grid', gap: '0.5rem', width: 'min(100%, 20rem)' }}>
      <Label htmlFor='required-name'>
        카드 이름 <span aria-hidden='true'>*</span>
      </Label>
      <Input id='required-name' required placeholder='필수 입력' />
    </div>
  );
}
