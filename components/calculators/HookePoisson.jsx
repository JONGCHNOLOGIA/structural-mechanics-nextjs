'use client';

import { useMemo, useState } from 'react';
import { computeHookePoisson } from '@/lib/calc/hookePoisson';
import { LENGTH_UNITS, FORCE_UNITS, STRESS_UNITS, AREA_UNITS, toBase, fromBase, fmt1 } from '@/lib/calc/units1';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import {
  DualField,
  ToggleRow,
  SelectField,
  ResetButton,
  ResultGrid,
  ResultCard,
  StepCard,
  ErrorBox,
  InputNeededPlaceholder,
  DiagramSkipNote,
} from './sm1/Controls';
import { CalcGate, useCalcGate } from './sm1/CalcGate';
import { AxialForceDiagramBlock, AxialFBD } from './sm1/Diagrams';

// CH.1-3 Hooke's Law and Poisson's Ratio — 원본 renderHookePoisson()의 React 버전.

const DEFAULTS = {
  mode: 'load',
  T: 'tension',
  P: 10,
  PUnit: 'kN',
  A: 500,
  AUnit: 'mm2',
  sigma: 20,
  sigmaUnit: 'MPa',
  E: 200,
  EUnit: 'GPa',
  nu: 0.3,
  L: 1,
  LUnit: 'm',
  w: 20,
  wUnit: 'mm',
};

export default function HookePoisson() {
  const [s, setS] = useState(DEFAULTS);
  const set = (patch) => setS((prev) => ({ ...prev, ...patch }));
  const setNum = (key) => (v) => set({ [key]: parseFloat(v) });

  const res = useMemo(() => computeHookePoisson(s), [s]);
  const gate = useCalcGate(s);
  const tone = res.valid ? (res.sign > 0 ? 'tens' : 'comp') : undefined;
  const toneOpp = tone === 'tens' ? 'comp' : 'tens'; // 횡방향은 종방향과 반대 부호


  return (
    <>
      {/* ---------------- Setting Menu ---------------- */}
      <div className="panel">
        <h3>SETTING MENU</h3>
        <EditableText
          contentKey="calc.HookePoisson.intro"
          defaultText="선형탄성 구간에서 ε=σ/E로 길이방향 변형률을 구하고, Poisson 효과(ε_lat = −ν·ε_long)로 폭이 어떻게 변하는지 함께 봅니다. 인장이면 길어지면서 가늘어지고, 압축이면 짧아지면서 굵어져요."
          style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.6, marginBottom: 14, background: 'var(--bg)', borderRadius: 0, padding: '12px 14px' }}
        />
        <SelectField
          label="입력 방식"
          value={s.mode}
          onChange={(v) => set({ mode: v })}
          options={[
            { value: 'load', label: 'Load 입력 (P, A)' },
            { value: 'stress', label: 'Stress 직접 입력 (σ)' },
          ]}
        />
        <ToggleRow
          value={s.T}
          onChange={(v) => set({ T: v })}
          options={[
            { value: 'tension', label: 'Tension', tone: 'tens' },
            { value: 'compression', label: 'Compression', tone: 'comp' },
          ]}
        />
        {s.mode === 'load' ? (
          <>
            <DualField label="하중 P" value={s.P} min={0} max={200} step={0.5} onChange={setNum('P')}
              unitMap={FORCE_UNITS} unit={s.PUnit} onUnitChange={(v) => set({ PUnit: v })} invalid={!(s.P >= 0)} />
            <DualField label="단면적 A" value={s.A} min={1} max={5000} step={1} onChange={setNum('A')}
              unitMap={AREA_UNITS} unit={s.AUnit} onUnitChange={(v) => set({ AUnit: v })} invalid={!(s.A > 0)} />
          </>
        ) : (
          <DualField label="수직응력 σ (직접 입력)" value={s.sigma} min={0} max={500} step={0.5} onChange={setNum('sigma')}
            unitMap={STRESS_UNITS} unit={s.sigmaUnit} onUnitChange={(v) => set({ sigmaUnit: v })} invalid={!(s.sigma >= 0)} />
        )}
        <DualField label="탄성계수 E" value={s.E} min={0.1} max={500} step={0.5} onChange={setNum('E')}
          unitMap={STRESS_UNITS} unit={s.EUnit} onUnitChange={(v) => set({ EUnit: v })} invalid={!(s.E > 0)} />
        <DualField label="Poisson's ratio ν (무차원)" value={s.nu} min={-0.99} max={0.5} step={0.01} onChange={setNum('nu')}
          invalid={!(s.nu > -1 && s.nu <= 0.5)} hint="일반적으로 0 ~ 0.5 범위 (등방성 탄성체는 -1 < ν ≤ 0.5)" />
        <DualField label="초기 길이 L (Longitudinal)" value={s.L} min={0.01} max={10} step={0.01} onChange={setNum('L')}
          unitMap={LENGTH_UNITS} unit={s.LUnit} onUnitChange={(v) => set({ LUnit: v })} invalid={!(s.L > 0)} />
        <DualField label="초기 폭/직경 w (Lateral)" value={s.w} min={0.1} max={500} step={0.5} onChange={setNum('w')}
          unitMap={LENGTH_UNITS} unit={s.wUnit} onUnitChange={(v) => set({ wUnit: v })} invalid={!(s.w > 0)} />
        <ResetButton onClick={() => setS(DEFAULTS)} />
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="panel">
        <h3>VISUALIZER</h3>
        <MemberSVG mode={s.T} res={res} />
        {res.valid ? (
          <>
            <ResultGrid>
              <ResultCard label="응력 σ" value={`${fmt1(fromBase(res.sigma_Pa, 'MPa', STRESS_UNITS), 2)} MPa`} tone={tone} />
              <ResultCard label="ε longitudinal" value={`${fmt1(res.epsLong * 1e6, 1)} µ`} tone={tone} />
              <ResultCard label="ε lateral" value={`${fmt1(res.epsLat * 1e6, 1)} µ`} tone={toneOpp} />
              <ResultCard label="ΔL" value={`${fmt1(fromBase(res.deltaL_m, 'mm', LENGTH_UNITS), 4)} mm`} tone={tone} />
              <ResultCard label="Δw" value={`${fmt1(fromBase(res.deltaW_m, 'mm', LENGTH_UNITS), 4)} mm`} tone={toneOpp} full />
            </ResultGrid>
            <EditableText as="div" className="ai-hint" contentKey="calc.HookePoisson.aiHint"
              defaultText="💬 왜 인장이면 폭이 줄어드는지, Poisson 효과를 오른쪽 AI 튜터에게 물어보세요." />
            {s.mode === 'load' ? (
              <>
                <h3 style={{ marginTop: 20 }}>자유물체도 (Free Body Diagram)</h3>
                <AxialFBD P={s.P} unitP={s.PUnit} sign={res.sign}
                  reactionLabel={`R = ${fmt1(s.P, 2)} ${s.PUnit}`} appliedLabel={`P = ${fmt1(s.P, 2)} ${s.PUnit}`} />
                <div className="hint">
                  {res.sign >= 0 ? '인장' : '압축'}: 지지부 반력과 하중이 서로 반대방향으로 작용해 평형(ΣF=0)을 이루고, 부재를 가상으로 자르면 어느
                  위치에서나 내부 축력 N이 동일하게 노출됩니다.
                </div>
                <AxialForceDiagramBlock signedP={res.sign * s.P} L={s.L} unitP={s.PUnit} unitL={s.LUnit} />
              </>
            ) : (
              <DiagramSkipNote>
                Stress 직접 입력 모드에서는 등가 하중 P 값이 없어 축력도와 자유물체도를 그리지 않습니다. Load 입력 모드로 전환하면 함께 표시됩니다.
              </DiagramSkipNote>
            )}
          </>
        ) : (
          <ErrorBox errors={res.errors} />
        )}

        <div className="steps" style={{ marginTop: 20 }}>
          <CalcGate gate={gate}>
            {(frozen) => {
              const fres = computeHookePoisson(frozen);
              return fres.valid ? <Steps s={frozen} res={fres} /> : <InputNeededPlaceholder />;
            }}
          </CalcGate>
        </div>
      </div>

      <AiTutorPanel question="음의 Poisson 비를 가지는 재료가 실제로 있나요?" />
    </>
  );
}

function Steps({ s, res }) {
  const tone = res.sign > 0 ? 'tens' : 'comp';
  const sigmaStep =
    s.mode === 'load' ? [`σ = P/A = ${s.P} ${s.PUnit} / ${s.A} ${s.AUnit}`] : [`σ = ${s.sigma} ${s.sigmaUnit} (직접 입력)`];
  return (
    <>
      <StepCard
        title="Step 1. Normal Stress"
        formula={s.mode === 'load' ? 'σ = P / A' : 'σ (직접 입력)'}
        eqLines={sigmaStep}
        final={
          <>
            σ = <span className={tone}>{fmt1(fromBase(res.sigma_Pa, 'MPa', STRESS_UNITS), 2)} MPa</span> ({res.sign > 0 ? '인장' : '압축'})
          </>
        }
      />
      <StepCard
        title="Step 2. Longitudinal Strain"
        formula="ε_long = σ / E"
        eqLines={[`ε_long = ${fmt1(res.sigma_Pa, 0)} Pa / ${fmt1(toBase(s.E, s.EUnit, STRESS_UNITS), 0)} Pa`]}
        final={`ε_long = ${fmt1(res.epsLong * 1e6, 1)} × 10⁻⁶`}
      />
      <StepCard
        title="Step 3. Lateral Strain (Poisson)"
        formula="ε_lat = −ν × ε_long"
        eqLines={[`ε_lat = −(${s.nu}) × ${fmt1(res.epsLong * 1e6, 1)}×10⁻⁶`]}
        final={`ε_lat = ${fmt1(res.epsLat * 1e6, 1)} × 10⁻⁶`}
      />
      <StepCard
        title="Step 4. Longitudinal Deformation"
        formula="ΔL = ε_long × L"
        eqLines={[`ΔL = ${fmt1(res.epsLong * 1e6, 1)}×10⁻⁶ × ${s.L} ${s.LUnit}`]}
        final={`ΔL = ${fmt1(fromBase(res.deltaL_m, 'mm', LENGTH_UNITS), 4)} mm`}
      />
      <StepCard
        title="Step 5. Lateral Deformation"
        formula="Δw = ε_lat × w"
        eqLines={[`Δw = ${fmt1(res.epsLat * 1e6, 1)}×10⁻⁶ × ${s.w} ${s.wUnit}`]}
        final={`Δw = ${fmt1(fromBase(res.deltaW_m, 'mm', LENGTH_UNITS), 4)} mm`}
      />
    </>
  );
}

// 하중을 받은 부재가 길이방향으로 늘거나 줄면서 폭은 반대로 변하는 모습 (변형은 과장 표현)
function MemberSVG({ mode, res }) {
  const w = 460, h = 220, cx = 230, baseW = 220, baseH = 70;
  const color = mode === 'tension' ? 'var(--teal)' : 'var(--crimson)';
  const ampL = res.valid ? (res.sign > 0 ? 26 : -26) : 0;
  const ampW = res.valid ? (res.sign > 0 ? -16 : 16) : 0;
  const defW = Math.max(30, baseW + ampL * 2);
  const defH = Math.max(14, baseH + ampW);
  const arrowDir = res.valid && res.sign > 0 ? 1 : -1;
  const ax1 = cx - defW / 2, ax2 = cx + defW / 2;
  const latX = cx + defW / 2 + 34;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 480, margin: '0 auto', display: 'block' }}>
      <rect x={cx - baseW / 2} y={h / 2 - baseH / 2} width={baseW} height={baseH} fill="none" stroke="#C3C3C3" strokeWidth="1.3" strokeDasharray="4 3" />
      <rect x={cx - defW / 2} y={h / 2 - defH / 2} width={defW} height={defH} fill={color} opacity="0.18" stroke={color} strokeWidth="1.8" />
      <line x1={ax1 - arrowDir * 22} y1={h / 2} x2={ax1 - 6} y2={h / 2} stroke={color} strokeWidth="2.2" />
      <line x1={ax2 + 6} y1={h / 2} x2={ax2 + arrowDir * 22} y2={h / 2} stroke={color} strokeWidth="2.2" />
      <text x={cx} y={h / 2 - defH / 2 - 14} fontSize="11" fill={color} textAnchor="middle" fontWeight="800">
        Longitudinal (L)
      </text>
      <text x={latX} y={h / 2} fontSize="11" fill={color} textAnchor="middle" fontWeight="800" transform={`rotate(90 ${latX} ${h / 2})`}>
        Lateral (w)
      </text>
    </svg>
  );
}
