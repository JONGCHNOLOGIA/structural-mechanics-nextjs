// 프로토타입의 cbFormulaSection()을 그대로 옮긴 것.
export default function FormulaSection({ title, children }) {
  return (
    <div className="step-card">
      <div className="step-header static">{title}</div>
      <div className="step-body">{children}</div>
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
