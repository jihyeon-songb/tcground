import { Input, Label } from '@tcground/ui';

export default function InvalidExample() {
  return (
    <div style={{ display: 'grid', gap: '0.5rem', width: 'min(100%, 20rem)' }}>
      <Label htmlFor='email-invalid'>이메일</Label>
      <Input id='email-invalid' type='email' defaultValue='invalid' aria-invalid />
      <p style={{ color: 'var(--destructive)', fontSize: '0.8125rem', margin: 0 }}>
        올바른 이메일 형식으로 입력하세요.
      </p>
    </div>
  );
}
