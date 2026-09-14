'use client';

import { useMemo, useState } from 'react';
import { fmt, fmtInput } from '@/lib/calc/unitOptions';
import { proppedCantileverUDL, proppedCantileverUDLCurve, fixedFixedCenterLoad, fixedFixedCenterLoadCurve } from '@/lib/calc/indeterminateBeams';
import FormulaSection, { Tip } from './FormulaSection';
import DeflectionCurveSVG from './DeflectionCurveSVG';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';

// Example 10-1(돌출 캔틸레버, UDL) / 10-2(양단고정, 중앙집중하중) —
// 반력 중 하나를 "여분력(redundant)"으로 남겨두고 EIv''=M(x)를 적분,
// 남는 경계조건(처짐/처짐각=0)으로 그 여분력을 거꾸로 구해냄.

export default function DifferentialEquationMethod() {
  const [beamType, setBeamType] = useState('propped'); // 'propped' | 'fixed-fixed'
  const [L, setL] = useState(4);
  const [q, setQ] = useState(10);
  const [P, setP] = useState(20);
  const [E, setE] = useState(200);
  const [I, setI] = useState(60);

  const EI = E * 1e9 * (I * 1e-6);
  const qSI = q * 1000;
  const PSI = P * 1000;
  const isPropped = beamType === 'propped';

  const result = useMemo(() => {
    const N = 40;
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const x = (L * i) / N;
      const v = isPropped ? proppedCantileverUDLCurve(x, L, qSI, EI) : fixedFixedCenterLoadCurve(x, L, PSI, EI);
      pts.push({ x, v });
    }
    const reactions = isPropped ? proppedCantileverUDL(L, qSI, EI) : fixedFixedCenterLoad(L, PSI, EI);
    return { pts, reactions };
  }, [isPropped, L, qSI, PSI, EI]);

  return (
    <>
      {/* ---------------- Setting Menu ---------------- */}
      <div className="panel">
        <h3>SETTING MENU</h3>
        <p style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.6, marginBottom: 14, background: 'var(--bg)', borderRadius: 10, padding: '12px 14px' }}>
          반력이 평형방정식 3개보다 많으면(<b>부정정</b>) 반력 하나를 <b>여분력</b>으로 남겨두고 EIv&#8221;=M(x)를 적분해요. 그러면 처짐·처짐각 조건이 하나 더 남는데, 그걸로 여분력을 거꾸로 구합니다.
        </p>
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          <button className={'add-block' + (isPropped ? ' active' : '')} style={{ margin: 0 }} onClick={() => setBeamType('propped')}>
            돌출 캔틸레버 (UDL)
          </button>
          <button className={'add-block' + (!isPropped ? ' active' : '')} style={{ margin: 0 }} onClick={() => setBeamType('fixed-fixed')}>
            양단고정 (중앙 집중하중)
          </button>
        </div>
        <div className="field">
          <label>스팬 길이 L (m)</label>
          <input type="number" defaultValue={fmtInput(L)} onBlur={(e) => setL(parseFloat(e.target.value))} />
        </div>
        {isPropped ? (
          <div className="field">
            <label>등분포하중 q (kN/m)</label>
            <input type="number" defaultValue={fmtInput(q)} onBlur={(e) => setQ(parseFloat(e.target.value))} />
          </div>
        ) : (
          <div className="field">
            <label>중앙 집중하중 P (kN)</label>
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
        <DeflectionCurveSVG points={result.pts} L={L} support={isPropped ? 'propped' : 'fixed-fixed'} pointLoadAt={isPropped ? undefined : L / 2} />

        {isPropped ? (
          <div className="result-grid">
            <div className="result-card">
              <div className="l">RA</div>
              <div className="v">{fmt(result.reactions.RA / 1000)} kN</div>
            </div>
            <div className="result-card">
              <div className="l">RB (여분력)</div>
              <div className="v">{fmt(result.reactions.RB / 1000)} kN</div>
            </div>
            <div className="result-card">
              <div className="l">MA (고정단 모멘트)</div>
              <div className="v">{fmt(result.reactions.MA / 1000)} kN·m</div>
            </div>
          </div>
        ) : (
          <div className="result-grid">
            <div className="result-card">
              <div className="l">MA = MB (고정단 모멘트)</div>
              <div className="v">{fmt(result.reactions.MA / 1000)} kN·m</div>
            </div>
            <div className="result-card">
              <div className="l">RA = RB</div>
              <div className="v">{fmt(result.reactions.RA / 1000)} kN</div>
            </div>
          </div>
        )}

        <div className="steps">
          {isPropped ? (
            <FormulaSection title="RB를 여분력으로 두고 적분">
              <div className="step-formula">
                <Tip title="A로부터 잰 굽힘모멘트, RB는 아직 모르는 값">EIv&#8221;</Tip> = RA·x − MA − qx²/2 &nbsp; (단, RA, MA도 RB로 표현됨)
              </div>
              <div className="step-row">경계조건: v(0)=0, v&#8217;(0)=0 (A는 고정단) → 적분상수 2개 결정</div>
              <div className="step-row">남은 조건: v(L)=0 (B는 롤러, 처짐이 0이어야 함) → 이 식 하나로 RB를 거꾸로 구함</div>
              <div className="step-final">RB = 3qL/8 = {fmt(result.reactions.RB / 1000)} kN, MA = qL²/8 = {fmt(result.reactions.MA / 1000)} kN·m</div>
            </FormulaSection>
          ) : (
            <FormulaSection title="대칭을 이용해 절반만 풀기">
              <div className="step-formula">
                <Tip title="중앙에서 대칭이라 절반(0~L/2)만 풀면 됨">EIv&#8221;</Tip> = (P/2)x − MA &nbsp; (0 ≤ x ≤ L/2)
              </div>
              <div className="step-row">경계조건: v(0)=0, v&#8217;(0)=0 (A는 고정단)</div>
              <div className="step-row">남은 조건: v&#8217;(L/2)=0 (중앙은 대칭이라 처짐각이 0) → 이 식으로 MA를 거꾸로 구함</div>
              <div className="step-final">MA = PL/8 = {fmt(result.reactions.MA / 1000)} kN·m (양쪽 고정단 모두 동일)</div>
            </FormulaSection>
          )}
        </div>
        <EditableText as="div" className="ai-hint" contentKey="calc.DifferentialEquationMethod.aiHint" defaultText="💬 왜 '남는 조건' 하나로 미지수를 구할 수 있는지 궁금하다면, 오른쪽 AI 튜터에게 물어보세요." />
      </div>

      <AiTutorPanel />
    </>
  );
}
