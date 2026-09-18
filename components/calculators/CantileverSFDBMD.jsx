'use client';

import { useMemo, useState } from 'react';
import { computeCantileverSFDBMD } from '@/lib/calc/beamStatics';
import { LENGTH_UNITS, FORCE_UNITS, TORQUE_UNITS, QINTENSITY_UNITS, fromBase, fmt1 } from '@/lib/calc/units1';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import { DualField, ResetButton, ResultGrid, ResultCard, StepCard, ErrorBox, InputNeededPlaceholder } from './sm1/Controls';
import { CalcGate, useCalcGate } from './sm1/CalcGate';
import { BeamSchematic, CurveDiagram } from './sm1/BeamDiagrams';

// CH.4-4 SFD & BMD — Cantilever Beam. 원본 renderCantileverSFDBMD()의 React 버전.

const DEFAULTS = { L: 6, LUnit: 'm', P: 50, PUnit: 'kN', a: 6, q: 0, qUnit: 'kN/m' };

const kN = (v) => fromBase(v, 'kN', FORCE_UNITS);
const kNm = (v) => fromBase(v, 'kN·m', TORQUE_UNITS);
const m = (v) => fromBase(v, 'm', LENGTH_UNITS);

export default function CantileverSFDBMD() {
  const [s, setS] = useState(DEFAULTS);
  const res = useMemo(() => computeCantileverSFDBMD(s), [s]);
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
          contentKey="calc.CantileverSFDBMD.note"
          defaultText="왼쪽 끝(x=0)이 고정단, 오른쪽 끝(x=L)이 자유단입니다. 고정단은 수직반력과 모멘트반력을 둘 다 내므로 하중이 얼마든 혼자서 평형을 맞춥니다."
        />
        <DualField label="경간(돌출 길이) L" value={s.L} min={1} max={30} step={0.5} onChange={setNum('L')}
          unitMap={LENGTH_UNITS} unit={s.LUnit} onUnitChange={(v) => set({ LUnit: v })} invalid={!(s.L > 0)} />
        <DualField label="집중하중 P" value={s.P} min={0} max={500} step={1} onChange={setNum('P')}
          unitMap={FORCE_UNITS} unit={s.PUnit} onUnitChange={(v) => set({ PUnit: v })} invalid={!(s.P >= 0)} />
        <DualField label="하중 위치 a (0=고정단, L=자유단)" value={s.a} min={0} max={s.L} step={0.1} onChange={setNum('a')}
          invalid={!(s.a >= 0 && s.a <= s.L)} />
        <DualField label="분포하중 q (선택, 전체 경간)" value={s.q} min={0} max={100} step={0.5} onChange={setNum('q')}
          unitMap={QINTENSITY_UNITS} unit={s.qUnit} onUnitChange={(v) => set({ qUnit: v })} invalid={!(s.q >= 0)} />
        <ResetButton onClick={() => setS(DEFAULTS)} />
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="panel">
        <h3>VISUALIZER</h3>
        {res.valid ? (
          <>
            <BeamSchematic
              L={res.L}
              supports={[{ pos: 0, type: 'fixed' }]}
              pointLoads={res.P > 0 ? [{ pos: res.a, P: kN(res.P) }] : []}
              udls={res.q > 0 ? [{ start: 0, end: res.L, q: fromBase(res.q, 'kN/m', QINTENSITY_UNITS) }] : []}
              reactions={[{ pos: 0, R: kN(res.R) }]}
            />
            <ResultGrid>
              <ResultCard label="고정단 반력 R" value={`${fmt1(kN(res.R), 3)} kN`} />
              <ResultCard label="고정단 모멘트 M₀ (hogging이라 음수)" value={`${fmt1(kNm(res.M0), 3)} kN·m`} tone="comp" />
            </ResultGrid>

            <h3 style={{ marginTop: 20 }}>SFD — V(x)</h3>
            <CurveDiagram points={res.Vpts.map((p) => ({ x: m(p.x), y: kN(p.y) }))} valueUnit="kN" lengthUnit="m" symbol="V" totalLen={m(res.L)} />
            <h3 style={{ marginTop: 20 }}>BMD — M(x)</h3>
            <CurveDiagram points={res.Mpts.map((p) => ({ x: m(p.x), y: kNm(p.y) }))} valueUnit="kN·m" lengthUnit="m" symbol="M" totalLen={m(res.L)} />

            <div className="hint">
              캔틸레버는 모멘트가 전 구간에서 음수(hogging — 위로 볼록)입니다. 그래서 굽힘응력도 단순보와 반대로 <b>윗면이 인장</b>,
              아랫면이 압축이 됩니다.
            </div>
            <EditableText as="div" className="ai-hint" contentKey="calc.CantileverSFDBMD.aiHint"
              defaultText="💬 캔틸레버는 왜 굽힘모멘트가 항상 음수(hogging)로 나오는지, 오른쪽 AI 튜터에게 물어보세요." />
          </>
        ) : (
          <ErrorBox errors={res.errors} />
        )}

        <div className="steps" style={{ marginTop: 20 }}>
          <CalcGate gate={gate}>
            {(frozen) => {
              const fres = computeCantileverSFDBMD(frozen);
              return fres.valid ? <Steps s={frozen} res={fres} /> : <InputNeededPlaceholder />;
            }}
          </CalcGate>
        </div>
      </div>

      <AiTutorPanel question="고정단 모멘트는 실제로 어떻게 저항되나요?" />
    </>
  );
}

function Steps({ s, res }) {
  const endVM = res.Vpts[res.Vpts.length - 1].y;
  const endM = res.Mpts[res.Mpts.length - 1].y;
  return (
    <>
      <StepCard
        title="Step 1. 고정단 반력"
        formula="R = P + q·L"
        eqLines={[`R = ${s.P} ${s.PUnit} + ${s.q} ${s.qUnit} × ${s.L} ${s.LUnit}`]}
        final={`R = ${fmt1(kN(res.R), 3)} kN`}
      />
      <StepCard
        title="Step 2. 고정단 모멘트"
        formula="M₀ = −(P·a + q·L²/2)"
        eqLines={[`M₀ = −(${s.P}×${s.a} + ${s.q}×${s.L}²/2)`]}
        final={`M₀ = ${fmt1(kNm(res.M0), 3)} kN·m (음수 = hogging)`}
      />
      <StepCard
        title="Step 3. 자유단 경계조건 검산"
        formula="자유단(x=L)에는 아무 지지도 없으므로 V=0, M=0"
        eqLines={[`V(L) = ${fmt1(kN(endVM), 5)} kN`, `M(L) = ${fmt1(kNm(endM), 5)} kN·m`]}
        final={Math.abs(endVM) < 1e-6 && Math.abs(endM) < 1e-6 ? '경계조건 만족 ✓' : '⚠ 확인 필요'}
      />
    </>
  );
}
