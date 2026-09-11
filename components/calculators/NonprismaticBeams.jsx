'use client';

import { useMemo, useState } from 'react';
import { fmt, fmtInput } from '@/lib/calc/unitOptions';
import FormulaSection, { Tip } from './FormulaSection';
import AiTutorPanel from './AiTutorPanel';

// 캔틸레버 보인데 단면(I)이 중간(x=c)에서 바뀜 — 자유단(x=L)에 집중하중 P.
// EI가 구간마다 다르니 M/EI 다이어그램을 구간별로 나눠 적분(수치적분)해서
// 모멘트-면적 2번째 정리로 처짐을 구함.

export default function NonprismaticBeams() {
  const [L, setL] = useState(4);
  const [c, setC] = useState(2);
  const [P, setP] = useState(20);
  const [E, setE] = useState(200);
  const [I1, setI1] = useState(30);
  const [I2, setI2] = useState(90);

  const cClamped = Math.min(Math.max(c, 0.001), L - 0.001);
  const PSI = P * 1000;
  const EPa = E * 1e9;
  const EI1 = EPa * (I1 * 1e-6);
  const EI2 = EPa * (I2 * 1e-6);

  const result = useMemo(() => {
    const N = 400;
    let theta = 0;
    let delta = 0;
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const x = (L * i) / N;
      const EIx = x < cClamped ? EI1 : EI2;
      const m = (PSI * (L - x)) / EIx; // M/EI (절대값)
      pts.push({ x, m });
    }
    for (let i = 0; i < N; i++) {
      const dx = L / N;
      const mAvg = (pts[i].m + pts[i + 1].m) / 2;
      const xAvg = (pts[i].x + pts[i + 1].x) / 2;
      theta += mAvg * dx;
      delta += mAvg * (L - xAvg) * dx;
    }
    return { pts, theta, delta };
  }, [L, cClamped, PSI, EI1, EI2]);

  const maxM = Math.max(1e-12, ...result.pts.map((p) => p.m));

  return (
    <>
      {/* ---------------- Setting Menu ---------------- */}
      <div className="panel">
        <h3>SETTING MENU</h3>
        <p style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.6, marginBottom: 14, background: 'var(--bg)', borderRadius: 10, padding: '12px 14px' }}>
          단면 2차모멘트가 한 값이 아니라(<b>Nonprismatic</b>) x=c 지점에서 I₁ → I₂로 바뀌는 캔틸레버예요. M/EI 다이어그램이 <b>c에서 불연속으로 꺾이고</b>, 구간을 나눠 적분해야 해요.
        </p>
        <div className="field">
          <label>스팬 길이 L (m)</label>
          <input type="number" defaultValue={fmtInput(L)} onBlur={(e) => setL(parseFloat(e.target.value))} />
        </div>
        <div className="field">
          <label>단면 전환 위치 c (m, 고정단으로부터)</label>
          <input type="range" min="0.1" max={Math.max(0.2, L - 0.1)} step="0.05" value={cClamped} onChange={(e) => setC(parseFloat(e.target.value))} style={{ width: '100%' }} />
          <div style={{ fontSize: 11, color: 'var(--gray-soft)', marginTop: 4 }}>c = {fmt(cClamped)} m</div>
        </div>
        <div className="field">
          <label>I₁ — [0, c] 구간 (×10⁶ mm⁴)</label>
          <input type="number" defaultValue={fmtInput(I1)} onBlur={(e) => setI1(parseFloat(e.target.value))} />
        </div>
        <div className="field">
          <label>I₂ — [c, L] 구간 (×10⁶ mm⁴)</label>
          <input type="number" defaultValue={fmtInput(I2)} onBlur={(e) => setI2(parseFloat(e.target.value))} />
        </div>
        <div className="field">
          <label>자유단 집중하중 P (kN)</label>
          <input type="number" defaultValue={fmtInput(P)} onBlur={(e) => setP(parseFloat(e.target.value))} />
        </div>
        <div className="field">
          <label>탄성계수 E (GPa)</label>
          <input type="number" defaultValue={fmtInput(E)} onBlur={(e) => setE(parseFloat(e.target.value))} />
        </div>
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="panel">
        <h3>
          VISUALIZER <span className="badge live" style={{ marginLeft: 6 }}>실시간</span>
        </h3>
        <NonprismaticSVG pts={result.pts} L={L} c={cClamped} maxM={maxM} />
        <div className="result-grid">
          <div className="result-card">
            <div className="l">θB (구간별 적분 합)</div>
            <div className="v">{result.theta.toExponential(3)} rad</div>
          </div>
          <div className="result-card">
            <div className="l">δB</div>
            <div className="v">{fmt(result.delta * 1000)} mm</div>
          </div>
        </div>
        <div className="steps">
          <FormulaSection title="구간별로 나눠 적분">
            <div className="step-formula">
              <Tip title="자유단으로부터 잰 굽힘모멘트">M(x)</Tip> = −P(L−x) (전 구간 동일, EI만 구간마다 다름)
            </div>
            <div className="step-row">θB = ∫₀ᶜ M/EI₁ dx + ∫ᶜᴸ M/EI₂ dx</div>
            <div className="step-row">δB = ∫₀ᶜ (M/EI₁)(L−x) dx + ∫ᶜᴸ (M/EI₂)(L−x) dx</div>
            <div className="step-final">I₂/I₁ = {fmt(I2 / I1)} → 단면이 클수록(I₂ 구간) M/EI 다이어그램이 낮아지는 게 보이시나요?</div>
          </FormulaSection>
        </div>
        <div className="ai-hint">💬 왜 단면이 큰 쪽에서 처짐 기여도가 작아지는지 궁금하다면, 오른쪽 AI 튜터에게 물어보세요.</div>
      </div>

      <AiTutorPanel />
    </>
  );
}

function NonprismaticSVG({ pts, L, c, maxM }) {
  const w = 620, h = 260;
  const padL = 50, padR = 40, padTop = 30, padBottom = 40;
  const drawW = w - padL - padR;
  const drawH = h - padTop - padBottom;

  const xToPx = (x) => padL + (x / L) * drawW;
  const mToPx = (m) => padTop + drawH - (m / maxM) * drawH;

  const areaPath =
    `M ${xToPx(0)} ${padTop + drawH} ` +
    pts.map((p) => `L ${xToPx(p.x).toFixed(2)} ${mToPx(p.m).toFixed(2)}`).join(' ') +
    ` L ${xToPx(L)} ${padTop + drawH} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 660, margin: '0 auto', display: 'block' }}>
      <line x1={padL} y1={padTop + drawH} x2={padL + drawW} y2={padTop + drawH} stroke="#8A97A2" strokeWidth="1.2" />
      <path d={areaPath} fill="#F7E3E6" stroke="#C3002F" strokeWidth="1.6" />
      <line x1={xToPx(c)} y1={padTop} x2={xToPx(c)} y2={padTop + drawH} stroke="#1E7F72" strokeWidth="1.4" strokeDasharray="5 4" />
      <text x={xToPx(c)} y={padTop - 8} fontSize="10.5" fill="#1E7F72" textAnchor="middle" fontWeight="800">c (단면 전환점)</text>
      <text x={padL} y={padTop + drawH + 20} fontSize="10.5" fill="#8A97A2">A (고정단)</text>
      <text x={padL + drawW} y={padTop + drawH + 20} fontSize="10.5" fill="#8A97A2" textAnchor="end">B (자유단)</text>
      <text x={padL + drawW / 2} y={h - 6} fontSize="10.5" fill="#8A97A2" textAnchor="middle">M/EI 다이어그램 (c에서 꺾임)</text>
    </svg>
  );
}
