import { useState } from 'react';

// 일부러 접근성을 지키지 않은 예시입니다. role/aria, focus trap, Esc 닫기,
// focus 복원이 모두 빠져 있어 키보드·보조 기기 사용자가 조작할 수 없습니다.
export default function InaccessibleDialogExample() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <span
        onClick={() => setOpen(true)}
        style={{
          background: '#bb001a',
          borderRadius: '0.5rem',
          color: 'white',
          cursor: 'pointer',
          display: 'inline-block',
          padding: '0.5rem 1rem',
        }}
      >
        관심 카드에서 삭제
      </span>

      {open ? (
        <div
          onClick={() => setOpen(false)}
          style={{
            alignItems: 'center',
            background: 'rgb(0 0 0 / 50%)',
            display: 'flex',
            inset: 0,
            justifyContent: 'center',
            position: 'fixed',
            zIndex: 1000,
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '0.75rem',
              color: '#191c1e',
              maxWidth: '22rem',
              padding: '1.5rem',
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>관심 카드에서 삭제할까요?</div>
            <div style={{ color: '#535f73', marginBottom: '1.25rem' }}>
              이 카드를 관심 목록에서 제거합니다.
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <span
                onClick={() => setOpen(false)}
                style={{ color: '#535f73', cursor: 'pointer', padding: '0.5rem 1rem' }}
              >
                취소
              </span>
              <span
                onClick={() => setOpen(false)}
                style={{
                  background: '#bb001a',
                  borderRadius: '0.5rem',
                  color: 'white',
                  cursor: 'pointer',
                  padding: '0.5rem 1rem',
                }}
              >
                삭제
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
