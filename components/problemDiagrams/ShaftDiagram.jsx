// 문제 생성기 전용 원형축 도식. 축하중 P(수평 화살표), 굽힘모멘트 M / 비틀림모멘트 T(곡선 화살표)를 표시.
// show로 필요한 화살표만 켤 수 있다 — 구조역학 1의 순수 비틀림 문제는 T만 켜고 P/M은 끈다
// (기본값은 전부 켜짐이라, 이미 셋 다 쓰던 구조역학 2의 조합하중 축 문제는 그대로 동작한다).
export default function ShaftDiagram({ dLabel, PLabel, MLabel, TLabel, show = { P: true, M: true, T: true } }) {
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
      {show.P && (
        <>
          <line x1={x1 - 40} y1={cy} x2={x1 - 10} y2={cy} stroke="#C3002F" strokeWidth="1.8" />
          <polygon points={`${x1 - 10},${cy} ${x1 - 18},${cy - 4} ${x1 - 18},${cy + 4}`} fill="#C3002F" />
          {/* 라벨을 화살표 왼쪽 끝 바깥에 오른쪽정렬로 붙이면(원래 방식) 뷰박스(0~340) 왼쪽으로
              잘려나가는 걸 실측으로 확인했다 — 화살표 중앙 위에 가운데정렬로 옮긴다. */}
          <text x={(x1 - 40 + x1 - 10) / 2} y={cy - 10} fontSize="13.5" fontWeight="800" fill="#C3002F" textAnchor="middle">{PLabel}</text>
        </>
      )}

      {/* 굽힘모멘트 M (곡선 화살표, 세로 평면) */}
      {show.M && (
        <>
          <path d={`M ${x2 + 14} ${cy - ry} A 20 20 0 1 1 ${x2 + 14} ${cy + ry}`} fill="none" stroke="#4A5FBF" strokeWidth="1.8" />
          <polygon points={`${x2 + 14},${cy + ry} ${x2 + 7},${cy + ry - 9} ${x2 + 21},${cy + ry - 9}`} fill="#4A5FBF" />
          <text x={x2 + 48} y={cy - 2} fontSize="13.5" fontWeight="800" fill="#4A5FBF" textAnchor="middle">{MLabel}</text>
        </>
      )}

      {/* 비틀림모멘트 T (원형 화살표, 축 둘레) */}
      {show.T && (
        <>
          <path d={`M ${(x1 + x2) / 2 - 16} ${cy - ry - 6} A 16 7 0 1 1 ${(x1 + x2) / 2 + 16} ${cy - ry - 6}`} fill="none" stroke="#1E7F72" strokeWidth="1.8" />
          <polygon points={`${(x1 + x2) / 2 + 16},${cy - ry - 6} ${(x1 + x2) / 2 + 9},${cy - ry - 11} ${(x1 + x2) / 2 + 9},${cy - ry - 1}`} fill="#1E7F72" />
          <text x={(x1 + x2) / 2} y={cy - ry - 14} fontSize="13.5" fontWeight="800" fill="#1E7F72" textAnchor="middle">{TLabel}</text>
        </>
      )}

      <text x={(x1 + x2) / 2} y={h - 8} fontSize="13" fill="#51626F" textAnchor="middle" fontWeight="700">{dLabel}</text>
    </svg>
  );
}
