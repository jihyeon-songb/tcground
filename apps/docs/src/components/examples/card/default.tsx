import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@tcground/ui';

export default function DefaultExample() {
  return (
    <Card style={{ maxWidth: '24rem' }}>
      <CardHeader>
        <CardTitle>리자몽 ex 151 SAR</CardTitle>
        <CardDescription>한국판 / SV 강화확장팩</CardDescription>
      </CardHeader>
      <CardContent>
        <p style={{ color: 'var(--muted-foreground)', margin: 0 }}>
          최근 30일 평균 거래가가 12% 상승했습니다.
        </p>
      </CardContent>
      <CardFooter>
        <Button variant='outline'>상세보기</Button>
      </CardFooter>
    </Card>
  );
}
