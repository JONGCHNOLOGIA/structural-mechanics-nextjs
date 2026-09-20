'use client';

import { fmt } from '@/lib/calc/unitOptions';

/*
  중첩(superposition)을 눈으로 보여주는 그림.

  하중을 하나씩만 남겨서 따로 푼 처짐곡선들을 옅은 색으로 겹쳐 그리고, 그 위에
  모든 하중을 한꺼번에 푼 곡선을 굵게 얹는다. 선형탄성이면 옅은 곡선들을 세로로 더한 값이
  굵은 곡선과 정확히 겹친다 — 그게 중첩의 전부다.

  세로 눈금은 모든 곡선에 공통으로 쓴다. 케이스마다 따로 늘리면 "더하면 맞는다"가 안 보인다.
*/

const COLORS = ['#1E7F72', '#4A5FBF', '#B0790A', '#8A4FBF', '#0F7FA8'];

export default function SuperpositionCurvesSVG({ cases, total, L, lenF, lenUnit, xStar }) {
  const w = 620;
  const padL = 46, padR = 46, padTop = 26;
  // 범례가 케이스 수만큼 길어지므로 아래 여백을 거기에 맞춰 잡는다 — 고정값으로 두면 잘린다.
  const padBottom = 34 + (cases.length + 1) * 14;
  const drawH = 160;
  const h = padTop + drawH + padBottom;
  const drawW = w - padL - padR;

  const all = [...cases.flatMap((c) => c.pts), ...total];
  const maxAbs = Math.max(1e-12, ...all.map((p) => Math.abs(p.v)));
  const xToPx = (x) => padL + (x / L) * drawW;
  const vToPx = (v) => padTop + drawH / 2 + (v / maxAbs) * (drawH / 2 - 8);

  const line = (pts) => pts.map((p) => `${xToPx(p.x).toFixed(2)},${vToPx(p.v).toFixed(2)}`).join(' ');

  const vStar = (pts) => {
    const i = Math.min(pts.length - 1, Math.max(0, Math.round((xStar / L) * (pts.length - 1))));
    return pts[i].v;
  };

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 660, margin: '0 auto', display: 'block', overflow: 'visible' }}>
      {/* 변형 전(처짐 0) 기준선 */}
      <line x1={padL} y1={vToPx(0)} x2={padL + drawW} y2={vToPx(0)} stroke="#B9C2C9" strokeWidth="1.2" strokeDasharray="5 4" />
      <text x={padL - 6} y={vToPx(0) + 4} fontSize="10" fill="#8A97A2" textAnchor="end">0</text>

      {/* 세로축 v — 아래가 + 방향이라는 걸 화살표로 못박는다 */}
      <line x1={padL - 16} y1={padTop} x2={padL - 16} y2={padTop + drawH} stroke="#8A97A2" strokeWidth="1.1" />
      <polygon points={`${padL - 16},${padTop + drawH + 4} ${padL - 19.5},${padTop + drawH - 3} ${padL - 12.5},${padTop + drawH - 3}`} fill="#8A97A2" />
      <text x={padL - 22} y={padTop + drawH} fontSize="11" fill="#8A97A2" textAnchor="end" fontWeight="800">v</text>

      {cases.map((c, i) => (
        <polyline key={c.label} points={line(c.pts)} fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth="1.6" opacity="0.85" />
      ))}
      <polyline points={line(total)} fill="none" stroke="#C3002F" strokeWidth="2.6" />

      {/* 관측점 — 여기서의 값들이 아래 표의 숫자다 */}
      <line x1={xToPx(xStar)} y1={padTop} x2={xToPx(xStar)} y2={padTop + drawH} stroke="#51626F" strokeWidth="1" strokeDasharray="3 3" />
      {cases.map((c, i) => (
        <circle key={c.label} cx={xToPx(xStar)} cy={vToPx(vStar(c.pts))} r="3.2" fill={COLORS[i % COLORS.length]} />
      ))}
      <circle cx={xToPx(xStar)} cy={vToPx(vStar(total))} r="4.4" fill="#C3002F" />
      <text x={xToPx(xStar)} y={padTop - 8} fontSize="10.5" fill="#51626F" textAnchor="middle" fontWeight="800">
        x = {fmt(xStar / lenF)} {lenUnit}
      </text>

      {/* 범례 */}
      <g transform={`translate(${padL}, ${padTop + drawH + 24})`}>
        {cases.map((c, i) => (
          <g key={c.label} transform={`translate(0, ${i * 14})`}>
            <line x1="0" y1="-3" x2="18" y2="-3" stroke={COLORS[i % COLORS.length]} strokeWidth="2.4" />
            <text x="24" y="1" fontSize="10.5" fill="#51626F">{c.label}</text>
          </g>
        ))}
        <g transform={`translate(0, ${cases.length * 14})`}>
          <line x1="0" y1="-3" x2="18" y2="-3" stroke="#C3002F" strokeWidth="3" />
          <text x="24" y="1" fontSize="10.5" fill="#C3002F" fontWeight="800">전부 함께 (= 위 곡선들의 합)</text>
        </g>
      </g>
    </svg>
  );
}
