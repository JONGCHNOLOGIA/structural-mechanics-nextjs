'use client';

// 단면 특성 계산기의 단면 도식. 모든 치수(mm)를 실제 비율 그대로 축척해서 그리고,
// 도심(centroid) 위치를 점선으로 표시한다 (T형은 좌우대칭이 아니라 ȳ가 중앙이 아님).
const COLOR = '#51626F';
const CENTROID = '#C3002F';
const MAX_PX = 168;

function scaleFor(boundW, boundH) {
  return Math.min(MAX_PX / boundW, MAX_PX / boundH);
}

export default function SectionShapeDiagram({ shape, d, ybar, totalHeight }) {
  const cx = 150;
  const cy = 140;

  let content = null;
  let boundW = 100;
  let boundH = 100;

  if (shape === 'rectangle') {
    boundW = d.b;
    boundH = d.h;
    const s = scaleFor(boundW, boundH);
    const w = d.b * s, h = d.h * s;
    content = (
      <>
        <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} fill="#F7E3E6" stroke={COLOR} strokeWidth="1.5" />
        <DimLabel x={cx} y={cy - h / 2 - 8} text={`b = ${d.b} mm`} />
        <DimLabel x={cx + w / 2 + 26} y={cy} text={`h = ${d.h} mm`} rotate />
      </>
    );
  } else if (shape === 'circle') {
    boundW = boundH = d.dia;
    const s = scaleFor(boundW, boundH);
    const r = (d.dia * s) / 2;
    content = (
      <>
        <circle cx={cx} cy={cy} r={r} fill="#F7E3E6" stroke={COLOR} strokeWidth="1.5" />
        <DimLabel x={cx} y={cy - r - 8} text={`d = ${d.dia} mm`} />
      </>
    );
  } else if (shape === 'hollowCircle') {
    boundW = boundH = d.diaOuter;
    const s = scaleFor(boundW, boundH);
    const ro = (d.diaOuter * s) / 2, ri = (d.diaInner * s) / 2;
    content = (
      <>
        <circle cx={cx} cy={cy} r={ro} fill="#F7E3E6" stroke={COLOR} strokeWidth="1.5" />
        <circle cx={cx} cy={cy} r={ri} fill="var(--bg, #FAF9F6)" stroke={COLOR} strokeWidth="1" />
        <DimLabel x={cx} y={cy - ro - 8} text={`dₒ = ${d.diaOuter} mm`} />
        <DimLabel x={cx} y={cy + 4} text={`dᵢ = ${d.diaInner}`} small />
      </>
    );
  } else if (shape === 'hollowRect') {
    boundW = d.B;
    boundH = d.H;
    const s = scaleFor(boundW, boundH);
    const W = d.B * s, H = d.H * s, w = d.b * s, h = d.h * s;
    content = (
      <>
        <rect x={cx - W / 2} y={cy - H / 2} width={W} height={H} fill="#F7E3E6" stroke={COLOR} strokeWidth="1.5" />
        <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} fill="var(--bg, #FAF9F6)" stroke={COLOR} strokeWidth="1" />
        <DimLabel x={cx} y={cy - H / 2 - 8} text={`B = ${d.B}, H = ${d.H} mm`} />
        <DimLabel x={cx} y={cy + 4} text={`b = ${d.b}, h = ${d.h}`} small />
      </>
    );
  } else if (shape === 'iBeam') {
    boundW = d.bf;
    boundH = d.h;
    const s = scaleFor(boundW, boundH);
    const bf = d.bf * s, h = d.h * s, tf = d.tf * s, tw = d.tw * s;
    const top = cy - h / 2;
    content = (
      <>
        <rect x={cx - bf / 2} y={top} width={bf} height={tf} fill="#F7E3E6" stroke={COLOR} strokeWidth="1.5" />
        <rect x={cx - tw / 2} y={top + tf} width={tw} height={h - 2 * tf} fill="#F7E3E6" stroke={COLOR} strokeWidth="1.5" />
        <rect x={cx - bf / 2} y={top + h - tf} width={bf} height={tf} fill="#F7E3E6" stroke={COLOR} strokeWidth="1.5" />
        <DimLabel x={cx} y={top - 8} text={`bf = ${d.bf} mm`} />
        <DimLabel x={cx + bf / 2 + 26} y={cy} text={`h = ${d.h} mm`} rotate />
      </>
    );
  } else if (shape === 'tSection') {
    boundW = d.bf;
    boundH = d.h;
    const s = scaleFor(boundW, boundH);
    const bf = d.bf * s, h = d.h * s, tf = d.tf * s, tw = d.tw * s;
    const top = cy - h / 2;
    const bottom = cy + h / 2;
    const centroidY = bottom - ybar * s;
    content = (
      <>
        <rect x={cx - bf / 2} y={top} width={bf} height={tf} fill="#F7E3E6" stroke={COLOR} strokeWidth="1.5" />
        <rect x={cx - tw / 2} y={top + tf} width={tw} height={h - tf} fill="#F7E3E6" stroke={COLOR} strokeWidth="1.5" />
        <line x1={cx - bf / 2 - 10} y1={centroidY} x2={cx + bf / 2 + 10} y2={centroidY} stroke={CENTROID} strokeWidth="1.3" strokeDasharray="4 3" />
        <text x={cx + bf / 2 + 14} y={centroidY + 4} fontSize="10" fontWeight="800" fill={CENTROID}>
          ȳ = {ybar.toFixed(1)}
        </text>
        <DimLabel x={cx} y={top - 8} text={`bf = ${d.bf} mm`} />
        <DimLabel x={cx - bf / 2 - 26} y={cy} text={`h = ${d.h} mm`} rotate />
      </>
    );
  }

  return (
    <svg viewBox="0 0 300 260" style={{ width: '100%', maxWidth: 320, margin: '0 auto', display: 'block' }}>
      {content}
      {shape !== 'tSection' && (
        <line x1={cx - 90} y1={cy} x2={cx + 90} y2={cy} stroke={CENTROID} strokeWidth="1" strokeDasharray="4 3" opacity="0.6" />
      )}
    </svg>
  );
}

function DimLabel({ x, y, text, rotate, small }) {
  return (
    <text
      x={x}
      y={y}
      fontSize={small ? 9.5 : 10.5}
      fontWeight="700"
      fill="#51626F"
      textAnchor={rotate ? 'start' : 'middle'}
      transform={rotate ? undefined : undefined}
    >
      {text}
    </text>
  );
}
