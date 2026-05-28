import { Textarea } from '@tcground/ui';

export default function DefaultExample() {
  return (
    <div style={{ width: 'min(100%, 22rem)' }}>
      <Textarea placeholder='보유 카드 상태나 메모를 입력하세요' />
    </div>
  );
}
