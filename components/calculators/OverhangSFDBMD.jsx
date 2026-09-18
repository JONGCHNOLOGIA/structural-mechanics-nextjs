'use client';

import { useMemo, useState } from 'react';
import { computeOverhangSFDBMD } from '@/lib/calc/beamStatics';
import { LENGTH_UNITS, FORCE_UNITS, TORQUE_UNITS, fromBase, fmt1 } from '@/lib/calc/units1';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import { DualField, ResetButton, ResultGrid, ResultCard, StepCard, ErrorBox, InputNeededPlaceholder } from './sm1/Controls';
import { CalcGate, useCalcGate } from './sm1/CalcGate';
import { BeamSchematic, CurveDiagram } from './sm1/BeamDiagrams';

// CH.4-5 SFD & BMD — Overhanging Beam. 원본 renderOverhangSFDBMD()의 React 버전.

const DEFAULTS = { L: 12, LUnit: 'm', Lb: 8, P: 60, PUnit: 'kN', a: 12 };

const kN = (v) => fromBase(v, 'kN', FORCE_UNITS);
const kNm = (v) => fromBase(v, 'kN·m', TORQUE_UNITS);
const m = (v) => fromBase(v, 'm', LENGTH_UNITS);

export default function OverhangSFDBMD() {
  const [s, setS] = useState(DEFAULTS);
  const res = useMemo(() => computeOverhangSFDBMD(s), [s]);
  const gate = useCalcGate(s);
  const set = (patch) => setS((prev) => ({ ...prev, ...patch }));
  const setNum = (key) => (v) => set({ [key]: parseFloat(v) });

  return (
    <>
      {/* ---------------- Setting Menu ---------------- */}
      <div className="panel">
        <h3>SETTING MENU</h3>
        <DualField label="전체 길이 L (자유단 끝까지)" value={s.L} min={1} max={40} step={0.5} onChange={setNum('L')}
          unitMap={LENGTH_UNITS} unit={s.LUnit} onUnitChange={(v) => set({ LUnit: v })} invalid={!(s.L > 0)} />
        <DualField label="오른쪽 지점 위치 Lb (0~L)" value={s.Lb} min={0.5} max={Math.max(0.5, s.L - 0.5)} step={0.1}
          onChange={setNum('Lb')} invalid={!(s.Lb > 0 && s.Lb < s.L)} />
        <DualField label="하중 P" value={s.P} min={0} max={500} step={1} onChange={setNum('P')}
          unitMap={FORCE_UNITS} unit={s.PUnit} onUnitChange={(v) => set({ PUnit: v })} invalid={!(s.P >= 0)} />
        <DualField label="하중 위치 a (0~L, 기본값=자유단 끝 L)" value={s.a} min={0} max={s.L} step={0.1} onChange={setNum('a')}
          invalid={!(s.a >= 0 && s.a <= s.L)}
          hint="왼쪽 지점(핀)은 x=0, 오른쪽 지점(롤러)은 x=Lb, 돌출 구간은 Lb~L 입니다. 하중 위치 a를 Lb보다 작게 두면 주경간 안쪽 하중도 표현할 수 있습니다." />
        <ResetButton onClick={() => setS(DEFAULTS)} />
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="panel">
        <h3>VISUALIZER</h3>
        {res.valid ? (
          <>
            <BeamSchematic
              L={res.L}
              supports={[{ pos: 0, type: 'pin' }, { pos: res.Lb, type: 'roller' }]}
              pointLoads={[{ pos: res.a, P: kN(res.P) }]}
              reactions={[{ pos: 0, R: kN(res.RA) }, { pos: res.Lb, R: kN(res.RB) }]}
            />
            <ResultGrid>
              <ResultCard label="R_A" value={`${fmt1(kN(res.RA), 3)} kN`} tone={res.RA < 0 ? 'comp' : 'tens'} />
              <ResultCard label="R_B" value={`${fmt1(kN(res.RB), 3)} kN`} />
              <ResultCard label="최대 |M|" value={`${fmt1(kNm(res.Mmax), 3)} kN·m`} />
              {res.RA < 0 && (
                <ResultCard label="참고" value="R_A가 음수 = A점에서 보가 들뜨려는 경향 (지점이 아래로 잡아당겨야 함)" full />
              )}
            </ResultGrid>

            <h3 style={{ marginTop: 20 }}>SFD — V(x)</h3>
            <CurveDiagram points={res.Vpts.map((p) => ({ x: m(p.x), y: kN(p.y) }))} valueUnit="kN" lengthUnit="m" symbol="V" totalLen={m(res.L)} />
            <h3 style={{ marginTop: 20 }}>BMD — M(x)</h3>
            <CurveDiagram points={res.Mpts.map((p) => ({ x: m(p.x), y: kNm(p.y) }))} valueUnit="kN·m" lengthUnit="m" symbol="M" totalLen={m(res.L)} />

            <div className="hint">
              주경간(0~Lb)은 아래로 처져 sagging(+M), 돌출 구간(Lb~L)은 반대로 hogging(−M)이 되기 쉽습니다. 부호가 바뀌는 지점
              (M=0인 위치)을 변곡점(inflection point)이라고 합니다.
            </div>
            <EditableText as="div" className="ai-hint" contentKey="calc.OverhangSFDBMD.aiHint"
              defaultText="💬 돌출보에서 M의 부호가 구간마다 왜 바뀌는지, 오른쪽 AI 튜터에게 물어보세요." />
          </>
        ) : (
          <ErrorBox errors={res.errors} />
        )}

        <div className="steps" style={{ marginTop: 20 }}>
          <CalcGate gate={gate}>
            {(frozen) => {
              const fres = computeOverhangSFDBMD(frozen);
              return fres.valid ? <Steps s={frozen} res={fres} /> : <InputNeededPlaceholder />;
            }}
          </CalcGate>
        </div>
      </div>

      <AiTutorPanel question="R_A가 음수로 나오면 실제로 무슨 뜻인가요?" />
    </>
  );
}

function Steps({ s, res }) {
  const endM = res.Mpts[res.Mpts.length - 1].y;
  return (
    <>
      <StepCard
        title="Step 1. ΣM_A = 0 으로 R_B"
        formula="R_B · Lb = P · a"
        eqLines={[`R_B = ${s.P} × ${s.a} / ${s.Lb}`]}
        final={`R_B = ${fmt1(kN(res.RB), 3)} kN`}
      />
      <StepCard
        title="Step 2. ΣFy = 0 으로 R_A"
        formula="R_A = P − R_B"
        eqLines={[`R_A = ${s.P} − ${fmt1(kN(res.RB), 3)}`]}
        final={`R_A = ${fmt1(kN(res.RA), 3)} kN${res.RA < 0 ? ' (음수 → A가 보를 아래로 잡아줘야 함)' : ''}`}
      />
      <StepCard
        title="Step 3. 경계조건 검산"
        formula="자유단(x=L)에는 지지가 없으므로 M=0"
        eqLines={[`M(L) = ${fmt1(kNm(endM), 5)} kN·m`]}
        final={Math.abs(endM) < 1e-6 ? '경계조건 만족 ✓' : '⚠ 확인 필요'}
      />
    </>
  );
}
