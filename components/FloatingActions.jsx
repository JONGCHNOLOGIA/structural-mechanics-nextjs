'use client';

import { useState } from 'react';
import { useSettings } from './SettingsProvider';
import AiTutorPanel from './calculators/AiTutorPanel';

// 우측 하단 플로팅 버튼 — AI 튜터, 설정. 건축공학과 홈페이지의 동그란 플로팅 아이콘 자리에서
// 아이디어를 가져온 것 (헤더에 있던 설정 아이콘은 여기로 옮겨왔다). 사이트 전체에서 재사용하되,
// 챕터 상세 페이지처럼 이미 AI 튜터 패널이 화면 안에 고정으로 들어가 있는 곳에서는
// showAi={false}로 중복되는 AI 버튼만 빼고 설정 버튼은 그대로 남긴다.
export default function FloatingActions({ showAi = true }) {
  const [open, setOpen] = useState(null); // null | 'ai' | 'settings'
  const toggle = (name) => setOpen((v) => (v === name ? null : name));

  return (
    <>
      {open && <div style={{ position: 'fixed', inset: 0, zIndex: 59 }} onClick={() => setOpen(null)} />}

      {open === 'ai' && (
        <div className="floating-panel" onClick={(e) => e.stopPropagation()}>
          <AiTutorPanel />
        </div>
      )}
      {open === 'settings' && (
        <div className="floating-panel" onClick={(e) => e.stopPropagation()}>
          <SettingsPanelBody />
        </div>
      )}

      <div className="floating-actions">
        {showAi && (
          <button className="floating-btn crimson" title="AI 튜터" aria-label="AI 튜터" onClick={() => toggle('ai')}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          </button>
        )}
        <button className="floating-btn" title="설정" aria-label="설정" onClick={() => toggle('settings')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>
    </>
  );
}

// SettingsButton과 같은 내용(소수점 자리수)이지만, 플로팅 패널 안에 바로 들어가는 버전.
function SettingsPanelBody() {
  const { decimals, setDecimals } = useSettings();
  const [applying, setApplying] = useState(false);

  async function handleChange(n) {
    setApplying(true);
    await setDecimals(n);
    window.location.reload();
  }

  return (
    <>
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
    </>
  );
}
