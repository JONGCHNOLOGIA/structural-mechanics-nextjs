'use client';

import { useMemo, useState } from 'react';
import { UNIT_OPTIONS, fmt, fmtInput } from '@/lib/calc/unitOptions';
import { computePlaneStress } from '@/lib/calc/planeStress';
import FormulaSection, { Tip } from './FormulaSection';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import Frac from '@/components/Frac';

// 프로토타입 renderPlaneStress() / psBuildVisuals()를 React로 옮긴 버전.

export default function PlaneStress() {
  const [units] = useState({ stress: 'psi' });
  const [sigmaX, setSigmaX] = useState(10000 * 6894.757);
  const [sigmaY, setSigmaY] = useState(-4000 * 6894.757);
  const [tauXY, setTauXY] = useState(3000 * 6894.757);
  const [theta, setTheta] = useState(0);

  const stressF = UNIT_OPTIONS.stress[units.stress];
  const disp = (b, f) => b / f;

  const r = useMemo(() => computePlaneStress(sigmaX, sigmaY, tauXY, theta), [sigmaX, sigmaY, tauXY, theta]);

  return (
    <>
      {/* ---------------- Setting Menu ---------------- */}
      <div className="panel">
        <h3>SETTING MENU</h3>
        <EditableText
          contentKey="calc.PlaneStress.intro"
          defaultText="임의의 응력 상태(σx, σy, τxy)에서, 요소를 θ만큼 돌렸을 때 새로운 면에 나타나는 응력(σx1, σy1, τx1y1)을 구해요."
          style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.6, marginBottom: 16, background: 'var(--bg)', borderRadius: 10, padding: '12px 14px' }}
        />
        <div className="field">
          <label>σx</label>
          <input type="number" defaultValue={fmtInput(disp(sigmaX, stressF))} onBlur={(e) => setSigmaX(parseFloat(e.target.value) * stressF)} />
        </div>
        <div className="field">
          <label>σy</label>
          <input type="number" defaultValue={fmtInput(disp(sigmaY, stressF))} onBlur={(e) => setSigmaY(parseFloat(e.target.value) * stressF)} />
        </div>
        <div className="field">
          <label>τxy</label>
          <input type="number" defaultValue={fmtInput(disp(tauXY, stressF))} onBlur={(e) => setTauXY(parseFloat(e.target.value) * stressF)} />
        </div>
        <div className="field">
          <label>회전각 θ — {theta.toFixed(0)}°</label>
          <input type="range" min="-90" max="90" step="1" value={theta} onChange={(e) => setTheta(parseFloat(e.target.value))} style={{ width: '100%' }} />
        </div>
        <button className="add-block" onClick={() => setTheta(r.thetaPdeg)}>주응력 각도로 이동 (θp)</button>
        <button className="add-block" onClick={() => setTheta(r.thetaSdeg)}>최대전단 각도로 이동 (θs)</button>
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="panel">
        <h3>
          VISUALIZER <span className="badge live" style={{ marginLeft: 6 }}>실시간</span>
        </h3>
        <ElementsSVG sigmaX={sigmaX} sigmaY={sigmaY} tauXY={tauXY} theta={theta} r={r} stressF={stressF} unitStress={units.stress} />
        <div className="steps">
          <FormulaSection title="응력 변환식">
            <div className="step-formula">
              σx1 = <Frac num="σx+σy" den="2" /> + <Frac num="σx−σy" den="2" />·cos2θ + τxy·sin2θ
            </div>
            <div className="step-row">
              σy1 = <Frac num="σx+σy" den="2" /> − <Frac num="σx−σy" den="2" />·cos2θ − τxy·sin2θ
            </div>
            <div className="step-row">τx1y1 = −<Frac num="σx−σy" den="2" />·sin2θ + τxy·cos2θ</div>
            <div className="step-final">
              현재 θ={theta.toFixed(0)}°: σx1={fmt(disp(r.sx1, stressF))}, σy1={fmt(disp(r.sy1, stressF))}, τx1y1={fmt(disp(r.tx1y1, stressF))} {units.stress}
            </div>
          </FormulaSection>
          <FormulaSection title="주응력 (Principal Stresses)">
            <div className="step-formula">
              tan 2θp = <Frac num="2τxy" den="σx−σy" />
            </div>
            <div className="step-row">
              σave = <Frac num="σx+σy" den="2" /> = {fmt(disp(r.avg, stressF))} {units.stress}
            </div>
            <div className="step-row">
              R = √[(<Frac num="σx−σy" den="2" />)² + τxy²] = {fmt(disp(r.R, stressF))} {units.stress}
            </div>
            <div className="step-final">
              θp = {r.thetaPdeg.toFixed(1)}° &nbsp; σ1,2 = σave ± R = {fmt(disp(r.sigma1, stressF))}, {fmt(disp(r.sigma2, stressF))} {units.stress}
            </div>
          </FormulaSection>
          <FormulaSection title="최대전단응력 (Maximum Shear)">
            <div className="step-formula">τmax = R &nbsp; θs = θp − 45°</div>
            <div className="step-final">
              τmax = {fmt(disp(r.R, stressF))} {units.stress} &nbsp; θs = {r.thetaSdeg.toFixed(1)}° &nbsp; (이때 수직응력 = σave = {fmt(disp(r.avg, stressF))} {units.stress})
            </div>
          </FormulaSection>
        </div>
        <EditableText as="div" className="ai-hint" contentKey="calc.PlaneStress.aiHint" defaultText="💬 왜 주응력 방향에서는 전단응력이 0이 되는지 궁금하다면, 오른쪽 AI 튜터에게 물어보세요." />
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
  const s = size / 2, L = 34;
  const sxo = sx >= 0 ? 1 : -1;
  const syo = sy >= 0 ? -1 : 1;
  const to = txy >= 0 ? 1 : -1;
  const tl = 22;
  return (
    <g>
      <g transform={`rotate(${(-rotateDeg).toFixed(2)} ${cx} ${cy})`}>
        <rect x={cx - s} y={cy - s} width={size} height={size} fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1.5" />
        {svgArrow(cx + s, cy, cx + s + sxo * L, cy, color, 'a1')}
        {svgArrow(cx - s, cy, cx - s - sxo * L, cy, color, 'a2')}
        {svgArrow(cx, cy - s, cx, cy - s + syo * L, color, 'a3')}
        {svgArrow(cx, cy + s, cx, cy + s - syo * L, color, 'a4')}
        {svgArrow(cx + s, cy + tl * 0.4 * to, cx + s, cy - tl * 0.6 * to, color, 'a5')}
        {svgArrow(cx - s, cy - tl * 0.4 * to, cx - s, cy + tl * 0.6 * to, color, 'a6')}
        {svgArrow(cx - tl * 0.4 * to, cy - s, cx + tl * 0.6 * to, cy - s, color, 'a7')}
        {svgArrow(cx + tl * 0.4 * to, cy + s, cx - tl * 0.6 * to, cy + s, color, 'a8')}
      </g>
      <text x={cx} y={cy + s + 50} fontSize="11" fontWeight="800" fill={color} textAnchor="middle">
        {label}
      </text>
    </g>
  );
}

function ElementsSVG({ sigmaX, sigmaY, tauXY, theta, r, stressF, unitStress }) {
  const disp = (b, f) => b / f;
  const w = 620, h = 340;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 660, margin: '0 auto', display: 'block' }}>
      <StressElement cx={150} cy={150} size={130} sx={sigmaX} sy={sigmaY} txy={tauXY} rotateDeg={0} color="#51626F" label="θ = 0° (원래 상태)" />
      <StressElement cx={460} cy={150} size={130} sx={r.sx1} sy={r.sy1} txy={r.tx1y1} rotateDeg={theta} color="#C3002F" label={`θ = ${theta.toFixed(0)}° (회전된 상태)`} />
      <text x={150} y={290} fontSize="11" textAnchor="middle" fill="#51626F">
        σx={fmt(disp(sigmaX, stressF))} σy={fmt(disp(sigmaY, stressF))} τxy={fmt(disp(tauXY, stressF))} {unitStress}
      </text>
      <text x={460} y={290} fontSize="11" textAnchor="middle" fill="#C3002F">
        σx1={fmt(disp(r.sx1, stressF))} σy1={fmt(disp(r.sy1, stressF))} τx1y1={fmt(disp(r.tx1y1, stressF))} {unitStress}
      </text>
      <text x={w / 2} y={320} fontSize="10.5" textAnchor="middle" fill="#8A97A2">
        시계반대 방향 = (+) 각도
      </text>
    </svg>
  );
}
