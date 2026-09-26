'use client';

import { useMemo, useState } from 'react';
import { computePointLoadSFDBMD } from '@/lib/calc/beamStatics';
import { LENGTH_UNITS, FORCE_UNITS, TORQUE_UNITS, fromBase, fmt1 } from '@/lib/calc/units1';
import AiTutorPanel from './AiTutorPanel';
import InterpretPanel from './InterpretPanel';
import EditableText from '@/components/EditableText';
import { DualField, ResetButton, ResultGrid, ResultCard, StepCard, ErrorBox, InputNeededPlaceholder } from './sm1/Controls';
import { CalcGate, useCalcGate } from './sm1/CalcGate';
import { BeamSchematic, CurveDiagram } from './sm1/BeamDiagrams';
import { DimLineH } from './EditableDim';

// CH.4-2 SFD & BMD — Simply Supported Beam with Point Load(s). 원본 renderPointLoadSFDBMD()의 React 버전.

const DEFAULTS = { L: 10, LUnit: 'm', P1: 50, P1Unit: 'kN', a1: 4, P2: 30, P2Unit: 'kN', a2: 7, cutX: 5 };

const kN = (v) => fromBase(v, 'kN', FORCE_UNITS);
const kNm = (v) => fromBase(v, 'kN·m', TORQUE_UNITS);
const m = (v) => fromBase(v, 'm', LENGTH_UNITS);

export default function PointLoadSFDBMD() {
  const [s, setS] = useState(DEFAULTS);
  const res = useMemo(() => computePointLoadSFDBMD(s), [s]);
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
        <DualField label="하중 P₁" value={s.P1} min={0} max={500} step={1} onChange={setNum('P1')}
          unitMap={FORCE_UNITS} unit={s.P1Unit} onUnitChange={(v) => set({ P1Unit: v })} />
        <DualField label="P₁ 위치 a₁" value={s.a1} min={0} max={s.L} step={0.1} onChange={setNum('a1')}
          invalid={!(s.a1 >= 0 && s.a1 <= s.L)} />
        <DualField label="하중 P₂ (선택)" value={s.P2} min={0} max={500} step={1} onChange={setNum('P2')}
          unitMap={FORCE_UNITS} unit={s.P2Unit} onUnitChange={(v) => set({ P2Unit: v })} />
        <DualField label="P₂ 위치 a₂" value={s.a2} min={0} max={s.L} step={0.1} onChange={setNum('a2')}
          invalid={!(s.a2 >= 0 && s.a2 <= s.L)} />
        <EditableText
          as="div"
          className="note-box"
          contentKey="calc.PointLoadSFDBMD.note"
          defaultText="아래 슬라이더로 절단 위치를 옮기면, 그 지점을 잘랐을 때 드러나는 자유물체도(V, M 포함)가 함께 바뀝니다."
        />
        <DualField label="절단 위치 x (자유물체도용)" value={s.cutX} min={0} max={s.L} step={0.05} onChange={setNum('cutX')}
          invalid={!(s.cutX >= 0 && s.cutX <= s.L)} />
        <ResetButton onClick={() => setS(DEFAULTS)} />
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="panel">
        <h3>VISUALIZER</h3>
        {res.valid ? (
          <>
            {/* 그림에 적히는 치수는 SETTING MENU에서 고른 단위 그대로다 — 숫자를 클릭하면 바로 고쳐진다.
                (하중 두 개는 각자 단위를 따로 고를 수 있어서 P마다 unit을 같이 넘긴다) */}
            <BeamSchematic
              L={s.L}
              lengthUnit={s.LUnit}
              supports={[{ pos: 0, type: 'pin' }, { pos: s.L, type: 'roller' }]}
              pointLoads={[
                { pos: s.a1, P: s.P1, unit: s.P1Unit },
                { pos: s.a2, P: s.P2, unit: s.P2Unit },
              ]}
              reactions={[{ pos: 0, R: kN(res.RA) }, { pos: s.L, R: kN(res.RB) }]}
              edit={{
                L: setNum('L'),
                pointLoadP: (i, v) => set(i === 0 ? { P1: v } : { P2: v }),
                pointLoadPos: (i, v) => set(i === 0 ? { a1: v } : { a2: v }),
              }}
            />
            <ResultGrid>
              <ResultCard label="R_A" value={`${fmt1(kN(res.RA), 3)} kN`} />
              <ResultCard label="R_B" value={`${fmt1(kN(res.RB), 3)} kN`} />
              <ResultCard label="최대 굽힘모멘트 M_max" value={`${fmt1(kNm(res.Mmax), 3)} kN·m`} tone="comp" full />
            </ResultGrid>

            <h3 style={{ marginTop: 20 }}>단면법 (Method of Sections) — V, M 노출</h3>
            <CutFBD res={res} cutDisp={s.cutX} lengthUnit={s.LUnit} onEditCut={setNum('cutX')} />
            <CutCheck res={res} />

            <h3 style={{ marginTop: 20 }}>SFD — V(x)</h3>
            <CurveDiagram points={res.Vpts.map((p) => ({ x: m(p.x), y: kN(p.y) }))} valueUnit="kN" lengthUnit="m" symbol="V" totalLen={m(res.L)} />
            <h3 style={{ marginTop: 20 }}>BMD — M(x)</h3>
            <CurveDiagram points={res.Mpts.map((p) => ({ x: m(p.x), y: kNm(p.y) }))} valueUnit="kN·m" lengthUnit="m" symbol="M" totalLen={m(res.L)} />

            <EditableText as="div" className="ai-hint" contentKey="calc.PointLoadSFDBMD.aiHint"
              defaultText="💬 왜 M이 최대가 되는 위치는 V가 0이 되는 지점(또는 하중점)인지, 오른쪽 AI 튜터에게 물어보세요." />
            <InterpretPanel
              summary={[
                `[CH.4-2 SFD/BMD] 단순보(왼쪽 핀, 오른쪽 롤러), 경간 L=${s.L}${s.LUnit}.`,
                s.P1 > 0 ? `집중하중 P₁=${s.P1}${s.P1Unit} (x=${s.a1}${s.LUnit} 위치)` : null,
                s.P2 > 0 ? `집중하중 P₂=${s.P2}${s.P2Unit} (x=${s.a2}${s.LUnit} 위치)` : null,
                `계산 결과: R_A=${fmt1(kN(res.RA), 3)}kN, R_B=${fmt1(kN(res.RB), 3)}kN, 최대 굽힘모멘트 M_max=${fmt1(kNm(res.Mmax), 3)}kN·m.`,
              ]
                .filter(Boolean)
                .join(' ')}
            />
          </>
        ) : (
          <ErrorBox errors={res.errors} />
        )}

        <div className="steps" style={{ marginTop: 20 }}>
          <CalcGate gate={gate}>
            {(frozen) => {
              const fres = computePointLoadSFDBMD(frozen);
              return fres.valid ? <Steps s={frozen} res={fres} /> : <InputNeededPlaceholder />;
            }}
          </CalcGate>
        </div>
      </div>

      <AiTutorPanel question="SFD와 BMD의 넓이 관계는 뭔가요?" />
    </>
  );
}

// 절단면 왼쪽 조각의 평형이 실제로 맞는지 숫자로 보여준다 — V, M의 정의를 확인하는 부분이라
// 슬라이더를 움직일 때마다 바로 갱신된다.
function CutCheck({ res }) {
  const RA = kN(res.RA);
  const x = m(res.cutX);
  const loadSum = res.passedLoads.reduce((a, p) => a + kN(p.P), 0);
  const momentSum = res.passedLoads.reduce((a, p) => a + kN(p.P) * (x - m(p.pos)), 0);
  const V = kN(res.cutV);
  const M = kNm(res.cutM);
  return (
    <div className="hint">
      <b>ΣFy=0:</b> R_A − ΣP(지나온 하중) − V = {fmt1(RA, 2)} − {fmt1(loadSum, 2)} − {fmt1(V, 2)} = {fmt1(RA - loadSum - V, 4)} (≈0)
      <br />
      <b>ΣM=0 (절단면 기준):</b> R_A·x − ΣP·(x−a) − M = {fmt1(RA * x, 2)} − {fmt1(momentSum, 2)} − {fmt1(M, 2)} ={' '}
      {fmt1(RA * x - momentSum - M, 4)} (≈0)
    </div>
  );
}

function Steps({ s, res }) {
  return (
    <>
      <StepCard
        title="Step 1. 반력"
        formula="ΣM_A = 0,  ΣFy = 0"
        eqLines={[`R_A = ${fmt1(kN(res.RA), 3)} kN,  R_B = ${fmt1(kN(res.RB), 3)} kN`]}
        final="R_A, R_B 확정"
      />
      <StepCard
        title="Step 2. 구간별 V(x)"
        formula="V(x) = (왼쪽 반력) − (왼쪽에서 지나온 하중들)"
        eqLines={['하중점을 지날 때마다 V가 그 하중 크기만큼 계단으로 떨어진다']}
        final="SFD 계단형 완성"
      />
      <StepCard
        title="Step 3. 구간별 M(x)"
        formula="M(x) = (왼쪽 반력)·거리 − Σ(왼쪽 하중)·거리"
        eqLines={['집중하중만 있으면 각 구간에서 M은 직선이고, 하중점에서 기울기가 꺾인다']}
        final={`M_max = ${fmt1(kNm(res.Mmax), 3)} kN·m`}
      />
      <StepCard
        title="Step 4. 단면법 검산 (슬라이더 위치 x)"
        formula="ΣFy=0, ΣM=0을 만족하도록 V, M이 정의된다"
        eqLines={[`x = ${fmt1(m(res.cutX), 2)} m 에서 V = ${fmt1(kN(res.cutV), 3)} kN, M = ${fmt1(kNm(res.cutM), 3)} kN·m`]}
        final="자유물체도에서 화살표 방향·크기로 직접 확인할 수 있다"
      />
    </>
  );
}

// 왼쪽 조각(0~x)만 남긴 자유물체도 — 잘려나간 오른쪽은 점선으로만 표시한다.
function CutFBD({ res, cutDisp, lengthUnit, onEditCut }) {
  // 아래쪽에 절단 위치 치수선을 넣을 자리를 두려고 높이를 200에서 늘렸다.
  const w = 460, h = 230, padL = 50, padR = 50, barY = 90;
  const Ldisp = m(res.L), xDisp = m(res.cutX);
  const X = (x) => padL + (x / Ldisp) * (w - padL - padR - 40);
  const cutX = X(xDisp);
  const RA = kN(res.RA);
  const V = kN(res.cutV);
  const M = kNm(res.cutM);
  const vDir = V >= 0 ? 1 : -1; // +V는 이 면에서 아래방향
  const mR = 16;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 460, margin: '8px auto 0', display: 'block', overflow: 'visible' }}>
      <line x1={X(0)} y1={barY} x2={cutX} y2={barY} stroke="var(--ink)" strokeWidth="5" />
      <line x1={cutX} y1={barY} x2={X(Ldisp)} y2={barY} stroke="#C3C3C3" strokeWidth="2" strokeDasharray="4 3" />

      <polygon points={`${X(0)},${barY} ${X(0) - 11},${barY + 18} ${X(0) + 11},${barY + 18}`} fill="none" stroke="var(--gray)" strokeWidth="1.6" />
      <line x1={X(0)} y1={barY + 36} x2={X(0)} y2={barY + 8} stroke="var(--teal)" strokeWidth="2.4" />
      <polygon points={`${X(0)},${barY + 6} ${X(0) - 6},${barY + 16} ${X(0) + 6},${barY + 16}`} fill="var(--teal)" />
      <text x={X(0)} y={barY + 50} fontSize="10" fontWeight="800" fill="var(--teal)" textAnchor="middle">
        R_A={fmt1(RA, 1)}
      </text>

      {res.passedLoads.map((p, i) => {
        const px = X(m(p.pos));
        return (
          <g key={i}>
            <line x1={px} y1={barY - 36} x2={px} y2={barY - 6} stroke="var(--crimson)" strokeWidth="2.4" />
            <polygon points={`${px},${barY - 4} ${px - 6},${barY - 14} ${px + 6},${barY - 14}`} fill="var(--crimson)" />
            <text x={px} y={barY - 42} fontSize="9.5" fontWeight="800" fill="var(--crimson)" textAnchor="middle">
              {fmt1(kN(p.P), 1)}
            </text>
          </g>
        );
      })}

      <line x1={cutX} y1={barY} x2={cutX} y2={barY + vDir * 30} stroke="var(--gray-soft)" strokeWidth="1" strokeDasharray="2 2" />
      <line x1={cutX + 10} y1={barY} x2={cutX + 10} y2={barY + vDir * 26} stroke="#8A97A2" strokeWidth="2.2" />
      <polygon
        points={`${cutX + 10},${barY + vDir * 28} ${cutX + 5},${barY + vDir * 20} ${cutX + 15},${barY + vDir * 20}`}
        fill="#8A97A2"
      />
      <text x={cutX + 22} y={barY + vDir * 30 + 4} fontSize="9.5" fontWeight="800" fill="#51626F">
        V={fmt1(V, 2)}
      </text>

      <path
        d={`M ${cutX - 10} ${barY - 14} A ${mR} ${mR} 0 1 ${M >= 0 ? 1 : 0} ${cutX - 10 + mR} ${barY - 14}`}
        fill="none"
        stroke="var(--crimson)"
        strokeWidth="2"
      />
      {/* M 라벨은 하중 P 라벨(barY-42)·V 라벨과 같은 높이대에 있어서 절단면이 하중에 가까우면
          글씨끼리 겹쳤다. 두 라벨보다 위로 올리고, 아래 호까지 가는 얇은 안내선을 붙여 뒀다. */}
      <line x1={cutX - 10 + mR / 2} y1={barY - 54} x2={cutX - 10 + mR / 2} y2={barY - 32} stroke="var(--crimson)" strokeWidth="0.8" strokeDasharray="2 2" />
      <text x={cutX - 10 + mR / 2} y={barY - 58} fontSize="9.5" fontWeight="800" fill="var(--crimson)" textAnchor="middle">
        M={fmt1(M, 2)}
      </text>
      {/* 절단 위치 x 치수 — 숫자를 클릭하면 그 자리에서 고칠 수 있고, 자유물체도가 바로 따라간다.
          (min을 null로 두는 건 x=0에서 자르는 것도 의미가 있어서다) */}
      <DimLineH
        x1={X(0)}
        x2={cutX}
        y={barY + 62}
        labelDy={13}
        fontSize={9.5}
        value={cutDisp}
        unit={lengthUnit}
        prefix="x = "
        boxW={52}
        min={null}
        onChange={onEditCut}
      />
    </svg>
  );
}
