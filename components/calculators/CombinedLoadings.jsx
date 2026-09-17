'use client';

import { useMemo, useState } from 'react';
import { UNIT_OPTIONS, fmt } from '@/lib/calc/unitOptions';
import { principalFromState } from '@/lib/calc/principalStress';
import FormulaSection from './FormulaSection';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import Frac from '@/components/Frac';
import StressStateCard from './StressStateCard';

// 프로토타입 renderCombinedLoadings()를 React로 옮긴 버전.

export default function CombinedLoadings() {
  const [units, setUnits] = useState({ stress: 'psi' });
  const [sigmaX, setSigmaX] = useState(8000 * 6894.757);
  const [sigmaY, setSigmaY] = useState(2000 * 6894.757);
  const [tauXY, setTauXY] = useState(3000 * 6894.757);

  const stressF = UNIT_OPTIONS.stress[units.stress];
  const disp = (b, f) => b / f;

  const r = useMemo(() => principalFromState(sigmaX, sigmaY, tauXY), [sigmaX, sigmaY, tauXY]);

  return (
    <>
      {/* ---------------- Setting Menu ---------------- */}
      <div className="panel">
        <h3>SETTING MENU</h3>
        <div style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.7, marginBottom: 14, background: 'var(--bg)', borderRadius: 0, padding: '12px 14px' }}>
          <EditableText
            as="span"
            contentKey="calc.CombinedLoadings.intro"
            defaultText="**방법**: 축하중·굽힘·비틀림·압력 등 여러 하중이 겹치면, 각각의 응력식으로 따로 구한 다음 **한 점에서 σx, σy, τxy로 합쳐서** Plane Stress 방식으로 최종 정리해요."
          />
          <br />
          <br />
          <b>자주 쓰는 개별 공식</b>
          <br />
          · 축하중: σ = <Frac num="P" den="A" />
          <br />
          · 굽힘: σ = <Frac num="My" den="I" />
          <br />
          · 비틀림: τ = <Frac num="Tr" den="Ip" />
          <br />
          · 전단력: τ = <Frac num="VQ" den="Ib" />
          <br />
          · 압력용기: σ1=<Frac num="pr" den="t" /> (원통 hoop), σ=<Frac num="pr" den="2t" /> (구/원통 길이방향)
        </div>
        <div style={{ fontSize: 12, color: 'var(--gray)', marginBottom: 10 }}>아래에 그 점에서 <b>합쳐진 최종값</b>을 입력하세요.</div>
        <StressStateCard
          title="응력 상태 (σx, σy, τxy — 합산값)"
          sigmaX={sigmaX}
          sigmaY={sigmaY}
          tauXY={tauXY}
          units={units}
          onFieldChange={(field, value) => {
            const val = parseFloat(value);
            if (isNaN(val)) return;
            const newVal = val * stressF;
            if (field === 'sigmaX') setSigmaX(newVal);
            else if (field === 'sigmaY') setSigmaY(newVal);
            else if (field === 'tauXY') setTauXY(newVal);
          }}
          onUnitChange={(v) => setUnits((p) => ({ ...p, stress: v }))}
        />
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="panel">
        <h3>VISUALIZER</h3>
        <ElementSVG sx={sigmaX} sy={sigmaY} txy={tauXY} />
        <div className="steps" style={{ marginTop: 12 }}>
          <FormulaSection title="최종 주응력 · 최대전단">
            <div className="step-formula">σ1,2 = σave ± R &nbsp; τmax = R</div>
            <div className="step-final">
              σ1 = {fmt(disp(r.sigma1, stressF))} {units.stress} &nbsp; σ2 = {fmt(disp(r.sigma2, stressF))} {units.stress} &nbsp; τmax = {fmt(disp(r.tauMax, stressF))} {units.stress}
            </div>
            <div className="step-row">주응력 방향 θp = {r.thetaP.toFixed(1)}°</div>
            <div style={{ fontSize: 11, color: 'var(--gray-soft)', marginTop: 8 }}>
              💡 σ1, σ2 부호가 같으면(둘 다 인장 또는 둘 다 압축) 평면 밖 전단(<Frac num="σ" den="2" />)이 더 클 수 있어요 — 3축 응력 상태까지 고려해야
              정확해요.
            </div>
          </FormulaSection>
        </div>
        <EditableText as="div" className="ai-hint" contentKey="calc.CombinedLoadings.aiHint" defaultText="💬 왜 평면 밖(out-of-plane) 전단까지 확인해야 하는지 궁금하다면, 오른쪽 AI 튜터에게 물어보세요." />
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
      {svgArrow(cx + s, cy, cx + s + sxo * L, cy, color, 'c1')}
      {svgArrow(cx - s, cy, cx - s - sxo * L, cy, color, 'c2')}
      {svgArrow(cx, cy - s, cx, cy - s + syo * L, color, 'c3')}
      {svgArrow(cx, cy + s, cx, cy + s - syo * L, color, 'c4')}
      {svgArrow(cx + s, cy + tl * 0.4 * to, cx + s, cy - tl * 0.6 * to, color, 'c5')}
      {svgArrow(cx - s, cy - tl * 0.4 * to, cx - s, cy + tl * 0.6 * to, color, 'c6')}
      {svgArrow(cx - tl * 0.4 * to, cy - s, cx + tl * 0.6 * to, cy - s, color, 'c7')}
      {svgArrow(cx + tl * 0.4 * to, cy + s, cx - tl * 0.6 * to, cy + s, color, 'c8')}
      <text x={cx} y={cy + s + 40} fontSize="13" fontWeight="800" fill={color} textAnchor="middle">합쳐진 응력 상태</text>
    </svg>
  );
}
