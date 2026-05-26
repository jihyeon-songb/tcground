import {Tabs} from '@tcground/headless-ui';

export default function BasicExample() {
  return (
    <Tabs.Root defaultValue="usage" style={{display: 'grid', gap: '0.75rem', minWidth: '20rem'}}>
      <Tabs.List aria-label="문서 섹션">
        <Tabs.Trigger value="usage">사용법</Tabs.Trigger>
        <Tabs.Trigger value="props">Props</Tabs.Trigger>
        <Tabs.Trigger value="a11y">접근성</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Panel value="usage">기본 사용법 안내가 들어가는 패널입니다.</Tabs.Panel>
      <Tabs.Panel value="props">컴포넌트 props 표가 들어가는 패널입니다.</Tabs.Panel>
      <Tabs.Panel value="a11y">접근성 가이드가 들어가는 패널입니다.</Tabs.Panel>
    </Tabs.Root>
  );
}
