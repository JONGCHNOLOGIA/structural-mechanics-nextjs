// 문제 생성기 전용 단면 도식. blocks를 아래→위로 쌓아 그리고, 각 블록의 높이/재료 라벨을 표시한다.
// angleDeg가 있으면(Inclined Loads) 전체 단면을 그만큼 회전시켜 그린다.
export default function CrossSectionDiagram({ blocks, angleDeg = 0, widthLabel }) {
  const w = 300, h = 220;
  const cx = w / 2, cy = h / 2 + 10;
  const maxW = Math.max(...blocks.map((b) => b.widthPx || 90));
  const totalH = blocks.reduce((s, b) => s + b.heightPx, 0);

  let cum = 0;
  const rects = blocks.map((b) => {
    const bw = b.widthPx || 90;
    const y = cy + totalH / 2 - cum - b.heightPx;
    cum += b.heightPx;
    return { ...b, x: cx - bw / 2, y, w: bw };
  });

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 260, margin: '4px auto 0', display: 'block' }}>
      <g transform={`rotate(${angleDeg} ${cx} ${cy})`}>
        {rects.map((r, i) => (
          <g key={i}>
            <rect x={r.x} y={r.y} width={r.w} height={r.heightPx} fill={r.fill} stroke={r.stroke} strokeWidth="1.6" />
            <text x={cx + maxW / 2 + 10} y={r.y + r.heightPx / 2 + 4} fontSize="13" fontWeight="800" fill={r.stroke}>
              {r.label}
            </text>
            <text x={cx - maxW / 2 - 10} y={r.y + r.heightPx / 2 + 4} fontSize="12.5" fill={r.stroke} textAnchor="end">
              {r.heightLabel}
            </text>
          </g>
        ))}
        {widthLabel && (
          <text x={cx} y={cy + totalH / 2 + 20} fontSize="12.5" fill="#51626F" textAnchor="middle" fontWeight="700">
            {widthLabel}
          </text>
        )}
      </g>

      {/* y-z 축 (기울어진 단면에서는 회전 밖에 그려서 기준축을 명확히 보여줌) */}
      {angleDeg !== 0 && (
        <g>
          <line x1={cx} y1={cy + 4} x2={cx} y2={cy - totalH / 2 - 30} stroke="#8A97A2" strokeWidth="1.2" strokeDasharray="3 3" />
          <text x={cx + 5} y={cy - totalH / 2 - 32} fontSize="12.5" fill="#8A97A2" fontWeight="800">y</text>
          <line x1={cx - maxW / 2 - 34} y1={cy} x2={cx + maxW / 2 + 34} y2={cy} stroke="#8A97A2" strokeWidth="1.2" strokeDasharray="3 3" />
          <text x={cx + maxW / 2 + 38} y={cy + 4} fontSize="12.5" fill="#8A97A2" fontWeight="800">z</text>
          <text x={cx + 14} y={cy - 14} fontSize="12.5" fill="var(--gray-soft)">α</text>
        </g>
      )}
    </svg>
  );
}
