'use client';

import { useMemo, useState } from 'react';
import { UNIT_OPTIONS, fmt, fmtSci } from '@/lib/calc/unitOptions';
import { computeHookesLaw } from '@/lib/calc/hookesLaw';

// 프로토타입 renderHookesLaw()를 React로 옮긴 버전.

export default function HookesLaw() {
  const [units] = useState({ stress: 'psi', length: 'in' });
  const [mode, setMode] = useState('stressToStrain');
  const [E, setE] = useState(30000 * 6894757);
  const [nu, setNu] = useState(0.3);
  const [sigmaX, setSigmaX] = useState(10000 * 6894.757);
  const [sigmaY, setSigmaY] = useState(-4000 * 6894.757);
  const [tauXY, setTauXY] = useState(3000 * 6894.757);
  const [epsX, setEpsX] = useState(0.001);
  const [epsY, setEpsY] = useState(-0.0003);
  const [gammaXY, setGammaXY] = useState(0.0005);
  const [thickness, setThickness] = useState(null);

  const stressF = UNIT_OPTIONS.stress[units.stress];
  const lenF = UNIT_OPTIONS.length[units.length];
  const disp = (b, f) => b / f;

  const r = useMemo(
    () =>
      E && nu !== null
        ? computeHookesLaw({ mode, E, nu, sigmaX, sigmaY, tauXY, epsX, epsY, gammaXY, thickness })
        : null,
    [mode, E, nu, sigmaX, sigmaY, tauXY, epsX, epsY, gammaXY, thickness]
  );

  return (
    <div className="grid grid-cols-[300px_1fr_300px] gap-6 max-w-[1700px] mx-auto p-6">
      {/* ---------------- Setting Menu ---------------- */}
      <div className="bg-white border border-line rounded-2xl p-5">
        <h3 className="text-crimson text-xs font-extrabold mb-4">SETTING MENU</h3>
        <p className="text-xs text-gray bg-bg rounded-xl p-3 mb-4 leading-relaxed">
          평면응력 상태에서 응력↔변형률을 서로 변환해요. 어느 쪽 값을 알고 있는지 선택하세요.
        </p>
        <div className="flex gap-2 mb-4">
          <button
            className={'flex-1 py-2 rounded-xl text-xs font-bold ' + (mode === 'stressToStrain' ? 'bg-crimson text-white' : 'border border-line text-gray')}
            onClick={() => setMode('stressToStrain')}
          >
            응력 → 변형률
          </button>
          <button
            className={'flex-1 py-2 rounded-xl text-xs font-bold ' + (mode === 'strainToStress' ? 'bg-crimson text-white' : 'border border-line text-gray')}
            onClick={() => setMode('strainToStress')}
          >
            변형률 → 응력
          </button>
        </div>
        <Field label="탄성계수 E">
          <input type="number" className="field-input" defaultValue={fmt(disp(E, stressF))} onBlur={(e) => setE(parseFloat(e.target.value) * stressF)} />
        </Field>
        <Field label="포아송비 ν (0~0.5)">
          <input type="number" className="field-input" defaultValue={nu} onBlur={(e) => setNu(parseFloat(e.target.value))} />
        </Field>
        {mode === 'stressToStrain' ? (
          <>
            <Field label="σx">
              <input type="number" className="field-input" defaultValue={fmt(disp(sigmaX, stressF))} onBlur={(e) => setSigmaX(parseFloat(e.target.value) * stressF)} />
            </Field>
            <Field label="σy">
              <input type="number" className="field-input" defaultValue={fmt(disp(sigmaY, stressF))} onBlur={(e) => setSigmaY(parseFloat(e.target.value) * stressF)} />
            </Field>
            <Field label="τxy">
              <input type="number" className="field-input" defaultValue={fmt(disp(tauXY, stressF))} onBlur={(e) => setTauXY(parseFloat(e.target.value) * stressF)} />
            </Field>
          </>
        ) : (
          <>
            <Field label="εx">
              <input type="number" className="field-input" defaultValue={epsX} onBlur={(e) => setEpsX(parseFloat(e.target.value))} />
            </Field>
            <Field label="εy">
              <input type="number" className="field-input" defaultValue={epsY} onBlur={(e) => setEpsY(parseFloat(e.target.value))} />
            </Field>
            <Field label="γxy">
              <input type="number" className="field-input" defaultValue={gammaXY} onBlur={(e) => setGammaXY(parseFloat(e.target.value))} />
            </Field>
          </>
        )}
        <Field label="두께 t (선택, Δt 계산용)">
          <input
            type="number"
            className="field-input"
            defaultValue={thickness === null ? '' : fmt(disp(thickness, lenF))}
            placeholder="값 입력"
            onBlur={(e) => setThickness(e.target.value === '' ? null : parseFloat(e.target.value) * lenF)}
          />
        </Field>
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="bg-white border border-line rounded-2xl p-6">
        <h3 className="text-crimson text-xs font-extrabold mb-4">VISUALIZER</h3>
        {r ? (
          <>
            <ElementSVG sx={r.sx} sy={r.sy} txy={r.txy} />
            <div className="mt-5 space-y-4 text-sm">
              {mode === 'stressToStrain' ? (
                <Section title="응력 → 변형률">
                  <p>εx = (σx − ν·σy)/E &nbsp; εy = (σy − ν·σx)/E &nbsp; γxy = τxy/G</p>
                  <p>G = E/(2(1+ν)) = {fmtSci(r.G)} Pa</p>
                  <p className="font-extrabold mt-1">
                    εx={r.ex.toExponential(3)} &nbsp; εy={r.ey.toExponential(3)} &nbsp; γxy={r.gxy.toExponential(3)}
                  </p>
                </Section>
              ) : (
                <Section title="변형률 → 응력">
                  <p>σx = E/(1−ν²)·(εx + ν·εy) &nbsp; σy = E/(1−ν²)·(εy + ν·εx) &nbsp; τxy = G·γxy</p>
                  <p className="font-extrabold mt-1">
                    σx={fmt(disp(r.sx, stressF))} {units.stress} &nbsp; σy={fmt(disp(r.sy, stressF))} {units.stress} &nbsp; τxy={fmt(disp(r.txy, stressF))} {units.stress}
                  </p>
                </Section>
              )}
              <Section title="두께변형 · 체적변형 · 변형에너지">
                <p>εz (두께방향) = −(ν/E)(σx+σy) = {r.ez.toExponential(3)}</p>
                <p>체적변형(dilatation) e = εx+εy+εz = {r.e.toExponential(3)}</p>
                <p>변형에너지밀도 u = ½(σx·εx + σy·εy + τxy·γxy) = {fmtSci(r.u)} J/m³</p>
                {r.deltaT !== null ? (
                  <p className="font-extrabold mt-1">두께 변화 Δt = εz × t = {fmtSci(r.deltaT)} m</p>
                ) : (
                  <p className="text-graySoft">두께(t)를 입력하면 Δt(두께 변화)도 계산돼요.</p>
                )}
              </Section>
            </div>
          </>
        ) : (
          <div className="text-graySoft text-sm border-2 border-dashed border-line rounded-xl p-16 text-center">E와 ν를 입력하면 계산 결과가 나타납니다.</div>
        )}
      </div>

      {/* ---------------- AI Tutor ---------------- */}
      <div className="bg-white border border-line rounded-2xl p-5 sticky top-6 self-start">
        <h3 className="text-crimson text-xs font-extrabold mb-4">
          AI TUTOR <span className="ml-2 text-[10px] bg-crimsonSoft text-crimson rounded-full px-2 py-0.5">준비중</span>
        </h3>
        <div className="text-sm text-gray bg-crimsonSoft rounded-xl p-3 mb-3">왜 εz가 σx, σy로만 결정되는지 궁금하다면, 다음 단계에서 연결될 AI 튜터에게 물어보세요.</div>
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
      {svgArrow(cx + s, cy, cx + s + sxo * L, cy, color, 'a1')}
      {svgArrow(cx - s, cy, cx - s - sxo * L, cy, color, 'a2')}
      {svgArrow(cx, cy - s, cx, cy - s + syo * L, color, 'a3')}
      {svgArrow(cx, cy + s, cx, cy + s - syo * L, color, 'a4')}
      {svgArrow(cx + s, cy + tl * 0.4 * to, cx + s, cy - tl * 0.6 * to, color, 'a5')}
      {svgArrow(cx - s, cy - tl * 0.4 * to, cx - s, cy + tl * 0.6 * to, color, 'a6')}
      {svgArrow(cx - tl * 0.4 * to, cy - s, cx + tl * 0.6 * to, cy - s, color, 'a7')}
      {svgArrow(cx + tl * 0.4 * to, cy + s, cx - tl * 0.6 * to, cy + s, color, 'a8')}
      <text x={cx} y={cy + s + 40} fontSize="11" fontWeight="800" fill={color} textAnchor="middle">현재 상태</text>
    </svg>
  );
}
