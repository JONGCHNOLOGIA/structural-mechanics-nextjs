'use client';

import { useMemo, useState } from 'react';
import { computeSectionModulus } from '@/lib/calc/beamStresses';
import { LENGTH_UNITS, STRESS_UNITS, TORQUE_UNITS, toBase, fromBase, fmt1, scaledPx } from '@/lib/calc/units1';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import { DualField, SelectField, ResetButton, ResultGrid, ResultCard, StepCard, ErrorBox, InputNeededPlaceholder } from './sm1/Controls';
import { CalcGate, useCalcGate } from './sm1/CalcGate';

// CH.5-2 Section Modulus & Beam Design — 원본 renderSectionModulus()의 React 버전.

const DEFAULTS = { M: 1000, MUnit: 'N·m', sigmaAllow: 150, sigmaAllowUnit: 'MPa', sectionType: 'rectangular', bFixed: 50, dimUnit: 'mm' };

const SECTION_OPTIONS = [
  { value: 'rectangular', label: 'Rectangular (폭 b 고정, 높이 h 역산)' },
  { value: 'circular', label: 'Circular (직경 d 역산)' },
];

export default function SectionModulusDesign() {
  const [s, setS] = useState(DEFAULTS);
  const res = useMemo(() => computeSectionModulus(s), [s]);
  const gate = useCalcGate(s);
  const set = (patch) => setS((prev) => ({ ...prev, ...patch }));
  const setNum = (key) => (v) => set({ [key]: parseFloat(v) });

  const isRect = s.sectionType === 'rectangular';
  const dimOut = res.valid ? fromBase(isRect ? res.h_required : res.d_required, s.dimUnit, LENGTH_UNITS) : NaN;

  return (
    <>
      {/* ---------------- Setting Menu ---------------- */}
      <div className="panel">
        <h3>SETTING MENU</h3>
        <EditableText
          as="div"
          className="note-box"
          contentKey="calc.SectionModulusDesign.note"
          defaultText="단면계수 S = I/c 하나만 알면 굽힘 저항 능력을 비교할 수 있습니다. 여기서는 거꾸로, 허용응력을 넘지 않으려면 S가 최소 얼마여야 하는지 구하고 그 S를 만족하는 치수를 역산합니다."
        />
        <DualField label="굽힘모멘트 M" value={s.M} min={0} max={5000} step={10} onChange={setNum('M')}
          unitMap={TORQUE_UNITS} unit={s.MUnit} onUnitChange={(v) => set({ MUnit: v })} invalid={!(s.M >= 0)} />
        <DualField label="허용응력 σ_allow" value={s.sigmaAllow} min={1} max={1000} step={1} onChange={setNum('sigmaAllow')}
          unitMap={STRESS_UNITS} unit={s.sigmaAllowUnit} onUnitChange={(v) => set({ sigmaAllowUnit: v })} invalid={!(s.sigmaAllow > 0)} />
        <SelectField label="단면 형상" value={s.sectionType} options={SECTION_OPTIONS} onChange={(v) => set({ sectionType: v })} />
        {isRect && (
          <DualField label="고정 폭 b" value={s.bFixed} min={1} max={300} step={1} onChange={setNum('bFixed')}
            unitMap={LENGTH_UNITS} unit={s.dimUnit} onUnitChange={(v) => set({ dimUnit: v })} invalid={!(s.bFixed > 0)} />
        )}
        {!isRect && (
          <div className="field">
            <label>결과 치수 표시 단위</label>
            <div className="input-unit-group">
              <select className="unit-inline" value={s.dimUnit} onChange={(e) => set({ dimUnit: e.target.value })}>
                {Object.keys(LENGTH_UNITS).map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>
        )}
        <ResetButton onClick={() => setS(DEFAULTS)} />
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="panel">
        <h3>VISUALIZER</h3>
        {res.valid ? (
          <>
            <DesignedSectionSVG s={s} dimOut={dimOut} isRect={isRect} />
            <ResultGrid>
              <ResultCard label="필요 단면계수 S_required" value={`${fmt1(res.S_required * 1e9, 2)} mm³`} />
              <ResultCard
                label={isRect ? '필요 높이 h_required' : '필요 직경 d_required'}
                value={`${fmt1(dimOut, 2)} ${s.dimUnit}`}
                tone="tens"
              />
            </ResultGrid>
            <div className="hint">
              실제 설계에서는 이 값보다 <b>크면서</b> 규격에 있는 치수(또는 형강 단면)를 고릅니다 — 계산값이 곧 제품 치수가 되는 건 아닙니다.
            </div>
            <EditableText as="div" className="ai-hint" contentKey="calc.SectionModulusDesign.aiHint"
              defaultText="💬 단면계수 S가 실제 설계에서 왜 중요한 지표인지, 오른쪽 AI 튜터에게 물어보세요." />
          </>
        ) : (
          <ErrorBox errors={res.errors} />
        )}

        <div className="steps" style={{ marginTop: 20 }}>
          <CalcGate gate={gate}>
            {(frozen) => {
              const fres = computeSectionModulus(frozen);
              return fres.valid ? <Steps s={frozen} res={fres} /> : <InputNeededPlaceholder />;
            }}
          </CalcGate>
        </div>
      </div>

      <AiTutorPanel question="I자 단면이 같은 재료량으로 더 효율적인 이유가 뭔가요?" />
    </>
  );
}

function Steps({ s, res }) {
  const isRect = s.sectionType === 'rectangular';
  const SMM3 = res.S_required * 1e9;
  const dimOut = fromBase(isRect ? res.h_required : res.d_required, s.dimUnit, LENGTH_UNITS);
  return (
    <>
      <StepCard
        title="Step 1. 필요 단면계수"
        formula="σ_allow = M / S  →  S_required = M / σ_allow"
        eqLines={[`S_required = ${s.M} ${s.MUnit} / ${s.sigmaAllow} ${s.sigmaAllowUnit}`]}
        final={`S_required = ${fmt1(SMM3, 2)} mm³`}
      />
      {isRect ? (
        <StepCard
          title="Step 2. 필요 높이 (b 고정)"
          formula="S = b·h²/6  →  h = √(6S/b)"
          eqLines={[`h = √(6 × ${fmt1(SMM3, 2)} mm³ / ${s.bFixed} ${s.dimUnit})`]}
          final={`h_required = ${fmt1(dimOut, 2)} ${s.dimUnit}`}
        />
      ) : (
        <StepCard
          title="Step 2. 필요 직경"
          formula="S = πd³/32  →  d = (32S/π)^(1/3)"
          eqLines={[`d = (32 × ${fmt1(SMM3, 2)} mm³ / π)^(1/3)`]}
          final={`d_required = ${fmt1(dimOut, 2)} ${s.dimUnit}`}
        />
      )}
    </>
  );
}

// 역산된 치수로 만들어진 단면 — 값이 바뀌면 그림도 같은 비율로 커진다.
function DesignedSectionSVG({ s, dimOut, isRect }) {
  const w = 260, h = 200, cx = w / 2, cy = h / 2;
  const outMM = toBase(dimOut || 0, s.dimUnit, LENGTH_UNITS) * 1000;
  const bMM = toBase(s.bFixed || 0, s.dimUnit, LENGTH_UNITS) * 1000;
  const shapeH = scaledPx(outMM, 300, 40, 140);
  const shapeW = isRect ? scaledPx(bMM, 300, 40, 110) : shapeH;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 260, margin: '0 auto', display: 'block' }}>
      {isRect ? (
        <rect x={cx - shapeW / 2} y={cy - shapeH / 2} width={shapeW} height={shapeH} fill="var(--teal-soft)" stroke="var(--teal)" strokeWidth="1.6" />
      ) : (
        <circle cx={cx} cy={cy} r={shapeH / 2} fill="var(--teal-soft)" stroke="var(--teal)" strokeWidth="1.6" />
      )}
      <line x1={cx - shapeW / 2 - 6} y1={cy} x2={cx + shapeW / 2 + 6} y2={cy} stroke="var(--gray)" strokeWidth="1" strokeDasharray="3 2" />
      <text x={cx} y={cy + shapeH / 2 + 22} fontSize="10.5" fill="var(--teal)" textAnchor="middle" fontWeight="800">
        {isRect ? `b=${fmt1(s.bFixed, 1)} × h=${fmt1(dimOut, 2)} ${s.dimUnit}` : `d=${fmt1(dimOut, 2)} ${s.dimUnit}`}
      </text>
      <text x={cx} y={h - 6} fontSize="9.5" fill="var(--gray)" textAnchor="middle">
        허용응력을 딱 만족하는 최소 단면
      </text>
    </svg>
  );
}
