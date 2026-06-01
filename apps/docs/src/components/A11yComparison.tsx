import CodeBlock from '@theme/CodeBlock';
import type { ReactNode } from 'react';

type Tone = 'bad' | 'good';

interface A11yColumnProps {
  tone: Tone;
  title: string;
  demo: ReactNode;
  code: string;
  notes: string[];
  language: string;
}

function A11yColumn({ tone, title, demo, code, notes, language }: A11yColumnProps) {
  return (
    <section className={`a11y-comparison__col a11y-comparison__col--${tone}`}>
      <h3 className='a11y-comparison__title'>{title}</h3>
      <div className='a11y-comparison__surface'>{demo}</div>
      <ul className='a11y-comparison__notes'>
        {notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
      <details className='a11y-comparison__code'>
        <summary>코드 보기</summary>
        <CodeBlock language={language}>{code}</CodeBlock>
      </details>
    </section>
  );
}

interface A11yComparisonProps {
  /** Live render of the inaccessible (Don't) implementation. */
  bad: ReactNode;
  /** Live render of the accessible (Do) implementation built on @tcground/headless. */
  good: ReactNode;
  badCode: string;
  goodCode: string;
  /** Bullet notes: what the Don't version breaks. */
  badNotes: string[];
  /** Bullet notes: what the headless primitive guarantees. */
  goodNotes: string[];
  language?: string;
}

/**
 * Side-by-side Do/Don't comparison for accessibility demos. Renders an
 * inaccessible implementation next to the accessible @tcground/headless-based
 * one, each with live demo, explanatory notes, and collapsible source.
 */
export default function A11yComparison({
  bad,
  good,
  badCode,
  goodCode,
  badNotes,
  goodNotes,
  language = 'tsx',
}: A11yComparisonProps) {
  return (
    <div className='a11y-comparison'>
      <A11yColumn
        tone='bad'
        title='❌ 잘못된 예'
        demo={bad}
        code={badCode}
        notes={badNotes}
        language={language}
      />
      <A11yColumn
        tone='good'
        title='✅ 올바른 예'
        demo={good}
        code={goodCode}
        notes={goodNotes}
        language={language}
      />
    </div>
  );
}
