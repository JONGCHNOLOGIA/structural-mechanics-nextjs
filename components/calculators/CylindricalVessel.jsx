'use client';

import { useMemo, useState } from 'react';
import { UNIT_OPTIONS, fmt, fmtInput } from '@/lib/calc/unitOptions';
import { computeCylindricalVessel } from '@/lib/calc/pressureVessels';
import FormulaSection, { Tip } from './FormulaSection';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import Frac from '@/components/Frac';

// 프로토타입 renderCylindricalVessel() / cvBuildVisuals()를 React로 옮긴 버전.

export default function CylindricalVessel() {
  const [units] = useState({ length: 'in', stress: 'psi' });
  const [r, setR] = useState(20 * 0.0254);
  const [t, setT] = useState(0.5 * 0.0254);
  const [p, setP] = useState(200 * 6894.757);
  const [theta, setTheta] = useState(0);

  const lenF = UNIT_OPTIONS.length[units.length];
  const stressF = UNIT_OPTIONS.stress[units.stress];
  const disp = (b, f) => b / f;

  const result = useMemo(() => (r && t ? computeCylindricalVessel(r, t, p, theta) : null), [r, t, p, theta]);

  return (
    <>
      {/* ---------------- Setting Menu ---------------- */}
      <div className="panel">
        <h3>SETTING MENU</h3>
        <p style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.6, marginBottom: 14, background: 'var(--bg)', borderRadius: 10, padding: '12px 14px' }}>
          원통형 압력용기는 <b>원주방향(hoop) 응력이 길이방향의 2배</b>예요. 용접선이 축과 비스듬한 각도(θ)일 때 그 방향의 응력도 계산해요.
        </p>
        <div className="field">
          <label>내부 반지름 r</label>
          <input type="number" defaultValue={fmtInput(disp(r, lenF))} onBlur={(e) => setR(parseFloat(e.target.value) * lenF)} />
        </div>
        <div className="field">
          <label>두께 t</label>
          <input type="number" defaultValue={fmtInput(disp(t, lenF))} onBlur={(e) => setT(parseFloat(e.target.value) * lenF)} />
        </div>
        <div className="field">
          <label>내부압력 p</label>
          <input type="number" defaultValue={fmtInput(disp(p, stressF))} onBlur={(e) => setP(parseFloat(e.target.value) * stressF)} />
        </div>
        <div className="field">
          <label>용접선 각도 θ (축 기준) — {theta.toFixed(0)}°</label>
          <input type="range" min="0" max="90" step="1" value={theta} onChange={(e) => setTheta(parseFloat(e.target.value))} style={{ width: '100%' }} />
        </div>
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="panel">
        <h3>
          VISUALIZER <span className="badge live" style={{ marginLeft: 6 }}>실시간</span>
        </h3>
        {result ? (
          <>
            <CylindricalVesselSVG r={result} theta={theta} />
            <div className="steps">
              <FormulaSection title="원통형 압력용기 응력">
                <div className="step-formula">
                  <Tip title="원주(hoop)응력">σ1</Tip> = <Frac num="pr" den="t" /> &nbsp; <Tip title="길이방향응력">σ2</Tip> = <Frac num="pr" den="2t" />
                </div>
                <div className="step-final">
                  σ1 = {fmt(disp(result.sigma1, stressF))} {units.stress} &nbsp; σ2 = {fmt(disp(result.sigma2, stressF))} {units.stress} &nbsp; (σ1 = 2σ2)
                </div>
                <div className="step-row" style={{ marginTop: 8 }}>
                  외부 표면: τmax = <Frac num="σ1" den="2" /> = {fmt(disp(result.tauOuter, stressF))} {units.stress}
                </div>
                <div className="step-row">
                  내부 표면: τmax = <Frac num="σ1" den="2" /> + <Frac num="p" den="2" /> = {fmt(disp(result.tauInner, stressF))} {units.stress}
                </div>
                <div className="step-final" style={{ marginTop: 8 }}>
                  θ={theta.toFixed(0)}°에서: σx1={fmt(disp(result.sx1, stressF))}, σy1={fmt(disp(result.sy1, stressF))}, τx1y1={fmt(disp(result.tx1y1, stressF))} {units.stress}
                </div>
              </FormulaSection>
            </div>
            <EditableText as="div" className="ai-hint" contentKey="calc.CylindricalVessel.aiHint" defaultText="💬 왜 용접선이 이 각도로 설계되는 경우가 많은지 궁금하다면, 오른쪽 AI 튜터에게 물어보세요." />
          </>
        ) : (
          <div className="viz-placeholder" style={{ minHeight: 300 }}>r, t를 입력하면 결과가 나타납니다.</div>
        )}
      </div>

      <AiTutorPanel />
    </>
  );
}

function svgArrow(x1, y1, x2, y2, color, key) {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const ah = 6;
  const ax1 = x2 - ah * Math.cos(ang - 0.4), ay1 = y2 - ah * Math.sin(ang - 0.4);
  const ax2 = x2 - ah * Math.cos(ang + 0.4), ay2 = y2 - ah * Math.sin(ang + 0.4);
  return (
    <g key={key}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="1.8" />
      <polygon points={`${x2},${y2} ${ax1},${ay1} ${ax2},${ay2}`} fill={color} />
    </g>
  );
}

function StressElement({ cx, cy, size, sx, sy, txy, rotateDeg, color, label }) {
  const s = size / 2, L = 30;
  const sxo = sx >= 0 ? 1 : -1;
  const syo = sy >= 0 ? -1 : 1;
  const to = txy >= 0 ? 1 : -1;
  const tl = 20;
  return (
    <g>
      <g transform={`rotate(${(-rotateDeg).toFixed(2)} ${cx} ${cy})`}>
        <rect x={cx - s} y={cy - s} width={size} height={size} fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1.5" />
        {svgArrow(cx + s, cy, cx + s + sxo * L, cy, color, 'e1')}
        {svgArrow(cx - s, cy, cx - s - sxo * L, cy, color, 'e2')}
        {svgArrow(cx, cy - s, cx, cy - s + syo * L, color, 'e3')}
        {svgArrow(cx, cy + s, cx, cy + s - syo * L, color, 'e4')}
        {svgArrow(cx + s, cy + tl * 0.4 * to, cx + s, cy - tl * 0.6 * to, color, 'e5')}
        {svgArrow(cx - s, cy - tl * 0.4 * to, cx - s, cy + tl * 0.6 * to, color, 'e6')}
        {svgArrow(cx - tl * 0.4 * to, cy - s, cx + tl * 0.6 * to, cy - s, color, 'e7')}
        {svgArrow(cx + tl * 0.4 * to, cy + s, cx - tl * 0.6 * to, cy + s, color, 'e8')}
      </g>
      <text x={cx} y={cy + s + 40} fontSize="11" fontWeight="800" fill={color} textAnchor="middle">
        {label}
      </text>
    </g>
  );
}

function CylindricalVesselSVG({ r, theta }) {
  return (
    <svg viewBox="0 0 620 260" style={{ width: '100%', maxWidth: 640, margin: '0 auto', display: 'block' }}>
      <rect x="40" y="80" width="180" height="90" rx="45" fill="#F7E3E6" fillOpacity="0.4" stroke="#51626F" strokeWidth="1.6" />
      <text x="130" y="65" fontSize="11" fill="#8A97A2" textAnchor="middle">원통 (길이방향 = x)</text>
      <StressElement cx={150} cy={200} size={80} sx={r.sigma2} sy={r.sigma1} txy={0} rotateDeg={0} color="#51626F" label="θ=0° (원래 상태)" />
      <StressElement cx={460} cy={200} size={80} sx={r.sx1} sy={r.sy1} txy={r.tx1y1} rotateDeg={theta} color="#C3002F" label={`θ=${theta.toFixed(0)}° (용접선 방향)`} />
    </svg>
  );
}
