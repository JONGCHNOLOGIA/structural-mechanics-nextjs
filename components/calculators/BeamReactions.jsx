'use client';

import { useMemo, useState } from 'react';
import { computeReactions } from '@/lib/calc/beamStatics';
import { LENGTH_UNITS, FORCE_UNITS, TORQUE_UNITS, QINTENSITY_UNITS, fromBase, fmt1 } from '@/lib/calc/units1';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import { DualField, ResetButton, ResultGrid, ResultCard, StepCard, ErrorBox, InputNeededPlaceholder } from './sm1/Controls';
import { CalcGate, useCalcGate } from './sm1/CalcGate';
import { BeamSchematic } from './sm1/BeamDiagrams';

// CH.4-1 Beam Reactions (Equilibrium) — 원본 renderBeamReactions()의 React 버전.

const DEFAULTS = {
  L: 10, LUnit: 'm',
  P1: 40, P1Unit: 'kN', a1: 3,
  P2: 0, P2Unit: 'kN', a2: 6,
  q: 0, qUnit: 'kN/m', qStart: 0, qEnd: 10,
  M0: 0, M0Unit: 'kN·m',
};

const kN = (v) => fromBase(v, 'kN', FORCE_UNITS);

export default function BeamReactions() {
  const [s, setS] = useState(DEFAULTS);
  const res = useMemo(() => computeReactions(s), [s]);
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
          contentKey="calc.BeamReactions.note"
          defaultText="왼쪽 끝(x=0)은 핀, 오른쪽 끝(x=L)은 롤러인 단순보입니다. 미지수가 둘(R_A, R_B)이고 평형방정식도 둘(ΣM=0, ΣFy=0)이라 정정구조로 풀립니다."
        />
        <DualField label="경간 L" value={s.L} min={1} max={50} step={0.5} onChange={setNum('L')}
          unitMap={LENGTH_UNITS} unit={s.LUnit} onUnitChange={(v) => set({ LUnit: v })} invalid={!(s.L > 0)} />
        <DualField label="하중 P₁" value={s.P1} min={0} max={500} step={1} onChange={setNum('P1')}
          unitMap={FORCE_UNITS} unit={s.P1Unit} onUnitChange={(v) => set({ P1Unit: v })} />
        <DualField label="P₁ 위치 a₁" value={s.a1} min={0} max={s.L} step={0.1} onChange={setNum('a1')}
          invalid={!(s.a1 >= 0 && s.a1 <= s.L)} />
        <DualField label="하중 P₂ (선택, 0이면 없음)" value={s.P2} min={0} max={500} step={1} onChange={setNum('P2')}
          unitMap={FORCE_UNITS} unit={s.P2Unit} onUnitChange={(v) => set({ P2Unit: v })} />
        <DualField label="P₂ 위치 a₂" value={s.a2} min={0} max={s.L} step={0.1} onChange={setNum('a2')}
          invalid={!(s.a2 >= 0 && s.a2 <= s.L)} />
        <DualField label="분포하중 강도 q (선택, 0이면 없음)" value={s.q} min={0} max={100} step={0.5} onChange={setNum('q')}
          unitMap={QINTENSITY_UNITS} unit={s.qUnit} onUnitChange={(v) => set({ qUnit: v })} />
        <DualField label="분포하중 시작" value={s.qStart} min={0} max={s.L} step={0.1} onChange={setNum('qStart')} />
        <DualField label="분포하중 끝" value={s.qEnd} min={0} max={s.L} step={0.1} onChange={setNum('qEnd')} />
        <DualField label="집중모멘트 M₀ (CCW 양수, 선택)" value={s.M0} min={-200} max={200} step={1} onChange={setNum('M0')}
          unitMap={TORQUE_UNITS} unit={s.M0Unit} onUnitChange={(v) => set({ M0Unit: v })}
          hint={
            <EditableText
              as="span"
              contentKey="beamReactions.momentHint"
              defaultText="M₀의 회전방향 부호는 교재마다 표기가 다를 수 있습니다 — 이 도구는 CCW(반시계)를 양수로 통일해서 계산합니다. 값을 0으로 두면 영향이 없습니다. 짝힘(couple)은 어디에 걸든 반력이 같으므로 그림에서는 보 가운데에 표시합니다."
            />
          } />
        <ResetButton onClick={() => setS(DEFAULTS)} />
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="panel">
        <h3>VISUALIZER</h3>
        {res.valid ? (
          <>
            <BeamSchematic
              L={res.L}
              supports={[{ pos: 0, type: 'pin' }, { pos: res.L, type: 'roller' }]}
              pointLoads={[{ pos: res.a1, P: kN(res.P1) }, { pos: res.a2, P: kN(res.P2) }].filter((p) => p.P > 0)}
              udls={res.q > 0 ? [{ start: res.qStart, end: res.qEnd, q: fromBase(res.q, 'kN/m', QINTENSITY_UNITS) }] : []}
              appliedMoments={res.M0 !== 0 ? [{ pos: res.L / 2, M: fromBase(res.M0, 'kN·m', TORQUE_UNITS) }] : []}
              reactions={[{ pos: 0, R: kN(res.RA) }, { pos: res.L, R: kN(res.RB) }]}
            />
            <ResultGrid>
              <ResultCard label="반력 R_A" value={`${fmt1(kN(res.RA), 3)} kN`} />
              <ResultCard label="반력 R_B" value={`${fmt1(kN(res.RB), 3)} kN`} />
              <ResultCard label="평형 검산 (보 끝에서 V, M ≈ 0)" value={`${fmt1(res.checkV, 4)}, ${fmt1(res.checkM, 4)}`} full />
            </ResultGrid>
            <EditableText as="div" className="ai-hint" contentKey="calc.BeamReactions.aiHint"
              defaultText="💬 반력을 구할 때 왜 A점 모멘트를 잡는지, 오른쪽 AI 튜터에게 물어보세요." />
          </>
        ) : (
          <ErrorBox errors={res.errors} />
        )}

        <div className="steps" style={{ marginTop: 20 }}>
          <CalcGate gate={gate}>
            {(frozen) => {
              const fres = computeReactions(frozen);
              return fres.valid ? <Steps s={frozen} res={fres} /> : <InputNeededPlaceholder />;
            }}
          </CalcGate>
        </div>
      </div>

      <AiTutorPanel question="분포하중은 왜 도심에 걸린 하나의 힘으로 바꿔도 되나요?" />
    </>
  );
}

function Steps({ s, res }) {
  const qTotal = kN(res.q * (res.qEnd - res.qStart));
  return (
    <>
      <StepCard
        title="Step 1. ΣM_A = 0 으로 R_B"
        formula="R_B · L = ΣPᵢ·aᵢ + q(구간)·(도심까지 거리) + M₀"
        eqLines={[
          `P₁·a₁ = ${fmt1(kN(res.P1), 2)} × ${s.a1} = ${fmt1(kN(res.P1) * s.a1, 2)} kN·m`,
          res.P2 > 0 ? `P₂·a₂ = ${fmt1(kN(res.P2), 2)} × ${s.a2} = ${fmt1(kN(res.P2) * s.a2, 2)} kN·m` : 'P₂ = 0 (없음)',
          res.q > 0 ? `분포하중 합력 = ${fmt1(qTotal, 2)} kN, 도심 위치 = ${fmt1((s.qStart + s.qEnd) / 2, 2)} ${s.LUnit}` : 'q = 0 (없음)',
        ]}
        final={`R_B = ${fmt1(kN(res.RB), 3)} kN`}
      />
      <StepCard
        title="Step 2. ΣFy = 0 으로 R_A"
        formula="R_A + R_B = ΣPᵢ + q·(구간 길이)"
        eqLines={[`R_A = (전체 하중 ${fmt1(kN(res.P1) + kN(res.P2) + qTotal, 2)} kN) − R_B`]}
        final={`R_A = ${fmt1(kN(res.RA), 3)} kN`}
      />
      <StepCard
        title="Step 3. 검산"
        formula="보 오른쪽 끝(x=L)에서는 V=0, M=0 이어야 한다"
        eqLines={[`V(L) = ${fmt1(res.checkV, 5)}`, `M(L) = ${fmt1(res.checkM, 5)}`]}
        final={Math.abs(res.checkV) < 1e-6 && Math.abs(res.checkM) < 1e-6 ? '평형 만족 ✓' : '⚠ 확인 필요'}
      />
    </>
  );
}
