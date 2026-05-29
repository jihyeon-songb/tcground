import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@tcground/ui';

export default function SmallExample() {
  return (
    <Card size='sm' style={{ maxWidth: '20rem' }}>
      <CardHeader>
        <CardTitle>Small Card</CardTitle>
        <CardDescription>컴팩트 배치에 적합한 사이즈입니다.</CardDescription>
      </CardHeader>
      <CardContent>본문 영역</CardContent>
    </Card>
  );
}
