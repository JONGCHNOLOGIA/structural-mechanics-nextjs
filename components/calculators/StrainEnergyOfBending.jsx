'use client';

import { useMemo, useState } from 'react';
import { fmt, fmtInput, fmtSci } from '@/lib/calc/unitOptions';
import { bendingStrainEnergy } from '@/lib/calc/strainEnergy';
import FormulaSection, { Tip } from './FormulaSection';
import AiTutorPanel from './AiTutorPanel';

// 캔틸레버 자유단에 P, M0가 작용할 때 굽힘이 저장하는 변형에너지 U = ∫M²/2EI dx.
// a) P만  b) M0만  c) P와 M0 동시 — 세 경우를 토글로 비교.

export default function StrainEnergyOfBending() {
  const [caseType, setCaseType] = useState('both'); // 'point' | 'moment' | 'both'
  const [L, setL] = useState(4);
  const [P, setP] = useState(20);
  const [M0, setM0] = useState(15);
  const [E, setE] = useState(200);
  const [I, setI] = useState(60);

  const EI = E * 1e9 * (I * 1e-6);
  const PSI = caseType === 'moment' ? 0 : P * 1000;
  const M0SI = caseType === 'point' ? 0 : M0 * 1000;

  const result = useMemo(() => {
    const U = bendingStrainEnergy(L, PSI, M0SI, EI);
    const Up = (PSI ** 2 * L ** 3) / (6 * EI); // P만 있을 때 기여분
    const Um = (M0SI ** 2 * L) / (2 * EI); // M0만 있을 때 기여분
    const Ucross = U - Up - Um; // 교차항 (P·M0)
    return { U, Up, Um, Ucross };
  }, [L, PSI, M0SI, EI]);

  const N = 40;
  const diagramPts = [];
  for (let i = 0; i <= N; i++) {
    const s = (L * i) / N;
    diagramPts.push({ s, M: PSI * s + M0SI });
  }
  const maxAbsM = Math.max(1e-9, ...diagramPts.map((p) => Math.abs(p.M)));

  return (
    <>
      {/* ---------------- Setting Menu ---------------- */}
      <div className="panel">
        <h3>SETTING MENU</h3>
        <p style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.6, marginBottom: 14, background: 'var(--bg)', borderRadius: 10, padding: '12px 14px' }}>
          굽힘모멘트가 있으면 보 안에 <b>변형에너지</b> U = ∫ M²/2EI dx 가 저장돼요. 캔틸레버 자유단에 P, M0를 각각 또는 동시에 줘서 비교해보세요.
        </p>
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          <button className={'add-block' + (caseType === 'point' ? ' active' : '')} style={{ margin: 0 }} onClick={() => setCaseType('point')}>
            P만
          </button>
          <button className={'add-block' + (caseType === 'moment' ? ' active' : '')} style={{ margin: 0 }} onClick={() => setCaseType('moment')}>
            M0만
          </button>
          <button className={'add-block' + (caseType === 'both' ? ' active' : '')} style={{ margin: 0 }} onClick={() => setCaseType('both')}>
            P + M0
          </button>
        </div>
        <div className="field">
          <label>스팬 길이 L (m)</label>
          <input type="number" defaultValue={fmtInput(L)} onBlur={(e) => setL(parseFloat(e.target.value))} />
        </div>
        {caseType !== 'moment' && (
          <div className="field">
            <label>자유단 집중하중 P (kN)</label>
            <input type="number" defaultValue={fmtInput(P)} onBlur={(e) => setP(parseFloat(e.target.value))} />
          </div>
        )}
        {caseType !== 'point' && (
          <div className="field">
            <label>자유단 모멘트 M0 (kN·m)</label>
            <input type="number" defaultValue={fmtInput(M0)} onBlur={(e) => setM0(parseFloat(e.target.value))} />
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
        <MomentDiagramSVG pts={diagramPts} L={L} maxAbsM={maxAbsM} />
        <div className="result-grid">
          <div className="result-card">
            <div className="l">총 변형에너지 U</div>
            <div className="v">{fmtSci(result.U)} J</div>
          </div>
          <div className="result-card">
            <div className="l">P 기여분 (P만 있었다면)</div>
            <div className="v">{fmtSci(result.Up)} J</div>
          </div>
        </div>
        <div className="steps">
          <FormulaSection title="변형에너지 적분">
            <div className="step-formula">
              <Tip title="자유단 B로부터 잰 거리 s에서의 굽힘모멘트">M(s)</Tip> = P·s + M0
            </div>
            <div className="step-row">U = ∫₀ᴸ M(s)²/2EI ds = P²L³/6EI + PM0L²/2EI + M0²L/2EI</div>
            {caseType === 'both' && (
              <div className="step-row">교차항(PM0L²/2EI) = {fmtSci(result.Ucross)} J — P와 M0가 같은 방향이면 에너지가 단순 합보다 커져요.</div>
            )}
            <div className="step-final">U = {fmtSci(result.U)} J</div>
          </FormulaSection>
        </div>
        <div className="ai-hint">💬 U를 P로 편미분하면 왜 처짐 δ가 나오는지 궁금하다면, 다음 소주제(Castigliano's Theorem)에서 바로 이어집니다.</div>
      </div>

      <AiTutorPanel />
    </>
  );
}

function MomentDiagramSVG({ pts, L, maxAbsM }) {
  const w = 620, h = 220;
  const padL = 50, padR = 40, padTop = 30, padBottom = 40;
  const drawW = w - padL - padR;
  const drawH = h - padTop - padBottom;
  const xToPx = (s) => padL + (s / L) * drawW;
  const mToPx = (m) => padTop + drawH - (m / maxAbsM) * drawH;

  const areaPath =
    `M ${xToPx(0)} ${padTop + drawH} ` +
    pts.map((p) => `L ${xToPx(p.s).toFixed(2)} ${mToPx(p.M).toFixed(2)}`).join(' ') +
    ` L ${xToPx(L)} ${padTop + drawH} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 660, margin: '0 auto', display: 'block' }}>
      <line x1={padL} y1={padTop + drawH} x2={padL + drawW} y2={padTop + drawH} stroke="#8A97A2" strokeWidth="1.2" />
      <path d={areaPath} fill="#E7E9F7" stroke="#4A5FBF" strokeWidth="1.6" />
      <text x={padL} y={padTop + drawH + 20} fontSize="10.5" fill="#8A97A2">B (자유단, s=0)</text>
      <text x={padL + drawW} y={padTop + drawH + 20} fontSize="10.5" fill="#8A97A2" textAnchor="end">A (고정단, s=L)</text>
      <text x={padL + drawW / 2} y={h - 6} fontSize="10.5" fill="#8A97A2" textAnchor="middle">굽힘모멘트 M(s) 다이어그램</text>
    </svg>
  );
}
