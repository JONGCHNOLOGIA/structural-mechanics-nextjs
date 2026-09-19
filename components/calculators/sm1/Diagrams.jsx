'use client';

import { fmt1 } from '@/lib/calc/units1';
import EditableText from '@/components/EditableText';
import { DimLineH } from '../EditableDim';

// 구조역학 1에서 여러 소주제가 공용으로 쓰는 그림들.
// 원본 프로토타입의 axisPlaneNoteSVG() / axialForceDiagramBlock() / axialFBDBlock() / stepDiagramSVG()를
// 좌표·색·문구 그대로 JSX로 옮긴 것.

const TEAL = 'var(--teal)';
const CRIMSON = 'var(--crimson)';
const GRAY = 'var(--gray)';

// 지금 보고 있는 단면이 어느 평면인지 알려주는 작은 축 그림
export function AxisPlaneNote() {
  return (
    <div className="axis-note">
      <svg width="52" height="52" viewBox="0 0 52 52">
        <line x1="10" y1="42" x2="42" y2="42" stroke={CRIMSON} strokeWidth="1.8" />
        <polygon points="42,42 36,39 36,45" fill={CRIMSON} />
        <text x="45" y="46" fontSize="9" fill={CRIMSON} fontWeight="800">x</text>
        <line x1="10" y1="42" x2="10" y2="12" stroke={TEAL} strokeWidth="1.8" />
        <polygon points="10,12 7,18 13,18" fill={TEAL} />
        <text x="4" y="10" fontSize="9" fill={TEAL} fontWeight="800">y</text>
        <line x1="10" y1="42" x2="26" y2="30" stroke={GRAY} strokeWidth="1.8" />
        <polygon points="26,30 19,30 22,35" fill={GRAY} />
        <text x="28" y="27" fontSize="9" fill={GRAY} fontWeight="800">z</text>
        <polygon points="10,12 26,20 26,40 10,42" fill={CRIMSON} opacity="0.14" stroke={CRIMSON} strokeWidth="1" />
      </svg>
      <EditableText
        as="div"
        contentKey="diagrams.axisPlaneNote"
        defaultText="지금 보고 있는 단면은 부재 길이방향(**x축**)에 **수직인 y-z 평면**입니다. 하중 P는 x축 방향으로 작용합니다."
      />
    </div>
  );
}

// 축력도 N(x) — 축하중만 받는 부재는 전 구간에서 N(x)=P로 일정하다.
export function AxialForceDiagram({ signedP, L, unitP, unitL, onEditL }) {
  // 아래쪽에 부재 길이 치수선을 넣을 자리를 두려고 높이를 170에서 늘렸다.
  const w = 440, h = 196, padL = 46, padR = 20, padT = 16, padB = 56;
  const plotW = w - padL - padR, plotH = h - padT - padB, zeroY = padT + plotH / 2;
  const amp = signedP === 0 ? 0 : (signedP > 0 ? -1 : 1) * plotH * 0.36;
  const lineY = zeroY + amp;
  const color = signedP >= 0 ? TEAL : CRIMSON;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 460, margin: '8px auto 0', display: 'block', overflow: 'visible' }}>
      <line x1={padL} y1={zeroY} x2={w - padR} y2={zeroY} stroke="#8A97A2" strokeWidth="1.2" />
      <line x1={padL} y1={padT} x2={padL} y2={h - padB} stroke="#8A97A2" strokeWidth="1.2" />
      {/* 부재 길이 L 치수 — 글씨로만 적던 걸 치수선으로 바꾸고, 클릭해서 고칠 수 있게 했다. */}
      <DimLineH
        x1={padL}
        x2={w - padR}
        y={h - padB + 20}
        labelDy={14}
        fontSize={10.5}
        color={GRAY}
        value={L}
        unit={unitL}
        prefix="L = "
        boxW={56}
        onChange={onEditL}
      />
      <text x="14" y={padT + 10} fontSize="10.5" fill={GRAY}>N(x)</text>
      <line x1={padL} y1={lineY} x2={w - padR} y2={lineY} stroke={color} strokeWidth="2.6" />
      <line x1={padL} y1={zeroY} x2={padL} y2={lineY} stroke={color} strokeWidth="1.2" strokeDasharray="3 2" />
      <line x1={w - padR} y1={zeroY} x2={w - padR} y2={lineY} stroke={color} strokeWidth="1.2" strokeDasharray="3 2" />
      <text x={(padL + w - padR) / 2} y={lineY + (amp < 0 ? -8 : 18)} fontSize="11.5" fontWeight="800" fill={color} textAnchor="middle">
        N(x) = {fmt1(signedP, 2)} {unitP} (전 구간 일정)
      </text>
    </svg>
  );
}

export function AxialForceDiagramBlock({ signedP, L, unitP, unitL, onEditL }) {
  return (
    <>
      <h3 style={{ marginTop: 20 }}>축력도 N(x) — Axial Force Diagram</h3>
      <AxialForceDiagram signedP={signedP} L={L} unitP={unitP} unitL={unitL} onEditL={onEditL} />
      <EditableText
        as="div"
        className="hint"
        contentKey="diagrams.axialForceHint"
        defaultText="축하중만 받는 부재이므로 부재 내부 어디를 잘라도 내력은 P로 동일합니다. (전단력/굽힘모멘트는 발생하지 않음 — SFD/BMD는 횡하중을 받는 보(beam)에서만 정의됩니다.)"
      />
    </>
  );
}

// 자유물체도 — 반력 R, 적용하중 P, 가상 절단면에서 드러나는 내력 N을 같이 보여준다.
export function AxialFBD({ P, unitP, sign, reactionLabel, appliedLabel }) {
  const w = 460, h = 170, gapHalf = 14, cx = 230, barLen = 200, barY = 88;
  const color = sign >= 0 ? TEAL : CRIMSON;
  const x1 = cx - barLen / 2, x2 = cx + barLen / 2;
  const leftSegEnd = cx - gapHalf, rightSegStart = cx + gapHalf;
  const endDir = sign >= 0 ? -1 : 1;
  const cutDirLeft = sign >= 0 ? 1 : -1;

  const arrow = (x, dir, key) => {
    const len = 30, ax2 = x + dir * len;
    return (
      <g key={key}>
        <line x1={x} y1={barY} x2={ax2} y2={barY} stroke={color} strokeWidth="2.6" />
        <polygon points={`${ax2},${barY} ${ax2 - dir * 9},${barY - 6} ${ax2 - dir * 9},${barY + 6}`} fill={color} />
      </g>
    );
  };

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 460, margin: '8px auto 0', display: 'block' }}>
      <line x1={x1} y1={barY} x2={leftSegEnd} y2={barY} stroke={GRAY} strokeWidth="4" />
      <line x1={rightSegStart} y1={barY} x2={x2} y2={barY} stroke={GRAY} strokeWidth="4" />
      {arrow(x1, endDir, 'r')}
      <text x={x1 + endDir * 44} y={barY - 12} fontSize="10.5" fontWeight="800" fill={color} textAnchor="middle">
        {reactionLabel}
      </text>
      {arrow(x2, -endDir, 'p')}
      <text x={x2 - endDir * 44} y={barY - 12} fontSize="10.5" fontWeight="800" fill={color} textAnchor="middle">
        {appliedLabel}
      </text>
      {arrow(leftSegEnd, cutDirLeft, 'cl')}
      {arrow(rightSegStart, -cutDirLeft, 'cr')}
      <text x={cx} y={barY + 34} fontSize="11" fontWeight="800" fill={color} textAnchor="middle">
        N = {fmt1(P, 2)} {unitP}
      </text>
      <text x={cx} y={barY - 46} fontSize="10" fill={GRAY} textAnchor="middle">
        가상의 절단면 (method of sections)
      </text>
    </svg>
  );
}

export function AxialFBDBlock({ P, unitP, sign, reactionLabel, appliedLabel }) {
  return (
    <>
      <h3 style={{ marginTop: 20 }}>자유물체도 (Free Body Diagram)</h3>
      <AxialFBD P={P} unitP={unitP} sign={sign} reactionLabel={reactionLabel} appliedLabel={appliedLabel} />
      <div className="hint">
        <b>{sign >= 0 ? '인장' : '압축'}:</b>{' '}
        <EditableText
          as="span"
          contentKey="diagrams.axialFbdHint"
          defaultText="지지부 반력과 하중이 서로 반대방향으로 작용해 평형(ΣF=0)을 이루고, 부재를 가상으로 자르면 어느 위치에서나 내부 축력 N이 동일하게 노출됩니다."
        />
      </div>
    </>
  );
}

// 구간마다 값이 계단식으로 바뀌는 다이어그램 (비균일 부재의 N-x, 다구간 축의 T-x 등에 공용)
export function StepDiagram({ segments, valueUnit, lengthUnit, quantitySymbol }) {
  const w = 460, h = 190, padL = 50, padR = 20, padT = 18, padB = 34;
  const totalLen = segments.reduce((a, s) => a + s.length, 0) || 1;
  const maxAbs = Math.max(1e-9, ...segments.map((s) => Math.abs(s.value)));
  const plotW = w - padL - padR, plotH = h - padT - padB, zeroY = padT + plotH / 2;
  const X = (x) => padL + (x / totalLen) * plotW;
  const Y = (v) => zeroY - (v / maxAbs) * (plotH * 0.42);

  let cx = 0;
  const parts = segments.map((seg, i) => {
    const x1 = X(cx), x2 = X(cx + seg.length), y = Y(seg.value);
    const color = seg.value >= 0 ? TEAL : CRIMSON;
    cx += seg.length;
    return (
      <g key={i}>
        <line x1={x1} y1={zeroY} x2={x1} y2={y} stroke={color} strokeWidth="1.2" strokeDasharray="3 2" />
        <line x1={x1} y1={y} x2={x2} y2={y} stroke={color} strokeWidth="2.6" />
        <line x1={x2} y1={zeroY} x2={x2} y2={y} stroke={color} strokeWidth="1.2" strokeDasharray="3 2" />
        <text x={(x1 + x2) / 2} y={y + (seg.value >= 0 ? -8 : 18)} fontSize="10" fontWeight="800" fill={color} textAnchor="middle">
          {fmt1(seg.value, 2)} {valueUnit}
        </text>
      </g>
    );
  });

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 460, margin: '8px auto 0', display: 'block' }}>
      <line x1={padL} y1={zeroY} x2={w - padR} y2={zeroY} stroke="#8A97A2" strokeWidth="1.2" />
      <line x1={padL} y1={padT} x2={padL} y2={h - padB} stroke="#8A97A2" strokeWidth="1.2" />
      <text x={(padL + w - padR) / 2} y={h - 8} fontSize="10.5" fill={GRAY} textAnchor="middle">
        위치 x (0 → {fmt1(totalLen, 2)} {lengthUnit})
      </text>
      <text x="16" y={padT + 10} fontSize="10.5" fill={GRAY}>
        {quantitySymbol}(x)
      </text>
      {parts}
    </svg>
  );
}
