// 문제 생성기 전용 축하중 부재(봉) 도식. 고정단(해칭)/자유단, 구간 경계, 축하중 화살표를 표시한다.
// 구조역학 1의 CH.1(인장/압축)·CH.2(스프링상수/부정정/여러 구간 봉) 문제에서 공용으로 쓴다.
export default function AxialBarDiagram({ leftSupport = 'free', rightSupport = 'free', segments = [{ lengthFrac: 1, label: '' }], loads = [] }) {
  const w = 340, h = 150;
  const padL = 56, padR = 56;
  const barY = 66, barH = 26;
  const drawW = w - padL - padR;
  const xAt = (frac) => padL + frac * drawW;

  const hatchV = (x, dir) =>
    Array.from({ length: 6 }).map((_, i) => {
      const y = barY - barH / 2 - 8 + (i * (barH + 16)) / 5;
      return <line key={i} x1={x} y1={y} x2={x + dir * 10} y2={y + 8} stroke="#51626F" strokeWidth="1.2" />;
    });

  let cum = 0;
  const boundaries = [0];
  segments.forEach((s) => {
    cum += s.lengthFrac;
    boundaries.push(cum);
  });

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 320, margin: '4px auto 0', display: 'block' }}>
      <rect x={padL} y={barY - barH / 2} width={drawW} height={barH} fill="var(--crimson-soft)" fillOpacity="0.5" stroke="#51626F" strokeWidth="1.8" />

      {/* 구간 경계선 */}
      {boundaries.slice(1, -1).map((f, i) => (
        <line key={i} x1={xAt(f)} y1={barY - barH / 2 - 6} x2={xAt(f)} y2={barY + barH / 2 + 6} stroke="#8A97A2" strokeWidth="1.2" strokeDasharray="3 3" />
      ))}

      {/* 지지(고정단 해칭) */}
      {leftSupport === 'fixed' && (
        <g>
          <rect x={padL - 8} y={barY - barH / 2 - 10} width="8" height={barH + 20} fill="#51626F" />
          {hatchV(padL - 8, -1)}
        </g>
      )}
      {rightSupport === 'fixed' && (
        <g>
          <rect x={padL + drawW} y={barY - barH / 2 - 10} width="8" height={barH + 20} fill="#51626F" />
          {hatchV(padL + drawW + 8, 1)}
        </g>
      )}

      {/* 축하중 화살표 */}
      {loads.map((ld, i) => {
        const px = xAt(ld.posFrac);
        const dir = ld.dir ?? 1;
        const x2 = px + dir * 34;
        // 라벨을 화살표 끝 "바깥쪽"에 붙이면(원래 방식) posFrac=1(오른쪽 끝)에서 오른쪽으로
        // 뻗어나가는 tension 화살표의 라벨이 340px 뷰박스 밖으로 잘려나갔다 — 화살표 중앙 위에
        // 가운데 정렬로 놓아서 어느 방향이든 캔버스 안에 들어오게 한다.
        const midX = (px + x2) / 2;
        return (
          <g key={i}>
            <line x1={px} y1={barY} x2={x2 - dir * 8} y2={barY} stroke="#C3002F" strokeWidth="1.8" />
            <polygon points={`${x2},${barY} ${x2 - dir * 8},${barY - 4} ${x2 - dir * 8},${barY + 4}`} fill="#C3002F" />
            <text x={midX} y={barY - 10} fontSize="11" fontWeight="800" fill="#C3002F" textAnchor="middle">
              {ld.label}
            </text>
          </g>
        );
      })}

      {/* 구간 치수선 */}
      <line x1={padL} y1={barY + barH / 2 + 24} x2={padL + drawW} y2={barY + barH / 2 + 24} stroke="#8A97A2" strokeWidth="1" />
      {boundaries.map((f, i) => (
        <line key={i} x1={xAt(f)} y1={barY + barH / 2 + 20} x2={xAt(f)} y2={barY + barH / 2 + 28} stroke="#8A97A2" strokeWidth="1" />
      ))}
      {segments.map((s, i) => (
        <text key={i} x={xAt((boundaries[i] + boundaries[i + 1]) / 2)} y={barY + barH / 2 + 40} fontSize="10.5" fill="#51626F" textAnchor="middle" fontWeight="700">
          {s.label}
        </text>
      ))}
    </svg>
  );
}
