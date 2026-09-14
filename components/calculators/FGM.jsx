'use client';

import { useMemo, useState } from 'react';
import { volFracA, mixColor, makeDots } from '@/lib/calc/fgm';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';

// 프로토타입 renderFGM() / fgmBuildVisuals()를 React로 옮긴 버전.
const COLOR_A = { name: 'Material A', hex: '#C3002F' };
const COLOR_B = { name: 'Material B', hex: '#1F8A4C' };

export default function FGM() {
  const [n, setN] = useState(1);
  const dots = useMemo(() => makeDots(), []);

  const gradStops = [];
  for (let i = 0; i <= 24; i++) {
    const zeta = i / 24;
    const aFrac = volFracA(zeta, n);
    const color = mixColor(COLOR_B.hex, COLOR_A.hex, aFrac);
    const offset = (1 - zeta) * 100;
    gradStops.push({ offset, color });
  }

  const bands = 10;
  const bandRows = [];
  for (let i = bands; i >= 1; i--) {
    const zetaTop = i / bands, zetaBottom = (i - 1) / bands;
    const zetaMid = (zetaTop + zetaBottom) / 2;
    const aPct = volFracA(zetaMid, n) * 100;
    bandRows.push({ aPct, bPct: 100 - aPct, bg: mixColor(COLOR_B.hex, COLOR_A.hex, aPct / 100) });
  }

  return (
    <>
      {/* ---------------- Setting Menu ---------------- */}
      <div className="panel">
        <h3>SETTING MENU</h3>
        <div className="field">
          <label>구배 지수 n = {n.toFixed(2)}</label>
          <input type="range" min="0.2" max="5" step="0.1" value={n} onChange={(e) => setN(parseFloat(e.target.value))} style={{ width: '100%' }} />
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          {[0.5, 1, 2, 5].map((v) => (
            <button key={v} className="add-block" style={{ margin: 0, flex: 1 }} onClick={() => setN(v)}>
              n={v}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 12, color: 'var(--gray-soft)', marginTop: 16, lineHeight: 1.6 }}>
          n=1이면 선형으로 섞이고, n&lt;1이면 하단(B-rich) 근처에서, n&gt;1이면 상단(A-rich) 근처에서 조성이 급하게 바뀝니다.
        </p>
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="panel">
        <h3>
          VISUALIZER <span className="badge live" style={{ marginLeft: 6 }}>실시간</span>
        </h3>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <BeamSVG gradStops={gradStops} />
          <DotSVG dots={dots} n={n} />
        </div>
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--gray)', marginBottom: 8 }}>높이 구간별 체적 비율 (A - B)</div>
          {bandRows.map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <div style={{ flex: 1, height: 20, borderRadius: 4, background: r.bg, opacity: 0.85 }} />
              <div style={{ fontSize: 10.5, fontFamily: "'JetBrains Mono',monospace", color: 'var(--gray)', width: 90, textAlign: 'right' }}>
                {r.aPct.toFixed(0)}% - {r.bPct.toFixed(0)}%
              </div>
            </div>
          ))}
        </div>
        <EditableText as="div" className="ai-hint" contentKey="calc.FGM.aiHint" defaultText="💬 실제 구조 해석에서 FGM 보를 어떻게 다루는지 궁금하다면, 오른쪽 AI 튜터에게 물어보세요." />
      </div>

      <AiTutorPanel />
    </>
  );
}

function BeamSVG({ gradStops }) {
  const barW = 220, barH = 220, barX = 30, barY = 30, skew = 40;
  const gradId = 'fgmGrad';
  return (
    <svg viewBox="0 0 400 300" style={{ width: '100%', maxWidth: 380, flex: '1 1 260px' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          {gradStops.map((s, i) => (
            <stop key={i} offset={`${s.offset.toFixed(1)}%`} stopColor={s.color} />
          ))}
        </linearGradient>
      </defs>
      <polygon
        points={`${barX + skew},${barY} ${barX + skew + barW},${barY} ${barX + skew + barW + 50},${barY - 35} ${barX + skew + 50},${barY - 35}`}
        fill={`url(#${gradId})`}
        opacity="0.85"
        stroke="#51626F"
        strokeWidth="1"
      />
      <rect x={barX + skew} y={barY} width={barW} height={barH} fill={`url(#${gradId})`} stroke="#51626F" strokeWidth="1.3" />
      <polygon
        points={`${barX + skew + barW},${barY} ${barX + skew + barW + 50},${barY - 35} ${barX + skew + barW + 50},${barY - 35 + barH} ${barX + skew + barW},${barY + barH}`}
        fill={`url(#${gradId})`}
        opacity="0.7"
        stroke="#51626F"
        strokeWidth="1"
      />
      <text x={barX + skew + barW / 2} y={barY - 42} fontSize="11" fontWeight="800" fill={COLOR_A.hex} textAnchor="middle">
        {COLOR_A.name}-rich (상단)
      </text>
      <text x={barX + skew + barW / 2} y={barY + barH + 20} fontSize="11" fontWeight="800" fill={COLOR_B.hex} textAnchor="middle">
        {COLOR_B.name}-rich (하단)
      </text>
    </svg>
  );
}

function DotSVG({ dots, n }) {
  const dotW = 140, dotH = 220;
  return (
    <svg viewBox={`0 0 ${dotW} ${dotH}`} style={{ width: 160, height: 220, border: '1px solid var(--line)', borderRadius: 8, background: 'var(--bg)' }}>
      {dots.map((d, i) => {
        const zeta = 1 - d.y;
        const aFrac = volFracA(zeta, n);
        const isA = ((d.x * 997 + d.y * 613) % 1) < aFrac;
        return <circle key={i} cx={(d.x * dotW).toFixed(1)} cy={(d.y * dotH).toFixed(1)} r="2.1" fill={isA ? COLOR_A.hex : COLOR_B.hex} />;
      })}
    </svg>
  );
}
