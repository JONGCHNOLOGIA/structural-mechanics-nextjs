'use client';

// 보 빌더(Bending-Moment Equation)의 VISUALIZER — 지지단·하중 아이콘을 실제 위치에 그림.
// support 아이콘: fixed=벽(해칭), pin=삼각형, roller=삼각형+원.
// load 아이콘: point=화살표(위=아래로 꽂힘, 아래=위로 꽂힘), udl/triangle=화살표 열+상단선, moment=곡선 화살표.

const GRAY = '#51626F';
const CRIMSON = '#C3002F';
const TEAL = '#1E7F72';

export default function BeamBuilderSVG({ L, spanLabel, supports, loads, selectedId, onSelect, maxAbsM, momentPts, maxAbsV, showDeflection }) {
  const w = 680;
  const beamY = 140;
  const padL = 40, padR = 40;
  const drawW = w - padL - padR;
  const xToPx = (x) => padL + (x / L) * drawW;

  const hasDiagram = Array.isArray(momentPts) && momentPts.length > 1;
  const diagH = 80;
  const diagTop = 220;
  const mToPx = (m) => diagTop + diagH / 2 - (maxAbsM > 0 ? (m / maxAbsM) * (diagH / 2 - 6) : 0);
  const h = hasDiagram ? diagTop + diagH + 30 : beamY + 110;

  const spanY = beamY + 60;
  const maxBendPx = 26;
  const bendScale = showDeflection && maxAbsV > 0 ? maxBendPx / maxAbsV : 0;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 720, margin: '0 auto', display: 'block', overflow: 'visible' }}>
      {/* 스팬 치수선 */}
      <line x1={padL} y1={spanY} x2={padL + drawW} y2={spanY} stroke="#8A97A2" strokeWidth="1" />
      <line x1={padL} y1={spanY - 4} x2={padL} y2={spanY + 4} stroke="#8A97A2" strokeWidth="1" />
      <line x1={padL + drawW} y1={spanY - 4} x2={padL + drawW} y2={spanY + 4} stroke="#8A97A2" strokeWidth="1" />
      <text x={padL + drawW / 2} y={spanY + 16} fontSize="12.5" fill="#8A97A2" textAnchor="middle" fontWeight="700">
        L = {spanLabel}
      </text>

      {/* 보 본체 */}
      <line x1={padL} y1={beamY} x2={padL + drawW} y2={beamY} stroke={GRAY} strokeWidth="4" />

      {/* 예상 처짐곡선 (점선, 실제 위치에 겹쳐서) */}
      {showDeflection && Array.isArray(momentPts) && momentPts.length > 1 && (
        <polyline
          points={momentPts.map((p) => `${xToPx(p.x)},${beamY + p.v * bendScale}`).join(' ')}
          fill="none"
          stroke={CRIMSON}
          strokeWidth="2"
          strokeDasharray="6 4"
        />
      )}

      {/* 지지단 */}
      {supports.map((s) => {
        const x = xToPx(s.x);
        const isSel = s.id === selectedId;
        const ring = isSel ? <circle cx={x} cy={beamY} r="18" fill="none" stroke={CRIMSON} strokeWidth="1.5" strokeDasharray="3 2" /> : null;
        if (s.type === 'fixed') {
          return (
            <g key={s.id} onClick={() => onSelect(s.id)} style={{ cursor: 'pointer' }}>
              {ring}
              <rect x={x - 5} y={beamY - 22} width="10" height="44" fill={GRAY} />
              {Array.from({ length: 6 }).map((_, i) => (
                <line key={i} x1={x - 5} y1={beamY - 18 + i * 8} x2={x - 15} y2={beamY - 10 + i * 8} stroke={GRAY} strokeWidth="1.2" />
              ))}
            </g>
          );
        }
        return (
          <g key={s.id} onClick={() => onSelect(s.id)} style={{ cursor: 'pointer' }}>
            {ring}
            <polygon points={`${x},${beamY} ${x - 10},${beamY + 17} ${x + 10},${beamY + 17}`} fill="none" stroke={GRAY} strokeWidth="1.6" />
            {s.type === 'roller' && (
              <>
                <circle cx={x - 5} cy={beamY + 21} r="2.5" fill={GRAY} />
                <circle cx={x + 5} cy={beamY + 21} r="2.5" fill={GRAY} />
              </>
            )}
          </g>
        );
      })}

      {/* 하중 */}
      {loads.map((l) => {
        const isSel = l.id === selectedId;
        const stroke = isSel ? CRIMSON : TEAL;
        if (l.kind === 'point') {
          const x = xToPx(l.x);
          const down = l.P >= 0;
          const y1 = down ? beamY - 40 : beamY + 40;
          const y2 = down ? beamY - 4 : beamY + 4;
          return (
            <g key={l.id} onClick={() => onSelect(l.id)} style={{ cursor: 'pointer' }}>
              <line x1={x} y1={y1} x2={x} y2={y2} stroke={stroke} strokeWidth="2" />
              <polygon
                points={
                  down
                    ? `${x},${y2 + 4} ${x - 5},${y2 - 6} ${x + 5},${y2 - 6}`
                    : `${x},${y2 - 4} ${x - 5},${y2 + 6} ${x + 5},${y2 + 6}`
                }
                fill={stroke}
              />
              <text x={x} y={down ? y1 - 6 : y1 + 16} fontSize="13" fontWeight="800" fill={stroke} textAnchor="middle">
                P
              </text>
            </g>
          );
        }
        if (l.kind === 'udl' || l.kind === 'triangle') {
          const xS = xToPx(l.xStart), xE = xToPx(l.xEnd);
          const qStart = l.kind === 'udl' ? l.q : l.qStart;
          const qEnd = l.kind === 'udl' ? l.q : l.qEnd;
          const maxQ = Math.max(Math.abs(qStart), Math.abs(qEnd), 1e-9);
          const scale = 34 / maxQ;
          const n = Math.max(2, Math.round((xE - xS) / 22));
          const arrows = [];
          for (let i = 0; i <= n; i++) {
            const t = i / n;
            const x = xS + (xE - xS) * t;
            const q = qStart + (qEnd - qStart) * t;
            const down = q >= 0;
            const len = Math.max(6, Math.abs(q) * scale);
            const yTail = down ? beamY - 6 - len : beamY + 6 + len;
            const yHead = down ? beamY - 6 : beamY + 6;
            arrows.push(
              <g key={i}>
                <line x1={x} y1={yTail} x2={x} y2={yHead} stroke={stroke} strokeWidth="1.4" />
                <polygon
                  points={
                    down
                      ? `${x},${yHead + 3} ${x - 3.5},${yHead - 5} ${x + 3.5},${yHead - 5}`
                      : `${x},${yHead - 3} ${x - 3.5},${yHead + 5} ${x + 3.5},${yHead + 5}`
                  }
                  fill={stroke}
                />
              </g>
            );
          }
          const topPts = Array.from({ length: n + 1 }).map((_, i) => {
            const t = i / n;
            const x = xS + (xE - xS) * t;
            const q = qStart + (qEnd - qStart) * t;
            const down = q >= 0;
            const len = Math.max(6, Math.abs(q) * scale);
            const y = down ? beamY - 6 - len : beamY + 6 + len;
            return `${x},${y}`;
          });
          return (
            <g key={l.id} onClick={() => onSelect(l.id)} style={{ cursor: 'pointer' }}>
              <polyline points={topPts.join(' ')} fill="none" stroke={stroke} strokeWidth="1.4" />
              {arrows}
              <text x={(xS + xE) / 2} y={beamY - 6 - 34 - 8} fontSize="13" fontWeight="800" fill={stroke} textAnchor="middle">
                {l.kind === 'udl' ? 'q' : 'q(x)'}
              </text>
            </g>
          );
        }
        if (l.kind === 'moment') {
          const x = xToPx(l.x);
          const ccw = l.M0 >= 0;
          const r = 16;
          const cy = beamY - 34;
          const start = ccw ? -0.3 : Math.PI + 0.3;
          const end = ccw ? Math.PI - 0.3 : -Math.PI + 0.3;
          const large = 0;
          const p1 = { x: x + r * Math.cos(start), y: cy + r * Math.sin(start) };
          const p2 = { x: x + r * Math.cos(end), y: cy + r * Math.sin(end) };
          const sweep = ccw ? 0 : 1;
          const tipAng = end + (ccw ? -0.5 : 0.5);
          return (
            <g key={l.id} onClick={() => onSelect(l.id)} style={{ cursor: 'pointer' }}>
              <path d={`M ${p1.x} ${p1.y} A ${r} ${r} 0 ${large} ${sweep} ${p2.x} ${p2.y}`} fill="none" stroke={stroke} strokeWidth="2" />
              <polygon
                points={`${p2.x},${p2.y} ${p2.x - 6 * Math.cos(tipAng - 0.4)},${p2.y - 6 * Math.sin(tipAng - 0.4)} ${p2.x - 6 * Math.cos(tipAng + 0.4)},${p2.y - 6 * Math.sin(tipAng + 0.4)}`}
                fill={stroke}
              />
              <line x1={x} y1={cy + r} x2={x} y2={beamY} stroke={stroke} strokeWidth="1.2" strokeDasharray="2 2" />
              <text x={x} y={cy - r - 6} fontSize="13" fontWeight="800" fill={stroke} textAnchor="middle">
                M₀
              </text>
            </g>
          );
        }
        return null;
      })}

      {/* M(x) 다이어그램 */}
      {hasDiagram && (
        <g>
          <line x1={padL} y1={diagTop + diagH / 2} x2={padL + drawW} y2={diagTop + diagH / 2} stroke="#8A97A2" strokeWidth="1" />
          <polyline
            points={momentPts.map((p) => `${xToPx(p.x)},${mToPx(p.M)}`).join(' ')}
            fill="none"
            stroke={CRIMSON}
            strokeWidth="1.8"
          />
          <text x={padL} y={diagTop - 8} fontSize="12.5" fill="#8A97A2" fontWeight="700">
            M(x) 다이어그램
          </text>
        </g>
      )}
    </svg>
  );
}
