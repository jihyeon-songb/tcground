import { Textarea } from '@tcground/ui';

export default function DisabledExample() {
  return (
    <div style={{ width: 'min(100%, 22rem)' }}>
      <Textarea disabled defaultValue='읽기 전용 메모입니다.' />
    </div>
  );
}
