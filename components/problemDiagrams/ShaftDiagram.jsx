// 문제 생성기 전용 조합하중 원형축 도식. 축하중 P(수평 화살표), 굽힘모멘트 M / 비틀림모멘트 T(곡선 화살표)를 표시.
export default function ShaftDiagram({ dLabel, PLabel, MLabel, TLabel }) {
  const w = 340, h = 170;
  const cy = h / 2;
  const x1 = 90, x2 = 250;
  const ry = 26;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 320, margin: '4px auto 0', display: 'block' }}>
      <rect x={x1} y={cy - ry} width={x2 - x1} height={2 * ry} fill="var(--crimson-soft)" fillOpacity="0.5" stroke="#51626F" strokeWidth="2" />
      <ellipse cx={x1} cy={cy} rx="9" ry={ry} fill="var(--card)" stroke="#51626F" strokeWidth="1.6" />
      <ellipse cx={x2} cy={cy} rx="9" ry={ry} fill="none" stroke="#51626F" strokeWidth="1.6" />

      {/* 축하중 P */}
      <line x1={x1 - 40} y1={cy} x2={x1 - 10} y2={cy} stroke="#C3002F" strokeWidth="1.8" />
      <polygon points={`${x1 - 10},${cy} ${x1 - 18},${cy - 4} ${x1 - 18},${cy + 4}`} fill="#C3002F" />
      <text x={x1 - 45} y={cy - 6} fontSize="11" fontWeight="800" fill="#C3002F" textAnchor="end">{PLabel}</text>

      {/* 굽힘모멘트 M (곡선 화살표, 세로 평면) */}
      <path d={`M ${x2 + 14} ${cy - ry} A 20 20 0 1 1 ${x2 + 14} ${cy + ry}`} fill="none" stroke="#4A5FBF" strokeWidth="1.8" />
      <polygon points={`${x2 + 14},${cy + ry} ${x2 + 7},${cy + ry - 9} ${x2 + 21},${cy + ry - 9}`} fill="#4A5FBF" />
      <text x={x2 + 48} y={cy - 2} fontSize="11" fontWeight="800" fill="#4A5FBF" textAnchor="middle">{MLabel}</text>

      {/* 비틀림모멘트 T (원형 화살표, 축 둘레) */}
      <path d={`M ${(x1 + x2) / 2 - 16} ${cy - ry - 6} A 16 7 0 1 1 ${(x1 + x2) / 2 + 16} ${cy - ry - 6}`} fill="none" stroke="#1E7F72" strokeWidth="1.8" />
      <polygon points={`${(x1 + x2) / 2 + 16},${cy - ry - 6} ${(x1 + x2) / 2 + 9},${cy - ry - 11} ${(x1 + x2) / 2 + 9},${cy - ry - 1}`} fill="#1E7F72" />
      <text x={(x1 + x2) / 2} y={cy - ry - 14} fontSize="11" fontWeight="800" fill="#1E7F72" textAnchor="middle">{TLabel}</text>

      <text x={(x1 + x2) / 2} y={h - 8} fontSize="10.5" fill="#51626F" textAnchor="middle" fontWeight="700">{dLabel}</text>
    </svg>
  );
}
