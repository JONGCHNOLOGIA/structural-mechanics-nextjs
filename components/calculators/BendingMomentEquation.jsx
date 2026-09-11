'use client';

import { useMemo, useState } from 'react';
import { fmt, fmtInput } from '@/lib/calc/unitOptions';
import { ssUDL, ssUDLmax, cantileverUDL, cantileverUDLmax } from '@/lib/calc/deflection';
import FormulaSection, { Tip } from './FormulaSection';
import DeflectionCurveSVG from './DeflectionCurveSVG';
import AiTutorPanel from './AiTutorPanel';

// Example 9-1 (단순보) / 9-2 (캔틸레버) — 등분포하중 q를 받는 보를
// (a) 굽힘모멘트식을 두 번 적분하는 방법과 (b) 4차 미분방정식 EIv''''=q를 네 번 적분하는 방법,
// 두 가지로 풀어서 같은 결과가 나오는 걸 보여줌.

export default function BendingMomentEquation() {
  const [beamType, setBeamType] = useState('simply-supported'); // 'simply-supported' | 'cantilever'
  const [method, setMethod] = useState('bending-moment'); // 'bending-moment' | 'fourth-order'
  const [L, setL] = useState(4);
  const [q, setQ] = useState(10);
  const [E, setE] = useState(200);
  const [I, setI] = useState(60);

  const EI = E * 1e9 * (I * 1e-6);
  const qSI = q * 1000;

  const result = useMemo(() => {
    const N = 40;
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const x = (L * i) / N;
      const r = beamType === 'simply-supported' ? ssUDL(x, L, qSI, EI) : cantileverUDL(x, L, qSI, EI);
      pts.push({ x, v: r.v });
    }
    const max = beamType === 'simply-supported' ? ssUDLmax(L, qSI, EI) : cantileverUDLmax(L, qSI, EI);
    return { pts, max };
  }, [beamType, L, qSI, EI]);

  const isSS = beamType === 'simply-supported';

  return (
    <>
      {/* ---------------- Setting Menu ---------------- */}
      <div className="panel">
        <h3>SETTING MENU</h3>
        <p style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.6, marginBottom: 14, background: 'var(--bg)', borderRadius: 10, padding: '12px 14px' }}>
          등분포하중 q를 받는 보의 처짐곡선을, <b>굽힘모멘트식 적분</b>과 <b>4차 미분방정식(EIv&#8371;&#8371;&#8371;&#8371;=q)</b> 두 방법으로 풀어서 같은 결과가 나오는 걸 비교합니다.
        </p>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <button className={'add-block' + (isSS ? ' active' : '')} style={{ margin: 0 }} onClick={() => setBeamType('simply-supported')}>
            단순보
          </button>
          <button className={'add-block' + (!isSS ? ' active' : '')} style={{ margin: 0 }} onClick={() => setBeamType('cantilever')}>
            캔틸레버
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          <button className={'add-block' + (method === 'bending-moment' ? ' active' : '')} style={{ margin: 0 }} onClick={() => setMethod('bending-moment')}>
            굽힘모멘트식
          </button>
          <button className={'add-block' + (method === 'fourth-order' ? ' active' : '')} style={{ margin: 0 }} onClick={() => setMethod('fourth-order')}>
            4차 미분방정식
          </button>
        </div>
        <div className="field">
          <label>스팬 길이 L (m)</label>
          <input type="number" defaultValue={fmtInput(L)} onBlur={(e) => setL(parseFloat(e.target.value))} />
        </div>
        <div className="field">
          <label>등분포하중 q (kN/m)</label>
          <input type="number" defaultValue={fmtInput(q)} onBlur={(e) => setQ(parseFloat(e.target.value))} />
        </div>
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
        <DeflectionCurveSVG points={result.pts} L={L} support={isSS ? 'simple' : 'cantilever'} />
        <div className="result-grid">
          <div className="result-card">
            <div className="l">{isSS ? 'θA (지점 A 처짐각)' : 'θB (자유단 처짐각)'}</div>
            <div className="v">{(isSS ? result.max.thetaA : result.max.thetaB).toExponential(3)} rad</div>
          </div>
          <div className="result-card">
            <div className="l">{isSS ? 'δmax (중앙 처짐)' : 'δB (자유단 처짐)'}</div>
            <div className="v">{fmt((isSS ? result.max.deltaMax : result.max.deltaB) * 1000)} mm</div>
          </div>
        </div>

        <div className="steps">
          {method === 'bending-moment' ? (
            <FormulaSection title="① 굽힘모멘트식을 두 번 적분">
              {isSS ? (
                <>
                  <div className="step-formula">
                    <Tip title="단순보의 굽힘모멘트식">M(x)</Tip> = qx(L−x)/2 &nbsp; → &nbsp; EIv&#8221; = M(x)
                  </div>
                  <div className="step-row">v(0)=0, v(L)=0 (양단 처짐 0) — 두 번 적분 후 이 두 조건으로 적분상수 결정</div>
                </>
              ) : (
                <>
                  <div className="step-formula">
                    <Tip title="자유단에서 잰 굽힘모멘트식">M(x)</Tip> = −q(L−x)²/2 &nbsp; → &nbsp; EIv&#8221; = M(x)
                  </div>
                  <div className="step-row">v(0)=0, v&#8217;(0)=0 (고정단에서 처짐·처짐각 모두 0)</div>
                </>
              )}
              <div className="step-final">
                v(x) = {isSS ? 'qx(L³−2Lx²+x³)/24EI' : 'q(x⁴−4Lx³+6L²x²)/24EI'}
              </div>
            </FormulaSection>
          ) : (
            <FormulaSection title="② 4차 미분방정식을 네 번 적분">
              <div className="step-formula">EIv&#8221;&#8221; = q &nbsp; (하중강도 q를 직접 적분)</div>
              <div className="step-row">EIv&#8221;&#8221;&#8217; = qx+c₁ &nbsp; EIv&#8221;&#8221; = qx²/2+c₁x+c₂ &nbsp; EIv&#8221; = qx³/6+c₁x²/2+c₂x+c₃ &nbsp; EIv = qx⁴/24+c₁x³/6+c₂x²/2+c₃x+c₄</div>
              {isSS ? (
                <div className="step-row">경계조건 4개: v(0)=0, EIv&#8221;(0)=0(모멘트 0), EIv&#8221;(L)=0, v(L)=0 → c₁,c₂,c₃,c₄ 결정</div>
              ) : (
                <div className="step-row">경계조건 4개: v(0)=0, v&#8217;(0)=0, EIv&#8221;(L)=0(자유단 모멘트 0), EIv&#8221;&#8217;(L)=0(자유단 전단 0) → c₁,c₂,c₃,c₄ 결정</div>
              )}
              <div className="step-final">굽힘모멘트식으로 풀었을 때와 <b>완전히 같은</b> v(x)가 나옵니다.</div>
            </FormulaSection>
          )}
        </div>
        <div className="ai-hint">💬 두 방법이 왜 같은 결과를 주는지 궁금하다면, 오른쪽 AI 튜터에게 물어보세요.</div>
      </div>

      <AiTutorPanel />
    </>
  );
}
