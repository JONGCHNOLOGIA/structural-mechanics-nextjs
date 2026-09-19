'use client';

import { useMemo, useState } from 'react';
import { UNIT_OPTIONS, fmt } from '@/lib/calc/unitOptions';
import { computeCylindricalVessel } from '@/lib/calc/pressureVessels';
import FormulaSection, { Tip } from './FormulaSection';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import Frac from '@/components/Frac';
import FieldBlockCard from './FieldBlockCard';
import { Dim, DimLineH, DimLineV } from './EditableDim';
import VesselShell3D from './VesselShell3D';

// 프로토타입 renderCylindricalVessel() / cvBuildVisuals()를 React로 옮긴 버전.

export default function CylindricalVessel() {
  const [units, setUnits] = useState({ length: 'in', stress: 'psi' });
  const [r, setR] = useState(20 * 0.0254);
  const [t, setT] = useState(0.5 * 0.0254);
  const [p, setP] = useState(200 * 6894.757);
  const [theta, setTheta] = useState(0);
  const [activeField, setActiveField] = useState('r');

  const lenF = UNIT_OPTIONS.length[units.length];
  const stressF = UNIT_OPTIONS.stress[units.stress];
  const disp = (b, f) => b / f;

  const result = useMemo(() => (r && t ? computeCylindricalVessel(r, t, p, theta) : null), [r, t, p, theta]);

  return (
    <>
      {/* ---------------- Setting Menu ---------------- */}
      <div className="panel">
        <h3>SETTING MENU</h3>
        <EditableText
          contentKey="calc.CylindricalVessel.intro"
          defaultText="원통형 압력용기는 **원주방향(hoop) 응력이 길이방향의 2배**예요. 용접선이 축과 비스듬한 각도(θ)일 때 그 방향의 응력도 계산해요."
          style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.6, marginBottom: 14, background: 'var(--bg)', borderRadius: 0, padding: '12px 14px' }}
        />
        <FieldBlockCard
          title="용기 치수 · 압력 (r, t, p)"
          activeKey={activeField}
          onActiveChange={setActiveField}
          fields={[
            { key: 'r', label: '반지름 r', value: disp(r, lenF), unitType: 'length', unit: units.length },
            { key: 't', label: '두께 t', value: disp(t, lenF), unitType: 'length', unit: units.length },
            { key: 'p', label: '압력 p', value: disp(p, stressF), unitType: 'stress', unit: units.stress },
          ]}
          onUnitChange={(unitType, v) => setUnits((prev) => ({ ...prev, [unitType === 'stress' ? 'stress' : 'length']: v }))}
          onFieldChange={(key, value) => {
            const val = parseFloat(value);
            if (isNaN(val)) return;
            if (key === 'r') setR(val * lenF);
            else if (key === 't') setT(val * lenF);
            else if (key === 'p') setP(val * stressF);
          }}
        />
        <div className="field">
          <label>용접선 각도 θ (축 기준) — {theta.toFixed(0)}°</label>
          <input type="range" min="0" max="90" step="1" value={theta} onChange={(e) => setTheta(parseFloat(e.target.value))} style={{ width: '100%' }} />
        </div>
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="panel">
        <h3>
          VISUALIZER
        </h3>
        {result ? (
          <>
            {/* 3D — 구형과 같은 구성이되, 조각 위 화살표 길이가 방향마다 다르다.
                둘레 방향(hoop)이 길이 방향의 두 배라서 그렇고, 이게 구형과 갈리는 지점이다. */}
            <VesselShell3D shape="cylinder" hoopRatio={1} axialRatio={0.5} />
            <p style={{ fontSize: 11, color: 'var(--gray-soft)', textAlign: 'center', margin: '2px 0 10px', lineHeight: 1.6 }}>
              <span style={{ color: 'var(--crimson)', fontWeight: 800 }}>빨강</span> = 안에서 미는 압력 ·{' '}
              <span style={{ color: 'var(--teal)', fontWeight: 800 }}>청록</span> = 그걸 붙잡는 벽면 ·{' '}
              <span style={{ color: '#B0790A', fontWeight: 800 }}>노랑</span> = 떠낸 조각
              <br />
              구형과 달리 <b>둘레 방향 화살표가 길이 방향보다 깁니다</b> — 둘레를 붙잡는 힘이 두 배로 큽니다.
            </p>
            <CylindricalVesselSVG
              r={result}
              theta={theta}
              radius={disp(r, lenF)}
              thickness={disp(t, lenF)}
              lengthUnit={units.length}
              onEditRadius={(v) => setR(v * lenF)}
              onEditThickness={(v) => setT(v * lenF)}
            />
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
      <text x={cx} y={cy + s + 40} fontSize="13" fontWeight="800" fill={color} textAnchor="middle">
        {label}
      </text>
    </g>
  );
}

function CylindricalVesselSVG({ r, theta, radius, thickness, lengthUnit, onEditRadius, onEditThickness }) {
  return (
    <svg viewBox="0 0 620 260" style={{ width: '100%', maxWidth: 640, margin: '0 auto', display: 'block', overflow: 'visible' }}>
      <rect x="40" y="80" width="180" height="90" rx="45" fill="#F7E3E6" fillOpacity="0.4" stroke="#51626F" strokeWidth="1.6" />
      <text x="130" y="65" fontSize="13" fill="#8A97A2" textAnchor="middle">원통 (길이방향 = x)</text>

      {/* 치수 — 반지름 r은 중심선에서 벽까지, 두께 t는 벽 옆에 적는다.
          그림은 비율대로 그리지 않지만(모양만 보여주는 그림) 숫자는 실제 입력값이고, 클릭해서 고칠 수 있다. */}
      <DimLineV x={232} y1={80} y2={125} side="right" value={radius} unit={lengthUnit} prefix="r = " fontSize={11.5} boxW={58} onChange={onEditRadius} />
      <Dim x={130} y={178} value={thickness} unit={lengthUnit} prefix="t = " fontSize={11.5} boxW={58} onChange={onEditThickness} />
      <StressElement cx={150} cy={200} size={80} sx={r.sigma2} sy={r.sigma1} txy={0} rotateDeg={0} color="#51626F" label="θ=0° (원래 상태)" />
      <StressElement cx={460} cy={200} size={80} sx={r.sx1} sy={r.sy1} txy={r.tx1y1} rotateDeg={theta} color="#C3002F" label={`θ=${theta.toFixed(0)}° (용접선 방향)`} />
    </svg>
  );
}
