'use client';

import { useMemo, useState } from 'react';
import { fmt, fmtInput } from '@/lib/calc/unitOptions';
import { ssUDLmax } from '@/lib/calc/deflection';
import FormulaSection, { Tip } from './FormulaSection';
import DeflectionCurveSVG from './DeflectionCurveSVG';
import { ssUDL } from '@/lib/calc/deflection';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import Frac from '@/components/Frac';

// 캔틸레버(P, M0)는 Castigliano 정리(U를 P, M0로 편미분)로,
// 단순보(등분포하중 q)는 단위하중법(가상의 단위하중을 준 뒤 M·m1을 적분)으로 처짐을 구함.
// 두 방법 모두 "변형에너지 하나로 처짐/처짐각을 구한다"는 같은 뿌리에서 나온 것.

export default function CastiglianosTheorem() {
  const [beamType, setBeamType] = useState('cantilever'); // 'cantilever' | 'simply-supported'
  const [view, setView] = useState('castigliano'); // 'castigliano' | 'unit-load'
  const [L, setL] = useState(4);
  const [P, setP] = useState(20);
  const [M0, setM0] = useState(15);
  const [q, setQ] = useState(10);
  const [E, setE] = useState(200);
  const [I, setI] = useState(60);

  const EI = E * 1e9 * (I * 1e-6);
  const PSI = P * 1000;
  const M0SI = M0 * 1000;
  const qSI = q * 1000;

  const cantileverResult = useMemo(
    () => ({
      deltaB: (PSI * L ** 3) / (3 * EI) + (M0SI * L ** 2) / (2 * EI),
      thetaB: (PSI * L ** 2) / (2 * EI) + (M0SI * L) / EI,
    }),
    [L, PSI, M0SI, EI]
  );

  const ssResult = useMemo(() => ssUDLmax(L, qSI, EI), [L, qSI, EI]);

  const curvePts = useMemo(() => {
    const N = 40;
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const x = (L * i) / N;
      if (beamType === 'simply-supported') {
        pts.push({ x, v: ssUDL(x, L, qSI, EI).v });
      } else {
        // 캔틸레버 곡선은 근사로 자유단 처짐만 참고 표시(간단화)
        const s = L - x; // 고정단으로부터 x
        const Mx = PSI * (L - x) + M0SI;
        pts.push({ x, v: (Mx * x ** 2) / (2 * EI) / L });
      }
    }
    return pts;
  }, [beamType, L, PSI, M0SI, qSI, EI]);

  const isCantilever = beamType === 'cantilever';

  return (
    <>
      {/* ---------------- Setting Menu ---------------- */}
      <div className="panel">
        <h3>SETTING MENU</h3>
        <p style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.6, marginBottom: 14, background: 'var(--bg)', borderRadius: 10, padding: '12px 14px' }}>
          <b>Castigliano 정리</b>: δ = <Frac num="∂U" den="∂P" />, θ = <Frac num="∂U" den="∂M" /> — 변형에너지를 하중으로 편미분.
          <br />
          <b>단위하중법</b>: 구하려는 지점에 가상의 단위하중(=1)을 주고, 실제 모멘트 M과 가상 모멘트 m을 곱해 적분 — 결과는 Castigliano와 완전히 같아요.
        </p>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <button className={'add-block' + (isCantilever ? ' active' : '')} style={{ margin: 0 }} onClick={() => setBeamType('cantilever')}>
            캔틸레버 (P, M0)
          </button>
          <button className={'add-block' + (!isCantilever ? ' active' : '')} style={{ margin: 0 }} onClick={() => setBeamType('simply-supported')}>
            단순보 (등분포 q)
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          <button className={'add-block' + (view === 'castigliano' ? ' active' : '')} style={{ margin: 0 }} onClick={() => setView('castigliano')}>
            Castigliano 편미분
          </button>
          <button className={'add-block' + (view === 'unit-load' ? ' active' : '')} style={{ margin: 0 }} onClick={() => setView('unit-load')}>
            단위하중법
          </button>
        </div>
        <div className="field">
          <label>스팬 길이 L (m)</label>
          <input type="number" defaultValue={fmtInput(L)} onBlur={(e) => setL(parseFloat(e.target.value))} />
        </div>
        {isCantilever ? (
          <>
            <div className="field">
              <label>자유단 집중하중 P (kN)</label>
              <input type="number" defaultValue={fmtInput(P)} onBlur={(e) => setP(parseFloat(e.target.value))} />
            </div>
            <div className="field">
              <label>자유단 모멘트 M0 (kN·m)</label>
              <input type="number" defaultValue={fmtInput(M0)} onBlur={(e) => setM0(parseFloat(e.target.value))} />
            </div>
          </>
        ) : (
          <div className="field">
            <label>등분포하중 q (kN/m)</label>
            <input type="number" defaultValue={fmtInput(q)} onBlur={(e) => setQ(parseFloat(e.target.value))} />
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
        <DeflectionCurveSVG points={curvePts} L={L} support={isCantilever ? 'cantilever' : 'simple'} />
        {isCantilever ? (
          <div className="result-grid">
            <div className="result-card">
              <div className="l" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                δB = <Frac num="∂U" den="∂P" />
              </div>
              <div className="v">{fmt(cantileverResult.deltaB * 1000)} mm</div>
            </div>
            <div className="result-card">
              <div className="l" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                θB = <Frac num="∂U" den="∂M0" />
              </div>
              <div className="v">{cantileverResult.thetaB.toExponential(3)} rad</div>
            </div>
          </div>
        ) : (
          <div className="result-grid">
            <div className="result-card">
              <div className="l">θA</div>
              <div className="v">{ssResult.thetaA.toExponential(3)} rad</div>
            </div>
            <div className="result-card">
              <div className="l">δ 중앙</div>
              <div className="v">{fmt(ssResult.deltaMax * 1000)} mm</div>
            </div>
          </div>
        )}

        <div className="steps">
          {isCantilever ? (
            view === 'castigliano' ? (
              <FormulaSection title="Castigliano 정리로 δB, θB 구하기">
                <div className="step-formula">
                  U = <Frac num="P²L³" den="6EI" /> + <Frac num="PM0L²" den="2EI" /> + <Frac num="M0²L" den="2EI" />
                </div>
                <div className="step-row">
                  <Tip title="P로 편미분 → P가 작용하는 방향의 처짐">δB</Tip> = <Frac num="∂U" den="∂P" /> = <Frac num="PL³" den="3EI" /> +{' '}
                  <Frac num="M0L²" den="2EI" />
                </div>
                <div className="step-row">
                  <Tip title="M0로 편미분 → M0가 작용하는 방향의 처짐각">θB</Tip> = <Frac num="∂U" den="∂M0" /> = <Frac num="PL²" den="2EI" /> +{' '}
                  <Frac num="M0L" den="EI" />
                </div>
                <div className="step-final">δB = {fmt(cantileverResult.deltaB * 1000)} mm, θB = {cantileverResult.thetaB.toExponential(3)} rad</div>
              </FormulaSection>
            ) : (
              <FormulaSection title="단위하중법으로 δB 구하기">
                <div className="step-formula">
                  δB = ∫₀ᴸ <Frac num="M(s)·m₁(s)" den="EI" /> ds
                </div>
                <div className="step-row">M(s) = Ps+M0 (실제 하중), m₁(s) = s (B에 가상의 단위하중 1을 줬을 때 모멘트)</div>
                <div className="step-row">
                  = ∫₀ᴸ <Frac num="(Ps+M0)s" den="EI" /> ds = <Frac num="PL³" den="3EI" /> + <Frac num="M0L²" den="2EI" />
                </div>
                <div className="step-final">Castigliano로 구한 값과 정확히 같아요: δB = {fmt(cantileverResult.deltaB * 1000)} mm</div>
              </FormulaSection>
            )
          ) : view === 'castigliano' ? (
            <FormulaSection title="Castigliano 정리 (가상하중 도입)">
              <div className="step-row" style={{ marginBottom: 8 }}>
                등분포하중 q는 그 자체로 "하중 변수"가 아니라서, 원하는 지점에 <b>가상의 집중하중 Q</b>를 추가로 두고 U를 Q로 편미분한 뒤 Q=0을 대입해요 — 이게 바로 오른쪽 "단위하중법"과 같은 발상이에요.
              </div>
              <div className="step-final">
                δ중앙 = <Frac num="∂U" den="∂Q" />|<sub>Q=0</sub> = <Frac num="5qL⁴" den="384EI" /> = {fmt(ssResult.deltaMax * 1000)} mm
              </div>
            </FormulaSection>
          ) : (
            <FormulaSection title="단위하중법으로 θA, δ중앙 구하기">
              <div className="step-formula">
                θA = ∫₀ᴸ <Frac num="M(x)·m₁(x)" den="EI" /> dx
              </div>
              <div className="step-row">
                M(x) = <Frac num="qx(L−x)" den="2" /> (실제), m₁(x) = 1−<Frac num="x" den="L" /> (A에 가상의 단위모멘트를 줬을 때)
              </div>
              <div className="step-row">
                θA = <Frac num="qL³" den="24EI" /> = {ssResult.thetaA.toExponential(3)} rad
              </div>
              <div className="step-formula" style={{ marginTop: 8 }}>
                δ중앙 = ∫₀ᴸ <Frac num="M(x)·m₂(x)" den="EI" /> dx
              </div>
              <div className="step-row">m₂(x) = 중앙에 가상의 단위하중 1을 줬을 때의 모멘트</div>
              <div className="step-final">
                δ중앙 = <Frac num="5qL⁴" den="384EI" /> = {fmt(ssResult.deltaMax * 1000)} mm
              </div>
            </FormulaSection>
          )}
        </div>
        <EditableText as="div" className="ai-hint" contentKey="calc.CastiglianosTheorem.aiHint" defaultText="💬 왜 가상의 단위하중을 줘도 결과가 맞는지 궁금하다면, 오른쪽 AI 튜터에게 물어보세요." />
      </div>

      <AiTutorPanel />
    </>
  );
}
