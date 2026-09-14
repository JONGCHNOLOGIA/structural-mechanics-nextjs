'use client';

import { useState } from 'react';
import { useSettings } from './SettingsProvider';

// 로그아웃 버튼 옆에 붙는 설정 버튼. 지금은 "계산 결과 소수점 자리수"만 있음 —
// 로그인 계정이면 profiles.decimals에 저장돼서 다른 기기에서도 이어지고,
// 비로그인이어도 이 브라우저(localStorage)엔 기억됨.
export default function SettingsButton() {
  const { decimals, setDecimals } = useSettings();
  const [open, setOpen] = useState(false);
  const [applying, setApplying] = useState(false);

  // fmt()가 참조하는 값이 바뀌어도 이미 그려진 화면(다른 컴포넌트들)까지 자동으로 다시
  // 그려지진 않아서, 설정을 저장한 다음 한 번 새로고침해서 전체 화면에 확실히 반영한다.
  async function handleChange(n) {
    setApplying(true);
    await setDecimals(n);
    window.location.reload();
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="logout-btn"
        title="설정"
        aria-label="설정"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setOpen(false)} />
          <div
            style={{
              position: 'absolute',
              top: 42,
              right: 0,
              zIndex: 91,
              background: 'var(--card)',
              border: '1px solid var(--line)',
              borderRadius: 12,
              boxShadow: '0 6px 20px rgba(0,0,0,0.1)',
              padding: '14px 16px',
              width: 220,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--gray)', marginBottom: 8 }}>설정</div>
            <label style={{ fontSize: 11.5, color: 'var(--gray-soft)', fontWeight: 700, display: 'block', marginBottom: 5 }}>
              계산 결과 소수점 자리수
            </label>
            <select
              className="unit-inline"
              style={{ width: '100%' }}
              value={decimals}
              disabled={applying}
              onChange={(e) => handleChange(parseInt(e.target.value, 10))}
            >
              {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  소수점 {n}자리
                </option>
              ))}
            </select>
            <p style={{ fontSize: 10.5, color: 'var(--gray-soft)', marginTop: 8, lineHeight: 1.5 }}>
              {applying ? '적용 중... 화면을 새로고침해요.' : '로그인 계정이면 이 설정이 저장돼서 다음에 들어와도 유지돼요.'}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
