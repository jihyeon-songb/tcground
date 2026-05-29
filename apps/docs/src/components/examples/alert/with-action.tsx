import { Alert, AlertAction, AlertDescription, AlertTitle, Button } from '@tcground/ui';
import { InfoIcon } from 'lucide-react';

export default function WithActionExample() {
  return (
    <Alert style={{ maxWidth: '28rem' }}>
      <InfoIcon aria-hidden='true' />
      <AlertTitle>가격 알림이 도착했습니다.</AlertTitle>
      <AlertDescription>리자몽 ex 151 SAR 시세가 5% 하락했습니다.</AlertDescription>
      <AlertAction>
        <Button size='xs' variant='outline'>
          보기
        </Button>
      </AlertAction>
    </Alert>
  );
}
