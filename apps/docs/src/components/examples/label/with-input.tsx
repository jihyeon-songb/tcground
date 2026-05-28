import { Input, Label } from '@tcground/ui';

export default function WithInputExample() {
  return (
    <div style={{ display: 'grid', gap: '0.5rem', width: 'min(100%, 20rem)' }}>
      <Label htmlFor='label-email'>이메일</Label>
      <Input id='label-email' type='email' placeholder='you@example.com' />
    </div>
  );
}
