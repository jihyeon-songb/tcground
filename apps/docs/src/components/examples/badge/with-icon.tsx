import { Badge } from '@tcground/ui';
import { CheckIcon } from 'lucide-react';

export default function WithIconExample() {
  return (
    <Badge variant='secondary'>
      <CheckIcon aria-hidden='true' />
      검증 완료
    </Badge>
  );
}
