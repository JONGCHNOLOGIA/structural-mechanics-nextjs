'use client';

import { useMemo, useState } from 'react';
import { UNIT_OPTIONS, fmt, fmtInput, fmtSci } from '@/lib/calc/unitOptions';
import { computeHookesLaw } from '@/lib/calc/hookesLaw';
import FormulaSection from './FormulaSection';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import Frac from '@/components/Frac';

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
    () => (E && nu !== null ? computeHookesLaw({ mode, E, nu, sigmaX, sigmaY, tauXY, epsX, epsY, gammaXY, thickness }) : null),
    [mode, E, nu, sigmaX, sigmaY, tauXY, epsX, epsY, gammaXY, thickness]
  );

  return (
    <>
      {/* ---------------- Setting Menu ---------------- */}
      <div className="panel">
        <h3>SETTING MENU</h3>
        <p style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.6, marginBottom: 14, background: 'var(--bg)', borderRadius: 10, padding: '12px 14px' }}>
          평면응력 상태에서 응력↔변형률을 서로 변환해요. 어느 쪽 값을 알고 있는지 선택하세요.
        </p>
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          <button className={'add-block' + (mode === 'stressToStrain' ? ' active' : '')} style={{ margin: 0 }} onClick={() => setMode('stressToStrain')}>
            응력 → 변형률
          </button>
          <button className={'add-block' + (mode === 'strainToStress' ? ' active' : '')} style={{ margin: 0 }} onClick={() => setMode('strainToStress')}>
            변형률 → 응력
          </button>
        </div>
        <div className="field">
          <label>탄성계수 E</label>
          <input type="number" defaultValue={fmtInput(disp(E, stressF))} onBlur={(e) => setE(parseFloat(e.target.value) * stressF)} />
        </div>
        <div className="field">
          <label>포아송비 ν</label>
          <input type="number" placeholder="0~0.5" defaultValue={nu} onBlur={(e) => setNu(parseFloat(e.target.value))} />
        </div>
        {mode === 'stressToStrain' ? (
          <>
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
          </>
        ) : (
          <>
            <div className="field">
              <label>εx</label>
              <input type="number" defaultValue={epsX} onBlur={(e) => setEpsX(parseFloat(e.target.value))} />
            </div>
            <div className="field">
              <label>εy</label>
              <input type="number" defaultValue={epsY} onBlur={(e) => setEpsY(parseFloat(e.target.value))} />
            </div>
            <div className="field">
              <label>γxy</label>
              <input type="number" defaultValue={gammaXY} onBlur={(e) => setGammaXY(parseFloat(e.target.value))} />
            </div>
          </>
        )}
        <div className="field">
          <label>두께 t (선택, Δt 계산용)</label>
          <input
            type="number"
            placeholder="값 입력"
            defaultValue={thickness === null ? '' : fmt(disp(thickness, lenF))}
            onBlur={(e) => setThickness(e.target.value === '' ? null : parseFloat(e.target.value) * lenF)}
          />
        </div>
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="panel">
        <h3>VISUALIZER</h3>
        {r ? (
          <>
            <ElementSVG sx={r.sx} sy={r.sy} txy={r.txy} />
            <div className="steps" style={{ marginTop: 12 }}>
              {mode === 'stressToStrain' ? (
                <FormulaSection title="응력 → 변형률">
                  <div className="step-formula">
                    εx = <Frac num="σx − ν·σy" den="E" /> &nbsp; εy = <Frac num="σy − ν·σx" den="E" /> &nbsp; γxy = <Frac num="τxy" den="G" />
                  </div>
                  <div className="step-row">
                    G = <Frac num="E" den="2(1+ν)" /> = {fmtSci(r.G)} Pa
                  </div>
                  <div className="step-final">
                    εx={r.ex.toExponential(3)} &nbsp; εy={r.ey.toExponential(3)} &nbsp; γxy={r.gxy.toExponential(3)}
                  </div>
                </FormulaSection>
              ) : (
                <FormulaSection title="변형률 → 응력">
                  <div className="step-formula">
                    σx = <Frac num="E" den="1−ν²" />·(εx + ν·εy) &nbsp; σy = <Frac num="E" den="1−ν²" />·(εy + ν·εx) &nbsp; τxy = G·γxy
                  </div>
                  <div className="step-final">
                    σx={fmt(disp(r.sx, stressF))} {units.stress} &nbsp; σy={fmt(disp(r.sy, stressF))} {units.stress} &nbsp; τxy={fmt(disp(r.txy, stressF))} {units.stress}
                  </div>
                </FormulaSection>
              )}
              <FormulaSection title="두께변형 · 체적변형 · 변형에너지">
                <div className="step-row">
                  εz (두께방향) = −(<Frac num="ν" den="E" />)(σx+σy) = {r.ez.toExponential(3)}
                </div>
                <div className="step-row">체적변형(dilatation) e = εx+εy+εz = {r.e.toExponential(3)}</div>
                <div className="step-row">변형에너지밀도 u = ½(σx·εx + σy·εy + τxy·γxy) = {fmtSci(r.u)} J/m³</div>
                {r.deltaT !== null ? (
                  <div className="step-final">두께 변화 Δt = εz × t = {fmtSci(r.deltaT)} m</div>
                ) : (
                  <div style={{ fontSize: 11, color: 'var(--gray-soft)' }}>두께(t)를 입력하면 Δt(두께 변화)도 계산돼요.</div>
                )}
              </FormulaSection>
            </div>
            <EditableText as="div" className="ai-hint" contentKey="calc.HookesLaw.aiHint" defaultText="💬 왜 εz가 σx, σy로만 결정되는지 궁금하다면, 오른쪽 AI 튜터에게 물어보세요." />
          </>
        ) : (
          <div className="viz-placeholder" style={{ minHeight: 300 }}>E와 ν를 입력하면 계산 결과가 나타납니다.</div>
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

function ElementSVG({ sx, sy, txy }) {
  const cx = 150, cy = 100, s = 60, L = 34, color = '#51626F';
  const sxo = sx >= 0 ? 1 : -1;
  const syo = sy >= 0 ? -1 : 1;
  const to = txy >= 0 ? 1 : -1;
  const tl = 22;
  return (
    <svg viewBox="0 0 300 220" style={{ width: '100%', maxWidth: 320, margin: '0 auto', display: 'block' }}>
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
