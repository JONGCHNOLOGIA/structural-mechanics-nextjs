'use client';

import { useMemo, useState } from 'react';
import { fmt, fmtInput } from '@/lib/calc/unitOptions';
import { releaseAtB, releaseAtA, proppedCantileverUDLCurve } from '@/lib/calc/indeterminateBeams';
import FormulaSection, { Tip } from './FormulaSection';
import DeflectionCurveSVG from './DeflectionCurveSVG';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import Frac from '@/components/Frac';

// 돌출 캔틸레버(고정단 A, 롤러 B, 등분포하중 q)를 "어느 지점을 놓아주느냐(release)"에 따라
// 두 가지로 풀 수 있음을 보여줌 — Fig.10-1의 (b)/(c)와 같은 아이디어.
// (a) B의 롤러를 없애고(캔틸레버) RB를 여분력으로 → 단위하중 1을 B에
// (b) A의 고정을 모멘트만 풀어주고(단순보) MA를 여분력으로 → 단위모멘트 1을 A에
// 두 경우 모두 "실제하중이 만든 변위 = 여분력이 만든 변위" 라는 적합조건(compatibility)으로 여분력을 구함.

export default function IndeterminateSuperposition() {
  const [release, setRelease] = useState('B'); // 'B' | 'A'
  const [L, setL] = useState(4);
  const [q, setQ] = useState(10);
  const [E, setE] = useState(200);
  const [I, setI] = useState(60);

  const EI = E * 1e9 * (I * 1e-6);
  const qSI = q * 1000;

  const result = useMemo(() => {
    const rb = releaseAtB(L, qSI, EI);
    const ra = releaseAtA(L, qSI, EI);
    const N = 40;
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const x = (L * i) / N;
      pts.push({ x, v: proppedCantileverUDLCurve(x, L, qSI, EI) });
    }
    return { rb, ra, pts };
  }, [L, qSI, EI]);

  const isB = release === 'B';

  return (
    <>
      {/* ---------------- Setting Menu ---------------- */}
      <div className="panel">
        <h3>SETTING MENU</h3>
        <EditableText
          contentKey="calc.IndeterminateSuperposition.intro"
          defaultText="부정정보를 풀려면 반력·모멘트 중 하나를 **여분력(redundant)**으로 남기고, 그 지점을 **풀어준(released)** 정정구조로 바꿔요. **어디를 풀어주느냐**에 따라 released structure가 달라지지만, 최종 답은 같아요."
          style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.6, marginBottom: 14, background: 'var(--bg)', borderRadius: 10, padding: '12px 14px' }}
        />
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          <button className={'add-block' + (isB ? ' active' : '')} style={{ margin: 0 }} onClick={() => setRelease('B')}>
            B의 롤러 → 캔틸레버
          </button>
          <button className={'add-block' + (!isB ? ' active' : '')} style={{ margin: 0 }} onClick={() => setRelease('A')}>
            A의 모멘트 → 단순보
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
        <DeflectionCurveSVG points={result.pts} L={L} support="propped" />

        <div className="result-grid">
          <div className="result-card">
            <div className="l">{isB ? 'δB (실제하중)' : 'θA (실제하중)'}</div>
            <div className="v">{isB ? fmt(result.rb.deltaB * 1000) + ' mm' : result.ra.thetaA.toExponential(3) + ' rad'}</div>
          </div>
          <div className="result-card">
            <div className="l">{isB ? 'RB (구한 여분력)' : 'MA (구한 여분력)'}</div>
            <div className="v">{isB ? fmt(result.rb.RB / 1000) + ' kN' : fmt(result.ra.MA / 1000) + ' kN·m'}</div>
          </div>
        </div>

        <div className="steps">
          {isB ? (
            <FormulaSection title="B의 롤러를 풀어서(캔틸레버) RB 구하기">
              <div className="step-formula">
                적합조건: 실제 B의 처짐 = 0 → <Tip title="q만 작용했을 때 B의 처짐(아래로)">δB</Tip> − RB·<Tip title="B에 단위하중 1이 작용했을 때 B의 처짐">δBB</Tip> = 0
              </div>
              <div className="step-row">
                δB = <Frac num="qL⁴" den="8EI" /> = {fmt(result.rb.deltaB * 1000)} mm (released 캔틸레버가 q만으로 처지는 양)
              </div>
              <div className="step-row">
                δBB = <Frac num="L³" den="3EI" /> = {fmt(result.rb.deltaBB * 1000)} mm (B에 단위하중 1을 줬을 때 처지는 양)
              </div>
              <div className="step-final">
                RB = <Frac num="δB" den="δBB" /> = {fmt(result.rb.RB / 1000)} kN
              </div>
            </FormulaSection>
          ) : (
            <FormulaSection title="A의 모멘트 구속을 풀어서(단순보) MA 구하기">
              <div className="step-formula">
                적합조건: 실제 A의 처짐각 = 0 → <Tip title="q만 작용했을 때 A의 처짐각">θA</Tip> − MA·<Tip title="A에 단위모멘트 1이 작용했을 때 A의 처짐각">θAA</Tip> = 0
              </div>
              <div className="step-row">
                θA = <Frac num="qL³" den="24EI" /> = {result.ra.thetaA.toExponential(3)} rad (released 단순보가 q만으로 회전하는 각)
              </div>
              <div className="step-row">
                θAA = <Frac num="L" den="3EI" /> = {result.ra.thetaAA.toExponential(3)} rad (A에 단위모멘트 1을 줬을 때 회전각)
              </div>
              <div className="step-final">
                MA = <Frac num="θA" den="θAA" /> = {fmt(result.ra.MA / 1000)} kN·m
              </div>
            </FormulaSection>
          )}
        </div>
        <EditableText as="div" className="ai-hint" contentKey="calc.IndeterminateSuperposition.aiHint" defaultText="💬 어느 쪽을 풀어줘도 결국 같은 보인데 왜 같은 답이 나오는지 궁금하다면, 오른쪽 AI 튜터에게 물어보세요." />
      </div>

      <AiTutorPanel />
    </>
  );
}
