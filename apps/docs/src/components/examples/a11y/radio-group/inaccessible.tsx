import { useState } from 'react';

const OPTIONS = [
  { value: 'kr', label: '한국판' },
  { value: 'jp', label: '일본판' },
  { value: 'en', label: '영문판' },
];

// 일부러 접근성을 지키지 않은 예시입니다. 단일 선택인데도 checkbox 를 써서
// 의미가 어긋나고, 그룹 role 과 방향키 이동이 없으며 모든 항목이 Tab 정지점입니다.
export default function InaccessibleRadioGroupExample() {
  const [selected, setSelected] = useState('kr');

  return (
    <div style={{ display: 'grid', gap: '0.75rem', width: '16rem' }}>
      <div style={{ color: '#535f73', fontSize: '0.875rem' }}>카드 언어판 선택</div>
      {OPTIONS.map((option) => (
        <label key={option.value} style={{ alignItems: 'center', display: 'flex', gap: '0.5rem' }}>
          <input
            type='checkbox'
            checked={selected === option.value}
            onChange={() => setSelected(option.value)}
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}
