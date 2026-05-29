import { Alert, AlertDescription, AlertTitle } from '@tcground/ui';
import { InfoIcon } from 'lucide-react';

export default function DefaultExample() {
  return (
    <Alert style={{ maxWidth: '28rem' }}>
      <InfoIcon aria-hidden='true' />
      <AlertTitle>새 카드가 등록되었습니다.</AlertTitle>
      <AlertDescription>최근 추가된 한국판 포켓몬 카드를 확인해 보세요.</AlertDescription>
    </Alert>
  );
}
