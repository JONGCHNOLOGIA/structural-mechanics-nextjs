'use client';

import { useMemo, useState } from 'react';
import { computeTorsionFormula } from '@/lib/calc/torsion';
import { LENGTH_UNITS, STRESS_UNITS, TORQUE_UNITS, toBase, fromBase, fmt1, scaledPx } from '@/lib/calc/units1';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import Frac from '@/components/Frac';
import { DualField, SelectField, ResetButton, ResultGrid, ResultCard, StepCard, ErrorBox, InputNeededPlaceholder } from './sm1/Controls';
import { CalcGate, useCalcGate } from './sm1/CalcGate';
import { Dim, DimLineH } from './EditableDim';

// CH.3-2 Torsion Formula (Shear Stress Distribution) — 원본 renderTorsionFormula()의 React 버전.

const DEFAULTS = { T: 250, TUnit: 'lb·ft', sectionType: 'solid_circular', dims: { d: 1.5, d_outer: 2, d_inner: 1.2 }, dimUnit: 'in' };

const SECTION_OPTIONS = [
  { value: 'solid_circular', label: 'Solid Circular' },
  { value: 'hollow_circular', label: 'Hollow Circular' },
];

export default function TorsionFormula() {
  const [s, setS] = useState(DEFAULTS);
  const res = useMemo(() => computeTorsionFormula(s), [s]);
  const gate = useCalcGate(s);
  const set = (patch) => setS((prev) => ({ ...prev, ...patch }));
  const setDim = (key) => (v) => setS((prev) => ({ ...prev, dims: { ...prev.dims, [key]: parseFloat(v) } }));

  return (
    <>
      {/* ---------------- Setting Menu ---------------- */}
      <div className="panel">
        <h3>SETTING MENU</h3>
        <EditableText
          contentKey="calc.TorsionFormula.intro"
          defaultText="비틀림 전단응력은 중심에서 0이고 반지름에 비례해 커져서 표면에서 가장 큽니다(τ=Tρ/Ip). 그래서 축 가운데 재료는 거의 일을 하지 않아요."
          style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.6, marginBottom: 14, background: 'var(--bg)', borderRadius: 0, padding: '12px 14px' }}
        />
        <DualField label="토크 T" value={s.T} min={0} max={1000} step={1} onChange={(v) => set({ T: parseFloat(v) })}
          unitMap={TORQUE_UNITS} unit={s.TUnit} onUnitChange={(v) => set({ TUnit: v })} invalid={!(s.T >= 0)} />
        <SelectField label="단면 형상" value={s.sectionType} options={SECTION_OPTIONS} onChange={(v) => set({ sectionType: v })} />
        {s.sectionType === 'solid_circular' ? (
          <DualField label="직경 d" value={s.dims.d} min={1} max={200} step={0.5} onChange={setDim('d')}
            unitMap={LENGTH_UNITS} unit={s.dimUnit} onUnitChange={(v) => set({ dimUnit: v })} invalid={!(s.dims.d > 0)} />
        ) : (
          <>
            <DualField label="외경 d₂" value={s.dims.d_outer} min={1} max={200} step={0.5} onChange={setDim('d_outer')}
              unitMap={LENGTH_UNITS} unit={s.dimUnit} onUnitChange={(v) => set({ dimUnit: v })} invalid={!(s.dims.d_outer > 0)} />
            <DualField label="내경 d₁" value={s.dims.d_inner} min={0.5} max={200} step={0.5} onChange={setDim('d_inner')}
              unitMap={LENGTH_UNITS} unit={s.dimUnit} onUnitChange={(v) => set({ dimUnit: v })}
              invalid={!(s.dims.d_inner > 0 && s.dims.d_inner < s.dims.d_outer)} />
          </>
        )}
        <ResetButton onClick={() => setS(DEFAULTS)} />
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="panel">
        <h3>VISUALIZER</h3>
        <DistributionSVG s={s} res={res} onEditDim={setDim} />
        {res.valid ? (
          <>
            <ResultGrid>
              <ResultCard label="극관성모멘트 Ip" value={`${fmt1(res.Ip * 1e12, 2)} mm⁴`} />
              <ResultCard label="최대 전단응력 τ_max" value={`${fmt1(fromBase(res.tauMax, 'MPa', STRESS_UNITS), 3)} MPa`} tone="comp" />
              <ResultCard
                label={res.rInner > 0 ? '내경면 응력 τ_min' : '중심 응력'}
                value={res.rInner > 0 ? `${fmt1(fromBase(res.tauMin, 'MPa', STRESS_UNITS), 3)} MPa` : '0 MPa'}
                full={res.rInner === 0}
              />
            </ResultGrid>
            <EditableText as="div" className="ai-hint" contentKey="calc.TorsionFormula.aiHint"
              defaultText="💬 중공축이 같은 재료량으로 왜 더 큰 토크를 견디는지, 오른쪽 AI 튜터에게 물어보세요." />
          </>
        ) : (
          <ErrorBox errors={res.errors} />
        )}

        <div className="steps" style={{ marginTop: 20 }}>
          <CalcGate gate={gate}>
            {(frozen) => {
              const fres = computeTorsionFormula(frozen);
              return fres.valid ? <Steps s={frozen} res={fres} /> : <InputNeededPlaceholder />;
            }}
          </CalcGate>
        </div>
      </div>

      <AiTutorPanel question="중공축 내부는 왜 재료를 없애도 되나요?" />
    </>
  );
}

// 화면에 적히는 수식은 전부 N·mm / mm / mm⁴ 로 맞춰서, 그대로 곱하고 나누면 MPa(N/mm²)가 나오게 했다.
// (입력 단위가 lb·ft, in 이어도 마찬가지 — 단위 변환값을 먼저 보여준 뒤 대입한다.)
function Steps({ s, res }) {
  const IpMM4 = res.Ip * 1e12;
  const T_Nmm = toBase(s.T, s.TUnit, TORQUE_UNITS) * 1000;
  const rMM = res.rOuter * 1000;
  const rInMM = res.rInner * 1000;
  const dLabel = s.sectionType === 'solid_circular' ? `d = ${fmt1(rMM * 2, 2)} mm` : `d₂ = ${fmt1(rMM * 2, 2)} mm, d₁ = ${fmt1(rInMM * 2, 2)} mm`;
  return (
    <>
      <StepCard
        title="Step 1. 극관성모멘트"
        formula={
          s.sectionType === 'solid_circular' ? (
            <>
              Ip = <Frac num="πd⁴" den="32" />
            </>
          ) : (
            <>
              Ip = <Frac num="π(d₂⁴−d₁⁴)" den="32" />
            </>
          )
        }
        eqLines={[dLabel, `Ip = ${fmt1(IpMM4, 2)} mm⁴`]}
        final={`Ip = ${fmt1(IpMM4, 2)} mm⁴`}
      />
      <StepCard
        title="Step 2. 최대 전단응력 (Torsion Formula)"
        formula={
          <>
            τ_max = <Frac num="T·r" den="Ip" />
          </>
        }
        eqLines={[
          `T = ${s.T} ${s.TUnit} = ${fmt1(T_Nmm, 1)} N·mm,  r = ${fmt1(rMM, 2)} mm`,
          <>
            τ_max = <Frac num={`${fmt1(T_Nmm, 1)} × ${fmt1(rMM, 2)}`} den={`${fmt1(IpMM4, 2)}`} />
          </>,
        ]}
        final={`τ_max = ${fmt1(fromBase(res.tauMax, 'MPa', STRESS_UNITS), 3)} MPa`}
      />
      {res.rInner > 0 && (
        <StepCard
          title="Step 3. 내경면 전단응력"
          formula={
            <>
              τ_min = <Frac num="T·r₁" den="Ip" />
            </>
          }
          eqLines={[
            <>
              τ_min = <Frac num={`${fmt1(T_Nmm, 1)} × ${fmt1(rInMM, 2)}`} den={`${fmt1(IpMM4, 2)}`} />
            </>,
          ]}
          final={
            <>
              τ_min = {fmt1(fromBase(res.tauMin, 'MPa', STRESS_UNITS), 3)} MPa (= τ_max × <Frac num="r₁" den="r₂" />)
            </>
          }
        />
      )}
    </>
  );
}

// 단면 위 전단응력 분포 — 중심(또는 내경)에서 표면까지 화살표가 길어지는 선형 분포
function DistributionSVG({ s, res, onEditDim }) {
  const dOuterVal = s.sectionType === 'solid_circular' ? s.dims.d : s.dims.d_outer;
  // 아래에 지름 치수선을 넣을 자리를 두려고 높이를 220에서 늘렸다.
  const w = 280, h = 254, cx = w / 2, cy = 98;
  // 그림 크기는 입력 단위와 무관하게 "실제 몇 mm인가"로 정해서, 단위를 바꿔도 원이 튀지 않게 한다.
  const dMM = toBase(dOuterVal || 0, s.dimUnit, LENGTH_UNITS) * 1000;
  const rOut = scaledPx(dMM, 150, 40, 85);
  const rIn = res.valid && res.rInner > 0 ? rOut * (res.rInner / res.rOuter) : 0;
  const N = 8;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 280, margin: '0 auto', display: 'block', overflow: 'visible' }}>
      <circle cx={cx} cy={cy} r={rOut} fill="var(--crimson-soft)" stroke="var(--crimson)" strokeWidth="1.6" />
      {rIn > 0 && <circle cx={cx} cy={cy} r={rIn} fill="var(--bg)" stroke="var(--crimson)" strokeWidth="1.4" strokeDasharray="3 2" />}
      {Array.from({ length: N }).map((_, i) => {
        const ang = (i * 2 * Math.PI) / N;
        const rStart = rIn > 0 ? rIn : 0;
        const x1 = cx + rStart * Math.cos(ang), y1 = cy + rStart * Math.sin(ang);
        const x2 = cx + rOut * Math.cos(ang), y2 = cy + rOut * Math.sin(ang);
        return (
          <g key={i}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--teal)" strokeWidth="2" />
            <polygon
              points={`${x2},${y2} ${x2 - 6 * Math.cos(ang - 0.4)},${y2 - 6 * Math.sin(ang - 0.4)} ${x2 - 6 * Math.cos(ang + 0.4)},${y2 - 6 * Math.sin(ang + 0.4)}`}
              fill="var(--teal)"
            />
          </g>
        );
      })}
      {/* 치수 — 바깥지름은 아래 치수선으로, 속이 빈 단면이면 안지름도 가운데에 적는다.
          숫자를 클릭하면 그 자리에서 고칠 수 있다. */}
      {rIn > 0 && (
        <Dim
          x={cx}
          y={cy + 4}
          color="var(--crimson)"
          fontSize={10}
          value={s.dims.d_inner}
          unit={s.dimUnit}
          prefix="dᵢ = "
          boxW={52}
          onChange={onEditDim('d_inner')}
        />
      )}
      <DimLineH
        x1={cx - rOut}
        x2={cx + rOut}
        y={cy + rOut + 14}
        labelDy={14}
        color="var(--crimson)"
        fontSize={10.5}
        value={dOuterVal}
        unit={s.dimUnit}
        prefix={rIn > 0 ? 'dₒ = ' : 'd = '}
        boxW={52}
        onChange={onEditDim(s.sectionType === 'solid_circular' ? 'd' : 'd_outer')}
      />
      <text x={cx} y={cy + rOut + 44} fontSize="10.5" fill="var(--gray)" textAnchor="middle">
        τ(ρ) = Tρ/Ip — 중심 0 → 표면 최대(선형)
      </text>
    </svg>
  );
}
