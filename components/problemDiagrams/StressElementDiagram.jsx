// 문제 생성기 전용 평면응력 요소 도식. 사각형 요소의 네 면에 σx, σy, τxy 화살표를 표시한다.
// (부호: 양수=면 바깥쪽으로 향하는 화살표(인장), 음수=안쪽(압축))
export default function StressElementDiagram({ sigmaX, sigmaY, tauXY, sigmaXLabel, sigmaYLabel, tauLabel }) {
  const w = 260, h = 220;
  const cx = w / 2, cy = h / 2;
  const s = 70; // half-size of square
  const x0 = cx - s, x1 = cx + s, y0 = cy - s, y1 = cy + s;

  const hasSx = sigmaX !== undefined && sigmaX !== 0;
  const hasSy = sigmaY !== undefined && sigmaY !== 0;
  const hasTau = tauXY !== undefined && tauXY !== 0;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 220, margin: '4px auto 0', display: 'block' }}>
      <rect x={x0} y={y0} width={2 * s} height={2 * s} fill="var(--crimson-soft)" fillOpacity="0.4" stroke="#51626F" strokeWidth="1.6" />

      {/* σx: 좌우 면 (양수면 바깥, 음수면 안쪽) */}
      {hasSx && (
        <>
          <line x1={sigmaX > 0 ? x1 + 4 : x1 - 4} y1={cy} x2={sigmaX > 0 ? x1 + 26 : x1 + 4} y2={cy} stroke="#C3002F" strokeWidth="1.8" />
          <polygon
            points={
              sigmaX > 0
                ? `${x1 + 26},${cy} ${x1 + 17},${cy - 4} ${x1 + 17},${cy + 4}`
                : `${x1 + 4},${cy} ${x1 + 13},${cy - 4} ${x1 + 13},${cy + 4}`
            }
            fill="#C3002F"
          />
          <line x1={sigmaX > 0 ? x0 - 26 : x0 - 4} y1={cy} x2={sigmaX > 0 ? x0 - 4 : x0 - 26} y2={cy} stroke="#C3002F" strokeWidth="1.8" />
          <polygon
            points={
              sigmaX > 0
                ? `${x0 - 26},${cy} ${x0 - 17},${cy - 4} ${x0 - 17},${cy + 4}`
                : `${x0 - 4},${cy} ${x0 - 13},${cy - 4} ${x0 - 13},${cy + 4}`
            }
            fill="#C3002F"
          />
          <text x={x1 + 30} y={cy - 6} fontSize="13.5" fontWeight="800" fill="#C3002F">{sigmaXLabel || 'σx'}</text>
        </>
      )}

      {/* σy: 상하 면 */}
      {hasSy && (
        <>
          <line x1={cx} y1={sigmaY > 0 ? y0 - 26 : y0 - 4} x2={cx} y2={sigmaY > 0 ? y0 - 4 : y0 - 26} stroke="#1E7F72" strokeWidth="1.8" />
          <polygon
            points={
              sigmaY > 0
                ? `${cx},${y0 - 26} ${cx - 4},${y0 - 17} ${cx + 4},${y0 - 17}`
                : `${cx},${y0 - 4} ${cx - 4},${y0 - 13} ${cx + 4},${y0 - 13}`
            }
            fill="#1E7F72"
          />
          <line x1={cx} y1={sigmaY > 0 ? y1 + 4 : y1 - 4} x2={cx} y2={sigmaY > 0 ? y1 + 26 : y1 + 4} stroke="#1E7F72" strokeWidth="1.8" />
          <polygon
            points={
              sigmaY > 0
                ? `${cx},${y1 + 26} ${cx - 4},${y1 + 17} ${cx + 4},${y1 + 17}`
                : `${cx},${y1 + 4} ${cx - 4},${y1 + 13} ${cx + 4},${y1 + 13}`
            }
            fill="#1E7F72"
          />
          <text x={cx + 8} y={y1 + 40} fontSize="13.5" fontWeight="800" fill="#1E7F72">{sigmaYLabel || 'σy'}</text>
        </>
      )}

      {/* τxy: 네 변을 따라 흐르는 전단 화살표 (양수 부호 관례) */}
      {hasTau && (
        <>
          <line x1={x0} y1={y0} x2={x0 + 44} y2={y0} stroke="#B0790A" strokeWidth="1.8" />
          <polygon points={`${x0 + 44},${y0} ${x0 + 36},${y0 - 4} ${x0 + 36},${y0 + 4}`} fill="#B0790A" />
          <line x1={x1} y1={y1} x2={x1 - 44} y2={y1} stroke="#B0790A" strokeWidth="1.8" />
          <polygon points={`${x1 - 44},${y1} ${x1 - 36},${y1 - 4} ${x1 - 36},${y1 + 4}`} fill="#B0790A" />
          <line x1={x1} y1={y0} x2={x1} y2={y0 + 44} stroke="#B0790A" strokeWidth="1.8" />
          <polygon points={`${x1},${y0 + 44} ${x1 - 4},${y0 + 36} ${x1 + 4},${y0 + 36}`} fill="#B0790A" />
          <line x1={x0} y1={y1} x2={x0} y2={y1 - 44} stroke="#B0790A" strokeWidth="1.8" />
          <polygon points={`${x0},${y1 - 44} ${x0 - 4},${y1 - 36} ${x0 + 4},${y1 - 36}`} fill="#B0790A" />
          <text x={x0 - 4} y={y0 - 8} fontSize="13.5" fontWeight="800" fill="#B0790A" textAnchor="end">{tauLabel || 'τxy'}</text>
        </>
      )}
    </svg>
  );
}
