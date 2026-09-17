'use client';

import { useMemo, useState } from 'react';
import { UNIT_OPTIONS, fmt } from '@/lib/calc/unitOptions';
import FormulaSection, { Tip } from './FormulaSection';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import Frac from '@/components/Frac';
import FieldBlockCard from './FieldBlockCard';

// 캔틸레버 보인데 단면(I)이 중간(x=c)에서 바뀜 — 자유단(x=L)에 집중하중 P.
// EI가 구간마다 다르니 M/EI 다이어그램을 구간별로 나눠 적분(수치적분)해서
// 모멘트-면적 2번째 정리로 처짐을 구함.

export default function NonprismaticBeams() {
  const [units, setUnits] = useState({ length: 'm', force: 'kN', E: 'GPa', inertia: 'mm⁴' });
  const [L, setL] = useState(4);
  const [c, setC] = useState(2);
  const [P, setP] = useState(20 * 1000);
  const [E, setE] = useState(200 * 1e9);
  const [I1, setI1] = useState(30e6 * 1e-12);
  const [I2, setI2] = useState(90e6 * 1e-12);
  const [activeField, setActiveField] = useState('L');

  const lenF = UNIT_OPTIONS.length[units.length];
  const forceF = UNIT_OPTIONS.force[units.force];
  const EF = UNIT_OPTIONS.E[units.E];
  const inertiaF = UNIT_OPTIONS.inertia[units.inertia];
  const disp = (b, f) => b / f;

  const cClamped = Math.min(Math.max(c, 0.001), L - 0.001);
  const PSI = P;
  const EPa = E;
  const EI1 = EPa * I1;
  const EI2 = EPa * I2;

  const result = useMemo(() => {
    const N = 400;
    let theta = 0;
    let delta = 0;
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const x = (L * i) / N;
      const EIx = x < cClamped ? EI1 : EI2;
      const m = (PSI * (L - x)) / EIx; // M/EI (절대값)
      pts.push({ x, m });
    }
    for (let i = 0; i < N; i++) {
      const dx = L / N;
      const mAvg = (pts[i].m + pts[i + 1].m) / 2;
      const xAvg = (pts[i].x + pts[i + 1].x) / 2;
      theta += mAvg * dx;
      delta += mAvg * (L - xAvg) * dx;
    }
    return { pts, theta, delta };
  }, [L, cClamped, PSI, EI1, EI2]);

  const maxM = Math.max(1e-12, ...result.pts.map((p) => p.m));

  return (
    <>
      {/* ---------------- Setting Menu ---------------- */}
      <div className="panel">
        <h3>SETTING MENU</h3>
        <EditableText
          contentKey="calc.NonprismaticBeams.intro"
          defaultText="단면 2차모멘트가 한 값이 아니라(**Nonprismatic**) x=c 지점에서 I₁ → I₂로 바뀌는 캔틸레버예요. M/EI 다이어그램이 **c에서 불연속으로 꺾이고**, 구간을 나눠 적분해야 해요."
          style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.6, marginBottom: 14, background: 'var(--bg)', borderRadius: 0, padding: '12px 14px' }}
        />
        <FieldBlockCard
          title="보 조건 (L, P, E, I₁, I₂)"
          activeKey={activeField}
          onActiveChange={setActiveField}
          fields={[
            { key: 'L', label: '스팬 L', value: disp(L, lenF), unitType: 'length', unit: units.length },
            { key: 'P', label: '집중하중 P', value: disp(P, forceF), unitType: 'force', unit: units.force },
            { key: 'E', label: '탄성계수 E', value: disp(E, EF), unitType: 'E', unit: units.E },
            { key: 'I1', label: 'I₁ [0,c]', value: disp(I1, inertiaF), unitType: 'inertia', unit: units.inertia },
            { key: 'I2', label: 'I₂ [c,L]', value: disp(I2, inertiaF), unitType: 'inertia', unit: units.inertia },
          ]}
          onUnitChange={(unitType, v) => setUnits((prev) => ({ ...prev, [unitType]: v }))}
          onFieldChange={(key, value) => {
            const val = parseFloat(value);
            if (isNaN(val)) return;
            if (key === 'L') setL(val * lenF);
            else if (key === 'P') setP(val * forceF);
            else if (key === 'E') setE(val * EF);
            else if (key === 'I1') setI1(val * inertiaF);
            else if (key === 'I2') setI2(val * inertiaF);
          }}
        />
        <div className="field">
          <label>단면 전환 위치 c (고정단으로부터) — {fmt(disp(cClamped, lenF))} {units.length}</label>
          <input type="range" min="0.1" max={Math.max(0.2, L - 0.1)} step="0.05" value={cClamped} onChange={(e) => setC(parseFloat(e.target.value))} style={{ width: '100%' }} />
        </div>
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="panel">
        <h3>
          VISUALIZER <span className="badge live" style={{ marginLeft: 6 }}>실시간</span>
        </h3>
        <NonprismaticSVG pts={result.pts} L={L} c={cClamped} maxM={maxM} />
        <div className="result-grid">
          <div className="result-card">
            <div className="l">θB (구간별 적분 합)</div>
            <div className="v">{result.theta.toExponential(3)} rad</div>
          </div>
          <div className="result-card">
            <div className="l">δB</div>
            <div className="v">{fmt(result.delta * 1000)} mm</div>
          </div>
        </div>
        <div className="steps">
          <FormulaSection title="구간별로 나눠 적분">
            <div className="step-formula">
              <Tip title="자유단으로부터 잰 굽힘모멘트">M(x)</Tip> = −P(L−x) (전 구간 동일, EI만 구간마다 다름)
            </div>
            <div className="step-row">
              θB = ∫₀ᶜ <Frac num="M" den="EI₁" /> dx + ∫ᶜᴸ <Frac num="M" den="EI₂" /> dx
            </div>
            <div className="step-row">
              δB = ∫₀ᶜ (<Frac num="M" den="EI₁" />)(L−x) dx + ∫ᶜᴸ (<Frac num="M" den="EI₂" />)(L−x) dx
            </div>
            <div className="step-final">
              <Frac num="I₂" den="I₁" /> = {fmt(I2 / I1)} → 단면이 클수록(I₂ 구간) <Frac num="M" den="EI" /> 다이어그램이 낮아지는 게 보이시나요?
            </div>
          </FormulaSection>
        </div>
        <EditableText as="div" className="ai-hint" contentKey="calc.NonprismaticBeams.aiHint" defaultText="💬 왜 단면이 큰 쪽에서 처짐 기여도가 작아지는지 궁금하다면, 오른쪽 AI 튜터에게 물어보세요." />
      </div>

      <AiTutorPanel />
    </>
  );
}

function NonprismaticSVG({ pts, L, c, maxM }) {
  const w = 620, h = 260;
  const padL = 50, padR = 40, padTop = 30, padBottom = 40;
  const drawW = w - padL - padR;
  const drawH = h - padTop - padBottom;

  const xToPx = (x) => padL + (x / L) * drawW;
  const mToPx = (m) => padTop + drawH - (m / maxM) * drawH;

  const areaPath =
    `M ${xToPx(0)} ${padTop + drawH} ` +
    pts.map((p) => `L ${xToPx(p.x).toFixed(2)} ${mToPx(p.m).toFixed(2)}`).join(' ') +
    ` L ${xToPx(L)} ${padTop + drawH} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 660, margin: '0 auto', display: 'block' }}>
      <line x1={padL} y1={padTop + drawH} x2={padL + drawW} y2={padTop + drawH} stroke="#8A97A2" strokeWidth="1.2" />
      <path d={areaPath} fill="#F7E3E6" stroke="#C3002F" strokeWidth="1.6" />
      <line x1={xToPx(c)} y1={padTop} x2={xToPx(c)} y2={padTop + drawH} stroke="#1E7F72" strokeWidth="1.4" strokeDasharray="5 4" />
      <text x={xToPx(c)} y={padTop - 8} fontSize="13" fill="#1E7F72" textAnchor="middle" fontWeight="800">c (단면 전환점)</text>
      <text x={padL} y={padTop + drawH + 20} fontSize="13" fill="#8A97A2">A (고정단)</text>
      <text x={padL + drawW} y={padTop + drawH + 20} fontSize="13" fill="#8A97A2" textAnchor="end">B (자유단)</text>
      <text x={padL + drawW / 2} y={h - 6} fontSize="13" fill="#8A97A2" textAnchor="middle">M/EI 다이어그램 (c에서 꺾임)</text>
    </svg>
  );
}
