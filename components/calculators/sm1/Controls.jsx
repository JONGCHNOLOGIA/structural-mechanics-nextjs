'use client';

import { fmt1 } from '@/lib/calc/units1';
import { Tip } from '../FormulaSection';
import { SYMBOL_TIPS } from './glossary';
import EditableText from '@/components/EditableText';
import Frac from '@/components/Frac';

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

// 수식 문자열에 나오는 기호를 용어집에서 찾아 툴팁으로 감싼다.
// 아래첨자가 붙은 기호(σ_allow)를 먼저 잡도록 긴 것부터 맞춰보고, 알파벳 기호는 단어 중간에
// 걸리지 않게(예: "failure strength"의 f) 앞뒤가 글자가 아닐 때만 인식한다.
const TIP_KEYS = Object.keys(SYMBOL_TIPS).sort((a, b) => b.length - a.length);
const TIP_PATTERN = new RegExp(
  '(' + TIP_KEYS.map((k) => `(?<![A-Za-z_])${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z_])`).join('|') + ')',
  'g'
);

function withTips(input) {
  const applyToString = (text, keyPrefix) =>
    text.split(TIP_PATTERN).map((part, i) =>
      SYMBOL_TIPS[part] ? (
        <Tip key={`${keyPrefix}-${i}`} title={SYMBOL_TIPS[part]}>
          {part}
        </Tip>
      ) : (
        <span key={`${keyPrefix}-${i}`}>{part}</span>
      )
    );
  if (typeof input === 'string') return applyToString(input, 't');
  // withFractions가 배열(문자열 조각 + <Frac> 섞임)을 돌려준 경우, 문자열 조각에만 팁을 적용하고
  // 이미 만들어진 <Frac> 엘리먼트는 그대로 둔다.
  if (Array.isArray(input)) return input.flatMap((chunk, i) => (typeof chunk === 'string' ? applyToString(chunk, `t${i}`) : chunk));
  return input;
}

// "(a/b)" 처럼 괄호로 정확히 감싸인 간단한 분수(안에 공백·다른 연산자 없이 토큰/토큰 하나뿐인
// 경우)만 실제 분자/분모가 위아래로 쌓인 모양(Frac)으로 바꾼다. "(d₂² − 4·A_required/π)"처럼
// 괄호 안에 분수 말고 다른 내용이 섞여 있으면 일부러 손대지 않고 그대로 둔다 — 어설프게 잘라서
// 수식을 깨뜨리느니, 애매한 건 원래 텍스트 그대로 보여주는 쪽이 안전하다.
const SIMPLE_FRACTION = /\(([^\s()/]+)\/([^\s()/]+)\)/g;

function withFractions(text) {
  if (typeof text !== 'string') return text;
  const parts = [];
  let last = 0;
  let match;
  SIMPLE_FRACTION.lastIndex = 0;
  while ((match = SIMPLE_FRACTION.exec(text))) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(<Frac key={`f${parts.length}`} num={match[1]} den={match[2]} />);
    last = match.index + match[0].length;
  }
  if (last === 0) return text; // 분수 패턴이 하나도 없었으면 원래 문자열 그대로
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function StepCard({ title, formula, eqLines = [], final }) {
  return (
    <div className="step-card">
      <div className="step-header static">{title}</div>
      <div className="step-body">
        {formula && <div className="step-formula">{withTips(withFractions(formula))}</div>}
        {eqLines.map((line, i) => (
          <div className="step-eq" key={i}>
            {withFractions(line)}
          </div>
        ))}
        {final && <div className="step-final">{withFractions(final)}</div>}
      </div>
    </div>
  );
}

export function ErrorBox({ errors }) {
  if (!errors || errors.length === 0) return null;
  return (
    <div className="error-box">
      {/* 아래 에러 문장들(errors 배열) 자체는 lib/calc/*.js 안에서 상황마다 계산되는 값이라
          이 문구처럼 통째로 고정 텍스트로 바꿔서 관리자가 고치게 할 수는 없다 — 이 제목줄만 고정 문구. */}
      <b>
        <EditableText as="span" contentKey="controls.errorBox.title" defaultText="입력값을 확인해주세요:" />
      </b>
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
      <EditableText
        as="div"
        contentKey="controls.inputNeededPlaceholder"
        defaultText="왼쪽에서 유효한 값을 입력하면
계산 과정이 표시됩니다."
        style={{ whiteSpace: 'pre-line' }}
      />
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
