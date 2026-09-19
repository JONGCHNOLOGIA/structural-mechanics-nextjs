'use client';

import { useMemo, useState } from 'react';
import { UNIT_OPTIONS, fmt } from '@/lib/calc/unitOptions';
import { computePlaneStress } from '@/lib/calc/planeStress';
import FormulaSection, { Tip, Collapsible } from './FormulaSection';
import { MohrCircleSVG } from './MohrsCircle';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import Frac from '@/components/Frac';
import StressStateCard from './StressStateCard';

// 프로토타입 renderPlaneStress() / psBuildVisuals()를 React로 옮긴 버전.

export default function PlaneStress() {
  const [units, setUnits] = useState({ stress: 'psi' });
  const [sigmaX, setSigmaX] = useState(10000 * 6894.757);
  const [sigmaY, setSigmaY] = useState(-4000 * 6894.757);
  const [tauXY, setTauXY] = useState(3000 * 6894.757);
  const [theta, setTheta] = useState(0);

  const stressF = UNIT_OPTIONS.stress[units.stress];
  const disp = (b, f) => b / f;

  const r = useMemo(() => computePlaneStress(sigmaX, sigmaY, tauXY, theta), [sigmaX, sigmaY, tauXY, theta]);

  function updateStressField(field, value) {
    const val = parseFloat(value);
    if (isNaN(val)) return;
    const newVal = val * stressF;
    if (field === 'sigmaX') setSigmaX(newVal);
    else if (field === 'sigmaY') setSigmaY(newVal);
    else if (field === 'tauXY') setTauXY(newVal);
  }

  return (
    <>
      {/* ---------------- Setting Menu ---------------- */}
      <div className="panel">
        <h3>SETTING MENU</h3>
        <EditableText
          contentKey="calc.PlaneStress.intro"
          defaultText="임의의 응력 상태(σx, σy, τxy)에서, 요소를 θ만큼 돌렸을 때 새로운 면에 나타나는 응력(σx1, σy1, τx1y1)을 구해요."
          style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.6, marginBottom: 16, background: 'var(--bg)', borderRadius: 0, padding: '12px 14px' }}
        />
        <StressStateCard
          sigmaX={sigmaX}
          sigmaY={sigmaY}
          tauXY={tauXY}
          units={units}
          onFieldChange={updateStressField}
          onUnitChange={(v) => setUnits((p) => ({ ...p, stress: v }))}
        />
        <div className="field">
          <label>회전각 θ — {theta.toFixed(0)}°</label>
          <input type="range" min="-90" max="90" step="1" value={theta} onChange={(e) => setTheta(parseFloat(e.target.value))} style={{ width: '100%' }} />
        </div>
        <button className="add-block" onClick={() => setTheta(r.thetaPdeg)}>주응력 각도로 이동 (θp)</button>
        <button className="add-block" onClick={() => setTheta(r.thetaSdeg)}>최대전단 각도로 이동 (θs)</button>
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="panel">
        <h3>
          VISUALIZER
        </h3>
        <ElementsSVG sigmaX={sigmaX} sigmaY={sigmaY} tauXY={tauXY} theta={theta} r={r} stressF={stressF} unitStress={units.stress} />
        {/* sin·cos 그래프와 Mohr 원은 기본으로 접어둔다 — 한꺼번에 펴두면 화면이 길어져서
            정작 위의 요소 그림이 안 보인다. 필요한 사람만 펴서 보면 된다. */}
        <div className="steps" style={{ marginTop: 14 }}>
          <Collapsible title="응력 변환 곡선 (sin · cos)" hint="θ를 돌릴 때 세 응력이 어떻게 변하는지">
            <EditableText
              as="div"
              contentKey="calc.PlaneStress.curvesNote"
              defaultText="변환식이 cos2θ·sin2θ로 되어 있어서, θ를 한 바퀴(180°) 돌리는 동안 세 응력은 모두 **사인파** 모양을 그려요. σx1이 가장 커지는 각도에서 τx1y1이 0을 지나가는 것도 그래프에서 바로 보입니다."
              style={{ fontSize: 11.5, color: 'var(--gray-soft)', marginBottom: 10, lineHeight: 1.7 }}
            />
            <TransformCurvesSVG
              sigmaX={sigmaX}
              sigmaY={sigmaY}
              tauXY={tauXY}
              theta={theta}
              r={r}
              stressF={stressF}
              unitStress={units.stress}
              onPickTheta={setTheta}
            />
          </Collapsible>

          <Collapsible title="Mohr's Circle" hint="같은 계산을 원으로">
            <EditableText
              as="div"
              contentKey="calc.PlaneStress.mohrNote"
              defaultText="위와 **완전히 같은 입력**을 원 하나로 나타낸 것이에요. 요소를 θ만큼 돌리면 원 위의 점은 **2θ**만큼 돕니다."
              style={{ fontSize: 11.5, color: 'var(--gray-soft)', marginBottom: 10, lineHeight: 1.7 }}
            />
            <MohrCircleSVG sigmaX={sigmaX} sigmaY={sigmaY} tauXY={tauXY} theta={theta} r={r} />
          </Collapsible>

          <FormulaSection title="응력 변환식">
            <div className="step-formula">
              σx1 = <Frac num="σx+σy" den="2" /> + <Frac num="σx−σy" den="2" />·cos2θ + τxy·sin2θ
            </div>
            <div className="step-row">
              σy1 = <Frac num="σx+σy" den="2" /> − <Frac num="σx−σy" den="2" />·cos2θ − τxy·sin2θ
            </div>
            <div className="step-row">τx1y1 = −<Frac num="σx−σy" den="2" />·sin2θ + τxy·cos2θ</div>
            <div className="step-final">
              현재 θ={theta.toFixed(0)}°: σx1={fmt(disp(r.sx1, stressF))}, σy1={fmt(disp(r.sy1, stressF))}, τx1y1={fmt(disp(r.tx1y1, stressF))} {units.stress}
            </div>
          </FormulaSection>
          <FormulaSection title="주응력 (Principal Stresses)">
            <div className="step-formula">
              tan 2θp = <Frac num="2τxy" den="σx−σy" />
            </div>
            <div className="step-row">
              σave = <Frac num="σx+σy" den="2" /> = {fmt(disp(r.avg, stressF))} {units.stress}
            </div>
            <div className="step-row">
              R = √[(<Frac num="σx−σy" den="2" />)² + τxy²] = {fmt(disp(r.R, stressF))} {units.stress}
            </div>
            <div className="step-final">
              θp = {r.thetaPdeg.toFixed(1)}° &nbsp; σ1,2 = σave ± R = {fmt(disp(r.sigma1, stressF))}, {fmt(disp(r.sigma2, stressF))} {units.stress}
            </div>
          </FormulaSection>
          <FormulaSection title="최대전단응력 (Maximum Shear)">
            <div className="step-formula">τmax = R &nbsp; θs = θp − 45°</div>
            <div className="step-final">
              τmax = {fmt(disp(r.R, stressF))} {units.stress} &nbsp; θs = {r.thetaSdeg.toFixed(1)}° &nbsp; (이때 수직응력 = σave = {fmt(disp(r.avg, stressF))} {units.stress})
            </div>
          </FormulaSection>
        </div>
        <EditableText as="div" className="ai-hint" contentKey="calc.PlaneStress.aiHint" defaultText="💬 왜 주응력 방향에서는 전단응력이 0이 되는지 궁금하다면, 오른쪽 AI 튜터에게 물어보세요." />
      </div>

      <AiTutorPanel />
    </>
  );
}

function svgArrow(x1, y1, x2, y2, color, key) {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const ah = 6;
  const ax1 = x2 - ah * Math.cos(ang - 0.4), ay1 = y2 - ah * Math.sin(ang - 0.4);
  const ax2 = x2 - ah * Math.cos(ang + 0.4), ay2 = y2 - ah * Math.sin(ang + 0.4);
  return (
    <g key={key}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="1.8" />
      <polygon points={`${x2},${y2} ${ax1},${ay1} ${ax2},${ay2}`} fill={color} />
    </g>
  );
}

// 응력 요소 하나. 교재 그림처럼
//  - 수직응력(σ)은 면에 수직인 화살표, 인장이면 바깥으로 / 압축이면 안으로
//  - 전단응력(τ)은 면을 따라 흐르는 화살표 네 개가 한 방향으로 도는 짝힘
//  - 축(x·y 또는 회전된 x1·y1)을 요소와 함께 돌려서 표시
// 로 그린다. 예전에는 전단이 면 위의 짧은 토막이라 어느 쪽으로 도는지 읽기 어려웠다.
function StressElement({ cx, cy, size, sx, sy, txy, rotateDeg, color, label, axisNames = ['x', 'y'] }) {
  const s = size / 2, L = 34;
  const sxo = sx >= 0 ? 1 : -1;   // 인장이면 바깥(+)
  const syo = sy >= 0 ? -1 : 1;
  const to = txy >= 0 ? 1 : -1;   // 전단의 회전 방향
  const t = s * 0.62;             // 전단 화살표 길이(면 길이의 62%)
  const off = 7;                  // 면에서 살짝 띄워 그려 테두리와 겹치지 않게
  const axLen = s + 46;

  return (
    <g>
      <g transform={`rotate(${(-rotateDeg).toFixed(2)} ${cx} ${cy})`}>
        {/* 축 — 요소와 같이 돌아가므로 회전된 요소에서는 x1·y1이 된다 */}
        <line x1={cx} y1={cy} x2={cx + axLen} y2={cy} stroke="#B9C2C9" strokeWidth="1" strokeDasharray="4 3" />
        <line x1={cx} y1={cy} x2={cx} y2={cy - axLen} stroke="#B9C2C9" strokeWidth="1" strokeDasharray="4 3" />
        <text x={cx + axLen + 4} y={cy + 4} fontSize="12" fill="#8A97A2" fontWeight="800">{axisNames[0]}</text>
        <text x={cx + 4} y={cy - axLen - 4} fontSize="12" fill="#8A97A2" fontWeight="800">{axisNames[1]}</text>

        <rect x={cx - s} y={cy - s} width={size} height={size} fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1.5" />

        {/* 수직응력 */}
        {svgArrow(cx + s, cy, cx + s + sxo * L, cy, color, 'n1')}
        {svgArrow(cx - s, cy, cx - s - sxo * L, cy, color, 'n2')}
        {svgArrow(cx, cy - s, cx, cy - s + syo * L, color, 'n3')}
        {svgArrow(cx, cy + s, cx, cy + s - syo * L, color, 'n4')}

        {/* 전단응력 — 네 면을 따라 같은 방향으로 도는 짝힘 (to>0이면 시계방향) */}
        {svgArrow(cx + s + off, cy + (t / 2) * to, cx + s + off, cy - (t / 2) * to, color, 's1')}
        {svgArrow(cx - s - off, cy - (t / 2) * to, cx - s - off, cy + (t / 2) * to, color, 's2')}
        {svgArrow(cx - (t / 2) * to, cy - s - off, cx + (t / 2) * to, cy - s - off, color, 's3')}
        {svgArrow(cx + (t / 2) * to, cy + s + off, cx - (t / 2) * to, cy + s + off, color, 's4')}
      </g>
      <text x={cx} y={cy + s + 52} fontSize="14" fontWeight="800" fill={color} textAnchor="middle">
        {label}
      </text>
    </g>
  );
}

function ElementsSVG({ sigmaX, sigmaY, tauXY, theta, r, stressF, unitStress }) {
  const disp = (b, f) => b / f;
  const w = 620, h = 358;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 660, margin: '0 auto', display: 'block' }}>
      <StressElement cx={150} cy={150} size={130} sx={sigmaX} sy={sigmaY} txy={tauXY} rotateDeg={0} color="#51626F" label="θ = 0° (원래 상태)" />
      <StressElement
        cx={460}
        cy={150}
        size={130}
        sx={r.sx1}
        sy={r.sy1}
        txy={r.tx1y1}
        rotateDeg={theta}
        color="#C3002F"
        label={`θ = ${theta.toFixed(0)}° (회전된 상태)`}
        axisNames={['x₁', 'y₁']}
      />
      {/* 값이 길어지면 한 줄로는 그림 밖까지 나가서, 수직응력 줄과 전단응력 줄로 나눠 적는다 */}
      <text x={150} y={294} fontSize="12.5" textAnchor="middle" fill="#51626F">
        σx={fmt(disp(sigmaX, stressF))} σy={fmt(disp(sigmaY, stressF))}
      </text>
      <text x={150} y={310} fontSize="12.5" textAnchor="middle" fill="#51626F">
        τxy={fmt(disp(tauXY, stressF))} {unitStress}
      </text>
      <text x={460} y={294} fontSize="12.5" textAnchor="middle" fill="#C3002F">
        σx1={fmt(disp(r.sx1, stressF))} σy1={fmt(disp(r.sy1, stressF))}
      </text>
      <text x={460} y={310} fontSize="12.5" textAnchor="middle" fill="#C3002F">
        τx1y1={fmt(disp(r.tx1y1, stressF))} {unitStress}
      </text>
      <text x={w / 2} y={338} fontSize="12" textAnchor="middle" fill="#8A97A2">
        시계반대 방향 = (+) 각도
      </text>
    </svg>
  );
}


// θ를 -90°~90°로 훑으면서 σx1, σy1, τx1y1이 그리는 곡선. 변환식이 cos2θ·sin2θ라서
// 세 곡선 모두 주기 180°의 사인파가 된다. 지금 각도 위치에 세로선과 점을 찍어 두고,
// 그래프를 클릭하면 그 각도로 이동한다.
function TransformCurvesSVG({ sigmaX, sigmaY, tauXY, theta, r, stressF, unitStress, onPickTheta }) {
  const w = 620, h = 300, padL = 58, padR = 96, padT = 18, padB = 44;
  const plotW = w - padL - padR, plotH = h - padT - padB;

  const avg = (sigmaX + sigmaY) / 2;
  const half = (sigmaX - sigmaY) / 2;
  const sx1 = (t) => avg + half * Math.cos(2 * t) + tauXY * Math.sin(2 * t);
  const sy1 = (t) => avg - half * Math.cos(2 * t) - tauXY * Math.sin(2 * t);
  const txy1 = (t) => -half * Math.sin(2 * t) + tauXY * Math.cos(2 * t);

  // 세로 눈금은 세 곡선이 모두 들어가도록 잡는다 — 최댓값은 σave ± R, 전단은 ±R이라 이 둘로 충분하다.
  const maxAbs = Math.max(1e-9, Math.abs(avg) + r.R, r.R);
  const X = (deg) => padL + ((deg + 90) / 180) * plotW;
  const Y = (v) => padT + plotH / 2 - (v / maxAbs) * (plotH / 2) * 0.9;

  const path = (fn) => {
    let d = '';
    for (let deg = -90; deg <= 90; deg += 1.5) {
      const v = fn((deg * Math.PI) / 180);
      d += (d ? ' L ' : 'M ') + X(deg).toFixed(2) + ' ' + Y(v).toFixed(2);
    }
    return d;
  };

  const series = [
    { key: 'sx1', label: 'σx1', color: '#C3002F', fn: sx1, now: r.sx1 },
    { key: 'sy1', label: 'σy1', color: '#1E7F72', fn: sy1, now: r.sy1 },
    { key: 'txy1', label: 'τx1y1', color: '#4A5FBF', fn: txy1, now: r.tx1y1 },
  ];
  const nowX = X(theta);

  function pick(e) {
    if (!onPickTheta) return;
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * w;
    const deg = Math.round(((px - padL) / plotW) * 180 - 90);
    onPickTheta(Math.max(-90, Math.min(90, deg)));
  }

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      style={{ width: '100%', maxWidth: 660, margin: '0 auto', display: 'block', overflow: 'visible', cursor: onPickTheta ? 'crosshair' : 'default' }}
      onClick={pick}
    >
      {/* 0 기준선과 축 */}
      <line x1={padL} y1={Y(0)} x2={padL + plotW} y2={Y(0)} stroke="#8A97A2" strokeWidth="1.2" />
      <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke="#8A97A2" strokeWidth="1.2" />
      {[-90, -45, 0, 45, 90].map((deg) => (
        <g key={deg}>
          <line x1={X(deg)} y1={padT + plotH} x2={X(deg)} y2={padT + plotH + 4} stroke="#8A97A2" strokeWidth="1" />
          <text x={X(deg)} y={padT + plotH + 17} fontSize="10.5" fill="#8A97A2" textAnchor="middle">{deg}°</text>
        </g>
      ))}
      <text x={padL + plotW / 2} y={h - 8} fontSize="11.5" fill="#8A97A2" textAnchor="middle">회전각 θ</text>
      <text x={padL - 6} y={Y(0) - 6} fontSize="10.5" fill="#8A97A2" textAnchor="end">0</text>
      <text x={padL - 6} y={Y(maxAbs * 0.9) + 4} fontSize="10.5" fill="#8A97A2" textAnchor="end">{fmt(maxAbs * 0.9 / stressF)}</text>

      {/* 주응력 각도와 최대전단 각도를 세로 점선으로 표시 */}
      {[{ deg: r.thetaPdeg, name: 'θp', col: '#B0790A' }, { deg: r.thetaSdeg, name: 'θs', col: '#8A97A2' }].map((m) => (
        <g key={m.name}>
          <line x1={X(m.deg)} y1={padT} x2={X(m.deg)} y2={padT + plotH} stroke={m.col} strokeWidth="1" strokeDasharray="3 3" />
          <text x={X(m.deg)} y={padT - 4} fontSize="10.5" fill={m.col} textAnchor="middle" fontWeight="800">{m.name}</text>
        </g>
      ))}

      {series.map((sv) => (
        <path key={sv.key} d={path(sv.fn)} fill="none" stroke={sv.color} strokeWidth="2" />
      ))}

      {/* 지금 각도 */}
      <line x1={nowX} y1={padT} x2={nowX} y2={padT + plotH} stroke="#3A3A3A" strokeWidth="1.4" />
      {series.map((sv) => (
        <circle key={sv.key} cx={nowX} cy={Y(sv.now)} r="3.6" fill={sv.color} stroke="#fff" strokeWidth="1.2" />
      ))}

      {/* 범례 — 현재 값까지 같이 보여준다 */}
      {series.map((sv, i) => (
        <g key={sv.key}>
          <line x1={padL + plotW + 10} y1={padT + 12 + i * 34} x2={padL + plotW + 28} y2={padT + 12 + i * 34} stroke={sv.color} strokeWidth="2.4" />
          <text x={padL + plotW + 32} y={padT + 16 + i * 34} fontSize="10.5" fill={sv.color} fontWeight="800">{sv.label}</text>
          <text x={padL + plotW + 10} y={padT + 29 + i * 34} fontSize="9.5" fill="#8A97A2">{fmt(sv.now / stressF)}</text>
        </g>
      ))}
      <text x={padL + plotW + 10} y={h - 12} fontSize="9.5" fill="#8A97A2">{unitStress}</text>
    </svg>
  );
}
