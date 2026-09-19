'use client';

import { fmt1 } from '@/lib/calc/units1';
import { Dim, DimLineH } from '../EditableDim';

// CH.4 소주제들이 공용으로 쓰는 보 그림들 — 원본의 beamDiagramSVG()/curveDiagramSVG()를 옮긴 것.

const GRAY = 'var(--gray)';
const CRIMSON = 'var(--crimson)';
const TEAL = 'var(--teal)';

// 보 개략도: 지점 기호 + 하중 화살표 + 반력 값.
// supports의 type은 'pin' | 'roller' | 'fixed' | 'slide'.
//
// L과 각 pos는 "왼쪽 SETTING MENU에서 고른 길이 단위 기준의 값"을 그대로 받는다 — 그림은 비율만
// 쓰므로 어떤 단위든 상관없고, 대신 치수 숫자를 그 단위 그대로 보여주고 고칠 수 있다.
// edit에 콜백을 넘긴 값만 클릭해서 수정할 수 있고, 안 넘긴 값(반력처럼 계산 결과인 것)은 글씨로만 나온다.
export function BeamSchematic({
  L,
  lengthUnit = '',
  forceUnit = '',
  qUnit = '',
  momentUnit = '',
  supports = [],
  pointLoads = [],
  udls = [],
  appliedMoments = [],
  reactions = [],
  edit = {},
}) {
  const w = 460, h = 206, padL = 40, padR = 40, beamY = 90;
  const X = (x) => padL + (x / L) * (w - padL - padR);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 460, margin: '0 auto', display: 'block', overflow: 'visible' }}>
      <line x1={X(0)} y1={beamY} x2={X(L)} y2={beamY} stroke={GRAY} strokeWidth="4" />

      {supports.map((sp, i) => {
        const x = X(sp.pos);
        if (sp.type === 'fixed') {
          const dir = sp.pos < L / 2 ? -1 : 1;
          return (
            <g key={`sp${i}`}>
              <line x1={x} y1={beamY - 24} x2={x} y2={beamY + 24} stroke="#51626F" strokeWidth="2" />
              {Array.from({ length: 6 }).map((_, k) => {
                const yy = beamY - 22 + k * 8;
                return <line key={k} x1={x} y1={yy} x2={x + dir * 9} y2={yy + 8} stroke="#8A97A2" strokeWidth="1.1" />;
              })}
            </g>
          );
        }
        if (sp.type === 'slide') {
          const dir = sp.pos < L / 2 ? -1 : 1;
          return (
            <g key={`sp${i}`}>
              <line x1={x} y1={beamY - 20} x2={x} y2={beamY + 20} stroke="#51626F" strokeWidth="1.6" />
              <line x1={x + dir * 7} y1={beamY - 20} x2={x + dir * 7} y2={beamY + 20} stroke="#51626F" strokeWidth="1.6" />
              {Array.from({ length: 5 }).map((_, k) => {
                const yy = beamY - 18 + k * 9;
                return <line key={k} x1={x + dir * 7} y1={yy} x2={x + dir * 14} y2={yy + 7} stroke="#8A97A2" strokeWidth="1" />;
              })}
              <text x={x} y={beamY + 34} fontSize="9" fill={GRAY} textAnchor="middle">sliding</text>
            </g>
          );
        }
        return (
          <g key={`sp${i}`}>
            <polygon points={`${x},${beamY} ${x - 12},${beamY + 20} ${x + 12},${beamY + 20}`} fill="none" stroke={GRAY} strokeWidth="1.6" />
            {sp.type === 'roller' && (
              <>
                <circle cx={x - 6} cy={beamY + 24} r="3" fill={GRAY} />
                <circle cx={x + 6} cy={beamY + 24} r="3" fill={GRAY} />
              </>
            )}
            <line x1={x - 16} y1={beamY + 22} x2={x + 16} y2={beamY + 22} stroke={GRAY} strokeWidth="1.2" />
          </g>
        );
      })}

      {pointLoads.map((p, i) => {
        const x = X(p.pos);
        return (
          <g key={`pl${i}`}>
            <line x1={x} y1={beamY - 40} x2={x} y2={beamY - 6} stroke={CRIMSON} strokeWidth="2.4" />
            <polygon points={`${x},${beamY - 4} ${x - 6},${beamY - 14} ${x + 6},${beamY - 14}`} fill={CRIMSON} />
            <Dim
              x={x}
              y={beamY - 46}
              color={CRIMSON}
              fontSize={10}
              value={p.P}
              unit={p.unit || forceUnit}
              prefix="P = "
              boxW={56}
              onChange={edit.pointLoadP ? (v) => edit.pointLoadP(i, v) : undefined}
            />
          </g>
        );
      })}

      {udls.map((u, i) => {
        const x1 = X(u.start), x2 = X(u.end);
        const q1 = u.q1 !== undefined ? u.q1 : u.q;
        const q2 = u.q2 !== undefined ? u.q2 : u.q;
        const qMaxAbs = Math.max(Math.abs(q1), Math.abs(q2)) || 1;
        // 화살표 시작 높이를 하중 세기에 비례시켜서, 삼각형 하중이면 실제로 삼각형으로 보이게 한다.
        const topY = (qq) => beamY - 8 - 20 * (Math.abs(qq) / qMaxAbs);
        const qLabel = u.q1 !== undefined ? `q: ${fmt1(q1, 1)}→${fmt1(q2, 1)}` : `q=${fmt1(u.q, 1)}`;
        return (
          <g key={`ud${i}`}>
            <line x1={x1} y1={topY(q1)} x2={x2} y2={topY(q2)} stroke={TEAL} strokeWidth="1.4" />
            {Array.from({ length: 7 }).map((_, k) => {
              const frac = k / 6;
              const xx = x1 + (x2 - x1) * frac;
              const qHere = q1 + (q2 - q1) * frac;
              const yy = topY(qHere);
              return (
                <g key={k}>
                  <line x1={xx} y1={yy} x2={xx} y2={beamY - 6} stroke={TEAL} strokeWidth="1.6" />
                  <polygon points={`${xx},${beamY - 4} ${xx - 4},${beamY - 11} ${xx + 4},${beamY - 11}`} fill={TEAL} />
                </g>
              );
            })}
            {u.q1 !== undefined ? (
              <text x={(x1 + x2) / 2} y={Math.min(topY(q1), topY(q2)) - 6} fontSize="9.5" fill={TEAL} textAnchor="middle" fontWeight="800">
                {qLabel}
              </text>
            ) : (
              <Dim
                x={(x1 + x2) / 2}
                y={Math.min(topY(q1), topY(q2)) - 6}
                color={TEAL}
                fontSize={9.5}
                value={u.q}
                unit={qUnit}
                prefix="q = "
                boxW={60}
                onChange={edit.udlQ ? (v) => edit.udlQ(i, v) : undefined}
              />
            )}
          </g>
        );
      })}

      {appliedMoments.map((mo, i) => {
        const x = X(mo.pos);
        return (
          <g key={`mo${i}`}>
            <path d={`M ${x - 14} ${beamY} A 14 14 0 1 1 ${x + 14} ${beamY}`} fill="none" stroke={CRIMSON} strokeWidth="2" />
            <Dim
              x={x}
              y={beamY - 20}
              color={CRIMSON}
              fontSize={10}
              value={mo.M}
              unit={momentUnit}
              prefix="M₀ = "
              boxW={60}
              min={null}
              onChange={edit.moment ? (v) => edit.moment(i, v) : undefined}
            />
          </g>
        );
      })}

      {reactions.map((r, i) => (
        <text key={`rc${i}`} x={X(r.pos)} y={beamY + 42} fontSize="9.5" fill={GRAY} textAnchor="middle">
          R={fmt1(r.R, 2)}
        </text>
      ))}

      {/* 하중이 어디에 걸려 있는지도 치수로 적어준다 — 스팬 치수선 바로 위 줄에 둔다. */}
      {pointLoads.map((p, i) =>
        p.pos > 0 && p.pos < L ? (
          <g key={`plpos${i}`}>
            <line x1={X(p.pos)} y1={beamY + 26} x2={X(p.pos)} y2={beamY + 52} stroke="var(--gray-soft)" strokeWidth="0.8" strokeDasharray="3 3" />
            <Dim
              x={X(p.pos) / 2 + X(0) / 2}
              y={beamY + 48}
              fontSize={9}
              color="var(--gray-soft)"
              value={p.pos}
              unit={lengthUnit}
              boxW={52}
              onChange={edit.pointLoadPos ? (v) => edit.pointLoadPos(i, v) : undefined}
            />
          </g>
        ) : null
      )}

      <text x={X(0)} y={beamY + 70} fontSize="9" fill="var(--gray-soft)" textAnchor="start">x=0</text>
      <DimLineH
        x1={X(0)}
        x2={X(L)}
        y={beamY + 76}
        labelDy={14}
        fontSize={10}
        value={L}
        unit={lengthUnit}
        prefix="L = "
        boxW={56}
        onChange={edit.L}
      />
    </svg>
  );
}

// SFD/BMD 곡선. 세로 스케일은 이 선도 안의 최댓값에 맞춰 늘린다 —
// 교재의 SFD/BMD도 같은 방식이고, 선도에서 읽어야 하는 건 "모양과 어디가 최대인가"이기 때문이다.
// 다만 눈금이 없으면 크기를 못 읽으므로 최대/최소 지점의 실제 값을 곡선 위에 적어준다.
export function CurveDiagram({ points, valueUnit, lengthUnit, symbol, totalLen }) {
  const w = 460, h = 190, padL = 50, padR = 20, padT = 18, padB = 34;
  const maxAbs = Math.max(1e-9, ...points.map((p) => Math.abs(p.y)));
  const plotW = w - padL - padR, plotH = h - padT - padB, zeroY = padT + plotH / 2;
  const X = (x) => padL + (x / totalLen) * plotW;
  const Y = (v) => zeroY - (v / maxAbs) * (plotH * 0.42);

  const d = points.map((p, i) => (i === 0 ? 'M' : 'L') + X(p.x) + ' ' + Y(p.y)).join(' ');
  const fillD = `${d} L ${X(points[points.length - 1].x)} ${zeroY} L ${X(points[0].x)} ${zeroY} Z`;

  // 위/아래로 가장 많이 나간 점 — 값을 읽을 수 있게 숫자를 붙인다.
  const peakPlus = points.reduce((a, p) => (p.y > a.y ? p : a), points[0]);
  const peakMinus = points.reduce((a, p) => (p.y < a.y ? p : a), points[0]);
  const marks = [];
  if (peakPlus.y > 1e-9) marks.push({ p: peakPlus, dy: -7 });
  if (peakMinus.y < -1e-9) marks.push({ p: peakMinus, dy: 15 });

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 460, margin: '8px auto 0', display: 'block' }}>
      <line x1={padL} y1={zeroY} x2={w - padR} y2={zeroY} stroke="#8A97A2" strokeWidth="1.2" />
      <line x1={padL} y1={padT} x2={padL} y2={h - padB} stroke="#8A97A2" strokeWidth="1.2" />
      <text x={(padL + w - padR) / 2} y={h - 8} fontSize="10.5" fill={GRAY} textAnchor="middle">
        위치 x (0 → {fmt1(totalLen, 2)} {lengthUnit})
      </text>
      <text x="16" y={padT + 10} fontSize="10.5" fill={GRAY}>
        {symbol}(x)
      </text>
      <path d={fillD} fill={CRIMSON} opacity="0.10" />
      <path d={d} fill="none" stroke={CRIMSON} strokeWidth="2.2" />
      {marks.map((m, i) => (
        <g key={i}>
          <circle cx={X(m.p.x)} cy={Y(m.p.y)} r="2.6" fill={CRIMSON} />
          <text
            x={Math.min(w - padR - 4, Math.max(padL + 4, X(m.p.x)))}
            y={Y(m.p.y) + m.dy}
            fontSize="9.5"
            fontWeight="800"
            fill={CRIMSON}
            textAnchor="middle"
          >
            {fmt1(m.p.y, 2)} {valueUnit}
          </text>
        </g>
      ))}
    </svg>
  );
}
