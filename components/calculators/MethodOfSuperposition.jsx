'use client';

import { useMemo, useState } from 'react';
import { fmt, fmtInput } from '@/lib/calc/unitOptions';
import { ssUDL, ssUDLmax, ssPointLoad, ssPointLoadInfo } from '@/lib/calc/deflection';
import FormulaSection from './FormulaSection';
import DeflectionCurveSVG from './DeflectionCurveSVG';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';

// 단순보에 등분포하중 q와 중앙 집중하중 P를 동시에(혹은 하나씩) 작용시켜,
// 표준 케이스 두 개의 처짐을 그냥 더하면(중첩) 실제 결합하중의 처짐이 된다는 걸 보여줌.

export default function MethodOfSuperposition() {
  const [L, setL] = useState(4);
  const [useUDL, setUseUDL] = useState(true);
  const [q, setQ] = useState(10);
  const [usePoint, setUsePoint] = useState(true);
  const [P, setP] = useState(20);
  const [E, setE] = useState(200);
  const [I, setI] = useState(60);

  const EI = E * 1e9 * (I * 1e-6);
  const qSI = useUDL ? q * 1000 : 0;
  const PSI = usePoint ? P * 1000 : 0;
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
        <p style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.6, marginBottom: 14, background: 'var(--bg)', borderRadius: 10, padding: '12px 14px' }}>
          보가 <b>선형탄성</b>이면, 여러 하중을 동시에 받을 때의 처짐은 각 하중을 <b>따로 작용시켰을 때의 처짐을 그냥 더한 것</b>과 같아요. 표준 공식표에 있는 케이스들을 조합해서 복잡한 하중도 빠르게 풀 수 있어요.
        </p>
        <div className="field">
          <label>스팬 길이 L (m)</label>
          <input type="number" defaultValue={fmtInput(L)} onBlur={(e) => setL(parseFloat(e.target.value))} />
        </div>
        <button className={'add-block' + (useUDL ? ' active' : '')} onClick={() => setUseUDL((v) => !v)}>
          {useUDL ? '✓ ' : ''}등분포하중 q 포함
        </button>
        {useUDL && (
          <div className="field">
            <label>q (kN/m)</label>
            <input type="number" defaultValue={fmtInput(q)} onBlur={(e) => setQ(parseFloat(e.target.value))} />
          </div>
        )}
        <button className={'add-block' + (usePoint ? ' active' : '')} onClick={() => setUsePoint((v) => !v)}>
          {usePoint ? '✓ ' : ''}중앙 집중하중 P 포함
        </button>
        {usePoint && (
          <div className="field">
            <label>P (kN, 중앙 작용)</label>
            <input type="number" defaultValue={fmtInput(P)} onBlur={(e) => setP(parseFloat(e.target.value))} />
          </div>
        )}
        <div className="field">
          <label>탄성계수 E (GPa)</label>
          <input type="number" defaultValue={fmtInput(E)} onBlur={(e) => setE(parseFloat(e.target.value))} />
        </div>
        <div className="field">
          <label>단면 2차모멘트 I (×10⁶ mm⁴)</label>
          <input type="number" defaultValue={fmtInput(I)} onBlur={(e) => setI(parseFloat(e.target.value))} />
        </div>
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
            <div className="step-row">등분포하중 q만: δ = 5qL⁴/384EI = {fmt(result.deltaCenterFromUDL * 1000)} mm</div>
            <div className="step-row">중앙 집중하중 P만: δ = PL³/48EI = {fmt(result.deltaFromPoint * 1000)} mm</div>
            <div className="step-final">합산 δ중앙 = {fmt(result.deltaCenter * 1000)} mm</div>
          </FormulaSection>
        </div>
        <EditableText as="div" className="ai-hint" contentKey="calc.MethodOfSuperposition.aiHint" defaultText="💬 왜 중첩이 선형탄성 범위에서만 성립하는지 궁금하다면, 오른쪽 AI 튜터에게 물어보세요." />
      </div>

      <AiTutorPanel />
    </>
  );
}
