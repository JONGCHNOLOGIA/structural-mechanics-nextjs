'use client';

import { useMemo, useState } from 'react';
import { volFracA, mixColor, makeDots } from '@/lib/calc/fgm';

// 프로토타입 renderFGM() / fgmBuildVisuals()를 React로 옮긴 버전.
// 계산이 아니라 "구배 지수 n에 따라 재료 조성이 어떻게 섞이는지"를 보여주는 개념 시각화.

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
    <div className="grid grid-cols-[300px_1fr_300px] gap-6 max-w-[1700px] mx-auto p-6">
      {/* ---------------- Setting Menu ---------------- */}
      <div className="bg-white border border-line rounded-2xl p-5">
        <h3 className="text-crimson text-xs font-extrabold mb-4">SETTING MENU</h3>
        <Field label={`구배 지수 n = ${n.toFixed(2)}`}>
          <input
            type="range"
            min="0.2"
            max="5"
            step="0.1"
            value={n}
            onChange={(e) => setN(parseFloat(e.target.value))}
            className="w-full"
          />
        </Field>
        <div className="flex gap-2 mt-2">
          {[0.5, 1, 2, 5].map((v) => (
            <button key={v} className="flex-1 py-1.5 border border-line rounded-lg text-xs font-bold text-gray" onClick={() => setN(v)}>
              n={v}
            </button>
          ))}
        </div>
        <p className="text-xs text-graySoft mt-4">
          n=1이면 선형으로 섞이고, n&lt;1이면 하단(B-rich) 근처에서, n&gt;1이면 상단(A-rich) 근처에서 조성이 급하게 바뀝니다.
        </p>
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="bg-white border border-line rounded-2xl p-6">
        <h3 className="text-crimson text-xs font-extrabold mb-4">
          VISUALIZER <span className="ml-2 text-[10px] bg-tealSoft text-teal rounded-full px-2 py-0.5">실시간</span>
        </h3>
        <div className="flex gap-6 flex-wrap">
          <BeamSVG gradStops={gradStops} />
          <DotSVG dots={dots} n={n} />
        </div>
        <div className="mt-6">
          <div className="text-xs font-extrabold text-gray mb-2">높이 구간별 체적 비율 (A - B)</div>
          {bandRows.map((r, i) => (
            <div key={i} className="flex items-center gap-2 mb-1">
              <div className="flex-1 h-5 rounded" style={{ background: r.bg, opacity: 0.85 }} />
              <div className="text-[11px] font-mono text-gray w-24 text-right">
                {r.aPct.toFixed(0)}% - {r.bPct.toFixed(0)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ---------------- AI Tutor ---------------- */}
      <div className="bg-white border border-line rounded-2xl p-5 sticky top-6 self-start">
        <h3 className="text-crimson text-xs font-extrabold mb-4">
          AI TUTOR <span className="ml-2 text-[10px] bg-crimsonSoft text-crimson rounded-full px-2 py-0.5">준비중</span>
        </h3>
        <div className="text-sm text-gray bg-crimsonSoft rounded-xl p-3 mb-3">
          실제 구조 해석에서 FGM 보를 어떻게 다루는지 궁금하다면, 다음 단계에서 연결될 AI 튜터에게 물어보세요.
        </div>
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

function BeamSVG({ gradStops }) {
  const barW = 220, barH = 220, barX = 30, barY = 30, skew = 40;
  const gradId = 'fgmGrad';
  return (
    <svg viewBox="0 0 400 300" className="w-full max-w-[380px] flex-1 min-w-[260px]">
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
    <svg viewBox={`0 0 ${dotW} ${dotH}`} className="border border-line rounded-lg bg-bg" style={{ width: 160, height: 220 }}>
      {dots.map((d, i) => {
        const zeta = 1 - d.y;
        const aFrac = volFracA(zeta, n);
        const isA = ((d.x * 997 + d.y * 613) % 1) < aFrac;
        return <circle key={i} cx={(d.x * dotW).toFixed(1)} cy={(d.y * dotH).toFixed(1)} r="2.1" fill={isA ? COLOR_A.hex : COLOR_B.hex} />;
      })}
    </svg>
  );
}
