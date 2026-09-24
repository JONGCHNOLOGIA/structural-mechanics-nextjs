// 문제 생성기 전용 단면 형상 도식. 사각형(b×h)이나 원형(d) 단면 하나를 그리고, 위쪽에 작용하는
// 하중(M/V/N) 라벨을 붙인다. 구조역학 1 CH.5(굽힘/전단응력) 문제에서 쓴다.
// h가 없으면(설계 문제처럼 구해야 하는 값이면) "h = ?"로 표시하고 테두리를 점선으로 그린다.
export default function SectionShapeDiagram({ shape = 'rectangular', b, h, d, topLabel }) {
  // combined-loading 문제의 topLabel처럼 "N = -5000 N, M = 3000 N·m" 같은 긴 라벨이나, 사각형이
  // 넓을 때 왼쪽으로 붙는 h 라벨이 실제로 캔버스 밖을 벗어나는 걸 렌더링 후 getBBox로 확인했다 —
  // 폭을 넉넉히 잡고 도형을 캔버스보다 좁게 그려서 라벨이 어느 쪽으로 번져도 안 잘리게 한다.
  const w = 280, vh = 210;
  const cx = w / 2, cy = vh / 2 + 6;

  if (shape === 'circular') {
    const r = 55;
    return (
      <svg viewBox={`0 0 ${w} ${vh}`} style={{ width: '100%', maxWidth: 250, margin: '4px auto 0', display: 'block' }}>
        <circle cx={cx} cy={cy} r={r} fill="var(--crimson-soft)" fillOpacity="0.5" stroke="#51626F" strokeWidth="1.8" />
        <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke="#8A97A2" strokeWidth="1" strokeDasharray="3 3" />
        <text x={cx} y={cy + r + 22} fontSize="13.5" fill="#51626F" textAnchor="middle" fontWeight="700">{`d = ${d} mm`}</text>
        {topLabel && (
          <text x={cx} y={cy - r - 14} fontSize="14.5" fontWeight="800" fill="#C3002F" textAnchor="middle">
            {topLabel}
          </text>
        )}
      </svg>
    );
  }

  const rw = Math.min(120, Math.max(50, b ? b * 1.1 : 80));
  const rh = h != null ? Math.min(130, Math.max(40, h * 1.1)) : 90;
  const x = cx - rw / 2, y = cy - rh / 2;
  return (
    <svg viewBox={`0 0 ${w} ${vh}`} style={{ width: '100%', maxWidth: 250, margin: '4px auto 0', display: 'block' }}>
      <rect x={x} y={y} width={rw} height={rh} fill="var(--crimson-soft)" fillOpacity="0.5" stroke="#51626F" strokeWidth="1.8" strokeDasharray={h == null ? '4 3' : undefined} />
      <text x={cx} y={y + rh + 18} fontSize="13.5" fill="#51626F" textAnchor="middle" fontWeight="700">{`b = ${b} mm`}</text>
      <text x={x - 10} y={cy + 4} fontSize="13.5" fill="#51626F" textAnchor="end" fontWeight="700">
        {h != null ? `h = ${h} mm` : 'h = ?'}
      </text>
      {topLabel && (
        <text x={cx} y={y - 14} fontSize="14.5" fontWeight="800" fill="#C3002F" textAnchor="middle">
          {topLabel}
        </text>
      )}
    </svg>
  );
}
