import {Tabs} from '@tcground/headless-ui';
import {useState} from 'react';

export default function ControlledExample() {
  const [value, setValue] = useState('overview');

  return (
    <div style={{display: 'grid', gap: '0.5rem', minWidth: '20rem'}}>
      <span style={{color: 'var(--pokemon-disabled-foreground)', fontSize: '0.875rem'}}>
        현재 탭: <code>{value}</code>
      </span>
      <Tabs.Root onValueChange={setValue} value={value} defaultValue="overview">
        <Tabs.List aria-label="섹션">
          <Tabs.Trigger value="overview">개요</Tabs.Trigger>
          <Tabs.Trigger value="details">상세</Tabs.Trigger>
          <Tabs.Trigger value="history">이력</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Panel value="overview">overview 패널</Tabs.Panel>
        <Tabs.Panel value="details">details 패널</Tabs.Panel>
        <Tabs.Panel value="history">history 패널</Tabs.Panel>
      </Tabs.Root>
    </div>
  );
}
