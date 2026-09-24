'use client';

import { useMemo, useState } from 'react';
import { computeShearRect } from '@/lib/calc/beamStresses';
import { LENGTH_UNITS, FORCE_UNITS, STRESS_UNITS, toBase, fromBase, fmt1, scaledPx } from '@/lib/calc/units1';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import Frac from '@/components/Frac';
import { DualField, ResetButton, ResultGrid, ResultCard, StepCard, ErrorBox, InputNeededPlaceholder } from './sm1/Controls';
import { CalcGate, useCalcGate } from './sm1/CalcGate';
import { DimLineH, DimLineV } from './EditableDim';

// CH.5-3 Shear Stress in Beams (Rectangular Section) — 원본 renderShearRect()의 React 버전.

// 원본 기본값은 V=1000 kN이라 50×100 단면에 τ=300 MPa(강재 항복을 넘는 값)가 나왔다.
// 교재 예제 수준(목재 보에서 한 자릿수 MPa)이 되도록 전단력만 현실적인 값으로 낮췄다.
const DEFAULTS = { V: 30, VUnit: 'kN', b: 50, h: 100, dimUnit: 'mm' };

const MPa = (v) => fromBase(v, 'MPa', STRESS_UNITS);

export default function ShearStressRect() {
  const [s, setS] = useState(DEFAULTS);
  const res = useMemo(() => computeShearRect(s), [s]);
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
          contentKey="calc.ShearStressRect.note"
          defaultText="굽힘응력이 연단에서 최대인 것과 반대로, 전단응력은 중립축에서 최대이고 위아래 표면에서 0입니다. 표면에는 맞물릴 재료가 없어 전단을 주고받을 상대가 없기 때문입니다."
        />
        <DualField label="전단력 V" value={s.V} min={0} max={500} step={1} onChange={setNum('V')}
          unitMap={FORCE_UNITS} unit={s.VUnit} onUnitChange={(v) => set({ VUnit: v })} invalid={!(s.V >= 0)} />
        <DualField label="폭 b" value={s.b} min={1} max={300} step={1} onChange={setNum('b')}
          unitMap={LENGTH_UNITS} unit={s.dimUnit} onUnitChange={(v) => set({ dimUnit: v })} invalid={!(s.b > 0)} />
        <DualField label="높이 h" value={s.h} min={1} max={300} step={1} onChange={setNum('h')}
          unitMap={LENGTH_UNITS} unit={s.dimUnit} onUnitChange={(v) => set({ dimUnit: v })} invalid={!(s.h > 0)} />
        <ResetButton onClick={() => setS(DEFAULTS)} />
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="panel">
        <h3>VISUALIZER</h3>
        <DistributionSVG s={s} res={res} onEditDim={setNum} />
        {res.valid ? (
          <>
            <ResultGrid>
              <ResultCard label="단면2차모멘트 I" value={`${fmt1(res.I * 1e12, 2)} mm⁴`} />
              <ResultCard label="단면적 A" value={`${fmt1(res.A * 1e6, 2)} mm²`} />
              <ResultCard label="최대 전단응력 τ_max (중립축)" value={`${fmt1(MPa(res.tauMax), 3)} MPa`} tone="comp" full />
            </ResultGrid>
            <EditableText as="div" className="ai-hint" contentKey="calc.ShearStressRect.aiHint"
              defaultText="💬 왜 사각형 단면은 상하단에서 전단응력이 0인지, 오른쪽 AI 튜터에게 물어보세요." />
          </>
        ) : (
          <ErrorBox errors={res.errors} />
        )}

        <div className="steps" style={{ marginTop: 20 }}>
          <CalcGate gate={gate}>
            {(frozen) => {
              const fres = computeShearRect(frozen);
              return fres.valid ? <Steps s={frozen} res={fres} /> : <InputNeededPlaceholder />;
            }}
          </CalcGate>
        </div>
      </div>

      <AiTutorPanel question="Q(y)는 정확히 무엇을 의미하나요?" />
    </>
  );
}

function Steps({ s, res }) {
  return (
    <>
      <StepCard
        title="Step 1. 단면2차모멘트와 단면적"
        formula={
          <>
            I = <Frac num="b·h³" den="12" />, A = b·h
          </>
        }
        eqLines={[`b = ${s.b} ${s.dimUnit}, h = ${s.h} ${s.dimUnit}`]}
        final={`I = ${fmt1(res.I * 1e12, 2)} mm⁴,  A = ${fmt1(res.A * 1e6, 2)} mm²`}
      />
      <StepCard
        title="Step 2. 중립축의 단면1차모멘트"
        formula={
          <>
            Q = (중립축 위쪽 면적) × (그 도심까지 거리) = b·(<Frac num="h" den="2" />)·(<Frac num="h" den="4" />)
          </>
        }
        eqLines={[`Q = ${s.b} × ${fmt1(s.h / 2, 2)} × ${fmt1(s.h / 4, 2)} ${s.dimUnit}³`]}
        final={`Q = ${fmt1(res.Q_na * 1e9, 2)} mm³`}
      />
      <StepCard
        title="Step 3. 최대 전단응력"
        formula={
          <>
            τ_max = <Frac num="V·Q" den="I·b" /> = <Frac num="1.5 V" den="A" /> (직사각형 특수해)
          </>
        }
        eqLines={[
          `일반식: τ = ${fmt1(MPa(res.tauMaxCheck), 3)} MPa`,
          <>
            특수해: τ = 1.5 × <Frac num={`${s.V} ${s.VUnit}`} den={`${fmt1(res.A * 1e6, 2)} mm²`} /> = {fmt1(MPa(res.tauMax), 3)} MPa
          </>,
        ]}
        final={`τ_max = ${fmt1(MPa(res.tauMax), 3)} MPa (두 식이 같은 값 ✓)`}
      />
    </>
  );
}

// 단면 옆에 τ(y)의 포물선 분포 — 중립축에서 가장 불룩하다.
function DistributionSVG({ s, res, onEditDim }) {
  // 왼쪽 높이 치수선 자리를 만들려고 그림 폭을, 아래 폭 치수선 자리를 만들려고 높이를 늘렸다
  // (원래 260×220).
  const w = 300, h = 244, cx = w / 2 + 6, cy = 104;
  // 그림 크기는 입력 단위와 무관하게 실제 mm 기준으로.
  const hMM = toBase(s.h || 0, s.dimUnit, LENGTH_UNITS) * 1000;
  const bMM = toBase(s.b || 0, s.dimUnit, LENGTH_UNITS) * 1000;
  const shapeH = scaledPx(hMM, 300, 60, 160);
  const shapeW = scaledPx(bMM, 300, 40, 120);
  const bulgeMax = res.valid ? scaledPx(MPa(res.tauMax), 100, 20, 65) : 30;
  const N = 10;
  const x0 = cx + shapeW / 2 + 6;

  let path = `M ${x0} ${cy - shapeH / 2}`;
  for (let i = 0; i <= N; i++) {
    const yy = cy - shapeH / 2 + (shapeH * i) / N;
    const yNorm = (shapeH / 2 - (i * shapeH) / N) / (shapeH / 2); // +1 상단, −1 하단
    const parab = 1 - yNorm * yNorm; // 상하단 0, 중앙 1
    path += ` L ${x0 + bulgeMax * parab} ${yy}`;
  }
  path += ` L ${x0} ${cy + shapeH / 2}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 300, margin: '0 auto', display: 'block', overflow: 'visible' }}>
      <rect x={cx - shapeW / 2} y={cy - shapeH / 2} width={shapeW} height={shapeH} fill="var(--bg)" stroke="#8A97A2" strokeWidth="1.4" />
      <path d={path} fill="var(--teal)" opacity="0.3" stroke="var(--teal)" strokeWidth="1.6" />
      <text x={x0 + bulgeMax + 18} y={cy} fontSize="9.5" fill="var(--teal)" fontWeight="800" textAnchor="middle">τ_max</text>
      <line x1={cx - shapeW / 2} y1={cy} x2={cx + shapeW / 2} y2={cy} stroke="var(--gray)" strokeWidth="1" strokeDasharray="3 2" />
      {/* 치수 — b와 h를 글씨로만 적던 걸 치수선 + 클릭해서 고칠 수 있는 숫자로 바꿨다. */}
      <DimLineV
        x={cx - shapeW / 2 - 14}
        y1={cy - shapeH / 2}
        y2={cy + shapeH / 2}
        fontSize={10.5}
        value={s.h}
        unit={s.dimUnit}
        prefix="h = "
        boxW={52}
        onChange={onEditDim('h')}
      />
      <DimLineH
        x1={cx - shapeW / 2}
        x2={cx + shapeW / 2}
        y={cy + shapeH / 2 + 12}
        labelDy={14}
        fontSize={10.5}
        value={s.b}
        unit={s.dimUnit}
        prefix="b = "
        boxW={52}
        onChange={onEditDim('b')}
      />
      <text x={cx} y={cy + shapeH / 2 + 44} fontSize="9.5" fill="var(--gray)" textAnchor="middle">
        τ(y) 포물선 분포
      </text>
    </svg>
  );
}
