import { Label, Textarea } from '@tcground/ui';

export default function WithLabelExample() {
  return (
    <div style={{ display: 'grid', gap: '0.5rem', width: 'min(100%, 22rem)' }}>
      <Label htmlFor='card-note'>카드 메모</Label>
      <Textarea id='card-note' placeholder='매입가, 상태, 보관 위치를 기록하세요' />
    </div>
  );
}
