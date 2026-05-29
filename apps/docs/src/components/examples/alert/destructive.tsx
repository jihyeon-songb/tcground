import { Alert, AlertDescription, AlertTitle } from '@tcground/ui';
import { CircleAlertIcon } from 'lucide-react';

export default function DestructiveExample() {
  return (
    <Alert variant='destructive' style={{ maxWidth: '28rem' }}>
      <CircleAlertIcon aria-hidden='true' />
      <AlertTitle>요청을 처리할 수 없습니다.</AlertTitle>
      <AlertDescription>네트워크 상태를 확인한 뒤 다시 시도해 주세요.</AlertDescription>
    </Alert>
  );
}
