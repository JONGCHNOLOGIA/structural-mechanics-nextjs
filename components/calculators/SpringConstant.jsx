'use client';

import { useMemo, useState } from 'react';
import { computeSpringConstant } from '@/lib/calc/springConstant';
import { LENGTH_UNITS, FORCE_UNITS, STRESS_UNITS, AREA_UNITS, fromBase, fmt1 } from '@/lib/calc/units1';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import Frac from '@/components/Frac';
import { DualField, ToggleRow, ResetButton, ResultGrid, ResultCard, StepCard, ErrorBox, InputNeededPlaceholder } from './sm1/Controls';
import { CalcGate, useCalcGate } from './sm1/CalcGate';
import { AxialForceDiagramBlock, AxialFBD } from './sm1/Diagrams';
import { DimLineH } from './EditableDim';

// CH.2-1 Spring Constant and Flexibility — 원본 renderSpringConstant()의 React 버전.

const DEFAULTS = {
  P: 10, PUnit: 'kN', mode: 'tension',
  A: 500, AUnit: 'mm2',
  L: 1, LUnit: 'm',
  E: 200, EUnit: 'GPa',
  P2: 20, P2Unit: 'kN',
};

export default function SpringConstant() {
  const [s, setS] = useState(DEFAULTS);
  const set = (patch) => setS((prev) => ({ ...prev, ...patch }));
  const setNum = (key) => (v) => set({ [key]: parseFloat(v) });

  const res = useMemo(() => computeSpringConstant(s), [s]);
  const gate = useCalcGate(s);
  const tone = res.valid ? (res.sign > 0 ? 'tens' : 'comp') : undefined;


  return (
    <>
      {/* ---------------- Setting Menu ---------------- */}
      <div className="panel">
        <h3>SETTING MENU</h3>
        <EditableText
          contentKey="calc.SpringConstant.intro"
          defaultText="축방향 부재는 결국 스프링과 같아요. 강성 k=EA/L이 클수록(굵고 짧고 단단할수록) 같은 하중에서 덜 늘어나고, 유연도 f=1/k는 그 반대를 나타냅니다."
          style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.6, marginBottom: 14, background: 'var(--bg)', borderRadius: 0, padding: '12px 14px' }}
        />
        <DualField label="하중 크기 P" value={s.P} min={0} max={200} step={0.5} onChange={setNum('P')}
          unitMap={FORCE_UNITS} unit={s.PUnit} onUnitChange={(v) => set({ PUnit: v })} invalid={!(s.P >= 0)} />
        <ToggleRow
          value={s.mode}
          onChange={(v) => set({ mode: v })}
          options={[
            { value: 'tension', label: 'Tension', tone: 'tens' },
            { value: 'compression', label: 'Compression', tone: 'comp' },
          ]}
        />
        <DualField label="단면적 A" value={s.A} min={1} max={5000} step={1} onChange={setNum('A')}
          unitMap={AREA_UNITS} unit={s.AUnit} onUnitChange={(v) => set({ AUnit: v })} invalid={!(s.A > 0)} />
        <DualField label="부재 길이 L" value={s.L} min={0.01} max={10} step={0.01} onChange={setNum('L')}
          unitMap={LENGTH_UNITS} unit={s.LUnit} onUnitChange={(v) => set({ LUnit: v })} invalid={!(s.L > 0)} />
        <DualField label="탄성계수 E" value={s.E} min={0.1} max={500} step={0.5} onChange={setNum('E')}
          unitMap={STRESS_UNITS} unit={s.EUnit} onUnitChange={(v) => set({ EUnit: v })} invalid={!(s.E > 0)} />
        <div className="hint" style={{ marginBottom: 10 }}>
          아래는 같은 스프링상수 k로 하중이 달라지면 변위가 비례해서 바뀌는 것을 보여주는 비교값입니다.
        </div>
        <DualField label="비교하중 P₂ (선형성 확인용)" value={s.P2} min={0} max={200} step={0.5} onChange={setNum('P2')}
          unitMap={FORCE_UNITS} unit={s.P2Unit} onUnitChange={(v) => set({ P2Unit: v })} />
        <ResetButton onClick={() => setS(DEFAULTS)} />
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="panel">
        <h3>VISUALIZER</h3>
        <SpringSVG mode={s.mode} res={res} length={s.L} lengthUnit={s.LUnit} onEditL={setNum('L')} />
        {res.valid ? (
          <>
            <ResultGrid>
              <ResultCard label="스프링상수 k" value={`${fmt1(res.k / 1e6, 3)} MN/m`} />
              <ResultCard label="유연도 f = 1/k" value={`${fmt1(res.f * 1e6, 4)} µm/N`} />
              <ResultCard label="변위 δ = P/k" value={`${fmt1(fromBase(res.delta_m, 'mm', LENGTH_UNITS), 4)} mm`} tone={tone} />
              <ResultCard label="P₂일 때 δ₂ (선형 비교)" value={`${fmt1(fromBase(res.delta2_m, 'mm', LENGTH_UNITS), 4)} mm`} full />
            </ResultGrid>
            <EditableText as="div" className="ai-hint" contentKey="calc.SpringConstant.aiHint"
              defaultText="💬 스프링상수 k가 클수록 왜 변위가 작아지는지, 오른쪽 AI 튜터에게 물어보세요." />
            <h3 style={{ marginTop: 20 }}>자유물체도 (Free Body Diagram)</h3>
            <AxialFBD P={s.P} unitP={s.PUnit} sign={res.sign}
              reactionLabel={`R = ${fmt1(s.P, 2)} ${s.PUnit}`} appliedLabel={`P = ${fmt1(s.P, 2)} ${s.PUnit}`} />
            <div className="hint">
              {res.sign >= 0 ? '인장' : '압축'}: 지지부 반력과 하중이 서로 반대방향으로 작용해 평형(ΣF=0)을 이루고, 부재를 가상으로 자르면 어느
              위치에서나 내부 축력 N이 동일하게 노출됩니다.
            </div>
            <AxialForceDiagramBlock signedP={res.sign * s.P} L={s.L} unitP={s.PUnit} unitL={s.LUnit} onEditL={setNum('L')} />
          </>
        ) : (
          <ErrorBox errors={res.errors} />
        )}

        <div className="steps" style={{ marginTop: 20 }}>
          <CalcGate gate={gate}>
            {(frozen) => {
              const fres = computeSpringConstant(frozen);
              return <Steps s={frozen} res={fres} />;
            }}
          </CalcGate>
        </div>
      </div>

      <AiTutorPanel question="스프링상수 개념이 왜 부정정 구조 해석에 쓰이나요?" />
    </>
  );
}

function Steps({ s, res }) {
  const tone = res.sign > 0 ? 'tens' : 'comp';
  return (
    <>
          {res.valid ? (
            <>
              <StepCard
                title="Step 1. Axial Rigidity & Spring Constant"
                formula={
                  <>
                    k = <Frac num="EA" den="L" />
                  </>
                }
                eqLines={[
                  <>
                    k = <Frac num={`${s.E} ${s.EUnit} × ${s.A} ${s.AUnit}`} den={`${s.L} ${s.LUnit}`} />
                  </>,
                ]}
                final={`k = ${fmt1(res.k / 1e6, 3)} MN/m`}
              />
              <StepCard
                title="Step 2. Flexibility"
                formula={
                  <>
                    f = <Frac num="1" den="k" /> = <Frac num="L" den="EA" />
                  </>
                }
                eqLines={[
                  <>
                    f = <Frac num="1" den={`${fmt1(res.k / 1e6, 3)} MN/m`} />
                  </>,
                ]}
                final={`f = ${fmt1(res.f * 1e6, 4)} µm/N`}
              />
              <StepCard
                title="Step 3. Displacement"
                formula={
                  <>
                    δ = <Frac num="P" den="k" /> = <Frac num="PL" den="EA" />
                  </>
                }
                eqLines={[
                  <>
                    δ = <Frac num={`${s.P} ${s.PUnit}`} den={`${fmt1(res.k / 1e6, 3)} MN/m`} />
                  </>,
                ]}
                final={
                  <>
                    δ = <span className={tone}>{fmt1(fromBase(res.delta_m, 'mm', LENGTH_UNITS), 4)} mm</span>
                  </>
                }
              />
            </>
          ) : (
            <InputNeededPlaceholder />
          )}
    </>
  );
}

// 고정단에 매달린 스프링이 하중 방향으로 늘어나거나 눌리는 모습 (δ는 보이도록 과장 표현)
function SpringSVG({ mode, res, length, lengthUnit, onEditL }) {
  // 아래쪽에 길이 치수선을 넣을 자리를 두려고 높이를 170에서 늘렸다.
  const w = 440, h = 206, x1 = 60, x2 = 340, y = 85, coils = 8;
  const color = mode === 'tension' ? 'var(--teal)' : 'var(--crimson)';
  const extra = res.valid ? Math.max(-40, Math.min(40, res.sign * 30)) : 0;
  const springEnd = x2 + extra;
  const segW = (springEnd - x1) / coils;

  let path = `M ${x1} ${y}`;
  for (let i = 0; i < coils; i++) {
    const cx = x1 + segW * (i + 0.5);
    path += ` L ${cx} ${y + (i % 2 === 0 ? -16 : 16)}`;
  }
  path += ` L ${springEnd} ${y}`;

  const arrowDir = res.valid && res.sign > 0 ? 1 : -1;
  const tipX = springEnd + 30 + arrowDir * 30;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 440, margin: '0 auto', display: 'block', overflow: 'visible' }}>
      <line x1={x1 - 10} y1={y - 25} x2={x1 - 10} y2={y + 25} stroke="#51626F" strokeWidth="2" />
      {Array.from({ length: 6 }).map((_, i) => {
        const yy = y - 22 + i * 8;
        return <line key={i} x1={x1 - 10} y1={yy} x2={x1 - 18} y2={yy + 8} stroke="#8A97A2" strokeWidth="1.2" />;
      })}
      <path d={path} fill="none" stroke={color} strokeWidth="2.4" />
      <rect x={springEnd} y={y - 16} width="26" height="32" fill={color} opacity="0.25" stroke={color} strokeWidth="1.6" />
      <line x1={springEnd + 30} y1={y} x2={tipX} y2={y} stroke={color} strokeWidth="2.4" />
      <polygon points={`${tipX},${y} ${springEnd + 30 + arrowDir * 21},${y - 6} ${springEnd + 30 + arrowDir * 21},${y + 6}`} fill={color} />
      <text x={springEnd + 30 + arrowDir * 15} y={y - 14} fontSize="11" fontWeight="800" fill={color} textAnchor="middle">
        P
      </text>
      {/* 원래 길이 L 치수 — 클릭해서 고칠 수 있다. 그림의 늘어난 길이는 δ를 확대해 그린 것이라
          치수선은 변형 전 길이(x1~x2) 기준으로 긋는다. */}
      <DimLineH
        x1={x1}
        x2={x2}
        y={y + 46}
        labelDy={14}
        fontSize={10.5}
        value={length}
        unit={lengthUnit}
        prefix="L = "
        boxW={56}
        onChange={onEditL}
      />
      <text x={(x1 + springEnd) / 2} y={y + 80} fontSize="10.5" fill="var(--gray)" textAnchor="middle">
        k = EA/L (그림은 δ를 확대 표현)
      </text>
    </svg>
  );
}
