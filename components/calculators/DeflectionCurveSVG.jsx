// Ch9 계산기들이 공유하는 처짐곡선 시각화. points: [{x, v}], x/v는 m 단위(v: 아래로 +).
// support: 'simple'(양단 핀-롤러) | 'cantilever'(왼쪽 고정단)
export default function DeflectionCurveSVG({ points, L, support = 'simple', pointLoadAt, momentAt }) {
  const w = 620, h = 260;
  const padL = 40, padR = 40, padTop = 40, padBottom = 60;
  const drawW = w - padL - padR;
  const beamY = padTop;

  const xToPx = (x) => padL + (x / L) * drawW;
  const maxAbsV = Math.max(1e-12, ...points.map((p) => Math.abs(p.v)));
  const vScale = 70 / maxAbsV; // 화면에서 최대 70px 처짐으로 과장해서 보여줌
  const vToPx = (v) => beamY + v * vScale;

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xToPx(p.x).toFixed(2)} ${vToPx(p.v).toFixed(2)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 660, margin: '0 auto', display: 'block' }}>
      {/* 원래(변형 전) 보 */}
      <line x1={padL} y1={beamY} x2={padL + drawW} y2={beamY} stroke="#EAE7E0" strokeWidth="3" />

      {/* 지점 표시 */}
      {support === 'simple' && (
        <>
          <polygon points={`${padL},${beamY} ${padL - 9},${beamY + 16} ${padL + 9},${beamY + 16}`} fill="#51626F" />
          <polygon points={`${padL + drawW},${beamY} ${padL + drawW - 9},${beamY + 16} ${padL + drawW + 9},${beamY + 16}`} fill="none" stroke="#51626F" strokeWidth="1.4" />
          <circle cx={padL + drawW - 9 + 6} cy={beamY + 20} r="2.2" fill="#51626F" />
          <circle cx={padL + drawW + 9 - 6} cy={beamY + 20} r="2.2" fill="#51626F" />
        </>
      )}
      {support === 'cantilever' && (
        <g>
          <rect x={padL - 10} y={beamY - 26} width="10" height="52" fill="#51626F" />
          {Array.from({ length: 6 }).map((_, i) => (
            <line key={i} x1={padL - 10} y1={beamY - 22 + i * 9} x2={padL - 20} y2={beamY - 14 + i * 9} stroke="#51626F" strokeWidth="1.2" />
          ))}
        </g>
      )}

      {/* 하중 표시 */}
      {pointLoadAt !== undefined && (
        <g>
          <line x1={xToPx(pointLoadAt)} y1={beamY - 34} x2={xToPx(pointLoadAt)} y2={beamY - 4} stroke="#C3002F" strokeWidth="1.8" />
          <polygon points={`${xToPx(pointLoadAt)},${beamY} ${xToPx(pointLoadAt) - 5},${beamY - 9} ${xToPx(pointLoadAt) + 5},${beamY - 9}`} fill="#C3002F" />
          <text x={xToPx(pointLoadAt)} y={beamY - 38} fontSize="11" fontWeight="800" fill="#C3002F" textAnchor="middle">P</text>
        </g>
      )}
      {momentAt !== undefined && (
        <g>
          <path d={`M ${xToPx(momentAt) - 12} ${beamY - 14} A 14 14 0 1 1 ${xToPx(momentAt) + 6} ${beamY - 22}`} fill="none" stroke="#4A5FBF" strokeWidth="1.8" />
          <polygon points={`${xToPx(momentAt) + 6},${beamY - 22} ${xToPx(momentAt) - 1},${beamY - 26} ${xToPx(momentAt) + 2},${beamY - 15}`} fill="#4A5FBF" />
          <text x={xToPx(momentAt)} y={beamY - 30} fontSize="11" fontWeight="800" fill="#4A5FBF" textAnchor="middle">M₀</text>
        </g>
      )}
      {pointLoadAt === undefined && momentAt === undefined && (
        <g>
          {Array.from({ length: Math.floor(drawW / 22) + 1 }).map((_, i) => {
            const px = padL + i * 22;
            return <line key={i} x1={px} y1={beamY - 18} x2={px} y2={beamY - 2} stroke="#C3002F" strokeWidth="1.3" markerEnd="url(#arrow)" />;
          })}
          <text x={padL + drawW / 2} y={beamY - 24} fontSize="11" fontWeight="800" fill="#C3002F" textAnchor="middle">q</text>
        </g>
      )}

      {/* 처짐곡선 (과장) */}
      <path d={pathD} fill="none" stroke="#1E7F72" strokeWidth="2.2" />
      <text x={padL + drawW / 2} y={h - 16} fontSize="10.5" fill="#8A97A2" textAnchor="middle">
        처짐곡선 (화면 표시를 위해 세로 방향으로 과장됨)
      </text>
    </svg>
  );
}
