import { Tabs, TabsContent, TabsList, TabsTrigger } from '@tcground/ui';

export default function BasicExample() {
  return (
    <Tabs defaultValue='usage' style={{ display: 'grid', gap: '0.75rem', minWidth: '20rem' }}>
      <TabsList aria-label='문서 섹션'>
        <TabsTrigger value='usage'>사용법</TabsTrigger>
        <TabsTrigger value='props'>Props</TabsTrigger>
        <TabsTrigger value='a11y'>접근성</TabsTrigger>
      </TabsList>
      <TabsContent value='usage'>기본 사용법 안내가 들어가는 패널입니다.</TabsContent>
      <TabsContent value='props'>컴포넌트 props 표가 들어가는 패널입니다.</TabsContent>
      <TabsContent value='a11y'>접근성 가이드가 들어가는 패널입니다.</TabsContent>
    </Tabs>
  );
}
