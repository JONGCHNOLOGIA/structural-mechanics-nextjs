import { Dim, DimLineH } from './EditableDim';

// Ch9 계산기들이 공유하는 처짐곡선 시각화. points: [{x, v}], x/v는 m 단위(v: 아래로 +).
// support: 'simple'(양단 핀-롤러) | 'cantilever'(왼쪽 고정단)
//
// 치수 표기용 값(LDisp/loadValue)은 그림 축척과 무관하게 "화면에 적을 숫자"로만 쓴다 — 계산은
// 계속 m/N 기준(L, points)으로 하고, 라벨만 SETTING MENU에서 고른 단위로 보여주기 위해서다.
// onEditL/onEditLoad를 넘기면 그 숫자를 클릭해서 바로 고칠 수 있다.
export default function DeflectionCurveSVG({
  points,
  L,
  support = 'simple',
  pointLoadAt,
  momentAt,
  LDisp,
  lengthUnit = '',
  onEditL,
  loadValue,
  loadUnit = '',
  onEditLoad,
}) {
  const w = 620, h = 300;
  const padL = 40, padR = 40, padTop = 58, padBottom = 60;
  const drawW = w - padL - padR;
  const beamY = padTop;

  const xToPx = (x) => padL + (x / L) * drawW;
  const maxAbsV = Math.max(1e-12, ...points.map((p) => Math.abs(p.v)));
  const vScale = 70 / maxAbsV; // 화면에서 최대 70px 처짐으로 과장해서 보여줌
  const vToPx = (v) => beamY + v * vScale;

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xToPx(p.x).toFixed(2)} ${vToPx(p.v).toFixed(2)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 660, margin: '0 auto', display: 'block', overflow: 'visible' }}>
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
      {/* 돌출 캔틸레버: 왼쪽 고정단 + 오른쪽 롤러 */}
      {support === 'propped' && (
        <g>
          <rect x={padL - 10} y={beamY - 26} width="10" height="52" fill="#51626F" />
          {Array.from({ length: 6 }).map((_, i) => (
            <line key={i} x1={padL - 10} y1={beamY - 22 + i * 9} x2={padL - 20} y2={beamY - 14 + i * 9} stroke="#51626F" strokeWidth="1.2" />
          ))}
          <polygon points={`${padL + drawW},${beamY} ${padL + drawW - 9},${beamY + 16} ${padL + drawW + 9},${beamY + 16}`} fill="none" stroke="#51626F" strokeWidth="1.4" />
          <circle cx={padL + drawW - 9 + 6} cy={beamY + 20} r="2.2" fill="#51626F" />
          <circle cx={padL + drawW + 9 - 6} cy={beamY + 20} r="2.2" fill="#51626F" />
        </g>
      )}
      {/* 양단고정 */}
      {support === 'fixed-fixed' && (
        <g>
          <rect x={padL - 10} y={beamY - 26} width="10" height="52" fill="#51626F" />
          {Array.from({ length: 6 }).map((_, i) => (
            <line key={i} x1={padL - 10} y1={beamY - 22 + i * 9} x2={padL - 20} y2={beamY - 14 + i * 9} stroke="#51626F" strokeWidth="1.2" />
          ))}
          <rect x={padL + drawW} y={beamY - 26} width="10" height="52" fill="#51626F" />
          {Array.from({ length: 6 }).map((_, i) => (
            <line key={i} x1={padL + drawW + 10} y1={beamY - 22 + i * 9} x2={padL + drawW + 20} y2={beamY - 14 + i * 9} stroke="#51626F" strokeWidth="1.2" />
          ))}
        </g>
      )}

      {/* 하중 표시 */}
      {pointLoadAt !== undefined && (
        <g>
          <line x1={xToPx(pointLoadAt)} y1={beamY - 34} x2={xToPx(pointLoadAt)} y2={beamY - 4} stroke="#C3002F" strokeWidth="1.8" />
          <polygon points={`${xToPx(pointLoadAt)},${beamY} ${xToPx(pointLoadAt) - 5},${beamY - 9} ${xToPx(pointLoadAt) + 5},${beamY - 9}`} fill="#C3002F" />
          <Dim
            x={xToPx(pointLoadAt)}
            y={beamY - 38}
            color="#C3002F"
            fontSize={12.5}
            value={loadValue}
            unit={loadUnit}
            prefix="P = "
            boxW={64}
            onChange={onEditLoad}
          />
        </g>
      )}
      {momentAt !== undefined && (
        <g>
          <path d={`M ${xToPx(momentAt) - 12} ${beamY - 14} A 14 14 0 1 1 ${xToPx(momentAt) + 6} ${beamY - 22}`} fill="none" stroke="#4A5FBF" strokeWidth="1.8" />
          <polygon points={`${xToPx(momentAt) + 6},${beamY - 22} ${xToPx(momentAt) - 1},${beamY - 26} ${xToPx(momentAt) + 2},${beamY - 15}`} fill="#4A5FBF" />
          <Dim
            x={xToPx(momentAt)}
            y={beamY - 30}
            color="#4A5FBF"
            fontSize={12.5}
            value={loadValue}
            unit={loadUnit}
            prefix="M₀ = "
            boxW={64}
            min={null}
            onChange={onEditLoad}
          />
        </g>
      )}
      {pointLoadAt === undefined && momentAt === undefined && (
        <g>
          {Array.from({ length: Math.floor(drawW / 22) + 1 }).map((_, i) => {
            const px = padL + i * 22;
            return <line key={i} x1={px} y1={beamY - 18} x2={px} y2={beamY - 2} stroke="#C3002F" strokeWidth="1.3" markerEnd="url(#arrow)" />;
          })}
          <Dim
            x={padL + drawW / 2}
            y={beamY - 24}
            color="#C3002F"
            fontSize={12.5}
            value={loadValue}
            unit={loadUnit}
            prefix="q = "
            boxW={68}
            onChange={onEditLoad}
          />
        </g>
      )}

      {/* 처짐곡선 (과장) */}
      <path d={pathD} fill="none" stroke="#1E7F72" strokeWidth="2.2" />

      {/* 스팬 치수선 — 처짐곡선이 가장 많이 내려간 자리보다 아래에 긋는다. */}
      <DimLineH
        x1={padL}
        x2={padL + drawW}
        y={h - 52}
        labelDy={15}
        fontSize={12}
        value={LDisp !== undefined ? LDisp : L}
        unit={lengthUnit}
        prefix="L = "
        boxW={64}
        onChange={onEditL}
      />
      <text x={padL + drawW / 2} y={h - 12} fontSize="13" fill="#8A97A2" textAnchor="middle">
        처짐곡선 (화면 표시를 위해 세로 방향으로 과장됨)
      </text>
    </svg>
  );
}
