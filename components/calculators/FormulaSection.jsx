'use client';

import { useState } from 'react';

// 프로토타입의 cbFormulaSection()을 그대로 옮긴 것.
export default function FormulaSection({ title, children }) {
  return (
    <div className="step-card">
      <div className="step-header static">{title}</div>
      <div className="step-body">{children}</div>
    </div>
  );
}

// 제목줄을 눌러 접었다 펼 수 있는 칸. FormulaSection과 같은 껍데기를 쓰되 static을 빼서
// 제목줄에 이미 들어 있는 hover 효과와 손가락 커서가 살아나게 한다.
// 한 화면에 시각자료가 여러 개 들어갈 때(예: Plane Stress의 sin·cos 그래프, Mohr 원)
// 기본은 접어두고 필요한 것만 펴보게 하려고 만들었다.
export function Collapsible({ title, children, defaultOpen = false, hint }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="step-card">
      <div
        className="step-header"
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
      >
        <span style={{ display: 'inline-block', width: 14 }}>{open ? '▾' : '▸'}</span>
        {title}
        {hint && !open && <span style={{ fontWeight: 400, color: 'var(--gray-soft)', marginLeft: 8 }}>{hint}</span>}
      </div>
      {open && <div className="step-body">{children}</div>}
    </div>
  );
}

// 프로토타입의 tip()을 그대로 옮긴 것 — 계산식 기호에 마우스 올리면 설명이 뜨는 툴팁.
export function Tip({ title, children }) {
  return (
    <span className="tip" data-tip={title}>
      {children}
    </span>
  );
}
