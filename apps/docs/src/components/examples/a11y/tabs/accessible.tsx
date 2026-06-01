import { Tabs, TabsContent, TabsList, TabsTrigger } from '@tcground/ui';

export default function AccessibleTabsExample() {
  return (
    <Tabs defaultValue='price' style={{ display: 'grid', gap: '0.75rem', minWidth: '20rem' }}>
      <TabsList aria-label='카드 정보 섹션'>
        <TabsTrigger value='price'>시세</TabsTrigger>
        <TabsTrigger value='detail'>상세</TabsTrigger>
        <TabsTrigger value='history'>거래 이력</TabsTrigger>
      </TabsList>
      <TabsContent value='price'>최근 평균 거래가와 변동 추이가 표시됩니다.</TabsContent>
      <TabsContent value='detail'>세트, 레어도, 카드 번호 정보가 표시됩니다.</TabsContent>
      <TabsContent value='history'>최근 체결된 거래 내역이 표시됩니다.</TabsContent>
    </Tabs>
  );
}
