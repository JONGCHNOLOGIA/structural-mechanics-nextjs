// 문제 생성기 전용 단면 M·V 도식. 직사각형 단면에 굽힘모멘트/전단력을 표시하고
// 중립축에서 y만큼 떨어진 분석 지점을 점으로 찍어준다.
export default function MaxStressPointDiagram({ widthLabel, heightLabel, MLabel, VLabel, yFrac }) {
  const w = 260, h = 220;
  const cx = w / 2, cy = h / 2;
  const rw = 90, rh = 130;
  const x0 = cx - rw / 2, y0 = cy - rh / 2;
  const pointY = cy - yFrac * (rh / 2);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 220, margin: '4px auto 0', display: 'block' }}>
      <rect x={x0} y={y0} width={rw} height={rh} fill="var(--crimson-soft)" fillOpacity="0.4" stroke="#51626F" strokeWidth="1.6" />
      <line x1={x0 - 14} y1={cy} x2={x0 + rw + 14} y2={cy} stroke="#8A97A2" strokeWidth="1" strokeDasharray="4 3" />
      <text x={x0 - 18} y={cy + 4} fontSize="9.5" fill="#8A97A2" textAnchor="end">N.A.</text>

      <circle cx={cx} cy={pointY} r="4" fill="#C3002F" />
      <text x={cx + 10} y={pointY + 4} fontSize="10.5" fontWeight="800" fill="#C3002F">분석점</text>

      <text x={x0 - 10} y={cy + 4} fontSize="10" fill="#51626F" textAnchor="end" />
      <text x={cx} y={y0 - 34} fontSize="12" fontWeight="800" fill="#4A5FBF" textAnchor="middle">{MLabel}</text>
      <text x={cx} y={y0 - 16} fontSize="12" fontWeight="800" fill="#1E7F72" textAnchor="middle">{VLabel}</text>

      <text x={cx} y={y0 + rh + 18} fontSize="10" fill="#51626F" textAnchor="middle" fontWeight="700">{widthLabel}</text>
      <text x={x0 - 8} y={cy} fontSize="10" fill="#51626F" textAnchor="end" transform={`rotate(-90 ${x0 - 8} ${cy})`}>{heightLabel}</text>
    </svg>
  );
}
