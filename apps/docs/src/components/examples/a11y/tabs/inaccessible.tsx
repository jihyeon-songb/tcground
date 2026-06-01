import { useState } from 'react';

const TABS = [
  { value: 'price', label: '시세', panel: '최근 평균 거래가와 변동 추이가 표시됩니다.' },
  { value: 'detail', label: '상세', panel: '세트, 레어도, 카드 번호 정보가 표시됩니다.' },
  { value: 'history', label: '거래 이력', panel: '최근 체결된 거래 내역이 표시됩니다.' },
];

// 일부러 접근성을 지키지 않은 예시입니다. tablist/tab/tabpanel role과
// aria-selected가 없고, div onClick 이라 키보드 focus·방향키 이동이 불가능합니다.
export default function InaccessibleTabsExample() {
  const [active, setActive] = useState('price');

  return (
    <div style={{ display: 'grid', gap: '0.75rem', minWidth: '20rem' }}>
      <div style={{ borderBottom: '1px solid #e6e8ea', display: 'flex', gap: '1rem' }}>
        {TABS.map((tab) => (
          <div
            key={tab.value}
            onClick={() => setActive(tab.value)}
            style={{
              borderBottom: active === tab.value ? '2px solid #bb001a' : '2px solid transparent',
              color: active === tab.value ? '#191c1e' : '#535f73',
              cursor: 'pointer',
              fontWeight: active === tab.value ? 700 : 400,
              padding: '0.5rem 0.25rem',
            }}
          >
            {tab.label}
          </div>
        ))}
      </div>
      <div>{TABS.find((tab) => tab.value === active)?.panel}</div>
    </div>
  );
}
