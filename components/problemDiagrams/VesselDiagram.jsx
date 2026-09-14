// 문제 생성기 전용 압력용기 도식. kind='sphere'|'cylinder'
export default function VesselDiagram({ kind, rLabel, tLabel, pLabel }) {
  const w = 300, h = 200;
  const cx = w / 2, cy = h / 2;
  const R = 60;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 260, margin: '4px auto 0', display: 'block' }}>
      {kind === 'sphere' ? (
        <>
          <circle cx={cx} cy={cy} r={R} fill="var(--crimson-soft)" fillOpacity="0.5" stroke="#51626F" strokeWidth="2.2" />
          <circle cx={cx} cy={cy} r={R - 6} fill="none" stroke="#51626F" strokeWidth="1" strokeDasharray="3 3" />
        </>
      ) : (
        <>
          <rect x={cx - R} y={cy - 34} width={2 * R} height="68" fill="var(--crimson-soft)" fillOpacity="0.5" stroke="#51626F" strokeWidth="2.2" />
          <ellipse cx={cx - R} cy={cy} rx="10" ry="34" fill="var(--card)" stroke="#51626F" strokeWidth="1.6" />
          <ellipse cx={cx + R} cy={cy} rx="10" ry="34" fill="none" stroke="#51626F" strokeWidth="1.6" />
        </>
      )}

      {/* 압력 화살표 (안에서 밖으로) */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const x1 = cx + Math.cos(rad) * (R - 22);
        const y1 = cy + Math.sin(rad) * (R - 22) * (kind === 'sphere' ? 1 : 0.55);
        const x2 = cx + Math.cos(rad) * (R - 4);
        const y2 = cy + Math.sin(rad) * (R - 4) * (kind === 'sphere' ? 1 : 0.55);
        return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#C3002F" strokeWidth="1.6" markerEnd="url(#vesselArrow)" />;
      })}
      <defs>
        <marker id="vesselArrow" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#C3002F" />
        </marker>
      </defs>
      <text x={cx} y={cy - R - 14} fontSize="11" fontWeight="800" fill="#C3002F" textAnchor="middle">{pLabel}</text>

      {/* r, t 치수 표시 */}
      <line x1={cx} y1={cy} x2={cx + R * (kind === 'sphere' ? Math.SQRT1_2 : 1)} y2={cy - (kind === 'sphere' ? R * Math.SQRT1_2 : 0)} stroke="#51626F" strokeWidth="1" strokeDasharray="2 2" />
      <text x={cx + 20} y={cy - 8} fontSize="10" fill="#51626F">{rLabel}</text>
      <text x={cx} y={h - 12} fontSize="10" fill="#51626F" textAnchor="middle">{tLabel}</text>
    </svg>
  );
}
