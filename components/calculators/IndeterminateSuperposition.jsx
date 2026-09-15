'use client';

import { useMemo, useState } from 'react';
import { UNIT_OPTIONS, fmt } from '@/lib/calc/unitOptions';
import { releaseAtB, releaseAtA, proppedCantileverUDLCurve } from '@/lib/calc/indeterminateBeams';
import FormulaSection, { Tip } from './FormulaSection';
import DeflectionCurveSVG from './DeflectionCurveSVG';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import Frac from '@/components/Frac';
import FieldBlockCard from './FieldBlockCard';

// 돌출 캔틸레버(고정단 A, 롤러 B, 등분포하중 q)를 "어느 지점을 놓아주느냐(release)"에 따라
// 두 가지로 풀 수 있음을 보여줌 — Fig.10-1의 (b)/(c)와 같은 아이디어.
// (a) B의 롤러를 없애고(캔틸레버) RB를 여분력으로 → 단위하중 1을 B에
// (b) A의 고정을 모멘트만 풀어주고(단순보) MA를 여분력으로 → 단위모멘트 1을 A에
// 두 경우 모두 "실제하중이 만든 변위 = 여분력이 만든 변위" 라는 적합조건(compatibility)으로 여분력을 구함.

export default function IndeterminateSuperposition() {
  const [release, setRelease] = useState('B'); // 'B' | 'A'
  const [units, setUnits] = useState({ length: 'm', distLoad: 'kN/m', force: 'kN', moment: 'kN·m', E: 'GPa', inertia: 'mm⁴' });
  const [L, setL] = useState(4);
  const [q, setQ] = useState(10 * 1000);
  const [E, setE] = useState(200 * 1e9);
  const [I, setI] = useState(60e6 * 1e-12);
  const [activeField, setActiveField] = useState('L');

  const lenF = UNIT_OPTIONS.length[units.length];
  const distF = UNIT_OPTIONS.distLoad[units.distLoad];
  const forceF = UNIT_OPTIONS.force[units.force];
  const momF = UNIT_OPTIONS.moment[units.moment];
  const EF = UNIT_OPTIONS.E[units.E];
  const inertiaF = UNIT_OPTIONS.inertia[units.inertia];
  const disp = (b, f) => b / f;

  const EI = E * I;
  const qSI = q;

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
        <FieldBlockCard
          title="보 조건 (L, q, E, I)"
          activeKey={activeField}
          onActiveChange={setActiveField}
          fields={[
            { key: 'L', label: '스팬 L', value: disp(L, lenF), unitType: 'length', unit: units.length },
            { key: 'q', label: '등분포하중 q', value: disp(q, distF), unitType: 'distLoad', unit: units.distLoad },
            { key: 'E', label: '탄성계수 E', value: disp(E, EF), unitType: 'E', unit: units.E },
            { key: 'I', label: '단면2차모멘트 I', value: disp(I, inertiaF), unitType: 'inertia', unit: units.inertia },
          ]}
          onUnitChange={(unitType, v) => setUnits((prev) => ({ ...prev, [unitType]: v }))}
          onFieldChange={(key, value) => {
            const val = parseFloat(value);
            if (isNaN(val)) return;
            if (key === 'L') setL(val * lenF);
            else if (key === 'q') setQ(val * distF);
            else if (key === 'E') setE(val * EF);
            else if (key === 'I') setI(val * inertiaF);
          }}
        />
        <div className="field">
          <label>단위 (여분력 표시: 힘 / 모멘트)</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <select className="unit-inline" style={{ width: '100%' }} value={units.force} onChange={(e) => setUnits((p) => ({ ...p, force: e.target.value }))}>
              {Object.keys(UNIT_OPTIONS.force).map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
            <select className="unit-inline" style={{ width: '100%' }} value={units.moment} onChange={(e) => setUnits((p) => ({ ...p, moment: e.target.value }))}>
              {Object.keys(UNIT_OPTIONS.moment).map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
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
            <div className="v">{isB ? fmt(disp(result.rb.RB, forceF)) + ` ${units.force}` : fmt(disp(result.ra.MA, momF)) + ` ${units.moment}`}</div>
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
                RB = <Frac num="δB" den="δBB" /> = {fmt(disp(result.rb.RB, forceF))} {units.force}
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
                MA = <Frac num="θA" den="θAA" /> = {fmt(disp(result.ra.MA, momF))} {units.moment}
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
