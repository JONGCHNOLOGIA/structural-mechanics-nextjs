'use client';

import { useMemo, useState } from 'react';
import { UNIT_OPTIONS, fmt, fmtInput } from '@/lib/calc/unitOptions';
import { computeMaxBeamStress } from '@/lib/calc/maxBeamStress';
import FormulaSection, { Tip } from './FormulaSection';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import Frac from '@/components/Frac';

// 프로토타입 renderMaxBeamStress() / mbBuildVisuals()를 React로 옮긴 버전.

export default function MaxBeamStress() {
  const [units, setUnits] = useState({ length: 'in', stress: 'psi', moment: 'kip·in', force: 'lb' });
  const [width, setWidth] = useState(4 * 0.0254);
  const [height, setHeight] = useState(8 * 0.0254);
  const [M, setM] = useState(60 * 112.9848);
  const [V, setV] = useState(2000 * 4.448222);
  const [y, setY] = useState(0);

  const lenF = UNIT_OPTIONS.length[units.length];
  const stressF = UNIT_OPTIONS.stress[units.stress];
  const momF = UNIT_OPTIONS.moment[units.moment];
  const forceF = UNIT_OPTIONS.force[units.force];
  const disp = (b, f) => b / f;

  const r = useMemo(() => (width && height ? computeMaxBeamStress(width, height, M, V, y) : null), [width, height, M, V, y]);

  return (
    <>
      {/* ---------------- Setting Menu ---------------- */}
      <div className="panel">
        <h3>SETTING MENU</h3>
        <EditableText
          contentKey="calc.MaxBeamStress.intro"
          defaultText="보 단면의 높이 방향 위치(y)에 따라 굽힘응력과 전단응력의 비율이 달라져요. 표면(y=±h/2)에선 전단이 0, 중립축(y=0)에선 굽힘응력이 0이에요."
          style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.6, marginBottom: 14, background: 'var(--bg)', borderRadius: 10, padding: '12px 14px' }}
        />
        <div className="field">
          <label>단위 (길이 / 응력)</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <select className="unit-inline" style={{ width: '100%' }} value={units.length} onChange={(e) => setUnits((p) => ({ ...p, length: e.target.value }))}>
              {Object.keys(UNIT_OPTIONS.length).map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
            <select className="unit-inline" style={{ width: '100%' }} value={units.stress} onChange={(e) => setUnits((p) => ({ ...p, stress: e.target.value }))}>
              {Object.keys(UNIT_OPTIONS.stress).map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="field">
          <label>단위 (모멘트 / 전단력)</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <select className="unit-inline" style={{ width: '100%' }} value={units.moment} onChange={(e) => setUnits((p) => ({ ...p, moment: e.target.value }))}>
              {Object.keys(UNIT_OPTIONS.moment).map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
            <select className="unit-inline" style={{ width: '100%' }} value={units.force} onChange={(e) => setUnits((p) => ({ ...p, force: e.target.value }))}>
              {Object.keys(UNIT_OPTIONS.force).map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="field">
          <label>Width (b) — {fmt(disp(width, lenF))} {units.length}</label>
          <input type="number" defaultValue={fmtInput(disp(width, lenF))} onBlur={(e) => setWidth(parseFloat(e.target.value) * lenF)} />
        </div>
        <div className="field">
          <label>Height (h) — {fmt(disp(height, lenF))} {units.length}</label>
          <input type="number" defaultValue={fmtInput(disp(height, lenF))} onBlur={(e) => setHeight(parseFloat(e.target.value) * lenF)} />
        </div>
        <div className="field">
          <label>Moment M — {fmt(disp(M, momF))} {units.moment}</label>
          <input type="number" defaultValue={fmtInput(disp(M, momF))} onBlur={(e) => setM(parseFloat(e.target.value) * momF)} />
        </div>
        <div className="field">
          <label>Shear V — {fmt(disp(V, forceF))} {units.force}</label>
          <input type="number" defaultValue={fmtInput(disp(V, forceF))} onBlur={(e) => setV(parseFloat(e.target.value) * forceF)} />
        </div>
        {width && height && (
          <div className="field">
            <label>단면 내 위치 y — {fmt(disp(y, lenF))} {units.length}</label>
            <input
              type="range"
              min={-disp(height, lenF) / 2}
              max={disp(height, lenF) / 2}
              step={disp(height, lenF) / 200}
              value={disp(y, lenF)}
              onChange={(e) => setY(parseFloat(e.target.value) * lenF)}
              style={{ width: '100%' }}
            />
          </div>
        )}
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="panel">
        <h3>
          VISUALIZER <span className="badge live" style={{ marginLeft: 6 }}>실시간</span>
        </h3>
        {r ? (
          <>
            <MaxBeamStressSVG width={width} height={height} y={y} r={r} />
            <div className="steps">
              <FormulaSection title="위치별 응력·주응력">
                <div className="step-formula">
                  <Tip title="굽힘응력">σx</Tip> = −<Frac num="My" den="I" /> &nbsp; <Tip title="전단응력">τ</Tip> = <Frac num="VQ" den="Ib" /> &nbsp; Q=<Frac num="b" den="2" />(<Frac num="h²" den="4" />−y²)
                </div>
                <div className="step-final">
                  σx = {fmt(disp(r.sigmaX, stressF))} {units.stress} &nbsp; τ = {fmt(disp(r.tau, stressF))} {units.stress}
                </div>
                <div className="step-row" style={{ marginTop: 8 }}>
                  σ1,2 = <Frac num="σx" den="2" /> ± √[(<Frac num="σx" den="2" />)²+τ²] = {fmt(disp(r.sigma1, stressF))},{' '}
                  {fmt(disp(r.sigma2, stressF))} {units.stress}
                </div>
                <div className="step-row">
                  τmax = {fmt(disp(r.tauMax, stressF))} {units.stress} &nbsp; 주응력 각도 θp = {r.thetaP.toFixed(1)}°
                </div>
              </FormulaSection>
            </div>
            <EditableText as="div" className="ai-hint" contentKey="calc.MaxBeamStress.aiHint" defaultText="💬 왜 표면과 중립축에서 응력 요소 모양이 저렇게 다른지 궁금하다면, 오른쪽 AI 튜터에게 물어보세요." />
          </>
        ) : (
          <div className="viz-placeholder" style={{ minHeight: 300 }}>폭과 높이를 입력하면 결과가 나타납니다.</div>
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

function StressElement({ cx, cy, size, sx, sy, txy, color, label }) {
  const s = size / 2, L = 30;
  const sxo = sx >= 0 ? 1 : -1;
  const syo = sy >= 0 ? -1 : 1;
  const to = txy >= 0 ? 1 : -1;
  const tl = 20;
  return (
    <g>
      <rect x={cx - s} y={cy - s} width={size} height={size} fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1.5" />
      {svgArrow(cx + s, cy, cx + s + sxo * L, cy, color, 'm1')}
      {svgArrow(cx - s, cy, cx - s - sxo * L, cy, color, 'm2')}
      {svgArrow(cx, cy - s, cx, cy - s + syo * L, color, 'm3')}
      {svgArrow(cx, cy + s, cx, cy + s - syo * L, color, 'm4')}
      {svgArrow(cx + s, cy + tl * 0.4 * to, cx + s, cy - tl * 0.6 * to, color, 'm5')}
      {svgArrow(cx - s, cy - tl * 0.4 * to, cx - s, cy + tl * 0.6 * to, color, 'm6')}
      {svgArrow(cx - tl * 0.4 * to, cy - s, cx + tl * 0.6 * to, cy - s, color, 'm7')}
      {svgArrow(cx + tl * 0.4 * to, cy + s, cx - tl * 0.6 * to, cy + s, color, 'm8')}
      <text x={cx} y={cy + s + 40} fontSize="13" fontWeight="800" fill={color} textAnchor="middle">
        {label}
      </text>
    </g>
  );
}

function MaxBeamStressSVG({ width, height, y, r }) {
  const scale = 180 / height;
  const hPx = height * scale, wPx = Math.min(80, width * scale);
  const cx = 110, cy = 140;
  const yPx = cy - (y / height) * hPx;
  return (
    <svg viewBox="0 0 460 300" style={{ width: '100%', maxWidth: 500, margin: '0 auto', display: 'block' }}>
      <rect x={cx - wPx / 2} y={cy - hPx / 2} width={wPx} height={hPx} fill="#F4F1E8" stroke="#51626F" strokeWidth="1.3" />
      <line x1={cx - wPx / 2 - 10} y1={cy} x2={cx + wPx / 2 + 10} y2={cy} stroke="#51626F" strokeWidth="1" strokeDasharray="4 3" />
      <circle cx={cx} cy={yPx} r="5" fill="#C3002F" />
      <text x={cx + wPx / 2 + 16} y={yPx + 4} fontSize="13" fill="#C3002F" fontWeight="800">현재 y</text>
      <text x={cx} y={cy - hPx / 2 - 12} fontSize="13" fill="#8A97A2" textAnchor="middle">단면 (y 위치 표시)</text>
      <StressElement cx={330} cy={140} size={100} sx={r.sigmaX} sy={0} txy={r.tau} color="#1E7F72" label="현재 y에서의 응력 요소" />
    </svg>
  );
}
