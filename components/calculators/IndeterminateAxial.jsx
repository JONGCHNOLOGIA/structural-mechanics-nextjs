'use client';

import { useMemo, useState } from 'react';
import { computeIndeterminate } from '@/lib/calc/indeterminateAxial';
import { LENGTH_UNITS, FORCE_UNITS, STRESS_UNITS, AREA_UNITS, fromBase, fmt1 } from '@/lib/calc/units1';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import Frac from '@/components/Frac';
import { DualField, SelectField, ResetButton, ResultGrid, ResultCard, StepCard, ErrorBox, InputNeededPlaceholder } from './sm1/Controls';
import { CalcGate, useCalcGate } from './sm1/CalcGate';
import { StepDiagram } from './sm1/Diagrams';
import { Dim, DimLineH } from './EditableDim';

// CH.2-3 Statically Indeterminate Axial Members — 원본 renderIndeterminate()의 React 버전.

const DEFAULTS = {
  mode: 'fixedBar',
  P: 100, PUnit: 'kN', a: 1, b: 2, LUnit: 'm', A: 500, AUnit: 'mm2', E: 200, EUnit: 'GPa',
  rbB: 1, rbL: 2, rbP: 100, rbPUnit: 'kN', rbEc: 200, rbEcUnit: 'GPa', rbAc: 300, rbAcUnit: 'mm2', rbLc: 1, rbLcUnit: 'm',
};

export default function IndeterminateAxial() {
  const [s, setS] = useState(DEFAULTS);
  const set = (patch) => setS((prev) => ({ ...prev, ...patch }));
  const setNum = (key) => (v) => set({ [key]: parseFloat(v) });

  const res = useMemo(() => computeIndeterminate(s), [s]);
  const gate = useCalcGate(s);


  const isRigid = s.mode === 'rigidBeam';

  return (
    <>
      {/* ---------------- Setting Menu ---------------- */}
      <div className="panel">
        <h3>SETTING MENU</h3>
        <EditableText
          contentKey="calc.IndeterminateAxial.intro"
          defaultText="반력이 평형방정식 개수보다 많아서 평형만으로는 못 푸는 구조예요. 변형이 맞아떨어져야 한다는 적합조건(compatibility)을 하나 더 세워야 풀립니다."
          style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.6, marginBottom: 14, background: 'var(--bg)', borderRadius: 0, padding: '12px 14px' }}
        />
        <SelectField
          label="부정정 구조 유형"
          value={s.mode}
          onChange={(v) => set({ mode: v })}
          options={[
            { value: 'fixedBar', label: '양단고정보 + 중간하중' },
            { value: 'rigidBeam', label: '강체보 + 탄성기둥 지지' },
          ]}
        />
        {!isRigid ? (
          <>
            <DualField label="하중 P (중간 지점에 작용)" value={s.P} min={0} max={500} step={1} onChange={setNum('P')}
              unitMap={FORCE_UNITS} unit={s.PUnit} onUnitChange={(v) => set({ PUnit: v })} invalid={!(s.P >= 0)} />
            <DualField label="왼쪽 구간 길이 a" value={s.a} min={0.01} max={10} step={0.01} onChange={setNum('a')}
              unitMap={LENGTH_UNITS} unit={s.LUnit} onUnitChange={(v) => set({ LUnit: v })} invalid={!(s.a > 0)} />
            <DualField label="오른쪽 구간 길이 b" value={s.b} min={0.01} max={10} step={0.01} onChange={setNum('b')}
              unitMap={LENGTH_UNITS} unit={s.LUnit} onUnitChange={(v) => set({ LUnit: v })} invalid={!(s.b > 0)} />
            <DualField label="단면적 A (균일 단면)" value={s.A} min={1} max={5000} step={1} onChange={setNum('A')}
              unitMap={AREA_UNITS} unit={s.AUnit} onUnitChange={(v) => set({ AUnit: v })} invalid={!(s.A > 0)} />
            <DualField label="탄성계수 E" value={s.E} min={0.1} max={500} step={0.5} onChange={setNum('E')}
              unitMap={STRESS_UNITS} unit={s.EUnit} onUnitChange={(v) => set({ EUnit: v })} invalid={!(s.E > 0)} />
          </>
        ) : (
          <>
            <EditableText
              as="div"
              className="note-box"
              contentKey="calc.IndeterminateAxial.noteRigid"
              defaultText="강체보 ABC가 A점에서 핀으로 지지되고, B점의 탄성기둥이 추가로 받쳐줍니다. C점에 하중 P가 작용합니다 (교재 Example 2-2 형태)."
            />
            <DualField label="A→B 거리 (기둥 위치)" value={s.rbB} min={0.1} max={10} step={0.05} onChange={setNum('rbB')}
              unitMap={LENGTH_UNITS} unit={s.LUnit} onUnitChange={(v) => set({ LUnit: v })} invalid={!(s.rbB > 0)} />
            <DualField label="A→C 거리 (하중 위치, 전체 보 길이)" value={s.rbL} min={0.1} max={15} step={0.05} onChange={setNum('rbL')}
              unitMap={LENGTH_UNITS} unit={s.LUnit} onUnitChange={(v) => set({ LUnit: v })} invalid={!(s.rbL > s.rbB)} />
            <DualField label="하중 P (C점, 하향)" value={s.rbP} min={0} max={500} step={1} onChange={setNum('rbP')}
              unitMap={FORCE_UNITS} unit={s.rbPUnit} onUnitChange={(v) => set({ rbPUnit: v })} invalid={!(s.rbP >= 0)} />
            <DualField label="기둥 탄성계수 E" value={s.rbEc} min={0.1} max={500} step={0.5} onChange={setNum('rbEc')}
              unitMap={STRESS_UNITS} unit={s.rbEcUnit} onUnitChange={(v) => set({ rbEcUnit: v })} invalid={!(s.rbEc > 0)} />
            <DualField label="기둥 단면적 A" value={s.rbAc} min={1} max={5000} step={1} onChange={setNum('rbAc')}
              unitMap={AREA_UNITS} unit={s.rbAcUnit} onUnitChange={(v) => set({ rbAcUnit: v })} invalid={!(s.rbAc > 0)} />
            <DualField label="기둥 길이 L" value={s.rbLc} min={0.1} max={10} step={0.05} onChange={setNum('rbLc')}
              unitMap={LENGTH_UNITS} unit={s.rbLcUnit} onUnitChange={(v) => set({ rbLcUnit: v })} invalid={!(s.rbLc > 0)} />
          </>
        )}
        <ResetButton onClick={() => setS(DEFAULTS)} />
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="panel">
        <h3>VISUALIZER</h3>
        {isRigid ? <RigidBeamSVG s={s} res={res} onEditNum={setNum} /> : <FixedBarSVG s={s} res={res} onEditNum={setNum} />}

        {res.valid ? (
          <>
            {res.mode === 'rigidBeam' ? (
              <ResultGrid>
                <ResultCard label="기둥력 F_B" value={`${fmt1(fromBase(res.F_B, 'kN', FORCE_UNITS), 3)} kN`} />
                <ResultCard label="핀 반력 A_y" value={`${fmt1(fromBase(res.A_y, 'kN', FORCE_UNITS), 3)} kN`} />
                <ResultCard label="기둥 변위 δ_B" value={`${fmt1(fromBase(res.delta_B, 'mm', LENGTH_UNITS), 4)} mm`} />
                <ResultCard label="하중점 변위 δ_C (닮음비 L/b 적용)" value={`${fmt1(fromBase(res.delta_C, 'mm', LENGTH_UNITS), 4)} mm`} />
                <ResultCard
                  label="검산 ΣFy = A_y+F_B−P"
                  value={`${fmt1(fromBase(res.A_y + res.F_B - res.P_N, 'kN', FORCE_UNITS), 4)} kN (≈0 이어야 함)`}
                  full
                />
              </ResultGrid>
            ) : (
              <ResultGrid>
                <ResultCard label="반력 R_A" value={`${fmt1(fromBase(res.R_A, 'kN', FORCE_UNITS), 3)} kN`} />
                <ResultCard label="반력 R_B" value={`${fmt1(fromBase(res.R_B, 'kN', FORCE_UNITS), 3)} kN`} />
                <ResultCard label="N_AC (인장)" value={`${fmt1(fromBase(res.N_AC, 'kN', FORCE_UNITS), 3)} kN`} tone="tens" />
                <ResultCard label="N_CB (압축)" value={`${fmt1(fromBase(res.N_CB, 'kN', FORCE_UNITS), 3)} kN`} tone="comp" />
                <ResultCard label="하중점 변위 δ_C" value={`${fmt1(fromBase(res.delta_C, 'mm', LENGTH_UNITS), 4)} mm`} full />
              </ResultGrid>
            )}
            <EditableText
              as="div"
              className="ai-hint"
              contentKey={isRigid ? 'calc.IndeterminateAxial.aiHintRigid' : 'calc.IndeterminateAxial.aiHint'}
              defaultText={
                isRigid
                  ? '💬 강체보의 변위가 왜 거리에 비례(닮은꼴)하는지, 오른쪽 AI 튜터에게 물어보세요.'
                  : '💬 정정구조와 달리 왜 평형방정식만으로는 반력을 못 구하는지, 오른쪽 AI 튜터에게 물어보세요.'
              }
            />
            {!isRigid && (
              <>
                <h3 style={{ marginTop: 20 }}>축력도 N(x)</h3>
                <StepDiagram
                  segments={[
                    { value: fromBase(res.N_AC, 'kN', FORCE_UNITS), length: fromBase(res.a_m, 'm', LENGTH_UNITS) },
                    { value: fromBase(res.N_CB, 'kN', FORCE_UNITS), length: fromBase(res.b_m, 'm', LENGTH_UNITS) },
                  ]}
                  valueUnit="kN"
                  lengthUnit="m"
                  quantitySymbol="N"
                />
              </>
            )}
          </>
        ) : (
          <ErrorBox errors={res.errors} />
        )}

        <div className="steps" style={{ marginTop: 20 }}>
          <CalcGate gate={gate}>
            {(frozen) => {
              const fres = computeIndeterminate(frozen);
              return fres.valid ? <Steps s={frozen} res={fres} /> : <InputNeededPlaceholder />;
            }}
          </CalcGate>
        </div>
      </div>

      <AiTutorPanel question="적합조건식은 왜 필요한가요?" />
    </>
  );
}

function Steps({ s, res }) {
  const kN = (v) => fmt1(fromBase(v, 'kN', FORCE_UNITS), 3);
  const mm = (v) => fmt1(fromBase(v, 'mm', LENGTH_UNITS), 4);

  if (res.mode === 'rigidBeam') {
    return (
      <>
        <StepCard
          title="Step 1. 평형방정식 ΣM_A=0"
          formula="F_B·b = P·L"
          eqLines={[
            <>
              F_B = <Frac num={`${s.rbP}×${s.rbL}`} den={`${s.rbB}`} />
            </>,
          ]}
          final={`F_B = ${kN(res.F_B)} kN`}
        />
        <StepCard
          title="Step 2. 기둥 변형 (적합조건에 필요)"
          formula={
            <>
              δ_B = <Frac num="F_B·L_col" den="E·A" />
            </>
          }
          final={`δ_B = ${mm(res.delta_B)} mm`}
        />
        <StepCard
          title="Step 3. 강체보 기하학적 적합조건"
          formula={
            <>
              보가 강체이므로 변위는 A로부터 거리에 비례: δ_C = δ_B×(<Frac num="L" den="b" />)
            </>
          }
          eqLines={[
            <>
              δ_C = {mm(res.delta_B)} × <Frac num={`${s.rbL}`} den={`${s.rbB}`} />
            </>,
          ]}
          final={`δ_C = ${mm(res.delta_C)} mm`}
        />
        <StepCard title="Step 4. ΣFy=0 (검산용 핀 반력)" formula="A_y = P − F_B" final={`A_y = ${kN(res.A_y)} kN`} />
      </>
    );
  }

  return (
    <>
      <StepCard title="Step 1. 평형방정식 (Equilibrium)" formula="R_A + R_B = P"
        eqLines={['두 반력의 합이 하중과 같아야 하지만, 미지수 2개(R_A,R_B)에 식 1개뿐 — 부정정(1차)']}
        final={`R_A + R_B = ${s.P} ${s.PUnit}`} />
      <StepCard
        title="Step 2. 적합조건 (Compatibility)"
        formula="δ_AC + δ_CB = 0 (양단 고정, 전체 길이 불변)"
        eqLines={[
          <>
            <Frac num="N_AC·a" den="EA" /> + <Frac num="N_CB·b" den="EA" /> = 0
          </>,
        ]}
        final={
          <>
            → R_A = <Frac num="Pb" den="L" />, R_B = <Frac num="Pa" den="L" />
          </>
        }
      />
      <StepCard
        title="Step 3. 반력 계산"
        formula={
          <>
            R_A = <Frac num="Pb" den="L" />, R_B = <Frac num="Pa" den="L" />
          </>
        }
        eqLines={[
          <>
            R_A = <Frac num={`${s.P}×${s.b}`} den={`${s.a}+${s.b}`} />
          </>,
          <>
            R_B = <Frac num={`${s.P}×${s.a}`} den={`${s.a}+${s.b}`} />
          </>,
        ]}
        final={`R_A = ${kN(res.R_A)} kN,  R_B = ${kN(res.R_B)} kN`}
      />
      <StepCard
        title="Step 4. 하중점 변위"
        formula={
          <>
            δ_C = <Frac num="N_AC·a" den="EA" />
          </>
        }
        eqLines={[
          <>
            δ_C = <Frac num={`${kN(res.N_AC)} kN × ${s.a} ${s.LUnit}`} den="EA" />
          </>,
        ]}
        final={`δ_C = ${mm(res.delta_C)} mm`}
      />
    </>
  );
}

// 양단이 벽에 물린 부재와, 중간 지점에 꽂히는 하중 P
function FixedBarSVG({ s, res, onEditNum }) {
  // 아래쪽에 a·b 구간 치수선을 넣을 자리를 두려고 높이를 180에서 늘렸다.
  const w = 460, h = 214, x1 = 70, x2 = 390, barY = 90;
  const totalLen = x2 - x1;
  const aFrac = res.valid ? res.a_m / res.L_m : 0.4;
  const cx = x1 + totalLen * aFrac;

  const wall = (x, dir, key) => (
    <g key={key}>
      <line x1={x} y1={barY - 24} x2={x} y2={barY + 24} stroke="#51626F" strokeWidth="2" />
      {Array.from({ length: 6 }).map((_, i) => {
        const yy = barY - 22 + i * 8;
        return <line key={i} x1={x} y1={yy} x2={x + dir * 9} y2={yy + 8} stroke="#8A97A2" strokeWidth="1.1" />;
      })}
    </g>
  );

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 460, margin: '8px auto 0', display: 'block' }}>
      {wall(x1, -1, 'l')}
      {wall(x2, 1, 'r')}
      <line x1={x1} y1={barY} x2={x2} y2={barY} stroke="var(--gray)" strokeWidth="4" />
      <circle cx={cx} cy={barY} r="4" fill="var(--ink)" />
      <line x1={cx} y1={barY - 40} x2={cx} y2={barY - 8} stroke="var(--crimson)" strokeWidth="2.4" />
      <polygon points={`${cx},${barY - 6} ${cx - 6},${barY - 16} ${cx + 6},${barY - 16}`} fill="var(--crimson)" />
      <Dim
        x={cx}
        y={barY - 46}
        color="var(--crimson)"
        fontSize={11}
        value={s.P}
        unit={s.PUnit}
        prefix="P = "
        boxW={62}
        min={null}
        onChange={onEditNum('P')}
      />
      {res.valid && (
        <>
          <text x={(x1 + cx) / 2} y={barY + 40} fontSize="10.5" fill="var(--teal)" textAnchor="middle">
            R_A = {fmt1(fromBase(res.R_A, 'kN', FORCE_UNITS), 2)} kN
          </text>
          <text x={(cx + x2) / 2} y={barY + 40} fontSize="10.5" fill="var(--crimson)" textAnchor="middle">
            R_B = {fmt1(fromBase(res.R_B, 'kN', FORCE_UNITS), 2)} kN
          </text>
        </>
      )}
      {/* 구간 길이 a, b 치수 — 숫자를 클릭하면 그 자리에서 고칠 수 있다. */}
      <DimLineH
        x1={x1}
        x2={cx}
        y={barY + 58}
        labelDy={14}
        fontSize={10}
        value={s.a}
        unit={s.LUnit}
        prefix="a = "
        boxW={52}
        onChange={onEditNum('a')}
      />
      <DimLineH
        x1={cx}
        x2={x2}
        y={barY + 58}
        labelDy={14}
        fontSize={10}
        value={s.b}
        unit={s.LUnit}
        prefix="b = "
        boxW={52}
        onChange={onEditNum('b')}
      />
    </svg>
  );
}

// 핀으로 지지된 강체보를 탄성기둥이 받치는 구조 — 세 힘(A_y, F_B, P)의 균형을 화살표로 보여준다.
function RigidBeamSVG({ s, res, onEditNum }) {
  // 아래쪽에 치수선을 넣을 자리를 두려고 높이를 200에서 늘렸다.
  const w = 460, h = 246, x0 = 60, xEnd = 420, beamY = 80, colBottom = 170;
  const totalLen = xEnd - x0;
  const bFrac = res.valid ? res.b_m / res.L_m : 0.5;
  const xB = x0 + totalLen * bFrac;
  const xC = xEnd;
  const Aydisp = res.valid ? fromBase(res.A_y, 'kN', FORCE_UNITS) : 0;
  const dir = Aydisp >= 0 ? -1 : 1;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 460, margin: '8px auto 0', display: 'block' }}>
      <polygon points={`${x0},${beamY} ${x0 - 11},${beamY + 18} ${x0 + 11},${beamY + 18}`} fill="none" stroke="var(--gray)" strokeWidth="1.6" />
      <line x1={x0 - 16} y1={beamY + 20} x2={x0 + 16} y2={beamY + 20} stroke="var(--gray)" strokeWidth="1.2" />
      <line x1={x0} y1={beamY} x2={xEnd} y2={beamY} stroke="var(--ink)" strokeWidth="6" />
      <text x={(x0 + xEnd) / 2} y={beamY - 10} fontSize="10" fill="var(--gray)" textAnchor="middle">강체보 (rigid)</text>
      <line x1={xB} y1={beamY} x2={xB} y2={colBottom} stroke="var(--teal)" strokeWidth="5" />
      <line x1={xB - 14} y1={colBottom} x2={xB + 14} y2={colBottom} stroke="var(--gray)" strokeWidth="1.2" />
      {Array.from({ length: 5 }).map((_, i) => {
        const xx = xB - 12 + i * 6;
        return <line key={i} x1={xx} y1={colBottom} x2={xx - 5} y2={colBottom + 7} stroke="#8A97A2" strokeWidth="1" />;
      })}
      <text x={xB + 16} y={(beamY + colBottom) / 2} fontSize="10" fill="var(--teal)">기둥(E,A,L)</text>
      {res.valid && (
        <>
          <line x1={xB - 24} y1={beamY + 34} x2={xB - 24} y2={beamY + 6} stroke="var(--teal)" strokeWidth="2.4" />
          <polygon points={`${xB - 24},${beamY + 4} ${xB - 30},${beamY + 14} ${xB - 18},${beamY + 14}`} fill="var(--teal)" />
          <text x={xB - 24} y={beamY + 48} fontSize="10" fontWeight="800" fill="var(--teal)" textAnchor="middle">
            F_B={fmt1(fromBase(res.F_B, 'kN', FORCE_UNITS), 1)}
          </text>
          <line x1={x0 + 22} y1={beamY + dir * 34} x2={x0 + 22} y2={beamY + dir * 6} stroke="var(--crimson)" strokeWidth="2.4" />
          <polygon points={`${x0 + 22},${beamY + dir * 4} ${x0 + 16},${beamY + dir * 14} ${x0 + 28},${beamY + dir * 14}`} fill="var(--crimson)" />
          <text x={x0 + 22} y={beamY + dir * 46} fontSize="10" fontWeight="800" fill="var(--crimson)" textAnchor="middle">
            A_y={fmt1(Math.abs(Aydisp), 1)}
          </text>
        </>
      )}
      <line x1={xC} y1={beamY - 38} x2={xC} y2={beamY - 6} stroke="var(--crimson)" strokeWidth="2.4" />
      <polygon points={`${xC},${beamY - 4} ${xC - 6},${beamY - 14} ${xC + 6},${beamY - 14}`} fill="var(--crimson)" />
      <Dim
        x={xC}
        y={beamY - 44}
        color="var(--crimson)"
        fontSize={10.5}
        value={s.rbP}
        unit={s.rbPUnit}
        prefix="P = "
        boxW={62}
        min={null}
        onChange={onEditNum('rbP')}
      />
      <text x={x0} y={beamY + 62} fontSize="9.5" fill="var(--gray-soft)" textAnchor="middle">A</text>
      <text x={xB} y={beamY + 62} fontSize="9.5" fill="var(--gray-soft)" textAnchor="middle">B</text>
      <text x={xC} y={beamY + 62} fontSize="9.5" fill="var(--gray-soft)" textAnchor="middle">C</text>
      {/* 치수 — A~B 거리 b, A~C 전체 길이 L, 기둥 길이 Lc. 숫자를 클릭하면 그 자리에서 고칠 수 있다. */}
      <DimLineH
        x1={x0}
        x2={xB}
        y={beamY + 76}
        labelDy={13}
        fontSize={9.5}
        value={s.rbB}
        unit="m"
        prefix="b = "
        boxW={52}
        onChange={onEditNum('rbB')}
      />
      <DimLineH
        x1={x0}
        x2={xEnd}
        y={beamY + 104}
        labelDy={13}
        fontSize={9.5}
        value={s.rbL}
        unit="m"
        prefix="L = "
        boxW={52}
        onChange={onEditNum('rbL')}
      />
      <Dim
        x={xB + 16}
        y={(beamY + colBottom) / 2 + 16}
        anchor="start"
        color="var(--teal)"
        fontSize={9.5}
        value={s.rbLc}
        unit={s.rbLcUnit}
        prefix="L = "
        boxW={52}
        onChange={onEditNum('rbLc')}
      />
      <text x={(x0 + xEnd) / 2} y={h - 8} fontSize="9.5" fill="var(--gray)" textAnchor="middle">
        ΣFy=0: A_y + F_B − P = 0 (화살표 방향·크기로 확인)
      </text>
    </svg>
  );
}
