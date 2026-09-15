'use client';

import { useMemo, useState } from 'react';
import { UNIT_OPTIONS, fmt } from '@/lib/calc/unitOptions';
import { ssUDL, ssUDLmax, ssPointLoad, ssPointLoadInfo } from '@/lib/calc/deflection';
import FormulaSection from './FormulaSection';
import DeflectionCurveSVG from './DeflectionCurveSVG';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import Frac from '@/components/Frac';
import FieldBlockCard from './FieldBlockCard';

// 단순보에 등분포하중 q와 중앙 집중하중 P를 동시에(혹은 하나씩) 작용시켜,
// 표준 케이스 두 개의 처짐을 그냥 더하면(중첩) 실제 결합하중의 처짐이 된다는 걸 보여줌.

export default function MethodOfSuperposition() {
  const [units, setUnits] = useState({ length: 'm', distLoad: 'kN/m', force: 'kN', E: 'GPa', inertia: 'mm⁴' });
  const [L, setL] = useState(4);
  const [useUDL, setUseUDL] = useState(true);
  const [q, setQ] = useState(10 * 1000);
  const [usePoint, setUsePoint] = useState(true);
  const [P, setP] = useState(20 * 1000);
  const [E, setE] = useState(200 * 1e9);
  const [I, setI] = useState(60e6 * 1e-12);
  const [activeField, setActiveField] = useState('L');

  const lenF = UNIT_OPTIONS.length[units.length];
  const distF = UNIT_OPTIONS.distLoad[units.distLoad];
  const forceF = UNIT_OPTIONS.force[units.force];
  const EF = UNIT_OPTIONS.E[units.E];
  const inertiaF = UNIT_OPTIONS.inertia[units.inertia];
  const disp = (b, f) => b / f;

  const EI = E * I;
  const qSI = useUDL ? q : 0;
  const PSI = usePoint ? P : 0;
  const a = L / 2;

  const result = useMemo(() => {
    const N = 40;
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const x = (L * i) / N;
      const v1 = qSI ? ssUDL(x, L, qSI, EI).v : 0;
      const v2 = PSI ? ssPointLoad(x, L, a, PSI, EI).v : 0;
      pts.push({ x, v: v1 + v2 });
    }
    const m1 = qSI ? ssUDLmax(L, qSI, EI) : { thetaA: 0, deltaMax: 0 };
    const m2 = PSI ? ssPointLoadInfo(L, a, PSI, EI) : { thetaA: 0, deltaAtLoad: 0 };
    const deltaCenterFromUDL = qSI ? ssUDL(a, L, qSI, EI).v : 0;
    return { pts, thetaA: m1.thetaA + m2.thetaA, deltaCenter: deltaCenterFromUDL + m2.deltaAtLoad, deltaCenterFromUDL, deltaFromPoint: m2.deltaAtLoad };
  }, [L, qSI, PSI, EI, a]);

  return (
    <>
      {/* ---------------- Setting Menu ---------------- */}
      <div className="panel">
        <h3>SETTING MENU</h3>
        <EditableText
          contentKey="calc.MethodOfSuperposition.intro"
          defaultText="보가 **선형탄성**이면, 여러 하중을 동시에 받을 때의 처짐은 각 하중을 **따로 작용시켰을 때의 처짐을 그냥 더한 것**과 같아요. 표준 공식표에 있는 케이스들을 조합해서 복잡한 하중도 빠르게 풀 수 있어요."
          style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.6, marginBottom: 14, background: 'var(--bg)', borderRadius: 10, padding: '12px 14px' }}
        />
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <button className={'add-block' + (useUDL ? ' active' : '')} style={{ margin: 0 }} onClick={() => setUseUDL((v) => !v)}>
            {useUDL ? '✓ ' : ''}등분포하중 q 포함
          </button>
          <button className={'add-block' + (usePoint ? ' active' : '')} style={{ margin: 0 }} onClick={() => setUsePoint((v) => !v)}>
            {usePoint ? '✓ ' : ''}중앙 집중하중 P 포함
          </button>
        </div>
        <FieldBlockCard
          title="보 조건 (L, q, P, E, I)"
          activeKey={activeField}
          onActiveChange={setActiveField}
          fields={[
            { key: 'L', label: '스팬 L', value: disp(L, lenF), unitType: 'length', unit: units.length },
            ...(useUDL ? [{ key: 'q', label: '등분포하중 q', value: disp(q, distF), unitType: 'distLoad', unit: units.distLoad }] : []),
            ...(usePoint ? [{ key: 'P', label: '집중하중 P', value: disp(P, forceF), unitType: 'force', unit: units.force }] : []),
            { key: 'E', label: '탄성계수 E', value: disp(E, EF), unitType: 'E', unit: units.E },
            { key: 'I', label: '단면2차모멘트 I', value: disp(I, inertiaF), unitType: 'inertia', unit: units.inertia },
          ]}
          onUnitChange={(unitType, v) => setUnits((prev) => ({ ...prev, [unitType]: v }))}
          onFieldChange={(key, value) => {
            const val = parseFloat(value);
            if (isNaN(val)) return;
            if (key === 'L') setL(val * lenF);
            else if (key === 'q') setQ(val * distF);
            else if (key === 'P') setP(val * forceF);
            else if (key === 'E') setE(val * EF);
            else if (key === 'I') setI(val * inertiaF);
          }}
        />
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="panel">
        <h3>
          VISUALIZER <span className="badge live" style={{ marginLeft: 6 }}>실시간</span>
        </h3>
        <DeflectionCurveSVG points={result.pts} L={L} support="simple" pointLoadAt={usePoint ? L / 2 : undefined} />
        <div className="result-grid">
          <div className="result-card">
            <div className="l">θA (합산)</div>
            <div className="v">{result.thetaA.toExponential(3)} rad</div>
          </div>
          <div className="result-card">
            <div className="l">δ 중앙 (합산)</div>
            <div className="v">{fmt(result.deltaCenter * 1000)} mm</div>
          </div>
        </div>

        <div className="steps">
          <FormulaSection title="중첩: 각 케이스를 따로 구해서 더하기">
            <div className="step-formula">δ중앙 = δ(q만) + δ(P만)</div>
            <div className="step-row">
              등분포하중 q만: δ = <Frac num="5qL⁴" den="384EI" /> = {fmt(result.deltaCenterFromUDL * 1000)} mm
            </div>
            <div className="step-row">
              중앙 집중하중 P만: δ = <Frac num="PL³" den="48EI" /> = {fmt(result.deltaFromPoint * 1000)} mm
            </div>
            <div className="step-final">합산 δ중앙 = {fmt(result.deltaCenter * 1000)} mm</div>
          </FormulaSection>
        </div>
        <EditableText as="div" className="ai-hint" contentKey="calc.MethodOfSuperposition.aiHint" defaultText="💬 왜 중첩이 선형탄성 범위에서만 성립하는지 궁금하다면, 오른쪽 AI 튜터에게 물어보세요." />
      </div>

      <AiTutorPanel />
    </>
  );
}
