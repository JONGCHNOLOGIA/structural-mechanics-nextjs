'use client';

import { useMemo, useState } from 'react';
import { UNIT_OPTIONS, fmt } from '@/lib/calc/unitOptions';
import { ssPointLoad, ssPointLoadInfo } from '@/lib/calc/deflection';
import FormulaSection, { Tip } from './FormulaSection';
import DeflectionCurveSVG from './DeflectionCurveSVG';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import Frac from '@/components/Frac';
import FieldBlockCard from './FieldBlockCard';

// Example 9-3 — Macaulay 괄호(단위함수) <x-a>를 이용해 집중하중 P가 임의 위치 a에 있는
// 단순보의 처짐을, 전단력식을 적분해서 구함. 괄호는 x<a일 땐 0, x≥a일 때만 값을 가짐.

export default function ShearForceEquation() {
  const [units, setUnits] = useState({ length: 'm', force: 'kN', E: 'GPa', inertia: 'mm⁴' });
  const [L, setL] = useState(4);
  const [a, setA] = useState(2);
  const [P, setP] = useState(20 * 1000);
  const [E, setE] = useState(200 * 1e9);
  const [I, setI] = useState(60e6 * 1e-12);
  const [activeField, setActiveField] = useState('L');

  const lenF = UNIT_OPTIONS.length[units.length];
  const forceF = UNIT_OPTIONS.force[units.force];
  const EF = UNIT_OPTIONS.E[units.E];
  const inertiaF = UNIT_OPTIONS.inertia[units.inertia];
  const disp = (b, f) => b / f;

  const EI = E * I;
  const PSI = P;
  const aClamped = Math.min(Math.max(a, 0.001), L - 0.001);

  const result = useMemo(() => {
    const N = 40;
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const x = (L * i) / N;
      pts.push({ x, v: ssPointLoad(x, L, aClamped, PSI, EI).v });
    }
    return { pts, info: ssPointLoadInfo(L, aClamped, PSI, EI) };
  }, [L, aClamped, PSI, EI]);

  const b = L - aClamped;

  return (
    <>
      {/* ---------------- Setting Menu ---------------- */}
      <div className="panel">
        <h3>SETTING MENU</h3>
        <EditableText
          contentKey="calc.ShearForceEquation.intro"
          defaultText="집중하중 P가 지점 A에서 a만큼 떨어진 위치에 있어요. **Macaulay 괄호** &lt;x−a&gt;를 쓰면 x&lt;a와 x≥a 구간을 나눠 적분할 필요 없이 **식 하나**로 전체 구간을 표현할 수 있어요."
          style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.6, marginBottom: 14, background: 'var(--bg)', borderRadius: 10, padding: '12px 14px' }}
        />
        <FieldBlockCard
          title="보 조건 (L, P, E, I)"
          activeKey={activeField}
          onActiveChange={setActiveField}
          fields={[
            { key: 'L', label: '스팬 L', value: disp(L, lenF), unitType: 'length', unit: units.length },
            { key: 'P', label: '집중하중 P', value: disp(P, forceF), unitType: 'force', unit: units.force },
            { key: 'E', label: '탄성계수 E', value: disp(E, EF), unitType: 'E', unit: units.E },
            { key: 'I', label: '단면2차모멘트 I', value: disp(I, inertiaF), unitType: 'inertia', unit: units.inertia },
          ]}
          onUnitChange={(unitType, v) => setUnits((prev) => ({ ...prev, [unitType]: v }))}
          onFieldChange={(key, value) => {
            const val = parseFloat(value);
            if (isNaN(val)) return;
            if (key === 'L') setL(val * lenF);
            else if (key === 'P') setP(val * forceF);
            else if (key === 'E') setE(val * EF);
            else if (key === 'I') setI(val * inertiaF);
          }}
        />
        <div className="field">
          <label>하중 위치 a (A로부터) — {fmt(disp(aClamped, lenF))} {units.length}</label>
          <input type="range" min="0.1" max={Math.max(0.2, L - 0.1)} step="0.05" value={aClamped} onChange={(e) => setA(parseFloat(e.target.value))} style={{ width: '100%' }} />
          <div style={{ fontSize: 11, color: 'var(--gray-soft)', marginTop: 4 }}>a = {fmt(disp(aClamped, lenF))} {units.length}, b = {fmt(disp(b, lenF))} {units.length}</div>
        </div>
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="panel">
        <h3>
          VISUALIZER <span className="badge live" style={{ marginLeft: 6 }}>실시간</span>
        </h3>
        <DeflectionCurveSVG points={result.pts} L={L} support="simple" pointLoadAt={aClamped} />
        <div className="result-grid">
          <div className="result-card">
            <div className="l">θA</div>
            <div className="v">{result.info.thetaA.toExponential(3)} rad</div>
          </div>
          <div className="result-card">
            <div className="l">θB</div>
            <div className="v">{result.info.thetaB.toExponential(3)} rad</div>
          </div>
          <div className="result-card">
            <div className="l">하중점 처짐 δ(a)</div>
            <div className="v">{fmt(result.info.deltaAtLoad * 1000)} mm</div>
          </div>
        </div>

        <div className="steps">
          <FormulaSection title="Macaulay 괄호로 전단력식 세우기">
            <div className="step-formula">
              &lt;x&gt; = {'{'} x (x≥0), 0 (x&lt;0) {'}'}
            </div>
            <div className="step-row">
              반력 R<sub>A</sub> = <Frac num="Pb" den="L" />, R<sub>B</sub> = <Frac num="Pa" den="L" />
            </div>
            <div className="step-row">V(x) = R_A − P&lt;x−a&gt;⁰ &nbsp; (한 식으로 전 구간 표현)</div>
            <div className="step-row">M(x) = R_A x − P&lt;x−a&gt;</div>
            <div className="step-formula">EIv&#8221; = R_A x − P&lt;x−a&gt;</div>
            <div className="step-row">
              두 번 적분 → EIv&#8217; = <Frac num="R_A x²" den="2" /> − <Frac num="P&lt;x−a&gt;²" den="2" /> + c₁, &nbsp; EIv ={' '}
              <Frac num="R_A x³" den="6" /> − <Frac num="P&lt;x−a&gt;³" den="6" /> + c₁x + c₂
            </div>
            <div className="step-final">v(0)=0, v(L)=0으로 c₁, c₂ 결정 — 하중이 어디 있든 식 형태가 그대로 유지돼요.</div>
          </FormulaSection>
        </div>
        <EditableText as="div" className="ai-hint" contentKey="calc.ShearForceEquation.aiHint" defaultText="💬 Macaulay 괄호가 왜 미분·적분해도 형태가 유지되는지 궁금하다면, 오른쪽 AI 튜터에게 물어보세요." />
      </div>

      <AiTutorPanel />
    </>
  );
}
