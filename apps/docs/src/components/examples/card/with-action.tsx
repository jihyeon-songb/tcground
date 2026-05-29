import {
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@tcground/ui';

export default function WithActionExample() {
  return (
    <Card style={{ maxWidth: '24rem' }}>
      <CardHeader>
        <CardTitle>관심 카드</CardTitle>
        <CardDescription>최근 가격 변동을 한눈에 확인하세요.</CardDescription>
        <CardAction>
          <Button size='sm' variant='ghost'>
            관리
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p style={{ color: 'var(--muted-foreground)', margin: 0 }}>등록된 카드 12개</p>
      </CardContent>
    </Card>
  );
}
