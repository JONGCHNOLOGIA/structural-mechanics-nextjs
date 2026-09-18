'use client';

import { useMemo, useState } from 'react';
import { computeTriangularLoad } from '@/lib/calc/beamStatics';
import { LENGTH_UNITS, FORCE_UNITS, TORQUE_UNITS, QINTENSITY_UNITS, fromBase, fmt1 } from '@/lib/calc/units1';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import { DualField, SelectField, ResetButton, ResultGrid, ResultCard, StepCard, ErrorBox, InputNeededPlaceholder } from './sm1/Controls';
import { CalcGate, useCalcGate } from './sm1/CalcGate';
import { BeamSchematic, CurveDiagram } from './sm1/BeamDiagrams';

// CH.4-6 SFD & BMD — Linearly Varying (Triangular) Distributed Load.
// 원본 renderTriangularLoad()의 React 버전.

const DEFAULTS = { mode: 'cantilever', L: 6, LUnit: 'm', q0: 12, qUnit: 'kN/m' };

const MODE_OPTIONS = [
  { value: 'cantilever', label: '(a) Cantilever — A 자유단, B 고정단' },
  { value: 'simple', label: '(b) Simply Supported — A 핀, B 롤러' },
  { value: 'rollerslide', label: '(c) Roller + Sliding — A 롤러, B 슬라이딩' },
];

const kN = (v) => fromBase(v, 'kN', FORCE_UNITS);
const kNm = (v) => fromBase(v, 'kN·m', TORQUE_UNITS);
const m = (v) => fromBase(v, 'm', LENGTH_UNITS);

export default function TriangularLoadSFDBMD() {
  const [s, setS] = useState(DEFAULTS);
  const res = useMemo(() => computeTriangularLoad(s), [s]);
  const gate = useCalcGate(s);
  const set = (patch) => setS((prev) => ({ ...prev, ...patch }));
  const setNum = (key) => (v) => set({ [key]: parseFloat(v) });

  const supports =
    s.mode === 'cantilever'
      ? [{ pos: res.L, type: 'fixed' }]
      : s.mode === 'simple'
      ? [{ pos: 0, type: 'pin' }, { pos: res.L, type: 'roller' }]
      : [{ pos: 0, type: 'roller' }, { pos: res.L, type: 'slide' }];

  const reactionsDisp = res.valid
    ? s.mode === 'cantilever'
      ? [{ pos: res.L, R: kN(res.RA) }]
      : s.mode === 'simple'
      ? [{ pos: 0, R: kN(res.RA) }, { pos: res.L, R: kN(res.RB) }]
      : [{ pos: 0, R: kN(res.RA) }]
    : [];

  return (
    <>
      {/* ---------------- Setting Menu ---------------- */}
      <div className="panel">
        <h3>SETTING MENU</h3>
        <EditableText
          as="div"
          className="note-box"
          contentKey="calc.TriangularLoadSFDBMD.note"
          defaultText="하중은 A(x=0)에서 0, B(x=L)에서 최대 q₀인 삼각형(선형변화) 분포하중으로 고정되어 있습니다 (교재 Example 4-11과 같은 형태). 지지조건만 바꿔 가며 같은 하중이 어떻게 다르게 받쳐지는지 비교해보세요."
        />
        <SelectField label="지지조건" value={s.mode} options={MODE_OPTIONS} onChange={(v) => set({ mode: v })} />
        <DualField label="경간 L" value={s.L} min={1} max={30} step={0.5} onChange={setNum('L')}
          unitMap={LENGTH_UNITS} unit={s.LUnit} onUnitChange={(v) => set({ LUnit: v })} invalid={!(s.L > 0)} />
        <DualField label="최대 하중강도 q₀ (B단에서 최대)" value={s.q0} min={0} max={100} step={0.5} onChange={setNum('q0')}
          unitMap={QINTENSITY_UNITS} unit={s.qUnit} onUnitChange={(v) => set({ qUnit: v })} invalid={!(s.q0 >= 0)} />
        <ResetButton onClick={() => setS(DEFAULTS)} />
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="panel">
        <h3>VISUALIZER</h3>
        {res.valid ? (
          <>
            <BeamSchematic
              L={res.L}
              supports={supports}
              udls={[{ start: 0, end: res.L, q1: 0, q2: fromBase(res.q0, 'kN/m', QINTENSITY_UNITS) }]}
              reactions={reactionsDisp}
            />
            <Results mode={s.mode} res={res} />

            <h3 style={{ marginTop: 20 }}>SFD — V(x) (2차곡선)</h3>
            <CurveDiagram points={res.Vpts.map((p) => ({ x: m(p.x), y: kN(p.y) }))} valueUnit="kN" lengthUnit="m" symbol="V" totalLen={m(res.L)} />
            <h3 style={{ marginTop: 20 }}>BMD — M(x) (3차곡선)</h3>
            <CurveDiagram points={res.Mpts.map((p) => ({ x: m(p.x), y: kNm(p.y) }))} valueUnit="kN·m" lengthUnit="m" symbol="M" totalLen={m(res.L)} />

            <div className="hint">
              q가 x에 대해 1차로 변하므로, 한 번 적분한 V는 2차곡선, 한 번 더 적분한 M은 3차곡선이 됩니다
              (등분포하중일 때의 직선·포물선보다 한 차수씩 높습니다).
            </div>
            <EditableText as="div" className="ai-hint" contentKey="calc.TriangularLoadSFDBMD.aiHint"
              defaultText="💬 왜 삼각형 하중에서는 SFD가 곡선, BMD가 3차곡선이 되는지, 오른쪽 AI 튜터에게 물어보세요." />
          </>
        ) : (
          <ErrorBox errors={res.errors} />
        )}

        <div className="steps" style={{ marginTop: 20 }}>
          <CalcGate gate={gate}>
            {(frozen) => {
              const fres = computeTriangularLoad(frozen);
              return fres.valid ? <Steps s={frozen} res={fres} /> : <InputNeededPlaceholder />;
            }}
          </CalcGate>
        </div>
      </div>

      <AiTutorPanel question="삼각형 하중의 합력은 왜 도심이 한쪽으로 치우치나요?" />
    </>
  );
}

function Results({ mode, res }) {
  if (mode === 'cantilever') {
    return (
      <ResultGrid>
        <ResultCard label="전체하중 W (삼각형 넓이)" value={`${fmt1(kN(res.totalLoad), 3)} kN`} />
        <ResultCard label="고정단 반력 R_B" value={`${fmt1(kN(res.RA), 3)} kN`} />
        <ResultCard label="고정단 모멘트 M_B" value={`${fmt1(kNm(res.M0), 3)} kN·m`} tone="comp" full />
      </ResultGrid>
    );
  }
  if (mode === 'simple') {
    return (
      <ResultGrid>
        <ResultCard label="R_A (= W × 1/3)" value={`${fmt1(kN(res.RA), 3)} kN`} />
        <ResultCard label="R_B (= W × 2/3)" value={`${fmt1(kN(res.RB), 3)} kN`} />
        <ResultCard label="최대모멘트 (x = L/√3)" value={`${fmt1(kNm(res.Mmax), 3)} kN·m`} tone="comp" full />
      </ResultGrid>
    );
  }
  return (
    <ResultGrid>
      <ResultCard label="R_A (롤러, = 전체하중 W)" value={`${fmt1(kN(res.RA), 3)} kN`} />
      <ResultCard label="B 슬라이딩단 반력모멘트 M_B" value={`${fmt1(kNm(res.MB), 3)} kN·m`} tone="comp" />
    </ResultGrid>
  );
}

function Steps({ s, res }) {
  const cards = [
    <StepCard
      key="W"
      title="Step 1. 전체하중 (하중 삼각형의 넓이)"
      formula="W = (1/2) · q₀ · L"
      eqLines={[`W = 0.5 × ${s.q0} ${s.qUnit} × ${s.L} ${s.LUnit}`]}
      final={`W = ${fmt1(kN(res.totalLoad), 3)} kN (도심은 B쪽에서 L/3 지점)`}
    />,
  ];

  if (s.mode === 'cantilever') {
    cards.push(
      <StepCard key="R" title="Step 2. 고정단 반력" formula="R_B = W (전체하중을 고정단이 다 받는다)"
        eqLines={[]} final={`R_B = ${fmt1(kN(res.RA), 3)} kN`} />,
      <StepCard key="M" title="Step 3. 고정단 모멘트" formula="M_B = −W · (L/3)"
        eqLines={[`삼각형 도심이 B로부터 L/3 = ${fmt1(s.L / 3, 3)} ${s.LUnit} 떨어져 있다`]}
        final={`M_B = ${fmt1(kNm(res.M0), 3)} kN·m`} />
    );
  } else if (s.mode === 'simple') {
    cards.push(
      <StepCard key="R" title="Step 2. 반력 (ΣM_A=0, 도심은 A로부터 2L/3)" formula="R_B = W × (2/3),  R_A = W × (1/3)"
        eqLines={[`R_B = ${fmt1(kN(res.totalLoad), 3)} × 2/3`]}
        final={`R_A = ${fmt1(kN(res.RA), 3)} kN,  R_B = ${fmt1(kN(res.RB), 3)} kN`} />,
      <StepCard key="M" title="Step 3. 최대모멘트 위치" formula="V(x) = 0 이 되는 지점: x = L/√3"
        eqLines={[`x = ${fmt1(s.L / Math.sqrt(3), 3)} ${s.LUnit}`]}
        final={`M_max = ${fmt1(kNm(res.Mmax), 3)} kN·m`} />
    );
  } else {
    cards.push(
      <StepCard key="R" title="Step 2. 롤러 반력 (B는 수직력을 못 낸다)" formula="R_A = W (전체하중을 A 혼자 부담)"
        eqLines={['슬라이딩 가이드는 모멘트만 막고 수직력은 막지 않는다']}
        final={`R_A = ${fmt1(kN(res.RA), 3)} kN`} />,
      // 하중 합력의 도심은 A에서 2L/3, 즉 B에서는 L/3 떨어져 있다. B를 기준으로 모멘트를 잡으므로
      // 팔 길이는 L/3이다 (원본 프로토타입은 여기에 2L/3을 적어 두어 수식과 결과가 어긋나 있었다).
      <StepCard key="M" title="Step 3. 슬라이딩단 반력모멘트" formula="M_B = R_A · L − W · (L/3)"
        eqLines={[
          `하중 합력의 도심은 A에서 2L/3 = ${fmt1((2 * s.L) / 3, 3)} ${s.LUnit}, 즉 B에서 L/3 = ${fmt1(s.L / 3, 3)} ${s.LUnit}`,
          `M_B = ${fmt1(kN(res.RA), 3)} × ${s.L} − ${fmt1(kN(res.totalLoad), 3)} × ${fmt1(s.L / 3, 3)}`,
        ]}
        final={`M_B = ${fmt1(kNm(res.MB), 3)} kN·m`} />
    );
  }
  return <>{cards}</>;
}
