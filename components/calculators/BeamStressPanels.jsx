'use client';

import { fmt } from '@/lib/calc/unitOptions';

/*
  참고자료(mmch8.pdf p.16~17, Example 8-3)와 요청 이미지의 그림을 다시 그린 것.

  한 단면을 깊이 방향으로 훑으면서 다섯 가지 응력이 어떻게 분포하는지 나란히 보여준다:
    (a) 단면      — 어디를 보고 있는지
    (b) σx        — 굽힘응력. 중립축에서 0, 위아래 끝에서 최대 (직선)
    (c) τxy       — 전단응력. 중립축에서 최대, 위아래 끝에서 0 (포물선)
    (d) σ1        — 주응력 중 큰 쪽
    (e) σ2        — 주응력 중 작은 쪽
    (f) τmax      — 그 지점의 최대전단응력

  σx가 가장 큰 곳과 τ가 가장 큰 곳이 서로 반대라는 것, 그런데 τmax(주응력 기준)는
  위아래 끝에서도 0이 아니라는 것이 이 그림에서 읽혀야 하는 부분이다.

  가로 폭은 각 패널 안에서 그 패널의 최댓값에 맞춰 늘린다 — 다섯 값의 크기 차이가 커서
  하나의 눈금으로 묶으면 작은 쪽이 선처럼 납작해진다. 대신 각 패널에 최댓값을 적어 둔다.
*/

const N = 41; // 깊이 방향 샘플 수
const CRIMSON = '#C3002F';
const TEAL = '#1E7F72';
const BLUE = '#4A5FBF';
const GOLD = '#B0790A';
const GRAY = '#8A97A2';

export function computeDepthProfiles(width, height, M, V) {
  const I = (width * Math.pow(height, 3)) / 12;
  const rows = [];
  for (let i = 0; i < N; i++) {
    const y = height / 2 - (i / (N - 1)) * height; // 위(+) → 아래(−)
    const sx = I > 0 ? (-M * y) / I : 0;
    const Q = (width / 2) * (Math.pow(height, 2) / 4 - y * y);
    const txy = I > 0 && width > 0 ? (V * Q) / (I * width) : 0;
    const c = sx / 2;
    const rad = Math.sqrt(c * c + txy * txy);
    rows.push({ y, sx, txy, s1: c + rad, s2: c - rad, tmax: rad });
  }
  return rows;
}

// 패널 하나 — 세로축이 깊이, 가로로 뻗은 길이가 그 깊이에서의 값.
function Panel({ x, w, top, hgt, rows, pick, color, label, unit, stressF }) {
  const values = rows.map(pick);
  const maxAbs = Math.max(1e-12, ...values.map((v) => Math.abs(v)));
  const half = w / 2;
  const X = (v) => x + half + (v / maxAbs) * (half * 0.86);
  const Y = (i) => top + (i / (rows.length - 1)) * hgt;

  const d =
    `M ${X(0)} ${Y(0)} ` +
    values.map((v, i) => `L ${X(v).toFixed(2)} ${Y(i).toFixed(2)}`).join(' ') +
    ` L ${X(0)} ${Y(rows.length - 1)} Z`;

  // 값을 읽을 수 있게 몇 군데만 숫자를 적는다 (전부 적으면 글씨가 겹친다)
  const marks = [0, Math.floor(rows.length / 4), Math.floor(rows.length / 2), Math.floor((3 * rows.length) / 4), rows.length - 1];

  return (
    <g>
      <line x1={x + half} y1={top} x2={x + half} y2={top + hgt} stroke={GRAY} strokeWidth="1" />
      <path d={d} fill={color} fillOpacity="0.22" stroke={color} strokeWidth="1.5" />
      {marks.map((i) => {
        const v = values[i];
        const px = X(v);
        return (
          <g key={i}>
            <line x1={x + half} y1={Y(i)} x2={px} y2={Y(i)} stroke={color} strokeWidth="0.8" opacity="0.5" />
            <text
              x={v >= 0 ? px + 3 : px - 3}
              y={Y(i) + 3}
              fontSize="8"
              fill="#3A3A3A"
              textAnchor={v >= 0 ? 'start' : 'end'}
            >
              {fmt(v / stressF)}
            </text>
          </g>
        );
      })}
      <text x={x + half} y={top + hgt + 16} fontSize="11" fill={color} textAnchor="middle" fontWeight="800">
        {label}
      </text>
      <text x={x + half} y={top + hgt + 29} fontSize="8.5" fill={GRAY} textAnchor="middle">
        최대 {fmt(maxAbs / stressF)} {unit}
      </text>
    </g>
  );
}

export default function BeamStressPanels({ width, height, M, V, stressF, unitStress, lenUnit, lenF, compact = false }) {
  const rows = computeDepthProfiles(width, height, M, V);
  const panels = compact
    ? [
        { pick: (r) => r.sx, color: CRIMSON, label: 'σx (굽힘)' },
        { pick: (r) => r.txy, color: TEAL, label: 'τxy (전단)' },
      ]
    : [
        { pick: (r) => r.sx, color: CRIMSON, label: 'σx' },
        { pick: (r) => r.txy, color: TEAL, label: 'τxy' },
        { pick: (r) => r.s1, color: BLUE, label: 'σ1' },
        { pick: (r) => r.s2, color: BLUE, label: 'σ2' },
        { pick: (r) => r.tmax, color: GOLD, label: 'τmax' },
      ];

  const secW = 56;
  const panelW = compact ? 132 : 96;
  const gap = 14;
  const top = 26;
  const hgt = 180;
  // 마지막 패널의 값 글씨가 오른쪽으로 삐져나가므로 여백을 따로 둔다
  const rightPad = 54;
  const w = 40 + secW + gap + panels.length * (panelW + gap) + rightPad;
  const h = top + hgt + 46;

  const secX = 40;
  const shapeH = hgt;
  const shapeW = Math.min(secW, Math.max(18, (width / height) * shapeH));

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: w, margin: '0 auto', display: 'block', overflow: 'visible' }}>
      {/* (a) 단면 */}
      <rect
        x={secX + (secW - shapeW) / 2}
        y={top}
        width={shapeW}
        height={shapeH}
        fill="#EAF4F1"
        stroke="#51626F"
        strokeWidth="1.4"
      />
      <line
        x1={secX - 6}
        y1={top + shapeH / 2}
        x2={secX + secW + 6}
        y2={top + shapeH / 2}
        stroke={GRAY}
        strokeWidth="1"
        strokeDasharray="4 3"
      />
      <text x={secX - 8} y={top + shapeH / 2 - 5} fontSize="8.5" fill={GRAY} textAnchor="start">
        중립축
      </text>
      <text x={secX + secW / 2} y={top - 10} fontSize="11" fill="#51626F" textAnchor="middle" fontWeight="800">
        단면
      </text>
      <text x={secX + secW / 2} y={top + shapeH + 16} fontSize="9" fill={GRAY} textAnchor="middle">
        b={fmt(width / lenF)} h={fmt(height / lenF)}
      </text>
      <text x={secX + secW / 2} y={top + shapeH + 28} fontSize="9" fill={GRAY} textAnchor="middle">
        {lenUnit}
      </text>

      {panels.map((p, i) => (
        <Panel
          key={p.label}
          x={secX + secW + gap + i * (panelW + gap)}
          w={panelW}
          top={top}
          hgt={hgt}
          rows={rows}
          pick={p.pick}
          color={p.color}
          label={p.label}
          unit={unitStress}
          stressF={stressF}
        />
      ))}
    </svg>
  );
}
