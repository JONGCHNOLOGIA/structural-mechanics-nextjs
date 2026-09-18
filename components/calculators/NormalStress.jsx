'use client';

import { useCallback, useMemo, useState } from 'react';
import { computeNormalStress } from '@/lib/calc/normalStress';
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
} from './sm1/Controls';
import { AxisPlaneNote, AxialForceDiagramBlock, AxialFBD } from './sm1/Diagrams';
import PracticePanel, { randInt, randChoice } from './sm1/PracticePanel';

// CH.1-1 Normal Stress and Strain — 원본 프로토타입의 renderNormalStress()를 React로 옮긴 것.
// 입력값은 "표시 단위 그대로" 상태에 두고(원본과 동일), 단위 변환은 계산 함수 안에서만 한다.

const DEFAULTS = {
  P: 10,
  PUnit: 'kN',
  mode: 'tension',
  sectionType: 'solid_circular',
  dims: { d: 25, d_outer: 30, d_inner: 20, b: 20, h: 30 },
  dimUnit: 'mm',
  L: 1,
  LUnit: 'm',
  E: 200,
  EUnit: 'GPa',
};

const SECTION_OPTIONS = [
  { value: 'solid_circular', label: 'Solid Circular' },
  { value: 'hollow_circular', label: 'Hollow Circular' },
  { value: 'rectangular', label: 'Rectangular' },
];

export default function NormalStress() {
  const [s, setS] = useState(DEFAULTS);
  const set = (patch) => setS((prev) => ({ ...prev, ...patch }));
  const setNum = (key) => (v) => set({ [key]: parseFloat(v) });
  const setDim = (key) => (v) => setS((prev) => ({ ...prev, dims: { ...prev.dims, [key]: parseFloat(v) } }));

  const res = useMemo(() => computeNormalStress(s), [s]);

  const tone = res.valid ? (res.sign > 0 ? 'tens' : 'comp') : undefined;
  const A_disp = res.valid ? res.A_m2 / Math.pow(LENGTH_UNITS[s.dimUnit], 2) : NaN;
  const sigmaMPa = res.valid ? fromBase(res.sigma_Pa, 'MPa', STRESS_UNITS) : NaN;
  const deltaMm = res.valid ? fromBase(res.delta_m, 'mm', LENGTH_UNITS) : NaN;

  const generate = useCallback(() => {
    const P = randInt(5, 150);
    const mode = randChoice(['tension', 'compression']);
    const type = randChoice(['solid_circular', 'rectangular']);
    let dims, dimsText;
    if (type === 'solid_circular') {
      const d = randInt(10, 80);
      dims = { d, d_outer: 80, d_inner: 40, b: 20, h: 30 };
      dimsText = `지름 d=${d}mm 원형`;
    } else {
      const b = randInt(10, 60), h = randInt(10, 80);
      dims = { d: 30, d_outer: 80, d_inner: 40, b, h };
      dimsText = `${b}×${h}mm 사각형`;
    }
    const L = randInt(5, 30) / 10;
    const E = randChoice([70, 100, 200]);
    const r = computeNormalStress({ P, PUnit: 'kN', mode, sectionType: type, dims, dimUnit: 'mm', L, LUnit: 'm', E, EUnit: 'GPa' });
    if (!r.valid) return null;
    return {
      q: `${dimsText} 단면봉이 길이 L=${L}m, E=${E}GPa일 때 ${mode === 'tension' ? '인장' : '압축'}하중 P=${P}kN이 작용한다. σ와 δ를 구하시오.`,
      a: `σ = ${fmt1(fromBase(r.sigma_Pa, 'MPa', STRESS_UNITS), 2)} MPa,  δ = ${fmt1(fromBase(r.delta_m, 'mm', LENGTH_UNITS), 4)} mm`,
    };
  }, []);

  return (
    <>
      {/* ---------------- Setting Menu ---------------- */}
      <div className="panel">
        <h3>SETTING MENU</h3>
        <EditableText
          contentKey="calc.NormalStress.intro"
          defaultText="축하중 P를 받는 봉의 수직응력 σ=P/A와 변형률 ε=σ/E, 그리고 늘어난(줄어든) 길이 δ=εL을 계산해요. 단면 형상을 바꿔가며 같은 하중에서도 응력이 어떻게 달라지는지 확인해보세요."
          style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.6, marginBottom: 14, background: 'var(--bg)', borderRadius: 0, padding: '12px 14px' }}
        />
        <DualField
          label="하중 크기 P"
          value={s.P}
          min={0}
          max={200}
          step={0.5}
          onChange={setNum('P')}
          unitMap={FORCE_UNITS}
          unit={s.PUnit}
          onUnitChange={(v) => set({ PUnit: v })}
          invalid={!(s.P >= 0)}
        />
        <ToggleRow
          value={s.mode}
          onChange={(v) => set({ mode: v })}
          options={[
            { value: 'tension', label: 'Tension (인장)', tone: 'tens' },
            { value: 'compression', label: 'Compression (압축)', tone: 'comp' },
          ]}
        />
        <SelectField
          label="단면 형상 Cross Section"
          value={s.sectionType}
          options={SECTION_OPTIONS}
          onChange={(v) => set({ sectionType: v })}
        />
        {s.sectionType === 'solid_circular' && (
          <DualField
            label="직경 d"
            value={s.dims.d}
            min={1}
            max={200}
            step={0.5}
            onChange={setDim('d')}
            unitMap={LENGTH_UNITS}
            unit={s.dimUnit}
            onUnitChange={(v) => set({ dimUnit: v })}
            invalid={!(s.dims.d > 0)}
          />
        )}
        {s.sectionType === 'hollow_circular' && (
          <>
            <DualField
              label="외경 d₂"
              value={s.dims.d_outer}
              min={1}
              max={200}
              step={0.5}
              onChange={setDim('d_outer')}
              unitMap={LENGTH_UNITS}
              unit={s.dimUnit}
              onUnitChange={(v) => set({ dimUnit: v })}
              invalid={!(s.dims.d_outer > 0)}
            />
            <DualField
              label="내경 d₁"
              value={s.dims.d_inner}
              min={0.5}
              max={200}
              step={0.5}
              onChange={setDim('d_inner')}
              unitMap={LENGTH_UNITS}
              unit={s.dimUnit}
              onUnitChange={(v) => set({ dimUnit: v })}
              invalid={!(s.dims.d_inner > 0 && s.dims.d_inner < s.dims.d_outer)}
            />
          </>
        )}
        {s.sectionType === 'rectangular' && (
          <>
            <DualField
              label="폭 b"
              value={s.dims.b}
              min={1}
              max={200}
              step={0.5}
              onChange={setDim('b')}
              unitMap={LENGTH_UNITS}
              unit={s.dimUnit}
              onUnitChange={(v) => set({ dimUnit: v })}
              invalid={!(s.dims.b > 0)}
            />
            <DualField
              label="높이 h"
              value={s.dims.h}
              min={1}
              max={200}
              step={0.5}
              onChange={setDim('h')}
              unitMap={LENGTH_UNITS}
              unit={s.dimUnit}
              onUnitChange={(v) => set({ dimUnit: v })}
              invalid={!(s.dims.h > 0)}
            />
          </>
        )}
        <DualField
          label="부재 길이 L"
          value={s.L}
          min={0.01}
          max={10}
          step={0.01}
          onChange={setNum('L')}
          unitMap={LENGTH_UNITS}
          unit={s.LUnit}
          onUnitChange={(v) => set({ LUnit: v })}
          invalid={!(s.L > 0)}
        />
        <DualField
          label="탄성계수 E (Hooke's law 보조계산용)"
          value={s.E}
          min={0.1}
          max={500}
          step={0.5}
          onChange={setNum('E')}
          unitMap={STRESS_UNITS}
          unit={s.EUnit}
          onUnitChange={(v) => set({ EUnit: v })}
          invalid={!(s.E > 0)}
        />
        <ResetButton onClick={() => setS(DEFAULTS)} />
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="panel">
        <h3>VISUALIZER</h3>
        <MemberSVG mode={s.mode} res={res} />
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
          <SectionSVG s={s} />
        </div>
        <AxisPlaneNote />
        {res.valid ? (
          <>
            <ResultGrid>
              <ResultCard label="단면적 A" value={`${fmt1(A_disp, 2)} ${s.dimUnit}²`} />
              <ResultCard label="수직응력 σ" value={`${fmt1(sigmaMPa, 2)} MPa`} tone={tone} />
              <ResultCard label="수직변형률 ε" value={`${fmt1(res.epsilon * 1e6, 1)} µ`} tone={tone} />
              <ResultCard label={`${res.sign > 0 ? '신장량' : '수축량'} δ`} value={`${fmt1(deltaMm, 4)} mm`} tone={tone} />
            </ResultGrid>
            <EditableText
              as="div"
              className="ai-hint"
              contentKey="calc.NormalStress.aiHint"
              defaultText="💬 왜 단면적이 커지면 응력이 줄어드는지, 오른쪽 AI 튜터에게 물어보세요."
            />
            <h3 style={{ marginTop: 20 }}>자유물체도 (Free Body Diagram)</h3>
            <AxialFBD
              P={s.P}
              unitP={s.PUnit}
              sign={res.sign}
              reactionLabel={`R = ${fmt1(s.P, 2)} ${s.PUnit}`}
              appliedLabel={`P = ${fmt1(s.P, 2)} ${s.PUnit}`}
            />
            <div className="hint">
              {res.sign >= 0 ? '인장' : '압축'}: 지지부 반력과 하중이 서로 반대방향으로 작용해 평형(ΣF=0)을 이루고, 부재를 가상으로 자르면 어느
              위치에서나 내부 축력 N이 동일하게 노출됩니다.
            </div>
            <AxialForceDiagramBlock signedP={res.sign * s.P} L={s.L} unitP={s.PUnit} unitL={s.LUnit} />
          </>
        ) : (
          <ErrorBox errors={res.errors} />
        )}

        <div className="steps" style={{ marginTop: 20 }}>
          {res.valid ? <Steps s={s} res={res} A_disp={A_disp} sigmaMPa={sigmaMPa} deltaMm={deltaMm} tone={tone} /> : <InputNeededPlaceholder />}
        </div>
      </div>

      <AiTutorPanel question="중공 단면인데 왜 인장응력이 더 크게 나오나요?" />

      <PracticePanel generate={generate} />
    </>
  );
}

function Steps({ s, res, A_disp, sigmaMPa, deltaMm, tone }) {
  let areaFormula, areaEq;
  if (s.sectionType === 'solid_circular') {
    areaFormula = 'A = (π/4)·d²';
    areaEq = `A = (π/4) × (${fmt1(s.dims.d, 2)} ${s.dimUnit})² = ${fmt1(A_disp, 2)} ${s.dimUnit}²`;
  } else if (s.sectionType === 'hollow_circular') {
    areaFormula = 'A = (π/4)·(d₂² − d₁²)';
    areaEq = `A = (π/4) × [(${fmt1(s.dims.d_outer, 2)})² − (${fmt1(s.dims.d_inner, 2)})²] ${s.dimUnit}² = ${fmt1(A_disp, 2)} ${s.dimUnit}²`;
  } else {
    areaFormula = 'A = b × h';
    areaEq = `A = ${fmt1(s.dims.b, 2)} × ${fmt1(s.dims.h, 2)} ${s.dimUnit}² = ${fmt1(A_disp, 2)} ${s.dimUnit}²`;
  }

  return (
    <>
      <StepCard title="Step 1. Cross-sectional Area" formula={areaFormula} eqLines={[areaEq]} final={`A = ${fmt1(A_disp, 2)} ${s.dimUnit}²`} />
      <StepCard
        title="Step 2. Normal Stress"
        formula="σ = P / A"
        eqLines={[
          `σ = ${s.P} ${s.PUnit} (${s.mode === 'tension' ? '인장 +' : '압축 −'}) / ${fmt1(A_disp, 2)} ${s.dimUnit}²`,
          `σ = ${fmt1(res.sigma_Pa, 0)} Pa`,
        ]}
        final={
          <>
            σ = <span className={tone}>{fmt1(sigmaMPa, 2)} MPa</span> ({res.sign > 0 ? '인장' : '압축'})
          </>
        }
      />
      <StepCard
        title="Step 3. Normal Strain (Hooke's law, 보조계산)"
        formula="ε = σ / E"
        eqLines={[`ε = ${fmt1(res.sigma_Pa, 0)} Pa / ${fmt1(res.E_Pa, 0)} Pa`]}
        final={
          <>
            ε = <span className={tone}>{fmt1(res.epsilon * 1e6, 1)} × 10⁻⁶</span> (무차원)
          </>
        }
      />
      <StepCard
        title="Step 4. Elongation / Shortening"
        formula="δ = ε × L"
        eqLines={[`δ = ${fmt1(res.epsilon * 1e6, 1)}×10⁻⁶ × ${s.L} ${s.LUnit}`]}
        final={
          <>
            δ = <span className={tone}>{fmt1(deltaMm, 4)} mm</span> ({res.sign > 0 ? '신장' : '수축'})
          </>
        }
      />
    </>
  );
}

// 고정단에 매달린 봉이 하중 방향으로 늘어나거나(인장) 줄어드는(압축) 모습 — δ는 보이도록 과장해서 그린다.
function MemberSVG({ mode, res }) {
  const w = 460, h = 190, x1 = 70, x2 = 330, barY = 75, barH = 28;
  const visualOffset = res.valid && res.sigma_Pa !== 0 ? res.sign * 38 : 0;
  const color = mode === 'tension' ? 'var(--teal)' : 'var(--crimson)';
  const arrowDir = mode === 'tension' ? 1 : -1;
  const defX2 = x2 + visualOffset;
  const defW = Math.max(4, defX2 - x1);
  const ax = defX2 + (arrowDir > 0 ? 8 : -8);
  const ax2 = ax + arrowDir * 34;
  const arH = 7;
  const brY = barY + barH + 34;
  const deltaLabel = res.valid ? (res.sign > 0 ? '신장 (elongation)' : '수축 (shortening)') : '';

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 480, margin: '0 auto', display: 'block' }}>
      <line x1={x1 - 8} y1={barY - 20} x2={x1 - 8} y2={barY + barH + 20} stroke="#51626F" strokeWidth="2" />
      {Array.from({ length: 7 }).map((_, i) => {
        const yy = barY - 18 + i * 8;
        return <line key={i} x1={x1 - 8} y1={yy} x2={x1 - 16} y2={yy + 8} stroke="#8A97A2" strokeWidth="1.2" />;
      })}
      <rect x={x1} y={barY} width={x2 - x1} height={barH} fill="none" stroke="#C3C3C3" strokeWidth="1.3" strokeDasharray="4 3" />
      <rect x={x1} y={barY} width={defW} height={barH} fill={color} opacity="0.18" stroke={color} strokeWidth="1.8" />
      <line x1={ax} y1={barY + barH / 2} x2={ax2} y2={barY + barH / 2} stroke={color} strokeWidth="2.4" />
      <polygon
        points={
          arrowDir > 0
            ? `${ax2},${barY + barH / 2} ${ax2 - 9},${barY + barH / 2 - arH} ${ax2 - 9},${barY + barH / 2 + arH}`
            : `${ax2},${barY + barH / 2} ${ax2 + 9},${barY + barH / 2 - arH} ${ax2 + 9},${barY + barH / 2 + arH}`
        }
        fill={color}
      />
      <text x={(ax + ax2) / 2} y={barY + barH / 2 - 14} fontSize="12" fontWeight="800" fill={color} textAnchor="middle">
        P
      </text>
      <line x1={x1} y1={brY} x2={defX2} y2={brY} stroke="#8A97A2" strokeWidth="1" />
      <line x1={x1} y1={brY - 5} x2={x1} y2={brY + 5} stroke="#8A97A2" strokeWidth="1" />
      <line x1={defX2} y1={brY - 5} x2={defX2} y2={brY + 5} stroke="#8A97A2" strokeWidth="1" />
      <text x={(x1 + defX2) / 2} y={brY + 18} fontSize="10.5" fill="#8A97A2" textAnchor="middle" fontWeight="700">
        {res.valid ? `${deltaLabel} — δ (그림은 확대 표현)` : ''}
      </text>
      <text x={x1 - 8} y={barY - 32} fontSize="10" fill="#8A97A2" textAnchor="middle">
        고정단
      </text>
    </svg>
  );
}

// 지금 고른 단면 형상을 실제 입력 치수 비율에 맞춰 그린다.
function SectionSVG({ s }) {
  const w = 220, h = 200, cx = w / 2, cy = h / 2 - 6;
  const label = (x, y, text, anchor = 'middle') => (
    <text x={x} y={y} fontSize="11" textAnchor={anchor} fill="var(--gray)">
      {text}
    </text>
  );

  let shape;
  if (s.sectionType === 'solid_circular') {
    const r = scaledPx(s.dims.d, 150, 25, 85);
    shape = (
      <>
        <circle cx={cx} cy={cy} r={r} fill="var(--crimson-soft)" stroke="var(--crimson)" strokeWidth="1.6" />
        {label(cx, cy + r + 30, `d = ${fmt1(s.dims.d, 2)} ${s.dimUnit}`)}
      </>
    );
  } else if (s.sectionType === 'hollow_circular') {
    const rOut = scaledPx(s.dims.d_outer, 150, 25, 85);
    const rIn = s.dims.d_outer > 0 ? Math.max(6, rOut * (s.dims.d_inner / s.dims.d_outer)) : 30;
    shape = (
      <>
        <circle cx={cx} cy={cy} r={rOut} fill="var(--crimson-soft)" stroke="var(--crimson)" strokeWidth="1.6" />
        <circle cx={cx} cy={cy} r={rIn} fill="var(--bg)" stroke="var(--crimson)" strokeWidth="1.4" strokeDasharray="3 2" />
        {label(cx, cy + rOut + 22, `d₂ = ${fmt1(s.dims.d_outer, 2)} ${s.dimUnit}`)}
        {label(cx, cy + rOut + 36, `d₁ = ${fmt1(s.dims.d_inner, 2)} ${s.dimUnit}`)}
      </>
    );
  } else {
    const rectW = scaledPx(s.dims.b, 150, 40, 130);
    const rectH = scaledPx(s.dims.h, 150, 40, 130);
    const rx = cx - rectW / 2, ry = cy - rectH / 2;
    shape = (
      <>
        <rect x={rx} y={ry} width={rectW} height={rectH} fill="var(--crimson-soft)" stroke="var(--crimson)" strokeWidth="1.6" />
        {label(cx, ry + rectH + 22, `b = ${fmt1(s.dims.b, 2)} ${s.dimUnit}`)}
        {label(rx - 10, cy, `h = ${fmt1(s.dims.h, 2)} ${s.dimUnit}`, 'end')}
      </>
    );
  }

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 220, margin: '0 auto', display: 'block' }}>
      {shape}
    </svg>
  );
}
