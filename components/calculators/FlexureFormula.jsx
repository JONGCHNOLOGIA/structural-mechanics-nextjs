'use client';

import { useMemo, useState } from 'react';
import { computeFlexure } from '@/lib/calc/beamStresses';
import { LENGTH_UNITS, STRESS_UNITS, TORQUE_UNITS, toBase, fromBase, fmt1, scaledPx } from '@/lib/calc/units1';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import { DualField, SelectField, ResetButton, ResultGrid, ResultCard, StepCard, ErrorBox, InputNeededPlaceholder } from './sm1/Controls';
import { CalcGate, useCalcGate } from './sm1/CalcGate';
import { DimLineH, DimLineV } from './EditableDim';

// CH.5-1 Flexure Formula (Normal Stress in Beams) — 원본 renderFlexure()의 React 버전.

const DEFAULTS = { M: 1000, MUnit: 'N·m', sectionType: 'rectangular', dims: { b: 50, h: 100, d: 80 }, dimUnit: 'mm', E: 200, EUnit: 'GPa' };

const SECTION_OPTIONS = [
  { value: 'rectangular', label: 'Rectangular' },
  { value: 'circular', label: 'Circular' },
];

const MPa = (v) => fromBase(v, 'MPa', STRESS_UNITS);

export default function FlexureFormula() {
  const [s, setS] = useState(DEFAULTS);
  const res = useMemo(() => computeFlexure(s), [s]);
  const gate = useCalcGate(s);
  const set = (patch) => setS((prev) => ({ ...prev, ...patch }));
  const setNum = (key) => (v) => set({ [key]: parseFloat(v) });
  const setDim = (key) => (v) => setS((prev) => ({ ...prev, dims: { ...prev.dims, [key]: parseFloat(v) } }));

  return (
    <>
      {/* ---------------- Setting Menu ---------------- */}
      <div className="panel">
        <h3>SETTING MENU</h3>
        <EditableText
          as="div"
          className="note-box"
          contentKey="calc.FlexureFormula.note"
          defaultText="굽힘모멘트 M은 양수(+, sagging — 아래로 볼록하게 휘는 방향)로 가정합니다. 이때 단면 위쪽은 눌리고(압축) 아래쪽은 늘어납니다(인장)."
        />
        <DualField label="굽힘모멘트 M" value={s.M} min={0} max={5000} step={10} onChange={setNum('M')}
          unitMap={TORQUE_UNITS} unit={s.MUnit} onUnitChange={(v) => set({ MUnit: v })} />
        <SelectField label="단면 형상" value={s.sectionType} options={SECTION_OPTIONS} onChange={(v) => set({ sectionType: v })} />
        {s.sectionType === 'rectangular' ? (
          <>
            <DualField label="폭 b" value={s.dims.b} min={1} max={300} step={1} onChange={setDim('b')}
              unitMap={LENGTH_UNITS} unit={s.dimUnit} onUnitChange={(v) => set({ dimUnit: v })} invalid={!(s.dims.b > 0)} />
            <DualField label="높이 h" value={s.dims.h} min={1} max={300} step={1} onChange={setDim('h')}
              unitMap={LENGTH_UNITS} unit={s.dimUnit} onUnitChange={(v) => set({ dimUnit: v })} invalid={!(s.dims.h > 0)} />
          </>
        ) : (
          <DualField label="직경 d" value={s.dims.d} min={1} max={300} step={1} onChange={setDim('d')}
            unitMap={LENGTH_UNITS} unit={s.dimUnit} onUnitChange={(v) => set({ dimUnit: v })} invalid={!(s.dims.d > 0)} />
        )}
        <DualField label="탄성계수 E" value={s.E} min={0.1} max={500} step={0.5} onChange={setNum('E')}
          unitMap={STRESS_UNITS} unit={s.EUnit} onUnitChange={(v) => set({ EUnit: v })} invalid={!(s.E > 0)} />
        <ResetButton onClick={() => setS(DEFAULTS)} />
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="panel">
        <h3>VISUALIZER</h3>
        <SectionStressSVG s={s} res={res} onEditDim={setDim} />
        {res.valid ? (
          <>
            <ResultGrid>
              <ResultCard label="단면2차모멘트 I" value={`${fmt1(res.I * 1e12, 2)} mm⁴`} />
              <ResultCard label="상단 응력 σ_top (압축)" value={`${fmt1(MPa(res.sigmaTop), 3)} MPa`} tone="comp" />
              <ResultCard label="하단 응력 σ_bottom (인장)" value={`${fmt1(MPa(res.sigmaBottom), 3)} MPa`} tone="tens" />
              <ResultCard label="곡률 κ = M/(E·I)" value={`${fmt1(res.kappa, 8)} 1/m`} />
              <ResultCard label="최대 변형률 ε_max" value={`${fmt1(res.epsilonMax * 1e6, 1)} µ`} full />
            </ResultGrid>
            <EditableText as="div" className="ai-hint" contentKey="calc.FlexureFormula.aiHint"
              defaultText="💬 왜 중립축에서 응력이 0이고 표면에서 최대인지, 오른쪽 AI 튜터에게 물어보세요." />
          </>
        ) : (
          <ErrorBox errors={res.errors} />
        )}

        <div className="steps" style={{ marginTop: 20 }}>
          <CalcGate gate={gate}>
            {(frozen) => {
              const fres = computeFlexure(frozen);
              return fres.valid ? <Steps s={frozen} res={fres} /> : <InputNeededPlaceholder />;
            }}
          </CalcGate>
        </div>
      </div>

      <AiTutorPanel question="축하중·비틀림·굽힘 공식이 서로 어떻게 닮았나요?" />
    </>
  );
}

function Steps({ s, res }) {
  const IMM4 = res.I * 1e12;
  const M_Nm = toBase(s.M, s.MUnit, TORQUE_UNITS);
  const E_MPa = fromBase(toBase(s.E, s.EUnit, STRESS_UNITS), 'MPa', STRESS_UNITS);
  return (
    <>
      <StepCard
        title="Step 1. 단면2차모멘트"
        formula={s.sectionType === 'rectangular' ? 'I = b·h³/12' : 'I = πd⁴/64'}
        eqLines={[
          s.sectionType === 'rectangular'
            ? `b = ${s.dims.b} ${s.dimUnit}, h = ${s.dims.h} ${s.dimUnit}`
            : `d = ${s.dims.d} ${s.dimUnit}`,
        ]}
        final={`I = ${fmt1(IMM4, 2)} mm⁴`}
      />
      <StepCard
        title="Step 2. 굽힘공식 (Flexure Formula)"
        formula="σ = −M·y / I   (y는 중립축 기준, 위쪽이 +)"
        eqLines={[
          `연단거리 c = ${fmt1(res.c * 1000, 2)} mm`,
          `|σ| = ${fmt1(M_Nm * 1000, 1)} N·mm × ${fmt1(res.c * 1000, 2)} mm / ${fmt1(IMM4, 2)} mm⁴`,
        ]}
        final={`σ_top = ${fmt1(MPa(res.sigmaTop), 3)} MPa (압축), σ_bottom = ${fmt1(MPa(res.sigmaBottom), 3)} MPa (인장)`}
      />
      <StepCard
        title="Step 3. 곡률-모멘트 관계"
        formula="κ = 1/ρ = M / (E·I)"
        eqLines={[
          `κ = ${fmt1(M_Nm * 1000, 1)} N·mm / (${fmt1(E_MPa, 1)} MPa × ${fmt1(IMM4, 2)} mm⁴)`,
          // mm 단위로 계산했으니 결과도 1/mm이다 — 여기에 ×1000을 해야 흔히 쓰는 1/m이 된다.
          `= ${(res.kappa / 1000).toExponential(3)} 1/mm  ×1000→  ${fmt1(res.kappa, 8)} 1/m`,
        ]}
        final={`κ = ${fmt1(res.kappa, 8)} 1/m  (곡률반경 ρ = 1/κ = ${fmt1(1 / res.kappa, 2)} m)`}
      />
    </>
  );
}

// 단면 옆에 응력 분포를 막대로 — 중립축에서 0, 연단에서 최대인 선형 분포.
function SectionStressSVG({ s, res, onEditDim }) {
  // 아래쪽에 폭(지름) 치수선을 넣을 자리를 두려고 높이를 220에서 늘렸다.
  const w = 280, h = 244, cx = w / 2, cy = 110;
  const isRect = s.sectionType === 'rectangular';
  // 그림 크기는 입력 단위와 무관하게 실제 mm 기준으로 정한다.
  const hMM = toBase(isRect ? s.dims.h : s.dims.d, s.dimUnit, LENGTH_UNITS) * 1000;
  const bMM = toBase(isRect ? s.dims.b : s.dims.d, s.dimUnit, LENGTH_UNITS) * 1000;
  const shapeH = scaledPx(hMM, 300, 60, 160);
  const shapeW = isRect ? scaledPx(bMM, 300, 50, 110) : shapeH;
  const halfW = shapeW / 2;
  const armX = cx + halfW + 8;
  const maxLen = res.valid ? scaledPx(MPa(res.sigmaMax), 150, 15, 65) : 40;
  const N = 6;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 280, margin: '0 auto', display: 'block', overflow: 'visible' }}>
      {isRect ? (
        <rect x={cx - shapeW / 2} y={cy - shapeH / 2} width={shapeW} height={shapeH} fill="var(--bg)" stroke="#8A97A2" strokeWidth="1.4" />
      ) : (
        <circle cx={cx} cy={cy} r={shapeH / 2} fill="var(--bg)" stroke="#8A97A2" strokeWidth="1.4" />
      )}
      <line x1={cx - halfW} y1={cy} x2={cx + halfW} y2={cy} stroke="var(--gray)" strokeWidth="1" strokeDasharray="3 2" />
      <text x={cx + halfW + 4} y={cy + 4} fontSize="9.5" fill="var(--gray)">N.A.</text>
      {Array.from({ length: 2 * N + 1 }).map((_, k) => {
        const i = k - N;
        const yy = cy - (i * (shapeH / 2)) / N;
        const stressSign = -i / N; // 상단(+y)은 압축(음수), 하단은 인장(양수)
        const len = maxLen * Math.abs(stressSign);
        const color = stressSign >= 0 ? 'var(--teal)' : 'var(--crimson)';
        const dir = stressSign >= 0 ? 1 : -1;
        return <line key={k} x1={armX} y1={yy} x2={armX + dir * len} y2={yy} stroke={color} strokeWidth="2" />;
      })}
      <text x={armX} y={cy - shapeH / 2 - 10} fontSize="9.5" fill="var(--crimson)" textAnchor="middle">−σ (압축, 상단)</text>
      <text x={armX} y={cy + shapeH / 2 + 18} fontSize="9.5" fill="var(--teal)" textAnchor="middle">+σ (인장, 하단)</text>

      {/* 치수 — 숫자를 클릭하면 그 자리에서 고칠 수 있다. 단위는 SETTING MENU의 길이 단위를 따른다.
          원형 단면은 높이/폭이 곧 지름이라 지름 하나만 적는다. */}
      {isRect ? (
        <>
          <DimLineV
            x={cx - shapeW / 2 - 14}
            y1={cy - shapeH / 2}
            y2={cy + shapeH / 2}
            fontSize={10.5}
            value={s.dims.h}
            unit={s.dimUnit}
            boxW={52}
            onChange={(v) => onEditDim('h')(v)}
          />
          <DimLineH
            x1={cx - shapeW / 2}
            x2={cx + shapeW / 2}
            y={cy + shapeH / 2 + 12}
            labelDy={14}
            fontSize={10.5}
            value={s.dims.b}
            unit={s.dimUnit}
            boxW={52}
            onChange={(v) => onEditDim('b')(v)}
          />
        </>
      ) : (
        <DimLineH
          x1={cx - shapeH / 2}
          x2={cx + shapeH / 2}
          y={cy + shapeH / 2 + 12}
          labelDy={14}
          fontSize={10.5}
          value={s.dims.d}
          unit={s.dimUnit}
          prefix="d = "
          boxW={52}
          onChange={(v) => onEditDim('d')(v)}
        />
      )}
    </svg>
  );
}
