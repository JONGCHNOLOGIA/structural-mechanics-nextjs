'use client';

import { useMemo, useState } from 'react';
import { computeTorqueDiagram } from '@/lib/calc/torsion';
import { LENGTH_UNITS, STRESS_UNITS, TORQUE_UNITS, fromBase, fmt1 } from '@/lib/calc/units1';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import { DualField, SelectField, ResetButton, ResultGrid, ResultCard, StepCard, ErrorBox, InputNeededPlaceholder } from './sm1/Controls';
import { CalcGate, useCalcGate } from './sm1/CalcGate';
import { StepDiagram } from './sm1/Diagrams';

// CH.3-4 Torque Diagram (Multi-Segment Shaft) — 원본 renderTorqueDiagram()의 React 버전.

const DEFAULTS = {
  segCount: 2,
  segs: [
    { T: 2000, TUnit: 'N·m', L: 0.6, LUnit: 'm', d: 50, dimUnit: 'mm', G: 80, GUnit: 'GPa' },
    { T: -250, TUnit: 'N·m', L: 0.4, LUnit: 'm', d: 50, dimUnit: 'mm', G: 40, GUnit: 'GPa' },
    { T: 0, TUnit: 'N·m', L: 0.3, LUnit: 'm', d: 50, dimUnit: 'mm', G: 80, GUnit: 'GPa' },
  ],
};

export default function TorqueDiagram() {
  const [s, setS] = useState(DEFAULTS);
  const res = useMemo(() => computeTorqueDiagram(s), [s]);
  const gate = useCalcGate(s);

  function setSeg(i, key, v, numeric = true) {
    setS((prev) => ({
      ...prev,
      segs: prev.segs.map((seg, idx) => (idx === i ? { ...seg, [key]: numeric ? parseFloat(v) : v } : seg)),
    }));
  }

  // 다이어그램은 N·m / m 로 통일해서 그린다 — 구간마다 입력 단위가 달라도 같은 축 위에 놓이게.
  const segments = res.valid
    ? res.perSeg.map((p) => ({ value: fromBase(p.T_Nm, 'N·m', TORQUE_UNITS), length: fromBase(p.L_m, 'm', LENGTH_UNITS) }))
    : [];

  return (
    <>
      {/* ---------------- Setting Menu ---------------- */}
      <div className="panel">
        <h3>SETTING MENU</h3>
        <EditableText
          as="div"
          className="note-box"
          contentKey="calc.TorqueDiagram.note"
          defaultText="구간마다 내부토크 T가 다른 축입니다. 각 구간의 비틀림각을 따로 구해서 더하면 전체 비틀림각이 됩니다(중첩). 부호는 회전 방향을 뜻하므로, 방향이 반대인 구간은 전체 각도를 오히려 줄입니다."
        />
        <SelectField
          label="구간 개수"
          value={String(s.segCount)}
          options={[
            { value: '2', label: '2구간' },
            { value: '3', label: '3구간' },
          ]}
          onChange={(v) => setS((prev) => ({ ...prev, segCount: parseInt(v, 10) }))}
        />
        <div className="hint">서로 다른 재질(G)·지름을 구간마다 넣어 강철-청동 합성축 같은 경우도 표현할 수 있습니다.</div>
        {s.segs.slice(0, s.segCount).map((seg, i) => (
          <div key={i} className="field" style={{ border: '1px solid var(--line)', borderRadius: 0, padding: 10, marginBottom: 10 }}>
            <label style={{ color: 'var(--crimson)' }}>구간 {i + 1}</label>
            <DualField label="내부토크 T (부호로 방향 구분)" value={seg.T} min={-3000} max={3000} step={10}
              onChange={(v) => setSeg(i, 'T', v)}
              unitMap={TORQUE_UNITS} unit={seg.TUnit} onUnitChange={(v) => setSeg(i, 'TUnit', v, false)} />
            <DualField label="길이 L" value={seg.L} min={0.01} max={5} step={0.01} onChange={(v) => setSeg(i, 'L', v)}
              unitMap={LENGTH_UNITS} unit={seg.LUnit} onUnitChange={(v) => setSeg(i, 'LUnit', v, false)} invalid={!(seg.L > 0)} />
            <DualField label="직경 d" value={seg.d} min={1} max={200} step={0.5} onChange={(v) => setSeg(i, 'd', v)}
              unitMap={LENGTH_UNITS} unit={seg.dimUnit} onUnitChange={(v) => setSeg(i, 'dimUnit', v, false)} invalid={!(seg.d > 0)} />
            <DualField label="전단탄성계수 G" value={seg.G} min={0.1} max={500} step={0.5} onChange={(v) => setSeg(i, 'G', v)}
              unitMap={STRESS_UNITS} unit={seg.GUnit} onUnitChange={(v) => setSeg(i, 'GUnit', v, false)} invalid={!(seg.G > 0)} />
          </div>
        ))}
        <ResetButton onClick={() => setS(DEFAULTS)} />
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="panel">
        <h3>VISUALIZER</h3>
        {res.valid ? (
          <>
            <h3>토크선도 T(x) — 구간별 계단식</h3>
            <StepDiagram segments={segments} valueUnit="N·m" lengthUnit="m" quantitySymbol="T" />
            <div className="hint">
              내부토크는 구간 안에서는 일정하고, 외부 토크가 걸리는 경계에서만 값이 튑니다. 그래서 T(x)는 계단 모양이 됩니다.
            </div>
            <ResultGrid>
              {res.perSeg.map((p, i) => (
                <ResultCard key={i} label={`구간${i + 1} τ_max`} value={`${fmt1(fromBase(p.tauMax, 'MPa', STRESS_UNITS), 2)} MPa`} />
              ))}
              <ResultCard label="전체 비틀림각 φ_total = Σφᵢ" value={`${fmt1((res.totalPhi * 180) / Math.PI, 3)}°`} tone="comp" full />
            </ResultGrid>
            <EditableText as="div" className="ai-hint" contentKey="calc.TorqueDiagram.aiHint"
              defaultText="💬 여러 토크가 걸린 축에서 T(x)가 왜 계단식으로 바뀌는지, 오른쪽 AI 튜터에게 물어보세요." />
          </>
        ) : (
          <ErrorBox errors={res.errors} />
        )}

        <div className="steps" style={{ marginTop: 20 }}>
          <CalcGate gate={gate}>
            {(frozen) => {
              const fres = computeTorqueDiagram(frozen);
              return fres.valid ? <Steps s={frozen} res={fres} /> : <InputNeededPlaceholder />;
            }}
          </CalcGate>
        </div>
      </div>

      <AiTutorPanel question="강철-청동 합성축은 왜 각도가 재질별로 다르게 쌓이나요?" />
    </>
  );
}

function Steps({ s, res }) {
  const cards = res.perSeg.map((p, i) => (
    <StepCard
      key={i}
      title={`Step ${i + 1}. 구간 ${i + 1} 비틀림각`}
      formula="φᵢ = Tᵢ·Lᵢ / (Gᵢ·Ipᵢ)"
      eqLines={[
        `Ip${i + 1} = πd⁴/32 = ${fmt1(p.Ip * 1e12, 1)} mm⁴`,
        `φ${i + 1} = ${fmt1(p.T_Nm, 1)} N·m × ${fmt1(p.L_m, 3)} m / (${fmt1(fromBase(p.G_Pa, 'GPa', STRESS_UNITS), 1)} GPa × Ip${i + 1})`,
      ]}
      final={`φ${i + 1} = ${fmt1((p.phi * 180) / Math.PI, 3)}°,  τ_max = ${fmt1(fromBase(p.tauMax, 'MPa', STRESS_UNITS), 2)} MPa`}
    />
  ));
  cards.push(
    <StepCard
      key="total"
      title={`Step ${res.perSeg.length + 1}. 전체 비틀림각`}
      formula="φ_total = Σφᵢ"
      eqLines={res.perSeg.map((p, i) => `φ${i + 1} = ${fmt1((p.phi * 180) / Math.PI, 3)}°`)}
      final={`φ_total = ${fmt1((res.totalPhi * 180) / Math.PI, 3)}°`}
    />
  );
  return <>{cards}</>;
}
