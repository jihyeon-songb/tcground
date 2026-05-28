import { Tabs, TabsContent, TabsList, TabsTrigger } from '@tcground/ui';
import { useState } from 'react';

export default function ControlledExample() {
  const [value, setValue] = useState('overview');

  return (
    <div style={{ display: 'grid', gap: '0.5rem', minWidth: '20rem' }}>
      <span style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
        현재 탭: <code>{value}</code>
      </span>
      <Tabs onValueChange={setValue} value={value} defaultValue='overview'>
        <TabsList aria-label='섹션'>
          <TabsTrigger value='overview'>개요</TabsTrigger>
          <TabsTrigger value='details'>상세</TabsTrigger>
          <TabsTrigger value='history'>이력</TabsTrigger>
        </TabsList>
        <TabsContent value='overview'>overview 패널</TabsContent>
        <TabsContent value='details'>details 패널</TabsContent>
        <TabsContent value='history'>history 패널</TabsContent>
      </Tabs>
    </div>
  );
}
