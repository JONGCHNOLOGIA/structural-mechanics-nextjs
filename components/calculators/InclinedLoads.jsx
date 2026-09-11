'use client';

import { useMemo, useState } from 'react';
import { UNIT_OPTIONS, fmt, fmtSci } from '@/lib/calc/unitOptions';
import { computeInclinedLoads } from '@/lib/calc/inclinedLoads';

// 프로토타입 renderInclinedLoads() / ilBuildVisuals()를 React로 옮긴 버전.

export default function InclinedLoads() {
  const [units] = useState({ length: 'in', stress: 'psi', moment: 'kip·in' });
  const [width, setWidth] = useState(4 * 0.0254);
  const [height, setHeight] = useState(6 * 0.0254);
  const [moment, setMoment] = useState(60 * 112.9848);
  const [alpha, setAlpha] = useState(30);

  const lenF = UNIT_OPTIONS.length[units.length];
  const momF = UNIT_OPTIONS.moment[units.moment];
  const stressF = UNIT_OPTIONS.stress[units.stress];
  const disp = (b, f) => b / f;

  const r = useMemo(() => (width && height ? computeInclinedLoads(width, height, moment, alpha) : null), [width, height, moment, alpha]);
  const betaDeg = r ? (r.betaRad * 180) / Math.PI : 0;

  return (
    <div className="grid grid-cols-[300px_1fr_300px] gap-6 max-w-[1700px] mx-auto p-6">
      {/* ---------------- Setting Menu ---------------- */}
      <div className="bg-white border border-line rounded-2xl p-5">
        <h3 className="text-crimson text-xs font-extrabold mb-4">SETTING MENU</h3>
        <p className="text-xs text-gray bg-bg rounded-xl p-3 mb-4 leading-relaxed">
          직사각형 단면에 <b>Z축에서 α만큼 기울어진 방향</b>으로 굽힘모멘트가 작용해요. 이 모멘트는 My, Mz 두 성분으로 분해되고, 단면 각 지점의 응력은 두 성분의 중첩으로 결정돼요.
        </p>
        <Field label="Width (b)">
          <input type="number" className="field-input" defaultValue={fmt(disp(width, lenF))} onBlur={(e) => setWidth(parseFloat(e.target.value) * lenF)} />
        </Field>
        <Field label="Height (h)">
          <input type="number" className="field-input" defaultValue={fmt(disp(height, lenF))} onBlur={(e) => setHeight(parseFloat(e.target.value) * lenF)} />
        </Field>
        <Field label="Moment M">
          <input type="number" className="field-input" defaultValue={fmt(disp(moment, momF))} onBlur={(e) => setMoment(parseFloat(e.target.value) * momF)} />
        </Field>
        <Field label={`기울기 α (Z축 기준) — ${alpha}°`}>
          <input type="range" min="0" max="90" step="1" value={alpha} onChange={(e) => setAlpha(parseFloat(e.target.value))} className="w-full" />
        </Field>
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="bg-white border border-line rounded-2xl p-6">
        <h3 className="text-crimson text-xs font-extrabold mb-4">
          VISUALIZER <span className="ml-2 text-[10px] bg-tealSoft text-teal rounded-full px-2 py-0.5">실시간</span>
        </h3>
        {r ? (
          <>
            <InclinedLoadsSVG width={width} height={height} r={r} alpha={alpha} betaDeg={betaDeg} stressF={stressF} unitStress={units.stress} />
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <ResultCard label="Mz = M·cos(α)" value={`${fmt(disp(r.Mz, momF))} ${units.moment}`} />
              <ResultCard label="My = M·sin(α)" value={`${fmt(disp(r.My, momF))} ${units.moment}`} />
              <ResultCard label="Iz = b·h³/12" value={`${fmtSci(r.Iz)} m⁴`} />
              <ResultCard label="Iy = h·b³/12" value={`${fmtSci(r.Iy)} m⁴`} />
            </div>
            <p className="text-xs font-extrabold mt-3">중립축 방향 β = {betaDeg.toFixed(1)}° <span className="font-normal text-graySoft">(tan β = tan α · Iz/Iy)</span></p>
            <p className="text-xs text-graySoft mt-2 leading-relaxed">
              💡 <b>Iz ≠ Iy</b>이면 중립축(β)이 모멘트 방향(α)과 <b>일치하지 않아요</b> — 이게 비대칭(2축) 굽힘의 핵심 포인트예요. 정사각형 단면(b=h)처럼 Iz=Iy일 때만 β=α가 됩니다.
            </p>
          </>
        ) : (
          <div className="text-graySoft text-sm border-2 border-dashed border-line rounded-xl p-16 text-center">폭과 높이를 입력하면 단면과 응력 분포가 나타납니다.</div>
        )}
      </div>

      {/* ---------------- AI Tutor ---------------- */}
      <div className="bg-white border border-line rounded-2xl p-5 sticky top-6 self-start">
        <h3 className="text-crimson text-xs font-extrabold mb-4">
          AI TUTOR <span className="ml-2 text-[10px] bg-crimsonSoft text-crimson rounded-full px-2 py-0.5">준비중</span>
        </h3>
        <div className="text-sm text-gray bg-crimsonSoft rounded-xl p-3 mb-3">왜 중립축이 모멘트 방향과 다른지 궁금하다면, 다음 단계에서 연결될 AI 튜터에게 물어보세요.</div>
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

function ResultCard({ label, value }) {
  return (
    <div className="bg-bg border border-line rounded-xl p-3">
      <div className="text-[11px] text-graySoft font-bold">{label}</div>
      <div className="text-sm font-extrabold mt-0.5">{value}</div>
    </div>
  );
}

function InclinedLoadsSVG({ width, height, r, alpha, betaDeg, stressF, unitStress }) {
  const w = 460, h = 320, cx = w / 2, cy = h / 2;
  const scale = Math.min(140 / width, 140 / height);
  const bPx = width * scale, hPx = height * scale;
  const radA = (alpha * Math.PI) / 180;
  const mLen = Math.max(bPx, hPx) / 2 + 40;
  const mx = cx + mLen * Math.cos(radA), my = cy - mLen * Math.sin(radA);
  const naLen = Math.max(bPx, hPx) / 2 + 45;
  const nx1 = cx + naLen * Math.cos(r.betaRad), ny1 = cy - naLen * Math.sin(r.betaRad);
  const nx2 = cx - naLen * Math.cos(r.betaRad), ny2 = cy + naLen * Math.sin(r.betaRad);

  const corners = [
    { label: 'D', y: height / 2, z: width / 2, px: cx + bPx / 2, py: cy - hPx / 2, anchor: 'start', dy: -6 },
    { label: 'E', y: -height / 2, z: width / 2, px: cx + bPx / 2, py: cy + hPx / 2, anchor: 'start', dy: 16 },
    { label: 'F', y: -height / 2, z: -width / 2, px: cx - bPx / 2, py: cy + hPx / 2, anchor: 'end', dy: 16 },
    { label: 'G', y: height / 2, z: -width / 2, px: cx - bPx / 2, py: cy - hPx / 2, anchor: 'end', dy: -6 },
  ];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-[500px] mx-auto block">
      <rect x={cx - bPx / 2} y={cy - hPx / 2} width={bPx} height={hPx} fill="#F7E3E6" stroke="#51626F" strokeWidth="1.4" />
      <line x1={cx} y1={cy + hPx / 2 + 20} x2={cx} y2={cy - hPx / 2 - 20} stroke="#8A97A2" strokeWidth="1.2" />
      <text x={cx + 8} y={cy - hPx / 2 - 20} fontSize="12" fill="#8A97A2" fontWeight="800">Y</text>
      <line x1={cx - bPx / 2 - 20} y1={cy} x2={cx + bPx / 2 + 20} y2={cy} stroke="#8A97A2" strokeWidth="1.2" />
      <text x={cx + bPx / 2 + 22} y={cy + 4} fontSize="12" fill="#8A97A2" fontWeight="800">Z</text>

      <line x1={cx} y1={cy} x2={mx} y2={my} stroke="#C3002F" strokeWidth="2" />
      <text x={mx + (Math.cos(radA) >= 0 ? 8 : -8)} y={my - (Math.sin(radA) >= 0 ? 6 : -14)} fontSize="11" fill="#C3002F" fontWeight="800" textAnchor={Math.cos(radA) >= 0 ? 'start' : 'end'}>
        M (α={alpha}°)
      </text>

      <line x1={nx1} y1={ny1} x2={nx2} y2={ny2} stroke="#1F8A4C" strokeWidth="1.6" strokeDasharray="6 4" />
      <text x={nx1 + (Math.cos(r.betaRad) >= 0 ? 6 : -6)} y={ny1 - 4} fontSize="11" fill="#1F8A4C" fontWeight="800" textAnchor={Math.cos(r.betaRad) >= 0 ? 'start' : 'end'}>
        중립축 (β={betaDeg.toFixed(1)}°)
      </text>

      {corners.map((c) => {
        const s = r.stressAt(c.y, c.z);
        const col = s >= 0 ? '#1E7F72' : '#C3002F';
        return (
          <g key={c.label}>
            <circle cx={c.px} cy={c.py} r="4" fill={col} />
            <text x={c.px} y={c.py + c.dy} fontSize="11" fontWeight="800" fill={col} textAnchor={c.anchor}>
              {c.label}: {fmt(s / stressF)} {unitStress}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
