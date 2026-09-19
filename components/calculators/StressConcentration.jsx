'use client';

import { useMemo, useState } from 'react';
import { computeStressConcentration } from '@/lib/calc/stressConcentration';
import { LENGTH_UNITS, FORCE_UNITS, STRESS_UNITS, fromBase, fmt1 } from '@/lib/calc/units1';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import { DualField, ResetButton, ResultGrid, ResultCard, StepCard, ErrorBox, InputNeededPlaceholder, DiagramSkipNote } from './sm1/Controls';
import { CalcGate, useCalcGate } from './sm1/CalcGate';
import { Dim, DimLineH, DimLineV } from './EditableDim';

// CH.2-5 Stress Concentration — 원본 renderStressConcentration()의 React 버전.

const DEFAULTS = { P: 10, PUnit: 'kN', b: 50, t: 10, d: 10, dimUnit: 'mm', K: 2.1 };

export default function StressConcentration() {
  const [s, setS] = useState(DEFAULTS);
  const set = (patch) => setS((prev) => ({ ...prev, ...patch }));
  const setNum = (key) => (v) => set({ [key]: parseFloat(v) });

  const res = useMemo(() => computeStressConcentration(s), [s]);
  const gate = useCalcGate(s);
  const areaScale = Math.pow(LENGTH_UNITS[s.dimUnit], 2);


  return (
    <>
      {/* ---------------- Setting Menu ---------------- */}
      <div className="panel">
        <h3>SETTING MENU</h3>
        <EditableText
          contentKey="calc.StressConcentration.intro"
          defaultText="구멍이 뚫린 판은 단면이 줄어드는 것(순단면)만으로 끝나지 않고, 구멍 가장자리에서 응력이 국부적으로 몇 배 더 커져요. 그 배수가 응력집중계수 K입니다."
          style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.6, marginBottom: 14, background: 'var(--bg)', borderRadius: 0, padding: '12px 14px' }}
        />
        <DualField label="하중 P" value={s.P} min={0} max={200} step={0.5} onChange={setNum('P')}
          unitMap={FORCE_UNITS} unit={s.PUnit} onUnitChange={(v) => set({ PUnit: v })} invalid={!(s.P >= 0)} />
        <DualField label="판 폭 b" value={s.b} min={1} max={200} step={0.5} onChange={setNum('b')}
          unitMap={LENGTH_UNITS} unit={s.dimUnit} onUnitChange={(v) => set({ dimUnit: v })} invalid={!(s.b > 0)} />
        <DualField label="판 두께 t" value={s.t} min={1} max={100} step={0.5} onChange={setNum('t')}
          unitMap={LENGTH_UNITS} unit={s.dimUnit} onUnitChange={(v) => set({ dimUnit: v })} invalid={!(s.t > 0)} />
        <DualField label="구멍 직경 d" value={s.d} min={0.5} max={199} step={0.5} onChange={setNum('d')}
          unitMap={LENGTH_UNITS} unit={s.dimUnit} onUnitChange={(v) => set({ dimUnit: v })} invalid={!(s.d > 0 && s.d < s.b)} />
        <DualField label="응력집중계수 K (교재 선도에서 읽은 값)" value={s.K} min={1} max={4} step={0.01} onChange={setNum('K')}
          invalid={!(s.K > 0)}
          hint={
            <EditableText
              as="span"
              contentKey="stressConcentration.kHint"
              defaultText="K는 d/b 비율에 따른 응력집중계수 선도(교재 Fig. 2-63)에서 직접 읽어 입력합니다. 계산기가 K를 임의로 산출하지 않습니다."
            />
          } />
        <ResetButton onClick={() => setS(DEFAULTS)} />
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="panel">
        <h3>VISUALIZER</h3>
        <PlateSVG s={s} onEditNum={setNum} />
        {res.valid ? (
          <ResultGrid>
            <ResultCard label="순단면적 A_net" value={`${fmt1(res.Anet / areaScale, 2)} ${s.dimUnit}²`} />
            <ResultCard label="공칭응력 σ_nom" value={`${fmt1(fromBase(res.sigmaNom, 'MPa', STRESS_UNITS), 2)} MPa`} />
            <ResultCard label="최대응력 σ_max = K·σ_nom" value={`${fmt1(fromBase(res.sigmaMax, 'MPa', STRESS_UNITS), 2)} MPa`} tone="comp" full />
          </ResultGrid>
        ) : (
          <ErrorBox errors={res.errors} />
        )}
        <DiagramSkipNote>
          Saint-Venant&apos;s principle: 구멍 주변의 국부적인 응력집중은 구멍에서 단면 치수 정도의 거리만 벗어나도 빠르게 사라지고, 먼 곳에서는 다시
          공칭응력 σ_nom에 가까워집니다.
        </DiagramSkipNote>
        <EditableText as="div" className="ai-hint" contentKey="calc.StressConcentration.aiHint"
          defaultText="💬 왜 정적 연성재료 설계에서는 응력집중을 종종 무시해도 되는지, 오른쪽 AI 튜터에게 물어보세요." />

        <div className="steps" style={{ marginTop: 20 }}>
          <CalcGate gate={gate}>
            {(frozen) => {
              const fres = computeStressConcentration(frozen);
              return <Steps s={frozen} res={fres} />;
            }}
          </CalcGate>
        </div>
      </div>

      <AiTutorPanel question="구멍이 작을수록 K가 커지는 이유가 뭔가요?" />
    </>
  );
}

function Steps({ s, res }) {
  const areaScale = Math.pow(LENGTH_UNITS[s.dimUnit], 2);
  return (
    <>
          {res.valid ? (
            <>
              <StepCard title="Step 1. 순단면적" formula="A_net = (b − d) × t"
                eqLines={[`A_net = (${s.b} − ${s.d}) × ${s.t} ${s.dimUnit}² = ${fmt1(res.Anet / areaScale, 2)} ${s.dimUnit}²`]}
                final={`A_net = ${fmt1(res.Anet / areaScale, 2)} ${s.dimUnit}²`} />
              <StepCard title="Step 2. 공칭응력" formula="σ_nom = P / A_net"
                eqLines={[`σ_nom = ${s.P} ${s.PUnit} / ${fmt1(res.Anet / areaScale, 2)} ${s.dimUnit}²`]}
                final={`σ_nom = ${fmt1(fromBase(res.sigmaNom, 'MPa', STRESS_UNITS), 2)} MPa`} />
              <StepCard title="Step 3. 최대응력" formula="σ_max = K × σ_nom"
                eqLines={[`σ_max = ${s.K} × ${fmt1(fromBase(res.sigmaNom, 'MPa', STRESS_UNITS), 2)} MPa`]}
                final={`σ_max = ${fmt1(fromBase(res.sigmaMax, 'MPa', STRESS_UNITS), 2)} MPa`} />
            </>
          ) : (
            <InputNeededPlaceholder />
          )}
    </>
  );
}

// 구멍 뚫린 판 — 구멍 옆(순단면)에서 응력선이 촘촘해지는 모습을 선 굵기로 표현
function PlateSVG({ s, onEditNum }) {
  // 좌우/아래에 치수선 자리를 두려고 그림을 조금 키웠다(원래 300×180).
  const w = 340, h = 236, plateW = 220, plateH = 90, cx = w / 2, cy = 92;
  const holeR = Math.min(30, plateW * 0.5 * Math.min(0.8, s.d / s.b));
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 340, margin: '0 auto', display: 'block', overflow: 'visible' }}>
      <rect x={cx - plateW / 2} y={cy - plateH / 2} width={plateW} height={plateH} fill="var(--bg)" stroke="#8A97A2" strokeWidth="1.6" />
      <circle cx={cx} cy={cy} r={holeR} fill="#fff" stroke="var(--crimson)" strokeWidth="1.8" />
      <line x1={cx} y1={cy - plateH / 2 - 8} x2={cx} y2={cy + plateH / 2 + 8} stroke="var(--gray)" strokeWidth="1" strokeDasharray="3 2" />
      <text x={cx} y={cy - plateH / 2 - 14} fontSize="10" fill="var(--gray)" textAnchor="middle">
        순단면 (b−d) 위치
      </text>
      {Array.from({ length: 5 }).map((_, i) => {
        const yy = cy - plateH / 2 + 10 + (i * (plateH - 20)) / 4;
        return (
          <line key={i} x1={cx + holeR + 4} y1={yy} x2={cx + plateW / 2 - 6} y2={yy} stroke="var(--crimson)" strokeWidth={2.6 - i * 0.4} opacity={0.9 - i * 0.15} />
        );
      })}
      <text x={cx + plateW / 2 + 8} y={cy} fontSize="10" fill="var(--crimson)" fontWeight="800">σ_max</text>
      <line x1={cx - plateW / 2 - 24} y1={cy} x2={cx - plateW / 2 - 6} y2={cy} stroke="#51626F" strokeWidth="2" />
      <line x1={cx + plateW / 2 + 6} y1={cy} x2={cx + plateW / 2 + 24} y2={cy} stroke="#51626F" strokeWidth="2" />

      {/* 치수 — 판 폭 b, 구멍 지름 d, 판 두께 t. 숫자를 클릭하면 그 자리에서 고칠 수 있다.
          (그림의 구멍 크기는 b 대비 비율로만 그리므로 숫자가 실제 값이다) */}
      <DimLineH
        x1={cx - holeR}
        x2={cx + holeR}
        y={cy + plateH / 2 + 14}
        labelDy={14}
        color="var(--crimson)"
        fontSize={10.5}
        value={s.d}
        unit={s.dimUnit}
        prefix="d = "
        boxW={54}
        onChange={onEditNum('d')}
      />
      <DimLineV
        x={cx - plateW / 2 - 14}
        y1={cy - plateH / 2}
        y2={cy + plateH / 2}
        fontSize={10.5}
        value={s.b}
        unit={s.dimUnit}
        prefix="b = "
        boxW={54}
        onChange={onEditNum('b')}
      />
      <Dim
        x={cx}
        y={cy + plateH / 2 + 46}
        fontSize={10.5}
        value={s.t}
        unit={s.dimUnit}
        prefix="판 두께 t = "
        boxW={54}
        onChange={onEditNum('t')}
      />
    </svg>
  );
}
