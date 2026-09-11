'use client';

import { useMemo, useState } from 'react';
import { UNIT_OPTIONS, fmt } from '@/lib/calc/unitOptions';
import { computeCylindricalVessel } from '@/lib/calc/pressureVessels';

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
    <div className="grid grid-cols-[300px_1fr_300px] gap-6 max-w-[1700px] mx-auto p-6">
      {/* ---------------- Setting Menu ---------------- */}
      <div className="bg-white border border-line rounded-2xl p-5">
        <h3 className="text-crimson text-xs font-extrabold mb-4">SETTING MENU</h3>
        <p className="text-xs text-gray bg-bg rounded-xl p-3 mb-4 leading-relaxed">
          원통형 압력용기는 <b>원주방향(hoop) 응력이 길이방향의 2배</b>예요. 용접선이 축과 비스듬한 각도(θ)일 때 그 방향의 응력도 계산해요.
        </p>
        <Field label="내부 반지름 r">
          <input type="number" className="field-input" defaultValue={fmt(disp(r, lenF))} onBlur={(e) => setR(parseFloat(e.target.value) * lenF)} />
        </Field>
        <Field label="두께 t">
          <input type="number" className="field-input" defaultValue={fmt(disp(t, lenF))} onBlur={(e) => setT(parseFloat(e.target.value) * lenF)} />
        </Field>
        <Field label="내부압력 p">
          <input type="number" className="field-input" defaultValue={fmt(disp(p, stressF))} onBlur={(e) => setP(parseFloat(e.target.value) * stressF)} />
        </Field>
        <Field label={`용접선 각도 θ (축 기준) — ${theta.toFixed(0)}°`}>
          <input type="range" min="0" max="90" step="1" value={theta} onChange={(e) => setTheta(parseFloat(e.target.value))} className="w-full" />
        </Field>
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="bg-white border border-line rounded-2xl p-6">
        <h3 className="text-crimson text-xs font-extrabold mb-4">
          VISUALIZER <span className="ml-2 text-[10px] bg-tealSoft text-teal rounded-full px-2 py-0.5">실시간</span>
        </h3>
        {result ? (
          <>
            <CylindricalVesselSVG r={result} theta={theta} />
            <div className="mt-5 border border-line rounded-xl p-3 bg-bg text-xs text-gray leading-relaxed space-y-0.5">
              <div className="text-xs font-extrabold text-crimson mb-1.5">원통형 압력용기 응력</div>
              <p>σ1 = pr/t (원주응력) &nbsp; σ2 = pr/2t (길이방향응력)</p>
              <p className="font-extrabold">
                σ1 = {fmt(disp(result.sigma1, stressF))} {units.stress} &nbsp; σ2 = {fmt(disp(result.sigma2, stressF))} {units.stress} &nbsp; (σ1 = 2σ2)
              </p>
              <p className="mt-2">외부 표면: τmax = σ1/2 = {fmt(disp(result.tauOuter, stressF))} {units.stress}</p>
              <p>내부 표면: τmax = σ1/2 + p/2 = {fmt(disp(result.tauInner, stressF))} {units.stress}</p>
              <p className="font-extrabold mt-2">
                θ={theta.toFixed(0)}°에서: σx1={fmt(disp(result.sx1, stressF))}, σy1={fmt(disp(result.sy1, stressF))}, τx1y1={fmt(disp(result.tx1y1, stressF))} {units.stress}
              </p>
            </div>
          </>
        ) : (
          <div className="text-graySoft text-sm border-2 border-dashed border-line rounded-xl p-16 text-center">r, t를 입력하면 결과가 나타납니다.</div>
        )}
      </div>

      {/* ---------------- AI Tutor ---------------- */}
      <div className="bg-white border border-line rounded-2xl p-5 sticky top-6 self-start">
        <h3 className="text-crimson text-xs font-extrabold mb-4">
          AI TUTOR <span className="ml-2 text-[10px] bg-crimsonSoft text-crimson rounded-full px-2 py-0.5">준비중</span>
        </h3>
        <div className="text-sm text-gray bg-crimsonSoft rounded-xl p-3 mb-3">왜 용접선이 이 각도로 설계되는 경우가 많은지 궁금하다면, 다음 단계에서 연결될 AI 튜터에게 물어보세요.</div>
        <input className="field-input mb-2" placeholder="질문을 입력하세요" disabled />
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="mb-3">
      <label className="block text-xs text-gray font-bold mb-1">{label}</label>
      {children}
    </div>
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
    <svg viewBox="0 0 620 260" className="w-full max-w-[640px] mx-auto block">
      <rect x="40" y="80" width="180" height="90" rx="45" fill="#F7E3E6" fillOpacity="0.4" stroke="#51626F" strokeWidth="1.6" />
      <text x="130" y="65" fontSize="11" fill="#8A97A2" textAnchor="middle">원통 (길이방향 = x)</text>
      <StressElement cx={150} cy={200} size={80} sx={r.sigma2} sy={r.sigma1} txy={0} rotateDeg={0} color="#51626F" label="θ=0° (원래 상태)" />
      <StressElement cx={460} cy={200} size={80} sx={r.sx1} sy={r.sy1} txy={r.tx1y1} rotateDeg={theta} color="#C3002F" label={`θ=${theta.toFixed(0)}° (용접선 방향)`} />
    </svg>
  );
}
