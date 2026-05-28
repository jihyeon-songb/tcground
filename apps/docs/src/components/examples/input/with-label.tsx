import { Input, Label } from '@tcground/ui';

export default function WithLabelExample() {
  return (
    <div style={{ display: 'grid', gap: '0.5rem', width: 'min(100%, 20rem)' }}>
      <Label htmlFor='card-name'>카드 이름</Label>
      <Input id='card-name' placeholder='Charizard ex' />
    </div>
  );
}
