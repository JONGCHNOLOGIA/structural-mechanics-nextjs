'use client';

/*
  여분력을 풀어준 구조(released structure)를 작게 그리는 읽기 전용 그림.

  참고자료 mmch10.pdf p.9~11의 손그림과 같은 역할이다 — 위쪽에 "실제 하중만 받는 released
  structure", 아래쪽에 "그 자리에 단위하중 1만 준 구조"를 나란히 놓고, 각각이 그 자리에서
  얼마나 움직이는지(δB·δbb 또는 θA·θaa)를 화살표로 짚어준다.

  편집은 위쪽 큰 보 그림에서 하고 여기는 과정을 보여주는 용도라, 드래그·클릭이 없다.
*/

const GRAY = '#51626F';
const TEAL = '#1E7F72';
const CRIMSON = '#C3002F';
const BLUE = '#2D6CDF';

export default function ReleasedStructureSVG({
  L,
  supports,
  loads = [],
  pts,
  dofX,
  dofKind = 'force', // 'force' → 처짐 화살표, 'moment' → 회전 표시
  dofLabel,
  caption,
  unit = false, // 단위하중 그림이면 하중을 "1"로만 표시
}) {
  const w = 300, h = 122;
  const padL = 26, padR = 26;
  const beamY = 58;
  const drawW = w - padL - padR;
  const xToPx = (x) => padL + (x / L) * drawW;

  const maxV = pts && pts.length ? Math.max(1e-12, ...pts.map((p) => Math.abs(p.v))) : 0;
  const bend = maxV > 0 ? 22 / maxV : 0;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: w, display: 'block' }}>
      {/* 변형 전 보 */}
      <rect x={padL} y={beamY - 3} width={drawW} height="6" fill="#E7E4DC" stroke={GRAY} strokeWidth="1" />

      {/* 지지단 */}
      {supports.map((s, i) => {
        const x = xToPx(s.x);
        if (s.type === 'fixed') {
          return (
            <g key={i}>
              <rect x={x - 3} y={beamY - 14} width="6" height="28" fill={GRAY} />
              {Array.from({ length: 4 }).map((_, k) => (
                <line key={k} x1={x - 3} y1={beamY - 11 + k * 7} x2={x - 10} y2={beamY - 6 + k * 7} stroke={GRAY} strokeWidth="1" />
              ))}
            </g>
          );
        }
        return (
          <g key={i}>
            <polygon points={`${x},${beamY + 3} ${x - 6},${beamY + 14} ${x + 6},${beamY + 14}`} fill="none" stroke={GRAY} strokeWidth="1.2" />
            {s.type === 'roller' && (
              <>
                <circle cx={x - 3} cy={beamY + 17} r="1.8" fill={GRAY} />
                <circle cx={x + 3} cy={beamY + 17} r="1.8" fill={GRAY} />
              </>
            )}
          </g>
        );
      })}

      {/* 하중 (모양만 — 값은 위쪽 큰 그림에 있다) */}
      {loads.map((l, i) => {
        if (l.kind === 'point') {
          const x = xToPx(l.x);
          const down = l.P >= 0;
          return (
            <g key={i}>
              <line x1={x} y1={down ? beamY - 26 : beamY + 26} x2={x} y2={down ? beamY - 5 : beamY + 5} stroke={TEAL} strokeWidth="1.6" />
              <polygon
                points={down ? `${x},${beamY - 3} ${x - 3.5},${beamY - 11} ${x + 3.5},${beamY - 11}`
                             : `${x},${beamY + 3} ${x - 3.5},${beamY + 11} ${x + 3.5},${beamY + 11}`}
                fill={TEAL}
              />
              {unit && <text x={x + 6} y={down ? beamY - 18 : beamY + 22} fontSize="10" fill={TEAL} fontWeight="800">1</text>}
            </g>
          );
        }
        if (l.kind === 'moment') {
          const x = xToPx(l.x);
          const cy = beamY - 20;
          const ccw = l.M0 >= 0;
          return (
            <g key={i}>
              <path
                d={`M ${x - 10} ${cy} A 10 10 0 1 ${ccw ? 1 : 0} ${x + 10} ${cy}`}
                fill="none" stroke={TEAL} strokeWidth="1.6"
              />
              <polygon points={`${x + 10},${cy} ${x + 5},${cy - 6} ${x + 15},${cy - 5}`} fill={TEAL} />
              <line x1={x} y1={cy + 10} x2={x} y2={beamY - 4} stroke={TEAL} strokeWidth="1" strokeDasharray="2 2" />
              {unit && <text x={x + 16} y={cy - 6} fontSize="10" fill={TEAL} fontWeight="800">1</text>}
            </g>
          );
        }
        // 분포하중
        const xS = xToPx(l.xStart), xE = xToPx(l.xEnd);
        const n = Math.max(2, Math.round((xE - xS) / 18));
        return (
          <g key={i}>
            <line x1={xS} y1={beamY - 22} x2={xE} y2={beamY - 22} stroke={TEAL} strokeWidth="1.2" />
            {Array.from({ length: n + 1 }).map((_, k) => {
              const x = xS + ((xE - xS) * k) / n;
              return (
                <g key={k}>
                  <line x1={x} y1={beamY - 22} x2={x} y2={beamY - 6} stroke={TEAL} strokeWidth="1" />
                  <polygon points={`${x},${beamY - 4} ${x - 2.5},${beamY - 10} ${x + 2.5},${beamY - 10}`} fill={TEAL} />
                </g>
              );
            })}
          </g>
        );
      })}

      {/* 변형 후 모양 */}
      {pts && pts.length > 1 && (
        <polyline
          points={pts.map((p) => `${xToPx(p.x)},${beamY + p.v * bend}`).join(' ')}
          fill="none" stroke={CRIMSON} strokeWidth="1.6" strokeDasharray="4 3"
        />
      )}

      {/* 그 자리가 얼마나 움직였는지 */}
      {pts && pts.length > 1 && dofX !== undefined && (() => {
        const i = Math.min(pts.length - 1, Math.max(0, Math.round((dofX / L) * (pts.length - 1))));
        const x = xToPx(dofX);
        const y = beamY + pts[i].v * bend;
        // 여분력 자리가 보 오른쪽 끝이면(가장 흔한 경우다) 라벨을 오른쪽에 붙일 자리가 없다 —
        // 그럴 땐 왼쪽으로 붙인다.
        const right = x > w * 0.7;
        const lx = right ? x - 6 : x + 6;
        const lanchor = right ? 'end' : 'start';
        if (dofKind === 'moment') {
          return (
            <g>
              <path d={`M ${x + 6} ${y - 9} A 11 11 0 0 1 ${x + 6} ${y + 9}`} fill="none" stroke={BLUE} strokeWidth="1.4" />
              <polygon points={`${x + 6},${y + 9} ${x + 11},${y + 3} ${x + 1},${y + 4}`} fill={BLUE} />
              <text x={right ? x - 8 : x + 19} y={y + 4} fontSize="10.5" fill={BLUE} fontWeight="800" textAnchor={lanchor}>{dofLabel}</text>
            </g>
          );
        }
        return (
          <g>
            <line x1={x} y1={beamY} x2={x} y2={y} stroke={BLUE} strokeWidth="1.4" />
            <polygon
              points={y > beamY ? `${x},${y} ${x - 3.5},${y - 7} ${x + 3.5},${y - 7}` : `${x},${y} ${x - 3.5},${y + 7} ${x + 3.5},${y + 7}`}
              fill={BLUE}
            />
            <text x={lx} y={(beamY + y) / 2 + 4} fontSize="10.5" fill={BLUE} fontWeight="800" textAnchor={lanchor}>{dofLabel}</text>
          </g>
        );
      })()}

      {caption && (
        <text x={w / 2} y={h - 6} fontSize="10.5" fill={GRAY} textAnchor="middle" fontWeight="700">
          {caption}
        </text>
      )}
    </svg>
  );
}
