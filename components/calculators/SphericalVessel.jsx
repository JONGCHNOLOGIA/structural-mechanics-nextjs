'use client';

import { useMemo, useState } from 'react';
import { UNIT_OPTIONS, fmt } from '@/lib/calc/unitOptions';
import { computeSphericalVessel } from '@/lib/calc/pressureVessels';

// 프로토타입 renderSphericalVessel() / svBuildVisuals()를 React로 옮긴 버전.

export default function SphericalVessel() {
  const [units] = useState({ length: 'in', stress: 'psi' });
  const [r, setR] = useState(20 * 0.0254);
  const [t, setT] = useState(0.5 * 0.0254);
  const [p, setP] = useState(200 * 6894.757);
  const [E, setE] = useState(null);
  const [nu, setNu] = useState(null);

  const lenF = UNIT_OPTIONS.length[units.length];
  const stressF = UNIT_OPTIONS.stress[units.stress];
  const disp = (b, f) => b / f;

  const result = useMemo(() => (r && t ? computeSphericalVessel(r, t, p, E, nu) : null), [r, t, p, E, nu]);

  return (
    <div className="grid grid-cols-[300px_1fr_300px] gap-6 max-w-[1700px] mx-auto p-6">
      {/* ---------------- Setting Menu ---------------- */}
      <div className="bg-white border border-line rounded-2xl p-5">
        <h3 className="text-crimson text-xs font-extrabold mb-4">SETTING MENU</h3>
        <p className="text-xs text-gray bg-bg rounded-xl p-3 mb-4 leading-relaxed">
          구형 압력용기는 벽 두께가 반지름보다 훨씬 얇을 때(r/t≫1), 벽면에 <b>모든 방향으로 같은 크기의 인장응력</b>이 생겨요.
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
        <Field label="E (변형률 계산용, 선택)">
          <input type="number" className="field-input" placeholder="값 입력" defaultValue={E === null ? '' : fmt(disp(E, stressF))} onBlur={(e) => setE(e.target.value === '' ? null : parseFloat(e.target.value) * stressF)} />
        </Field>
        <Field label="ν (선택)">
          <input type="number" className="field-input" placeholder="0~0.5" defaultValue={nu === null ? '' : nu} onBlur={(e) => setNu(e.target.value === '' ? null : parseFloat(e.target.value))} />
        </Field>
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="bg-white border border-line rounded-2xl p-6">
        <h3 className="text-crimson text-xs font-extrabold mb-4">
          VISUALIZER <span className="ml-2 text-[10px] bg-tealSoft text-teal rounded-full px-2 py-0.5">실시간</span>
        </h3>
        {result ? (
          <>
            <SphericalVesselSVG sigma={result.sigma} />
            <div className="mt-5 border border-line rounded-xl p-3 bg-bg text-xs text-gray leading-relaxed space-y-0.5">
              <div className="text-xs font-extrabold text-crimson mb-1.5">구형 압력용기 응력</div>
              <p>σ = pr/2t (벽면 응력, 모든 방향 동일)</p>
              <p className="font-extrabold">σ1=σ2 = {fmt(disp(result.sigma, stressF))} {units.stress}</p>
              <p className="mt-2">외부 표면: τmax = σ/2 = {fmt(disp(result.tauOuter, stressF))} {units.stress}</p>
              <p>
                내부 표면: τmax = (σ+p)/2 = {fmt(disp(result.tauInner, stressF))} {units.stress}{' '}
                <span className="text-graySoft">(r/t≫1이면 외부와 거의 같음)</span>
              </p>
              {result.eps !== null && <p className="font-extrabold mt-2">변형률 ε = σ(1−ν)/E = {result.eps.toExponential(3)}</p>}
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
        <div className="text-sm text-gray bg-crimsonSoft rounded-xl p-3 mb-3">왜 구형 용기가 원통형보다 응력이 낮은지 궁금하다면, 다음 단계에서 연결될 AI 튜터에게 물어보세요.</div>
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

function SphericalVesselSVG({ sigma }) {
  const arrows = [];
  for (let a = 0; a < 360; a += 30) {
    const rad = (a * Math.PI) / 180;
    const x1 = 120 + 95 * Math.cos(rad), y1 = 120 + 95 * Math.sin(rad);
    const x2 = 120 + 70 * Math.cos(rad), y2 = 120 + 70 * Math.sin(rad);
    arrows.push(svgArrow(x1, y1, x2, y2, '#C3002F', a));
  }
  const s = 45, L = 30, cx = 320, cy = 120, color = '#1E7F72';
  const sxo = sigma >= 0 ? 1 : -1;
  return (
    <svg viewBox="0 0 420 260" className="w-full max-w-[440px] mx-auto block">
      <circle cx="120" cy="120" r="85" fill="#F7E3E6" fillOpacity="0.4" stroke="#51626F" strokeWidth="1.6" />
      {arrows}
      <text x="120" y="225" fontSize="11" fill="#8A97A2" textAnchor="middle">내부압력 p</text>

      <rect x={cx - s} y={cy - s} width={s * 2} height={s * 2} fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1.5" />
      {svgArrow(cx + s, cy, cx + s + sxo * L, cy, color, 'sv1')}
      {svgArrow(cx - s, cy, cx - s - sxo * L, cy, color, 'sv2')}
      {svgArrow(cx, cy - s, cx, cy - s - sxo * L, color, 'sv3')}
      {svgArrow(cx, cy + s, cx, cy + s + sxo * L, color, 'sv4')}
      <text x={cx} y={cy + s + 40} fontSize="11" fontWeight="800" fill={color} textAnchor="middle">벽면 요소 (등이축 인장)</text>
    </svg>
  );
}
