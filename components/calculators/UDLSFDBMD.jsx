'use client';

import { useMemo, useState } from 'react';
import { computeUDLSFDBMD } from '@/lib/calc/beamStatics';
import { LENGTH_UNITS, FORCE_UNITS, TORQUE_UNITS, QINTENSITY_UNITS, fromBase, fmt1 } from '@/lib/calc/units1';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import { DualField, ResetButton, ResultGrid, ResultCard, StepCard, ErrorBox, InputNeededPlaceholder } from './sm1/Controls';
import { CalcGate, useCalcGate } from './sm1/CalcGate';
import { BeamSchematic, CurveDiagram } from './sm1/BeamDiagrams';

// CH.4-3 SFD & BMD — Simply Supported Beam with UDL. 원본 renderUDLSFDBMD()의 React 버전.

const DEFAULTS = { L: 10, LUnit: 'm', q: 20, qUnit: 'kN/m', qStart: 0, qEnd: 10 };

const kN = (v) => fromBase(v, 'kN', FORCE_UNITS);
const kNm = (v) => fromBase(v, 'kN·m', TORQUE_UNITS);
const m = (v) => fromBase(v, 'm', LENGTH_UNITS);

export default function UDLSFDBMD() {
  const [s, setS] = useState(DEFAULTS);
  const res = useMemo(() => computeUDLSFDBMD(s), [s]);
  const gate = useCalcGate(s);
  const set = (patch) => setS((prev) => ({ ...prev, ...patch }));
  const setNum = (key) => (v) => set({ [key]: parseFloat(v) });

  return (
    <>
      {/* ---------------- Setting Menu ---------------- */}
      <div className="panel">
        <h3>SETTING MENU</h3>
        <DualField label="경간 L" value={s.L} min={1} max={50} step={0.5} onChange={setNum('L')}
          unitMap={LENGTH_UNITS} unit={s.LUnit} onUnitChange={(v) => set({ LUnit: v })} invalid={!(s.L > 0)} />
        <DualField label="분포하중 강도 q" value={s.q} min={0} max={100} step={0.5} onChange={setNum('q')}
          unitMap={QINTENSITY_UNITS} unit={s.qUnit} onUnitChange={(v) => set({ qUnit: v })} invalid={!(s.q >= 0)} />
        <DualField label="분포하중 시작 위치" value={s.qStart} min={0} max={s.L} step={0.1} onChange={setNum('qStart')}
          invalid={!(s.qStart >= 0 && s.qStart < s.qEnd)} />
        <DualField label="분포하중 끝 위치" value={s.qEnd} min={0} max={s.L} step={0.1} onChange={setNum('qEnd')}
          invalid={!(s.qEnd <= s.L && s.qEnd > s.qStart)}
          hint="기본값(0~L)은 전체 경간에 걸친 등분포하중이며, 위 두 값을 좁히면 부분 구간에만 하중을 실을 수 있습니다." />
        <ResetButton onClick={() => setS(DEFAULTS)} />
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="panel">
        <h3>VISUALIZER</h3>
        {res.valid ? (
          <>
            <BeamSchematic
              L={s.L}
              lengthUnit={s.LUnit}
              qUnit={s.qUnit}
              supports={[{ pos: 0, type: 'pin' }, { pos: s.L, type: 'roller' }]}
              udls={[{ start: s.qStart, end: s.qEnd, q: s.q }]}
              reactions={[{ pos: 0, R: kN(res.RA) }, { pos: s.L, R: kN(res.RB) }]}
              edit={{ L: setNum('L'), udlQ: (i, v) => set({ q: v }) }}
            />
            <ResultGrid>
              <ResultCard label="R_A" value={`${fmt1(kN(res.RA), 3)} kN`} />
              <ResultCard label="R_B" value={`${fmt1(kN(res.RB), 3)} kN`} />
              <ResultCard label="최대 굽힘모멘트 |M|_max" value={`${fmt1(kNm(res.Mmax), 3)} kN·m`} tone="comp" full />
            </ResultGrid>

            <h3 style={{ marginTop: 20 }}>SFD — V(x) (직선)</h3>
            <CurveDiagram points={res.Vpts.map((p) => ({ x: m(p.x), y: kN(p.y) }))} valueUnit="kN" lengthUnit="m" symbol="V" totalLen={m(res.L)} />
            <h3 style={{ marginTop: 20 }}>BMD — M(x) (포물선)</h3>
            <CurveDiagram points={res.Mpts.map((p) => ({ x: m(p.x), y: kNm(p.y) }))} valueUnit="kN·m" lengthUnit="m" symbol="M" totalLen={m(res.L)} />

            <div className="hint">
              하중이 걸린 구간에서 q가 일정하므로 V는 기울기 −q인 직선이고, M은 그 V를 적분한 모양이라 포물선이 됩니다
              (dV/dx = −q, dM/dx = V).
            </div>
            <EditableText as="div" className="ai-hint" contentKey="calc.UDLSFDBMD.aiHint"
              defaultText="💬 등분포하중에서는 왜 V가 직선, M이 포물선이 되는지, 오른쪽 AI 튜터에게 물어보세요." />
          </>
        ) : (
          <ErrorBox errors={res.errors} />
        )}

        <div className="steps" style={{ marginTop: 20 }}>
          <CalcGate gate={gate}>
            {(frozen) => {
              const fres = computeUDLSFDBMD(frozen);
              return fres.valid ? <Steps s={frozen} res={fres} /> : <InputNeededPlaceholder />;
            }}
          </CalcGate>
        </div>
      </div>

      <AiTutorPanel question="등분포하중은 왜 항상 중앙에서 M이 최대인가요?" />
    </>
  );
}

function Steps({ s, res }) {
  const isFullSpan = s.qStart === 0 && s.qEnd === s.L;
  const W = kN(res.q * (res.qEnd - res.qStart));
  return (
    <>
      <StepCard
        title="Step 1. 분포하중을 합력으로"
        formula="W = q × (하중 구간 길이)"
        eqLines={[`W = ${s.q} ${s.qUnit} × ${fmt1(s.qEnd - s.qStart, 2)} ${s.LUnit} = ${fmt1(W, 3)} kN`]}
        final={`합력 W = ${fmt1(W, 3)} kN (도심은 구간 한가운데)`}
      />
      <StepCard
        title="Step 2. 반력"
        formula={isFullSpan ? 'R_A = R_B = q·L/2 (전체 경간 대칭)' : 'ΣM_A = 0,  ΣFy = 0 (부분 구간)'}
        eqLines={[`R_A = ${fmt1(kN(res.RA), 3)} kN,  R_B = ${fmt1(kN(res.RB), 3)} kN`]}
        final="반력 확정"
      />
      <StepCard
        title="Step 3. V(x)"
        formula="dV/dx = −q  →  하중 구간 안에서 V는 직선"
        eqLines={[`하중 구간: ${s.qStart} ~ ${s.qEnd} ${s.LUnit} (구간 밖에서는 V가 일정)`]}
        final="SFD 형태 확인"
      />
      <StepCard
        title="Step 4. M(x) 및 최댓값"
        formula="dM/dx = V  →  하중 구간 안에서 M은 포물선"
        eqLines={['|M|_max는 V=0이 되는 위치에서 생긴다']}
        final={`M_max = ${fmt1(kNm(res.Mmax), 3)} kN·m`}
      />
    </>
  );
}
