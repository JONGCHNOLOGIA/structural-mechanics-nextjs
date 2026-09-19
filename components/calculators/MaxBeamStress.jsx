'use client';

import { useMemo, useState } from 'react';
import { UNIT_OPTIONS, fmt } from '@/lib/calc/unitOptions';
import { computeMaxBeamStress } from '@/lib/calc/maxBeamStress';
import FormulaSection, { Tip } from './FormulaSection';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import Frac from '@/components/Frac';
import FieldBlockCard from './FieldBlockCard';
import { Dim, DimLineH, DimLineV } from './EditableDim';

// 프로토타입 renderMaxBeamStress() / mbBuildVisuals()를 React로 옮긴 버전.

export default function MaxBeamStress() {
  const [units, setUnits] = useState({ length: 'in', stress: 'psi', moment: 'kip·in', force: 'lb' });
  const [width, setWidth] = useState(4 * 0.0254);
  const [height, setHeight] = useState(8 * 0.0254);
  const [M, setM] = useState(60 * 112.9848);
  const [V, setV] = useState(2000 * 4.448222);
  const [y, setY] = useState(0);
  const [activeField, setActiveField] = useState('width');

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
          style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.6, marginBottom: 14, background: 'var(--bg)', borderRadius: 0, padding: '12px 14px' }}
        />
        <FieldBlockCard
          title="단면 · 하중 (Width, Height, M, V)"
          activeKey={activeField}
          onActiveChange={setActiveField}
          fields={[
            { key: 'width', label: 'Width', value: disp(width, lenF), unitType: 'length', unit: units.length },
            { key: 'height', label: 'Height', value: disp(height, lenF), unitType: 'length', unit: units.length },
            { key: 'M', label: 'Moment M', value: disp(M, momF), unitType: 'moment', unit: units.moment },
            { key: 'V', label: 'Shear V', value: disp(V, forceF), unitType: 'force', unit: units.force },
          ]}
          onUnitChange={(unitType, v) => setUnits((prev) => ({ ...prev, [unitType]: v }))}
          onFieldChange={(key, value) => {
            const val = parseFloat(value);
            if (isNaN(val)) return;
            if (key === 'width') setWidth(val * lenF);
            else if (key === 'height') setHeight(val * lenF);
            else if (key === 'M') setM(val * momF);
            else if (key === 'V') setV(val * forceF);
          }}
        />
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
          VISUALIZER
        </h3>
        {r ? (
          <>
            <MaxBeamStressSVG
              width={width}
              height={height}
              y={y}
              r={r}
              lenUnit={units.length}
              lenF={lenF}
              onEditWidth={(v) => setWidth(v * lenF)}
              onEditHeight={(v) => setHeight(v * lenF)}
              onEditY={(v) => setY(v * lenF)}
            />
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

function MaxBeamStressSVG({ width, height, y, r, lenUnit, lenF, onEditWidth, onEditHeight, onEditY }) {
  const scale = 180 / height;
  const hPx = height * scale, wPx = Math.min(80, width * scale);
  // 치수선을 왼쪽에 그을 자리를 두려고 단면을 오른쪽으로 조금 옮겼다(원래 cx=110).
  const cx = 130, cy = 140;
  const yPx = cy - (y / height) * hPx;
  return (
    <svg viewBox="0 0 460 320" style={{ width: '100%', maxWidth: 500, margin: '0 auto', display: 'block', overflow: 'visible' }}>
      <rect x={cx - wPx / 2} y={cy - hPx / 2} width={wPx} height={hPx} fill="#F4F1E8" stroke="#51626F" strokeWidth="1.3" />
      <line x1={cx - wPx / 2 - 10} y1={cy} x2={cx + wPx / 2 + 10} y2={cy} stroke="#51626F" strokeWidth="1" strokeDasharray="4 3" />
      <circle cx={cx} cy={yPx} r="5" fill="#C3002F" />
      <text x={cx + wPx / 2 + 16} y={yPx - 8} fontSize="13" fill="#C3002F" fontWeight="800">현재 y</text>
      {/* 중립축에서 현재 지점까지의 거리 y도 치수로 적어두고 클릭해서 고칠 수 있게 한다 */}
      <Dim
        x={cx + wPx / 2 + 16}
        y={yPx + 7}
        anchor="start"
        color="#C3002F"
        fontSize={12}
        value={y / lenF}
        unit={lenUnit}
        boxW={62}
        min={null}
        onChange={onEditY}
      />
      <text x={cx} y={cy - hPx / 2 - 12} fontSize="13" fill="#8A97A2" textAnchor="middle">단면 (y 위치 표시)</text>

      {/* 단면 치수 — 클릭하면 그 자리에서 값 수정 */}
      <DimLineV
        x={cx - wPx / 2 - 18}
        y1={cy - hPx / 2}
        y2={cy + hPx / 2}
        fontSize={12}
        value={height / lenF}
        unit={lenUnit}
        boxW={62}
        onChange={onEditHeight}
      />
      <DimLineH
        x1={cx - wPx / 2}
        x2={cx + wPx / 2}
        y={cy + hPx / 2 + 14}
        labelDy={15}
        fontSize={12}
        value={width / lenF}
        unit={lenUnit}
        boxW={62}
        onChange={onEditWidth}
      />
      <StressElement cx={330} cy={140} size={100} sx={r.sigmaX} sy={0} txy={r.tau} color="#1E7F72" label="현재 y에서의 응력 요소" />
    </svg>
  );
}
