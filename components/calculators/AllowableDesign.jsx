'use client';

import { useMemo, useState } from 'react';
import { computeAllowableDesign } from '@/lib/calc/allowableDesign';
import { LENGTH_UNITS, FORCE_UNITS, STRESS_UNITS, fromBase, fmt1, scaledPx } from '@/lib/calc/units1';
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
import { AxisPlaneNote, AxialFBD } from './sm1/Diagrams';

// CH.1-5 Allowable Stresses and Design — 원본 renderAllowableDesign()의 React 버전.
// Mode A는 "이 단면이 버티나?", B는 "얼마까지 실을 수 있나?", C는 "얼마나 굵어야 하나?"를 푼다.

const DEFAULTS = {
  mode: 'A',
  useFOS: false,
  sigmaAllow: 150,
  stressUnit: 'MPa',
  failureStrength: 250,
  n: 2.0,
  P: 50,
  PUnit: 'kN',
  sectionType: 'solid_circular',
  dims: { d: 25, d_outer: 30, d_inner: 20, b: 20, h: 30 },
  dimUnit: 'mm',
};

const MODE_OPTIONS = [
  { value: 'A', label: 'A — Safety Check' },
  { value: 'B', label: 'B — Allowable Load' },
  { value: 'C', label: 'C — Required Area / Size' },
];
const SECTION_OPTIONS = [
  { value: 'solid_circular', label: 'Solid Circular' },
  { value: 'hollow_circular', label: 'Hollow Circular' },
  { value: 'rectangular', label: 'Rectangular' },
];

export default function AllowableDesign() {
  const [s, setS] = useState(DEFAULTS);
  const set = (patch) => setS((prev) => ({ ...prev, ...patch }));
  const setNum = (key) => (v) => set({ [key]: parseFloat(v) });
  const setDim = (key) => (v) => setS((prev) => ({ ...prev, dims: { ...prev.dims, [key]: parseFloat(v) } }));

  const res = useMemo(() => computeAllowableDesign(s), [s]);
  const gate = useCalcGate(s);
  const areaScale = Math.pow(LENGTH_UNITS[s.dimUnit], 2);
  const needP = s.mode === 'A' || s.mode === 'C';

  const dReq = res.d_required_m !== undefined ? fromBase(res.d_required_m, s.dimUnit, LENGTH_UNITS) : undefined;
  const dInReq = res.d_inner_required_m !== undefined ? fromBase(res.d_inner_required_m, s.dimUnit, LENGTH_UNITS) : undefined;
  const hReq = res.h_required_m !== undefined ? fromBase(res.h_required_m, s.dimUnit, LENGTH_UNITS) : undefined;


  return (
    <>
      {/* ---------------- Setting Menu ---------------- */}
      <div className="panel">
        <h3>SETTING MENU</h3>
        <EditableText
          contentKey="calc.AllowableDesign.intro"
          defaultText="허용응력을 기준으로 (A) 지금 단면이 안전한지 판정하거나, (B) 실을 수 있는 최대 하중을 구하거나, (C) 필요한 단면 치수를 역산해봐요. 안전율 n을 쓰면 파괴강도를 n으로 나눠 허용응력을 정합니다."
          style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.6, marginBottom: 14, background: 'var(--bg)', borderRadius: 0, padding: '12px 14px' }}
        />
        <SelectField label="Mode" value={s.mode} options={MODE_OPTIONS} onChange={(v) => set({ mode: v })} />
        <ToggleRow
          value={s.useFOS ? 'fos' : 'direct'}
          onChange={(v) => set({ useFOS: v === 'fos' })}
          options={[
            { value: 'direct', label: 'σ_allow 직접입력' },
            { value: 'fos', label: 'Factor of Safety' },
          ]}
        />
        {s.useFOS ? (
          <>
            <DualField label="파괴강도 (failure strength)" value={s.failureStrength} min={1} max={1000} step={1}
              onChange={setNum('failureStrength')} unitMap={STRESS_UNITS} unit={s.stressUnit}
              onUnitChange={(v) => set({ stressUnit: v })} invalid={!(s.failureStrength > 0)} />
            <DualField label="안전율 n = failure strength / allowable stress" value={s.n} min={1} max={10} step={0.1}
              onChange={setNum('n')} invalid={!(s.n > 0)} />
          </>
        ) : (
          <DualField label="허용응력 σ_allow" value={s.sigmaAllow} min={1} max={1000} step={1}
            onChange={setNum('sigmaAllow')} unitMap={STRESS_UNITS} unit={s.stressUnit}
            onUnitChange={(v) => set({ stressUnit: v })} invalid={!(s.sigmaAllow > 0)} />
        )}
        {needP && (
          <DualField label="하중 P" value={s.P} min={0} max={200} step={0.5} onChange={setNum('P')}
            unitMap={FORCE_UNITS} unit={s.PUnit} onUnitChange={(v) => set({ PUnit: v })} invalid={!(s.P >= 0)} />
        )}
        <SelectField label="단면 형상" value={s.sectionType} options={SECTION_OPTIONS} onChange={(v) => set({ sectionType: v })} />

        {s.sectionType === 'solid_circular' && (
          <DualField label="직경 d" value={s.dims.d} min={1} max={200} step={0.5} onChange={setDim('d')}
            unitMap={LENGTH_UNITS} unit={s.dimUnit} onUnitChange={(v) => set({ dimUnit: v })} invalid={!(s.dims.d > 0)} />
        )}
        {s.sectionType === 'hollow_circular' && (
          <>
            <DualField label={`외경 d₂ ${s.mode === 'C' ? '(고정)' : ''}`} value={s.dims.d_outer} min={1} max={200} step={0.5}
              onChange={setDim('d_outer')} unitMap={LENGTH_UNITS} unit={s.dimUnit}
              onUnitChange={(v) => set({ dimUnit: v })} invalid={!(s.dims.d_outer > 0)} />
            {s.mode !== 'C' ? (
              <DualField label="내경 d₁" value={s.dims.d_inner} min={0.5} max={200} step={0.5} onChange={setDim('d_inner')}
                unitMap={LENGTH_UNITS} unit={s.dimUnit} onUnitChange={(v) => set({ dimUnit: v })}
                invalid={!(s.dims.d_inner > 0 && s.dims.d_inner < s.dims.d_outer)} />
            ) : (
              <EditableText as="div" className="hint" style={{ marginBottom: 10 }} contentKey="allowableDesign.modeCOuterHint" defaultText="Mode C에서는 외경만 고정하고 내경을 역산합니다." />
            )}
          </>
        )}
        {s.sectionType === 'rectangular' && (
          <>
            <DualField label={`폭 b ${s.mode === 'C' ? '(고정)' : ''}`} value={s.dims.b} min={1} max={200} step={0.5}
              onChange={setDim('b')} unitMap={LENGTH_UNITS} unit={s.dimUnit}
              onUnitChange={(v) => set({ dimUnit: v })} invalid={!(s.dims.b > 0)} />
            {s.mode !== 'C' ? (
              <DualField label="높이 h" value={s.dims.h} min={1} max={200} step={0.5} onChange={setDim('h')}
                unitMap={LENGTH_UNITS} unit={s.dimUnit} onUnitChange={(v) => set({ dimUnit: v })} invalid={!(s.dims.h > 0)} />
            ) : (
              <EditableText as="div" className="hint" style={{ marginBottom: 10 }} contentKey="allowableDesign.modeCWidthHint" defaultText="Mode C에서는 폭(b)만 고정하고 높이(h)를 역산합니다." />
            )}
          </>
        )}
        <ResetButton onClick={() => setS(DEFAULTS)} />
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="panel">
        <h3>VISUALIZER</h3>
        {res.valid ? (
          <>
            <SectionSVG s={s} dRequired={dReq} hRequired={hReq} />
            {s.mode === 'A' && (
              <>
                <ResultGrid>
                  <ResultCard label="실제응력 σ_actual" value={`${fmt1(fromBase(res.sigma_actual_Pa, 'MPa', STRESS_UNITS), 2)} MPa`} />
                  <ResultCard label="허용응력 σ_allow" value={`${fmt1(fromBase(res.sigma_allow_Pa, 'MPa', STRESS_UNITS), 2)} MPa`} />
                  <ResultCard label="Utilization Ratio" value={fmt1(res.ratio, 3)} full />
                </ResultGrid>
                <Gauge
                  actual={fromBase(res.sigma_actual_Pa, 'MPa', STRESS_UNITS)}
                  allowable={fromBase(res.sigma_allow_Pa, 'MPa', STRESS_UNITS)}
                />
              </>
            )}
            {s.mode === 'B' && (
              <ResultGrid>
                <ResultCard label="단면적 A" value={`${fmt1(res.A_m2 / areaScale, 2)} ${s.dimUnit}²`} />
                <ResultCard label="허용응력 σ_allow" value={`${fmt1(fromBase(res.sigma_allow_Pa, 'MPa', STRESS_UNITS), 2)} MPa`} />
                <ResultCard label="허용하중 P_allow" value={`${fmt1(fromBase(res.P_allow_N, 'kN', FORCE_UNITS), 3)} kN`} full />
              </ResultGrid>
            )}
            {s.mode === 'C' && (
              <ResultGrid>
                <ResultCard label="필요 단면적 A_required" value={`${fmt1(res.A_required_m2 / areaScale, 2)} ${s.dimUnit}²`} />
                <ResultCard label="허용응력 σ_allow" value={`${fmt1(fromBase(res.sigma_allow_Pa, 'MPa', STRESS_UNITS), 2)} MPa`} />
                {dReq !== undefined && <ResultCard label="필요 직경 d_required" value={`${fmt1(dReq, 2)} ${s.dimUnit}`} full />}
                {dInReq !== undefined && <ResultCard label="필요 내경 d₁_required" value={`${fmt1(dInReq, 2)} ${s.dimUnit}`} full />}
                {hReq !== undefined && <ResultCard label="필요 높이 h_required" value={`${fmt1(hReq, 2)} ${s.dimUnit}`} full />}
              </ResultGrid>
            )}
            <AxisPlaneNote />
          </>
        ) : (
          <ErrorBox errors={res.errors} />
        )}

        <EditableText as="div" className="ai-hint" contentKey="calc.AllowableDesign.aiHint"
          defaultText="💬 안전율(n)과 허용응력의 관계가 궁금하면 오른쪽 AI 튜터에게 물어보세요." />

        {res.valid && (
          <>
            <h3 style={{ marginTop: 20 }}>자유물체도 (Free Body Diagram)</h3>
            {s.mode === 'B' ? (
              <AxialFBD
                P={fromBase(res.P_allow_N, 'kN', FORCE_UNITS)}
                unitP="kN"
                sign={1}
                reactionLabel={`R = ${fmt1(fromBase(res.P_allow_N, 'kN', FORCE_UNITS), 2)} kN`}
                appliedLabel={`P_allow = ${fmt1(fromBase(res.P_allow_N, 'kN', FORCE_UNITS), 2)} kN`}
              />
            ) : (
              <AxialFBD P={s.P} unitP={s.PUnit} sign={1}
                reactionLabel={`R = ${fmt1(s.P, 2)} ${s.PUnit}`} appliedLabel={`P = ${fmt1(s.P, 2)} ${s.PUnit}`} />
            )}
            <div className="hint">
              인장: 지지부 반력과 하중이 서로 반대방향으로 작용해 평형(ΣF=0)을 이루고, 부재를 가상으로 자르면 어느 위치에서나 내부 축력 N이 동일하게
              노출됩니다.
            </div>
            <DiagramSkipNote>
              이 소주제는 부재 길이(L)를 입력받지 않는 단면 판정/설계 도구라서, 위치에 따른 값 변화를 그리는 축력도(N-x)는 표시하지 않습니다. 부재
              길이에 따른 변화가 궁금하면 Normal Stress and Strain 소주제를 참고하세요.
            </DiagramSkipNote>
          </>
        )}

        <div className="steps" style={{ marginTop: 20 }}>
          <CalcGate gate={gate}>
            {(frozen) => {
              const fres = computeAllowableDesign(frozen);
              return fres.valid ? <Steps s={frozen} res={fres} /> : <InputNeededPlaceholder />;
            }}
          </CalcGate>
        </div>
      </div>

      <AiTutorPanel question="안전율이 클수록 항상 좋은 건가요?" />
    </>
  );
}

function Steps({ s, res }) {
  const areaScale = Math.pow(LENGTH_UNITS[s.dimUnit], 2);
  const allowStep = s.useFOS ? (
    <StepCard
      title="Step 0. Allowable Stress from Factor of Safety"
      formula="σ_allow = failure strength / n"
      eqLines={[`σ_allow = ${s.failureStrength} ${s.stressUnit} / ${s.n}`]}
      final={`σ_allow = ${fmt1(fromBase(res.sigma_allow_Pa, 'MPa', STRESS_UNITS), 2)} MPa`}
    />
  ) : null;

  if (s.mode === 'A') {
    const A_disp = res.A_m2 / areaScale;
    return (
      <>
        {allowStep}
        <StepCard
          title="Step 1. Actual Stress"
          formula="σ_actual = P / A"
          eqLines={[`σ_actual = ${s.P} ${s.PUnit} / ${fmt1(A_disp, 2)} ${s.dimUnit}²`]}
          final={`σ_actual = ${fmt1(fromBase(res.sigma_actual_Pa, 'MPa', STRESS_UNITS), 2)} MPa`}
        />
        <StepCard
          title="Step 2. Safety Judgement"
          formula="σ_actual ≤ σ_allow ?"
          eqLines={[
            `${fmt1(fromBase(res.sigma_actual_Pa, 'MPa', STRESS_UNITS), 2)} MPa ${res.safe ? '≤' : '>'} ${fmt1(
              fromBase(res.sigma_allow_Pa, 'MPa', STRESS_UNITS), 2)} MPa`,
          ]}
          final={
            <>
              <span className={res.safe ? 'tens' : 'comp'}>{res.safe ? 'SAFE' : 'NOT SAFE'}</span> (utilization = {fmt1(res.ratio, 3)})
            </>
          }
        />
      </>
    );
  }

  if (s.mode === 'B') {
    const A_disp = res.A_m2 / areaScale;
    return (
      <>
        {allowStep}
        <StepCard title="Step 1. Cross-sectional Area" formula="단면 형상에 따른 A 계산"
          eqLines={[`A = ${fmt1(A_disp, 2)} ${s.dimUnit}²`]} final={`A = ${fmt1(A_disp, 2)} ${s.dimUnit}²`} />
        <StepCard
          title="Step 2. Allowable Load"
          formula="P_allow = σ_allow × A"
          eqLines={[`P_allow = ${fmt1(fromBase(res.sigma_allow_Pa, 'MPa', STRESS_UNITS), 2)} MPa × ${fmt1(A_disp, 2)} ${s.dimUnit}²`]}
          final={`P_allow = ${fmt1(fromBase(res.P_allow_N, 'kN', FORCE_UNITS), 3)} kN`}
        />
      </>
    );
  }

  const Areq_disp = res.A_required_m2 / areaScale;
  let shapeStep = null;
  if (res.d_required_m !== undefined) {
    shapeStep = (
      <StepCard title="Step 2. Required Diameter" formula="d_required = √(4·A_required/π)"
        eqLines={[`d_required = √(4 × ${fmt1(Areq_disp, 2)} ${s.dimUnit}² / π)`]}
        final={`d_required = ${fmt1(fromBase(res.d_required_m, s.dimUnit, LENGTH_UNITS), 2)} ${s.dimUnit}`} />
    );
  } else if (res.d_inner_required_m !== undefined) {
    shapeStep = (
      <StepCard title="Step 2. Required Inner Diameter" formula="d₁_required = √(d₂² − 4·A_required/π)"
        eqLines={[`d₁_required = √((${s.dims.d_outer})² − 4×${fmt1(Areq_disp, 2)}/π) ${s.dimUnit}`]}
        final={`d₁_required = ${fmt1(fromBase(res.d_inner_required_m, s.dimUnit, LENGTH_UNITS), 2)} ${s.dimUnit}`} />
    );
  } else if (res.h_required_m !== undefined) {
    shapeStep = (
      <StepCard title="Step 2. Required Height" formula="h_required = A_required / b"
        eqLines={[`h_required = ${fmt1(Areq_disp, 2)} ${s.dimUnit}² / ${s.dims.b} ${s.dimUnit}`]}
        final={`h_required = ${fmt1(fromBase(res.h_required_m, s.dimUnit, LENGTH_UNITS), 2)} ${s.dimUnit}`} />
    );
  }

  return (
    <>
      {allowStep}
      <StepCard
        title="Step 1. Required Area"
        formula="A_required = P / σ_allow"
        eqLines={[`A_required = ${s.P} ${s.PUnit} / ${fmt1(fromBase(res.sigma_allow_Pa, 'MPa', STRESS_UNITS), 2)} MPa`]}
        final={`A_required = ${fmt1(Areq_disp, 2)} ${s.dimUnit}²`}
      />
      {shapeStep}
    </>
  );
}

// 실제응력이 허용응력의 몇 %인지 보여주는 막대. 검은 눈금이 허용치(100%) 위치이고, 눈금을 넘으면 붉게 변한다.
function Gauge({ actual, allowable }) {
  const ratio = allowable > 0 ? actual / allowable : 0;
  const pct = (Math.min(ratio, 1.4) / 1.4) * 100;
  const safe = actual <= allowable;
  return (
    <div className="gauge-wrap">
      <div className="gauge-track">
        <div className={'gauge-fill ' + (safe ? 'safe' : 'unsafe')} style={{ width: `${pct}%` }} />
        <div className="gauge-marker" style={{ left: `${100 / 1.4}%` }} />
      </div>
      <div className="gauge-labels">
        <span>Actual: {fmt1(actual, 2)} MPa</span>
        <span>Allowable: {fmt1(allowable, 2)} MPa</span>
      </div>
      <div style={{ textAlign: 'center', marginTop: 8 }}>
        <span className={'badge ' + (safe ? 'safe' : 'unsafe')}>{safe ? 'SAFE' : 'NOT SAFE'}</span>
      </div>
    </div>
  );
}

// Mode C에서는 역산된 치수(d_required / h_required)를 그림에 그대로 반영해서 보여준다.
function SectionSVG({ s, dRequired, hRequired }) {
  const w = 220, h = 200, cx = w / 2, cy = h / 2 - 6;
  let shape;
  if (s.sectionType === 'solid_circular') {
    const r = scaledPx(dRequired !== undefined ? dRequired : s.dims.d, 150, 25, 85);
    shape = (
      <>
        <circle cx={cx} cy={cy} r={r} fill="var(--teal-soft)" stroke="var(--teal)" strokeWidth="1.6" />
        <text x={cx} y={cy + r + 26} fontSize="11" textAnchor="middle" fill="var(--gray)">
          {dRequired !== undefined ? `d_required = ${fmt1(dRequired, 2)} ${s.dimUnit}` : `d = ${fmt1(s.dims.d, 2)} ${s.dimUnit}`}
        </text>
      </>
    );
  } else if (s.sectionType === 'hollow_circular') {
    const rOut = scaledPx(s.dims.d_outer, 150, 25, 85);
    const rIn = s.dims.d_outer > 0 ? Math.max(6, rOut * ((s.dims.d_inner || 0) / s.dims.d_outer)) : 30;
    shape = (
      <>
        <circle cx={cx} cy={cy} r={rOut} fill="var(--teal-soft)" stroke="var(--teal)" strokeWidth="1.6" />
        <circle cx={cx} cy={cy} r={rIn} fill="var(--bg)" stroke="var(--teal)" strokeWidth="1.4" strokeDasharray="3 2" />
        <text x={cx} y={cy + rOut + 22} fontSize="11" textAnchor="middle" fill="var(--gray)">
          d₂ = {fmt1(s.dims.d_outer, 2)} {s.dimUnit}
        </text>
      </>
    );
  } else {
    const rectW = scaledPx(s.dims.b, 150, 40, 130);
    const rectH = scaledPx(hRequired || s.dims.h, 150, 40, 130);
    const rx = cx - rectW / 2, ry = cy - rectH / 2;
    shape = (
      <>
        <rect x={rx} y={ry} width={rectW} height={rectH} fill="var(--teal-soft)" stroke="var(--teal)" strokeWidth="1.6" />
        <text x={cx} y={ry + rectH + 22} fontSize="11" textAnchor="middle" fill="var(--gray)">
          b = {fmt1(s.dims.b, 2)} {s.dimUnit}
        </text>
      </>
    );
  }
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 220, margin: '0 auto', display: 'block' }}>
      {shape}
    </svg>
  );
}
