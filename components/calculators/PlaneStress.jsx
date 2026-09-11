'use client';

import { useMemo, useState } from 'react';
import { UNIT_OPTIONS, fmt } from '@/lib/calc/unitOptions';
import { computePlaneStress } from '@/lib/calc/planeStress';

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
    <div className="grid grid-cols-[300px_1fr_300px] gap-6 max-w-[1700px] mx-auto p-6">
      {/* ---------------- Setting Menu ---------------- */}
      <div className="bg-white border border-line rounded-2xl p-5">
        <h3 className="text-crimson text-xs font-extrabold mb-4">SETTING MENU</h3>
        <p className="text-xs text-gray bg-bg rounded-xl p-3 mb-4 leading-relaxed">
          임의의 응력 상태(σx, σy, τxy)에서, 요소를 θ만큼 돌렸을 때 새로운 면에 나타나는 응력(σx1, σy1, τx1y1)을 구해요.
        </p>
        <Field label="σx">
          <input type="number" className="field-input" defaultValue={fmt(disp(sigmaX, stressF))} onBlur={(e) => setSigmaX(parseFloat(e.target.value) * stressF)} />
        </Field>
        <Field label="σy">
          <input type="number" className="field-input" defaultValue={fmt(disp(sigmaY, stressF))} onBlur={(e) => setSigmaY(parseFloat(e.target.value) * stressF)} />
        </Field>
        <Field label="τxy">
          <input type="number" className="field-input" defaultValue={fmt(disp(tauXY, stressF))} onBlur={(e) => setTauXY(parseFloat(e.target.value) * stressF)} />
        </Field>
        <Field label={`회전각 θ — ${theta.toFixed(0)}°`}>
          <input type="range" min="-90" max="90" step="1" value={theta} onChange={(e) => setTheta(parseFloat(e.target.value))} className="w-full" />
        </Field>
        <button className="w-full py-2 mb-2 border border-line rounded-xl text-xs font-bold text-gray" onClick={() => setTheta(r.thetaPdeg)}>
          주응력 각도로 이동 (θp)
        </button>
        <button className="w-full py-2 border border-line rounded-xl text-xs font-bold text-gray" onClick={() => setTheta(r.thetaSdeg)}>
          최대전단 각도로 이동 (θs)
        </button>
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="bg-white border border-line rounded-2xl p-6">
        <h3 className="text-crimson text-xs font-extrabold mb-4">
          VISUALIZER <span className="ml-2 text-[10px] bg-tealSoft text-teal rounded-full px-2 py-0.5">실시간</span>
        </h3>
        <ElementsSVG sigmaX={sigmaX} sigmaY={sigmaY} tauXY={tauXY} theta={theta} r={r} stressF={stressF} unitStress={units.stress} />

        <div className="mt-5 space-y-4 text-sm">
          <Section title="응력 변환식">
            <p>σx1 = (σx+σy)/2 + (σx−σy)/2·cos2θ + τxy·sin2θ</p>
            <p>σy1 = (σx+σy)/2 − (σx−σy)/2·cos2θ − τxy·sin2θ</p>
            <p>τx1y1 = −(σx−σy)/2·sin2θ + τxy·cos2θ</p>
            <p className="font-extrabold mt-1">
              현재 θ={theta.toFixed(0)}°: σx1={fmt(disp(r.sx1, stressF))}, σy1={fmt(disp(r.sy1, stressF))}, τx1y1={fmt(disp(r.tx1y1, stressF))} {units.stress}
            </p>
          </Section>
          <Section title="주응력 (Principal Stresses)">
            <p>tan 2θp = 2τxy / (σx−σy)</p>
            <p>σave = (σx+σy)/2 = {fmt(disp(r.avg, stressF))} {units.stress}</p>
            <p>R = √[((σx−σy)/2)² + τxy²] = {fmt(disp(r.R, stressF))} {units.stress}</p>
            <p className="font-extrabold mt-1">
              θp = {r.thetaPdeg.toFixed(1)}° &nbsp; σ1,2 = σave ± R = {fmt(disp(r.sigma1, stressF))}, {fmt(disp(r.sigma2, stressF))} {units.stress}
            </p>
          </Section>
          <Section title="최대전단응력 (Maximum Shear)">
            <p>τmax = R &nbsp; θs = θp − 45°</p>
            <p className="font-extrabold mt-1">
              τmax = {fmt(disp(r.R, stressF))} {units.stress} &nbsp; θs = {r.thetaSdeg.toFixed(1)}° &nbsp; (이때 수직응력 = σave = {fmt(disp(r.avg, stressF))} {units.stress})
            </p>
          </Section>
        </div>
      </div>

      {/* ---------------- AI Tutor ---------------- */}
      <div className="bg-white border border-line rounded-2xl p-5 sticky top-6 self-start">
        <h3 className="text-crimson text-xs font-extrabold mb-4">
          AI TUTOR <span className="ml-2 text-[10px] bg-crimsonSoft text-crimson rounded-full px-2 py-0.5">준비중</span>
        </h3>
        <div className="text-sm text-gray bg-crimsonSoft rounded-xl p-3 mb-3">왜 주응력 방향에서는 전단응력이 0이 되는지 궁금하다면, 다음 단계에서 연결될 AI 튜터에게 물어보세요.</div>
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

function Section({ title, children }) {
  return (
    <div className="border border-line rounded-xl p-3 bg-bg">
      <div className="text-xs font-extrabold text-crimson mb-1.5">{title}</div>
      <div className="text-xs text-gray leading-relaxed space-y-0.5">{children}</div>
    </div>
  );
}

function svgArrow(x1, y1, x2, y2, color) {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const ah = 6;
  const ax1 = x2 - ah * Math.cos(ang - 0.4), ay1 = y2 - ah * Math.sin(ang - 0.4);
  const ax2 = x2 - ah * Math.cos(ang + 0.4), ay2 = y2 - ah * Math.sin(ang + 0.4);
  return (
    <g key={`${x1}-${y1}-${x2}-${y2}`}>
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
        {svgArrow(cx + s, cy, cx + s + sxo * L, cy, color)}
        {svgArrow(cx - s, cy, cx - s - sxo * L, cy, color)}
        {svgArrow(cx, cy - s, cx, cy - s + syo * L, color)}
        {svgArrow(cx, cy + s, cx, cy + s - syo * L, color)}
        {svgArrow(cx + s, cy + tl * 0.4 * to, cx + s, cy - tl * 0.6 * to, color)}
        {svgArrow(cx - s, cy - tl * 0.4 * to, cx - s, cy + tl * 0.6 * to, color)}
        {svgArrow(cx - tl * 0.4 * to, cy - s, cx + tl * 0.6 * to, cy - s, color)}
        {svgArrow(cx + tl * 0.4 * to, cy + s, cx - tl * 0.6 * to, cy + s, color)}
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
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-[660px] mx-auto block">
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
