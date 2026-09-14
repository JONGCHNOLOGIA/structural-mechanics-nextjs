'use client';

// 순수굽힘 가정의 보 측면도(X-Y 측면도, 휨 곡률 표시). 원래 CompositeBeams.jsx 안에만 있던 걸
// 다른 계산기(Transformed Section 등)에서도 재사용할 수 있게 공용 파일로 뺌.
// bend: -24~24px 사이 값(모멘트 크기·부호에 비례) — 0이면 안 휨, +면 새깅(가운데가 아래로 처짐).
export default function BeamElevationSVG({ momentLabel, bend }) {
  const w = 420;
  const h = 150;
  const barY = 68;
  const barH = 16;
  const x1 = 55;
  const x2 = 365;
  const midX = (x1 + x2) / 2;
  const topY = barY;
  const botY = barY + barH;
  const midLocalY = (topY + botY) / 2 + bend;
  const bendLabel = bend === 0 ? '' : bend > 0 ? ' · 새깅(sagging)' : ' · 호깅(hogging)';
  const ax = 20;
  const ay = h - 18;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 520, margin: '10px auto 0', display: 'block' }}>
      <path
        d={`M ${x1} ${topY} Q ${midX} ${topY + bend} ${x2} ${topY} L ${x2} ${botY} Q ${midX} ${botY + bend} ${x1} ${botY} Z`}
        fill="#F2F0EA"
        stroke="#51626F"
        strokeWidth="1.3"
      />
      {bend !== 0 && (
        <line x1={x1} y1={(topY + botY) / 2} x2={x2} y2={(topY + botY) / 2} stroke="#C3C3C3" strokeWidth="1" strokeDasharray="3 3" />
      )}
      <line x1={midX} y1={midLocalY - 30} x2={midX} y2={midLocalY + 30} stroke="#C3002F" strokeWidth="1.2" strokeDasharray="4 4" />
      <text x={midX} y={midLocalY - 35} fontSize="10" fill="#C3002F" textAnchor="middle" fontWeight="700">
        분석 단면 위치
      </text>
      <path d={`M ${x1 - 5} ${topY - 16} A 17 17 0 1 1 ${x1 - 5} ${botY + 16}`} fill="none" stroke="#51626F" strokeWidth="1.7" />
      <polygon points={`${x1 - 5},${botY + 16} ${x1 - 12},${botY + 7} ${x1 + 2},${botY + 9}`} fill="#51626F" />
      <path d={`M ${x2 + 5} ${topY - 16} A 17 17 0 1 0 ${x2 + 5} ${botY + 16}`} fill="none" stroke="#51626F" strokeWidth="1.7" />
      <polygon points={`${x2 + 5},${topY - 16} ${x2 - 2},${topY - 9} ${x2 + 12},${topY - 7}`} fill="#51626F" />
      <text x={x1 - 16} y={topY - 4} fontSize="12" fill="#51626F" fontWeight="800" textAnchor="end">
        M
      </text>
      <text x={x2 + 16} y={topY - 4} fontSize="12" fill="#51626F" fontWeight="800">
        M
      </text>
      <text x={midX} y={h - 8} fontSize="10.5" fill="var(--gray-soft)" textAnchor="middle">
        순수굽힘(pure bending) 가정 — M = {momentLabel}
        {bendLabel}
      </text>
      <line x1={ax} y1={ay} x2={ax} y2={ay - 24} stroke="#8A97A2" strokeWidth="1.3" />
      <polygon points={`${ax},${ay - 24} ${ax - 3},${ay - 18} ${ax + 3},${ay - 18}`} fill="#8A97A2" />
      <text x={ax + 6} y={ay - 20} fontSize="10" fill="#8A97A2" fontWeight="800">
        Y
      </text>
      <line x1={ax} y1={ay} x2={ax + 24} y2={ay} stroke="#8A97A2" strokeWidth="1.3" />
      <polygon points={`${ax + 24},${ay} ${ax + 18},${ay - 3} ${ax + 18},${ay + 3}`} fill="#8A97A2" />
      <text x={ax + 27} y={ay + 4} fontSize="10" fill="#8A97A2" fontWeight="800">
        X
      </text>
    </svg>
  );
}
