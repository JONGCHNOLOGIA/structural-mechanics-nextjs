// 문제 생성기 전용 하중도(beam loading diagram). 지점(단순/캔틸레버/돌출캔틸레버)과
// 하중(등분포/집중하중/모멘트)을 표준 공학 도식 관례(핀-롤러 삼각형, 고정단 해칭,
// 화살표)로 그린다. DeflectionCurveSVG의 지점 표기 스타일을 그대로 따름.
export default function BeamDiagram({ support = 'simple', spanLabel, loads = [], stepAtFrac }) {
  const w = 420, h = 170;
  const padL = 50, padR = 50;
  const beamY = 70;
  const drawW = w - padL - padR;
  const xAt = (frac) => padL + frac * drawW;

  const hatch = (x) =>
    Array.from({ length: 6 }).map((_, i) => (
      <line key={i} x1={x} y1={beamY - 22 + i * 9} x2={x - 10} y2={beamY - 14 + i * 9} stroke="#51626F" strokeWidth="1.2" />
    ));

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 420, margin: '4px auto 0', display: 'block' }}>
      <line x1={padL} y1={beamY} x2={padL + drawW} y2={beamY} stroke="#51626F" strokeWidth="3" />

      {/* 지점 */}
      {(support === 'cantilever' || support === 'propped') && (
        <g>
          <rect x={padL - 10} y={beamY - 26} width="10" height="52" fill="#51626F" />
          {hatch(padL - 10)}
        </g>
      )}
      {support === 'simple' && (
        <>
          <polygon points={`${padL},${beamY} ${padL - 9},${beamY + 16} ${padL + 9},${beamY + 16}`} fill="none" stroke="#51626F" strokeWidth="1.4" />
          <circle cx={padL - 9 + 6} cy={beamY + 20} r="2.2" fill="#51626F" />
          <circle cx={padL + 9 - 6} cy={beamY + 20} r="2.2" fill="#51626F" />
        </>
      )}
      {(support === 'simple' || support === 'propped') && (
        <>
          <polygon
            points={`${padL + drawW},${beamY} ${padL + drawW - 9},${beamY + 16} ${padL + drawW + 9},${beamY + 16}`}
            fill="none"
            stroke="#51626F"
            strokeWidth="1.4"
          />
          <circle cx={padL + drawW - 9 + 6} cy={beamY + 20} r="2.2" fill="#51626F" />
          <circle cx={padL + drawW + 9 - 6} cy={beamY + 20} r="2.2" fill="#51626F" />
        </>
      )}

      {/* 단면 전환 지점 (Nonprismatic) */}
      {stepAtFrac !== undefined && (
        <line x1={xAt(stepAtFrac)} y1={beamY - 30} x2={xAt(stepAtFrac)} y2={beamY + 4} stroke="#8A97A2" strokeWidth="1.2" strokeDasharray="3 3" />
      )}

      {/* 하중 */}
      {loads.map((ld, i) => {
        if (ld.kind === 'udl') {
          return (
            <g key={i}>
              {Array.from({ length: Math.floor(drawW / 24) + 1 }).map((_, k) => {
                const px = padL + k * 24;
                return (
                  <g key={k}>
                    <line x1={px} y1={beamY - 22} x2={px} y2={beamY - 3} stroke="#C3002F" strokeWidth="1.3" />
                    <polygon points={`${px},${beamY} ${px - 3.5},${beamY - 7} ${px + 3.5},${beamY - 7}`} fill="#C3002F" />
                  </g>
                );
              })}
              <text x={padL + drawW / 2} y={beamY - 27} fontSize="12" fontWeight="800" fill="#C3002F" textAnchor="middle">
                {ld.label || 'q'}
              </text>
            </g>
          );
        }
        if (ld.kind === 'point') {
          const px = xAt(ld.posFrac ?? 1);
          return (
            <g key={i}>
              <line x1={px} y1={beamY - 38} x2={px} y2={beamY - 3} stroke="#C3002F" strokeWidth="1.8" />
              <polygon points={`${px},${beamY} ${px - 5},${beamY - 9} ${px + 5},${beamY - 9}`} fill="#C3002F" />
              <text x={px} y={beamY - 42} fontSize="12" fontWeight="800" fill="#C3002F" textAnchor="middle">
                {ld.label || 'P'}
              </text>
            </g>
          );
        }
        if (ld.kind === 'moment') {
          const px = xAt(ld.posFrac ?? 1);
          return (
            <g key={i}>
              <path d={`M ${px - 13} ${beamY - 12} A 14 14 0 1 1 ${px + 7} ${beamY - 24}`} fill="none" stroke="#4A5FBF" strokeWidth="1.8" />
              <polygon points={`${px + 7},${beamY - 24} ${px},${beamY - 28} ${px + 3},${beamY - 17}`} fill="#4A5FBF" />
              <text x={px} y={beamY - 32} fontSize="12" fontWeight="800" fill="#4A5FBF" textAnchor="middle">
                {ld.label || 'M₀'}
              </text>
            </g>
          );
        }
        return null;
      })}

      {/* 스팬 치수선 */}
      <line x1={padL} y1={beamY + 34} x2={padL + drawW} y2={beamY + 34} stroke="#8A97A2" strokeWidth="1" />
      <line x1={padL} y1={beamY + 30} x2={padL} y2={beamY + 38} stroke="#8A97A2" strokeWidth="1" />
      <line x1={padL + drawW} y1={beamY + 30} x2={padL + drawW} y2={beamY + 38} stroke="#8A97A2" strokeWidth="1" />
      <text x={padL + drawW / 2} y={beamY + 50} fontSize="11" fill="#51626F" textAnchor="middle" fontWeight="700">
        {spanLabel}
      </text>
    </svg>
  );
}
