import { useState } from 'react';

const PERIODS = [
  { value: '3m', label: '3개월' },
  { value: '6m', label: '6개월' },
  { value: '1y', label: '1년' },
];

// 일부러 접근성을 지키지 않은 예시입니다. 패널을 바꾸지 않고 같은 뷰를 필터하는데도
// tablist/tab role 을 붙여, 가리킬 tabpanel 이 없고 방향키 이동도 없습니다.
export default function InaccessibleSegmentedControlExample() {
  const [period, setPeriod] = useState('6m');

  return (
    <div role='tablist' aria-label='차트 기간' style={{ display: 'inline-flex', gap: '0.25rem' }}>
      {PERIODS.map((option) => {
        const active = option.value === period;
        return (
          <button
            key={option.value}
            type='button'
            role='tab'
            aria-selected={active}
            onClick={() => setPeriod(option.value)}
            style={{
              background: active ? '#fff' : 'transparent',
              border: 'none',
              borderRadius: '9999px',
              color: active ? '#1b1b1f' : '#535f73',
              cursor: 'pointer',
              fontSize: '0.875rem',
              padding: '0.375rem 0.75rem',
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
