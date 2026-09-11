'use client';

import { useMemo, useState } from 'react';
import { UNIT_OPTIONS, fmt } from '@/lib/calc/unitOptions';
import { principalFromState } from '@/lib/calc/principalStress';

// 프로토타입 renderCombinedLoadings()를 React로 옮긴 버전.

export default function CombinedLoadings() {
  const [units] = useState({ stress: 'psi' });
  const [sigmaX, setSigmaX] = useState(8000 * 6894.757);
  const [sigmaY, setSigmaY] = useState(2000 * 6894.757);
  const [tauXY, setTauXY] = useState(3000 * 6894.757);

  const stressF = UNIT_OPTIONS.stress[units.stress];
  const disp = (b, f) => b / f;

  const r = useMemo(() => principalFromState(sigmaX, sigmaY, tauXY), [sigmaX, sigmaY, tauXY]);

  return (
    <div className="grid grid-cols-[320px_1fr_300px] gap-6 max-w-[1700px] mx-auto p-6">
      {/* ---------------- Setting Menu ---------------- */}
      <div className="bg-white border border-line rounded-2xl p-5">
        <h3 className="text-crimson text-xs font-extrabold mb-4">SETTING MENU</h3>
        <div className="text-xs text-gray bg-bg rounded-xl p-3 mb-4 leading-relaxed">
          <b className="text-ink">방법</b>: 축하중·굽힘·비틀림·압력 등 여러 하중이 겹치면, 각각의 응력식으로 따로 구한 다음 <b>한 점에서 σx, σy, τxy로 합쳐서</b> Plane Stress 방식으로 최종 정리해요.
          <div className="mt-2">
            <b>자주 쓰는 개별 공식</b>
            <div>· 축하중: σ = P/A</div>
            <div>· 굽힘: σ = My/I</div>
            <div>· 비틀림: τ = Tr/Ip</div>
            <div>· 전단력: τ = VQ/(Ib)</div>
            <div>· 압력용기: σ1=pr/t (원통 hoop), σ=pr/2t (구/원통 길이방향)</div>
          </div>
        </div>
        <p className="text-xs text-gray mb-3">아래에 그 점에서 <b>합쳐진 최종값</b>을 입력하세요.</p>
        <Field label="σx (합산값)">
          <input type="number" className="field-input" defaultValue={fmt(disp(sigmaX, stressF))} onBlur={(e) => setSigmaX(parseFloat(e.target.value) * stressF)} />
        </Field>
        <Field label="σy (합산값)">
          <input type="number" className="field-input" defaultValue={fmt(disp(sigmaY, stressF))} onBlur={(e) => setSigmaY(parseFloat(e.target.value) * stressF)} />
        </Field>
        <Field label="τxy (합산값)">
          <input type="number" className="field-input" defaultValue={fmt(disp(tauXY, stressF))} onBlur={(e) => setTauXY(parseFloat(e.target.value) * stressF)} />
        </Field>
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="bg-white border border-line rounded-2xl p-6">
        <h3 className="text-crimson text-xs font-extrabold mb-4">VISUALIZER</h3>
        <ElementSVG sx={sigmaX} sy={sigmaY} txy={tauXY} />
        <div className="mt-5 border border-line rounded-xl p-3 bg-bg text-xs text-gray leading-relaxed space-y-0.5">
          <div className="text-xs font-extrabold text-crimson mb-1.5">최종 주응력 · 최대전단</div>
          <p>σ1,2 = σave ± R &nbsp; τmax = R</p>
          <p className="font-extrabold">
            σ1 = {fmt(disp(r.sigma1, stressF))} {units.stress} &nbsp; σ2 = {fmt(disp(r.sigma2, stressF))} {units.stress} &nbsp; τmax = {fmt(disp(r.tauMax, stressF))} {units.stress}
          </p>
          <p>주응력 방향 θp = {r.thetaP.toFixed(1)}°</p>
          <p className="text-graySoft mt-2">💡 σ1, σ2 부호가 같으면(둘 다 인장 또는 둘 다 압축) 평면 밖 전단(σ/2)이 더 클 수 있어요 — 3축 응력 상태까지 고려해야 정확해요.</p>
        </div>
      </div>

      {/* ---------------- AI Tutor ---------------- */}
      <div className="bg-white border border-line rounded-2xl p-5 sticky top-6 self-start">
        <h3 className="text-crimson text-xs font-extrabold mb-4">
          AI TUTOR <span className="ml-2 text-[10px] bg-crimsonSoft text-crimson rounded-full px-2 py-0.5">준비중</span>
        </h3>
        <div className="text-sm text-gray bg-crimsonSoft rounded-xl p-3 mb-3">왜 평면 밖(out-of-plane) 전단까지 확인해야 하는지 궁금하다면, 다음 단계에서 연결될 AI 튜터에게 물어보세요.</div>
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

function ElementSVG({ sx, sy, txy }) {
  const cx = 150, cy = 100, s = 60, L = 34, color = '#51626F';
  const sxo = sx >= 0 ? 1 : -1;
  const syo = sy >= 0 ? -1 : 1;
  const to = txy >= 0 ? 1 : -1;
  const tl = 22;
  return (
    <svg viewBox="0 0 300 220" className="w-full max-w-[320px] mx-auto block">
      <rect x={cx - s} y={cy - s} width={s * 2} height={s * 2} fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1.5" />
      {svgArrow(cx + s, cy, cx + s + sxo * L, cy, color, 'c1')}
      {svgArrow(cx - s, cy, cx - s - sxo * L, cy, color, 'c2')}
      {svgArrow(cx, cy - s, cx, cy - s + syo * L, color, 'c3')}
      {svgArrow(cx, cy + s, cx, cy + s - syo * L, color, 'c4')}
      {svgArrow(cx + s, cy + tl * 0.4 * to, cx + s, cy - tl * 0.6 * to, color, 'c5')}
      {svgArrow(cx - s, cy - tl * 0.4 * to, cx - s, cy + tl * 0.6 * to, color, 'c6')}
      {svgArrow(cx - tl * 0.4 * to, cy - s, cx + tl * 0.6 * to, cy - s, color, 'c7')}
      {svgArrow(cx + tl * 0.4 * to, cy + s, cx - tl * 0.6 * to, cy + s, color, 'c8')}
      <text x={cx} y={cy + s + 40} fontSize="11" fontWeight="800" fill={color} textAnchor="middle">합쳐진 응력 상태</text>
    </svg>
  );
}
