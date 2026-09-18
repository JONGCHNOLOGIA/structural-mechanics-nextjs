'use client';

import { fmt1 } from '@/lib/calc/units1';

// 구조역학 1 계산기들이 공용으로 쓰는 입력/결과 UI 조각들.
// 원본 프로토타입의 dualField()/unitSelect()/resultCard()/stepCard()/errorBox() 를 React로 옮긴 것 —
// 클래스명과 보이는 모습은 그대로 두고, onclick 문자열 대신 콜백을 받도록만 바꿨다.

export function UnitSelect({ map, value, onChange }) {
  return (
    <select className="unit-inline" value={value} onChange={(e) => onChange(e.target.value)}>
      {Object.keys(map).map((u) => (
        <option key={u} value={u}>
          {u}
        </option>
      ))}
    </select>
  );
}

// 슬라이더와 숫자 입력이 같은 값을 가리키는 필드. 슬라이더를 끄는 동안에도 즉시 반영된다.
// 숫자 입력은 타이핑 중간 상태("", "-", "1.")를 막지 않으려고 문자열 그대로 올려보내고,
// 숫자로 해석되는 경우에만 onChange가 값을 반영하도록 호출부에서 처리한다.
export function DualField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  unitMap,
  unit,
  onUnitChange,
  invalid = false,
  hint,
}) {
  return (
    <div className="field dual-field">
      <label>{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={Number.isFinite(value) ? value : min}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="input-unit-group">
        <input
          type="number"
          step="any"
          value={value}
          className={invalid ? 'invalid' : ''}
          onChange={(e) => onChange(e.target.value)}
        />
        {unitMap && <UnitSelect map={unitMap} value={unit} onChange={onUnitChange} />}
      </div>
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

// 인장/압축처럼 둘 중 하나를 고르는 토글. tone으로 활성 색을 정한다('tens' 초록, 'comp' 크림슨).
export function ToggleRow({ options, value, onChange }) {
  return (
    <div className="toggle-row">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={'toggle-btn' + (value === opt.value ? ' active' : '') + (opt.tone ? ' ' + opt.tone : '')}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function SelectField({ label, value, options, onChange }) {
  return (
    <div className="field">
      <label>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ResetButton({ onClick }) {
  return (
    <button type="button" className="reset-btn" onClick={onClick}>
      ↺ 초기값으로 Reset
    </button>
  );
}

// tone: 'tens' | 'comp' | undefined — 값 글자색을 인장(초록)/압축(크림슨)으로 구분할 때 쓴다.
// full을 주면 결과 그리드 한 줄 전체를 차지한다(원본의 span 3에 해당).
export function ResultCard({ label, value, tone, full }) {
  return (
    <div className="result-card" style={full ? { gridColumn: '1 / -1' } : undefined}>
      <div className="l">{label}</div>
      <div className={'v' + (tone ? ' ' + tone : '')}>{value}</div>
    </div>
  );
}

export function ResultGrid({ children }) {
  return <div className="result-grid">{children}</div>;
}

export function StepCard({ title, formula, eqLines = [], final }) {
  return (
    <div className="step-card">
      <div className="step-header static">{title}</div>
      <div className="step-body">
        {formula && <div className="step-formula">{formula}</div>}
        {eqLines.map((line, i) => (
          <div className="step-eq" key={i}>
            {line}
          </div>
        ))}
        {final && <div className="step-final">{final}</div>}
      </div>
    </div>
  );
}

export function ErrorBox({ errors }) {
  if (!errors || errors.length === 0) return null;
  return (
    <div className="error-box">
      <b>입력값을 확인해주세요:</b>
      {errors.map((e, i) => (
        <div key={i}>· {e}</div>
      ))}
    </div>
  );
}

export function InputNeededPlaceholder() {
  return (
    <div className="viz-placeholder" style={{ minHeight: 220 }}>
      <span className="badge">입력 필요</span>
      <div>
        왼쪽에서 유효한 값을 입력하면
        <br />
        계산 과정이 표시됩니다.
      </div>
    </div>
  );
}

export function DiagramSkipNote({ children }) {
  return (
    <div className="diagram-skip-note">
      <b>참고:</b> {children}
    </div>
  );
}

export { fmt1 };
