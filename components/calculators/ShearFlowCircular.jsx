'use client';

import { useMemo, useState } from 'react';
import { computeShearCircularOrFlow } from '@/lib/calc/beamStresses';
import { LENGTH_UNITS, FORCE_UNITS, STRESS_UNITS, VOLUME3_UNITS, IN4_UNITS, toBase, fromBase, fmt1, scaledPx } from '@/lib/calc/units1';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import Frac from '@/components/Frac';
import { DualField, SelectField, ResetButton, ResultGrid, ResultCard, StepCard, ErrorBox, InputNeededPlaceholder } from './sm1/Controls';
import { CalcGate, useCalcGate } from './sm1/CalcGate';
import { Dim, DimLineH } from './EditableDim';

// CH.5-4 Shear Stress (Circular) and Shear Flow in Built-up Beams —
// 원본 renderShearCircularFlow()의 React 버전.

// 원본 기본값(V=1000 kN, Q=1e5 mm³, I=5e6 mm⁴, F=500 N)으로는 체결재 간격이 0.03 mm로 나와
// 교재 예제로 쓸 수 없었다. 못으로 조립한 목재 상자보 정도의 현실적인 값으로 바꿔서,
// 간격이 100 mm 안팎으로 떨어지게 했다.
const DEFAULTS = {
  mode: 'circular',
  V: 10, VUnit: 'kN',
  d: 80, dimUnit: 'mm',
  Q: 40000, QUnit: 'mm3',
  I: 50000000, IUnit: 'mm4',
  Fallow: 800, FallowUnit: 'N',
};

const MODE_OPTIONS = [
  { value: 'circular', label: '원형 단면 전단응력' },
  { value: 'shearflow', label: '조립보 Shear Flow / 체결재 간격' },
];

const MPa = (v) => fromBase(v, 'MPa', STRESS_UNITS);
const mm = (v) => fromBase(v, 'mm', LENGTH_UNITS);

export default function ShearFlowCircular() {
  const [s, setS] = useState(DEFAULTS);
  const res = useMemo(() => computeShearCircularOrFlow(s), [s]);
  const gate = useCalcGate(s);
  const set = (patch) => setS((prev) => ({ ...prev, ...patch }));
  const setNum = (key) => (v) => set({ [key]: parseFloat(v) });

  return (
    <>
      {/* ---------------- Setting Menu ---------------- */}
      <div className="panel">
        <h3>SETTING MENU</h3>
        <EditableText
          as="div"
          className="note-box"
          contentKey="calc.ShearFlowCircular.note"
          defaultText="같은 τ=VQ/(Ib)에서 출발하지만, 원형 단면은 단면 전체의 최대응력을 구하는 문제이고 조립보는 '조각들이 서로 미끄러지지 않게 붙잡는 힘'을 구하는 문제입니다. 전단흐름 q는 단위 길이당 힘(N/m)이라 응력과 단위가 다릅니다."
        />
        <SelectField label="모드" value={s.mode} options={MODE_OPTIONS} onChange={(v) => set({ mode: v })} />
        <DualField label="전단력 V" value={s.V} min={0} max={500} step={1} onChange={setNum('V')}
          unitMap={FORCE_UNITS} unit={s.VUnit} onUnitChange={(v) => set({ VUnit: v })} invalid={!(s.V >= 0)} />
        {s.mode === 'circular' ? (
          <DualField label="직경 d" value={s.d} min={1} max={300} step={1} onChange={setNum('d')}
            unitMap={LENGTH_UNITS} unit={s.dimUnit} onUnitChange={(v) => set({ dimUnit: v })} invalid={!(s.d > 0)} />
        ) : (
          <>
            <DualField label="단면1차모멘트 Q (붙잡아야 할 조각 기준)" value={s.Q} min={1} max={1000000} step={100} onChange={setNum('Q')}
              unitMap={VOLUME3_UNITS} unit={s.QUnit} onUnitChange={(v) => set({ QUnit: v })} invalid={!(s.Q > 0)} />
            <DualField label="단면2차모멘트 I (조립된 전체 단면)" value={s.I} min={1} max={100000000} step={1000} onChange={setNum('I')}
              unitMap={IN4_UNITS} unit={s.IUnit} onUnitChange={(v) => set({ IUnit: v })} invalid={!(s.I > 0)} />
            <DualField label="체결재 허용하중 F_allow (못·볼트 1개)" value={s.Fallow} min={1} max={5000} step={10} onChange={setNum('Fallow')}
              unitMap={FORCE_UNITS} unit={s.FallowUnit} onUnitChange={(v) => set({ FallowUnit: v })} invalid={!(s.Fallow > 0)} />
          </>
        )}
        <ResetButton onClick={() => setS(DEFAULTS)} />
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="panel">
        <h3>VISUALIZER</h3>
        {res.valid ? (
          <>
            {res.mode === 'circular' ? (
              <>
                <CircularSectionSVG s={s} res={res} onEditD={setNum('d')} />
                <ResultGrid>
                  <ResultCard label="단면2차모멘트 I" value={`${fmt1(res.I * 1e12, 2)} mm⁴`} />
                  <ResultCard label="단면적 A" value={`${fmt1(res.A * 1e6, 2)} mm²`} />
                  <ResultCard label="최대 전단응력 τ_max = 4V/(3A)" value={`${fmt1(MPa(res.tauMax), 3)} MPa`} tone="comp" full />
                </ResultGrid>
                <EditableText
                  as="div"
                  className="hint"
                  contentKey="shearFlowCircular.circularHint"
                  defaultText="같은 단면적이라도 계수가 다릅니다 — 직사각형은 1.5V/A, 원형은 1.333V/A. 중립축 근처에 폭이 넓게 몰려 있는 원형이 조금 더 유리합니다."
                />
              </>
            ) : (
              <>
                <BoltSpacingSVG spacingMM={mm(res.spacing)} />
                <ResultGrid>
                  <ResultCard label="전단흐름 q = V·Q/I" value={`${fmt1(res.q, 2)} N/m`} />
                  <ResultCard label="필요 체결재 간격 s = F_allow/q" value={`${fmt1(mm(res.spacing), 2)} mm`} tone="tens" />
                </ResultGrid>
                <EditableText
                  as="div"
                  className="hint"
                  contentKey="shearFlowCircular.spacingHint"
                  defaultText="실제로는 이 간격보다 **좁게** 박아야 안전합니다. 간격이 넓어질수록 체결재 하나가 담당하는 길이가 길어져 하중이 커집니다."
                />
              </>
            )}
            <EditableText as="div" className="ai-hint" contentKey={`calc.ShearFlowCircular.aiHint.${res.mode}`}
              defaultText={
                res.mode === 'circular'
                  ? '💬 원형 단면의 τ_max 계수가 사각형(1.5)과 다른 이유가 뭔가요?'
                  : '💬 못·볼트 간격을 좁히면 왜 더 안전해지는지, 오른쪽 AI 튜터에게 물어보세요.'
              } />
          </>
        ) : (
          <ErrorBox errors={res.errors} />
        )}

        <div className="steps" style={{ marginTop: 20 }}>
          <CalcGate gate={gate}>
            {(frozen) => {
              const fres = computeShearCircularOrFlow(frozen);
              return fres.valid ? <Steps s={frozen} res={fres} /> : <InputNeededPlaceholder />;
            }}
          </CalcGate>
        </div>
      </div>

      <AiTutorPanel question="shear flow와 shear stress의 차이가 뭔가요?" />
    </>
  );
}

function Steps({ s, res }) {
  if (res.mode === 'circular') {
    return (
      <>
        <StepCard
          title="Step 1. 단면2차모멘트와 단면적"
          formula={
            <>
              I = <Frac num="πd⁴" den="64" />, A = <Frac num="πd²" den="4" />
            </>
          }
          eqLines={[`d = ${s.d} ${s.dimUnit}`]}
          final={`I = ${fmt1(res.I * 1e12, 2)} mm⁴,  A = ${fmt1(res.A * 1e6, 2)} mm²`}
        />
        <StepCard
          title="Step 2. 최대 전단응력 (원형 특수해)"
          formula={
            <>
              τ_max = <Frac num="4V" den="3A" />
            </>
          }
          eqLines={[
            <>
              τ_max = <Frac num={`4 × ${s.V} ${s.VUnit}`} den={`3 × ${fmt1(res.A * 1e6, 2)} mm²`} />
            </>,
          ]}
          final={`τ_max = ${fmt1(MPa(res.tauMax), 3)} MPa`}
        />
      </>
    );
  }
  return (
    <>
      <StepCard
        title="Step 1. 전단흐름"
        formula={
          <>
            q = <Frac num="V·Q" den="I" />
          </>
        }
        eqLines={[
          <>
            q = <Frac num={`${s.V} ${s.VUnit} × ${s.Q} ${s.QUnit}`} den={`${s.I} ${s.IUnit}`} />
          </>,
        ]}
        final={`q = ${fmt1(res.q, 2)} N/m (= 길이 1m마다 붙잡아야 할 힘)`}
      />
      <StepCard
        title="Step 2. 체결재 간격"
        formula={
          <>
            s = <Frac num="F_allow" den="q" />
          </>
        }
        eqLines={[
          <>
            s = <Frac num={`${s.Fallow} ${s.FallowUnit}`} den={`${fmt1(res.q, 2)} N/m`} />
          </>,
        ]}
        final={`s = ${fmt1(mm(res.spacing), 2)} mm 이하로 배치`}
      />
    </>
  );
}

// 원형 단면과 전단응력 분포. 지름은 치수 숫자를 클릭해서 바로 고칠 수 있다
// (원래는 그림 없이 결과 카드만 있었다).
function CircularSectionSVG({ s, res, onEditD }) {
  const w = 300, h = 216, cx = 104, cy = 96;
  const dMM = toBase(s.d || 0, s.dimUnit, LENGTH_UNITS) * 1000;
  const r = scaledPx(dMM, 300, 30, 70);
  const N = 9;
  const armX = cx + r + 10;
  const maxLen = res.valid ? scaledPx(MPa(res.tauMax), 40, 20, 80) : 40;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 300, margin: '0 auto 6px', display: 'block', overflow: 'visible' }}>
      <circle cx={cx} cy={cy} r={r} fill="var(--bg)" stroke="#8A97A2" strokeWidth="1.4" />
      <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke="var(--gray)" strokeWidth="1" strokeDasharray="3 2" />
      <text x={cx - r - 6} y={cy - 5} fontSize="9.5" fill="var(--gray)" textAnchor="end">N.A.</text>

      {/* 전단응력은 중립축에서 최대, 위아래 끝에서 0인 포물선 분포 */}
      {Array.from({ length: N }).map((_, k) => {
        const t = (k / (N - 1)) * 2 - 1; // −1(하단) ~ +1(상단)
        const yy = cy - t * r;
        const len = maxLen * (1 - t * t);
        return <line key={k} x1={armX} y1={yy} x2={armX + len} y2={yy} stroke="var(--teal)" strokeWidth="2" />;
      })}
      <text x={armX + maxLen / 2} y={cy - r - 8} fontSize="9.5" fill="var(--teal)" fontWeight="800" textAnchor="middle">
        τ(y) 분포
      </text>
      <Dim
        x={armX + maxLen + 6}
        y={cy + 4}
        anchor="start"
        color="var(--teal)"
        fontSize={10}
        value={MPa(res.tauMax)}
        unit="MPa"
        prefix="τ_max = "
      />

      {/* 지름 치수 — 클릭하면 그 자리에서 고칠 수 있다 */}
      <DimLineH
        x1={cx - r}
        x2={cx + r}
        y={cy + r + 14}
        labelDy={14}
        fontSize={10.5}
        value={s.d}
        unit={s.dimUnit}
        prefix="d = "
        boxW={52}
        onChange={onEditD}
      />
    </svg>
  );
}

// 조립보 위에 체결재를 계산된 간격으로 늘어놓은 그림 — 간격이 좁아지면 못이 촘촘해진다.
function BoltSpacingSVG({ spacingMM }) {
  const w = 440, h = 120, x0 = 30, x1 = 410, topY = 34, botY = 74;
  // 화면에 그릴 간격: 실제 간격(mm)에 비례하되 너무 촘촘하거나 성기지 않게 자른다.
  const pxPerMM = 0.6;
  const stepPx = Math.max(16, Math.min(160, (spacingMM || 0) * pxPerMM));
  const bolts = [];
  for (let x = x0 + stepPx / 2; x < x1; x += stepPx) bolts.push(x);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 440, margin: '0 auto 6px', display: 'block' }}>
      <rect x={x0} y={topY} width={x1 - x0} height={20} fill="var(--bg)" stroke="#8A97A2" strokeWidth="1.3" />
      <rect x={x0} y={botY - 20} width={x1 - x0} height={20} fill="var(--bg)" stroke="#8A97A2" strokeWidth="1.3" />
      <line x1={x0} y1={topY + 20} x2={x1} y2={topY + 20} stroke="var(--crimson)" strokeWidth="1.2" strokeDasharray="4 3" />
      {bolts.map((x, i) => (
        <g key={i}>
          <line x1={x} y1={topY - 4} x2={x} y2={botY + 4} stroke="var(--teal)" strokeWidth="2.4" />
          <circle cx={x} cy={topY - 6} r="3" fill="var(--teal)" />
        </g>
      ))}
      {bolts.length >= 2 && (
        <>
          <line x1={bolts[0]} y1={botY + 16} x2={bolts[1]} y2={botY + 16} stroke="var(--gray)" strokeWidth="1" />
          <text x={(bolts[0] + bolts[1]) / 2} y={botY + 30} fontSize="9.5" fill="var(--gray)" textAnchor="middle">
            s = {fmt1(spacingMM, 1)} mm
          </text>
        </>
      )}
      <text x={x1} y={topY + 14} fontSize="9" fill="var(--crimson)" textAnchor="end">
        미끄러지려는 면
      </text>
    </svg>
  );
}
