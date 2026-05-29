import { Badge } from '@tcground/ui';

export default function AsChildExample() {
  return (
    <Badge asChild variant='link'>
      <a href='/docs/components/button'>Button 문서 보기</a>
    </Badge>
  );
}
