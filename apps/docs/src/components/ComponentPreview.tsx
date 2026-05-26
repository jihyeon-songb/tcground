import CodeBlock from '@theme/CodeBlock';
import TabItem from '@theme/TabItem';
import Tabs from '@theme/Tabs';
import type {ReactNode} from 'react';

interface ComponentPreviewProps {
  children: ReactNode;
  code: string;
  language?: string;
}

export default function ComponentPreview({
  children,
  code,
  language = 'tsx',
}: ComponentPreviewProps) {
  return (
    <div className="component-preview">
      <Tabs groupId="component-preview" defaultValue="preview">
        <TabItem value="preview" label="Preview">
          <div className="component-preview__surface">{children}</div>
        </TabItem>
        <TabItem value="code" label="Code">
          <CodeBlock language={language}>{code}</CodeBlock>
        </TabItem>
      </Tabs>
    </div>
  );
}