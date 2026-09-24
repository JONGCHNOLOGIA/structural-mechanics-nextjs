'use client';

import { useMemo, useState } from 'react';
import { computeTorsionDesign, HOLLOW_K } from '@/lib/calc/torsion';
import { LENGTH_UNITS, STRESS_UNITS, TORQUE_UNITS, toBase, fromBase, fmt1, scaledPx } from '@/lib/calc/units1';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import Frac from '@/components/Frac';
import { DualField, SelectField, UnitSelect, ResetButton, ResultGrid, ResultCard, StepCard, ErrorBox, InputNeededPlaceholder } from './sm1/Controls';
import { CalcGate, useCalcGate } from './sm1/CalcGate';
import { DimLineH, DimLineV } from './EditableDim';

// CH.3-3 Allowable Torque & Required Diameter Design — 원본 renderTorsionDesign()의 React 버전.

const DEFAULTS = {
  calcMode: 'maxTorque',
  sectionType: 'solid_circular',
  twistMode: 'total',
  dims: { d: 1.5, d_outer: 2 },
  dimUnit: 'in',
  L: 54, LUnit: 'in',
  G: 11504, GUnit: 'ksi',
  tauAllow: 6000, tauAllowUnit: 'psi',
  phiAllowDeg: 2.5,
  thetaAllowDeg: 0.75, thetaLenUnit: 'm',
  T: 250, TUnit: 'lb·ft',
};

const MODE_OPTIONS = [
  { value: 'maxTorque', label: '최대 허용 토크 계산' },
  { value: 'reqDiameter', label: '필요 지름 계산 (T 주어짐)' },
];
const SECTION_OPTIONS = [
  { value: 'solid_circular', label: 'Solid Circular' },
  { value: 'hollow_circular', label: 'Hollow Circular' },
];
const TWIST_OPTIONS = [
  { value: 'total', label: '전체 각도 φ_allow (deg)' },
  { value: 'rate', label: '단위길이당 θ_allow (deg/length)' },
];

export default function TorsionDesign() {
  const [s, setS] = useState(DEFAULTS);
  const res = useMemo(() => computeTorsionDesign(s), [s]);
  const gate = useCalcGate(s);
  const set = (patch) => setS((prev) => ({ ...prev, ...patch }));
  const setNum = (key) => (v) => set({ [key]: parseFloat(v) });
  const setDim = (key) => (v) => setS((prev) => ({ ...prev, dims: { ...prev.dims, [key]: parseFloat(v) } }));

  const isTorqueMode = s.calcMode === 'maxTorque';
  const hollow = s.sectionType === 'hollow_circular';

  return (
    <>
      {/* ---------------- Setting Menu ---------------- */}
      <div className="panel">
        <h3>SETTING MENU</h3>
        <EditableText
          as="div"
          className="note-box"
          contentKey="calc.TorsionDesign.note"
          defaultText="비틀림 설계는 응력 조건(τ ≤ τ_allow)과 변형 조건(비틀림각 제한) 두 가지를 동시에 만족해야 합니다. 두 조건을 따로 푼 뒤, 더 엄격한 쪽이 설계를 지배합니다."
        />
        <SelectField label="계산 모드" value={s.calcMode} options={MODE_OPTIONS} onChange={(v) => set({ calcMode: v })} />
        <SelectField label="단면 형상" value={s.sectionType} options={SECTION_OPTIONS} onChange={(v) => set({ sectionType: v })} />

        {isTorqueMode ? (
          hollow ? (
            <>
              <DualField label="외경 d₂" value={s.dims.d_outer} min={1} max={200} step={0.5} onChange={setDim('d_outer')}
                unitMap={LENGTH_UNITS} unit={s.dimUnit} onUnitChange={(v) => set({ dimUnit: v })} invalid={!(s.dims.d_outer > 0)}
                hint={
                  <EditableText
                    as="span"
                    contentKey="torsionDesign.hollowD1Hint"
                    defaultText={`내경 d₁은 교재 예제와 동일하게 t = d₂/10, 즉 d₁ = ${HOLLOW_K}·d₂ 로 가정합니다.`}
                  />
                } />
            </>
          ) : (
            <DualField label="직경 d" value={s.dims.d} min={1} max={200} step={0.5} onChange={setDim('d')}
              unitMap={LENGTH_UNITS} unit={s.dimUnit} onUnitChange={(v) => set({ dimUnit: v })} invalid={!(s.dims.d > 0)} />
          )
        ) : (
          <>
            {hollow && (
              <EditableText
                as="div"
                className="hint"
                contentKey="torsionDesign.reqDiameterHollowHint"
                defaultText={`중공축: t = d₂/10 (d₁ = ${HOLLOW_K}·d₂) 가정으로 필요 외경 d₂를 역산합니다.`}
                style={{ marginBottom: 10 }}
              />
            )}
            <DualField label="토크 T (주어진 값)" value={s.T} min={0} max={1000} step={1} onChange={setNum('T')}
              unitMap={TORQUE_UNITS} unit={s.TUnit} onUnitChange={(v) => set({ TUnit: v })} invalid={!(s.T >= 0)} />
          </>
        )}

        <DualField label="부재 길이 L" value={s.L} min={1} max={200} step={1} onChange={setNum('L')}
          unitMap={LENGTH_UNITS} unit={s.LUnit} onUnitChange={(v) => set({ LUnit: v })} invalid={!(s.L > 0)} />
        <DualField label="전단탄성계수 G" value={s.G} min={0.1} max={500} step={0.5} onChange={setNum('G')}
          unitMap={STRESS_UNITS} unit={s.GUnit} onUnitChange={(v) => set({ GUnit: v })} invalid={!(s.G > 0)} />
        <DualField label="허용 전단응력 τ_allow" value={s.tauAllow} min={1} max={1000} step={1} onChange={setNum('tauAllow')}
          unitMap={STRESS_UNITS} unit={s.tauAllowUnit} onUnitChange={(v) => set({ tauAllowUnit: v })} invalid={!(s.tauAllow > 0)} />

        <SelectField label="비틀림 제한 방식" value={s.twistMode} options={TWIST_OPTIONS} onChange={(v) => set({ twistMode: v })} />
        {s.twistMode === 'total' ? (
          <DualField label="허용 비틀림각 φ_allow (deg, 전체 길이 L 기준)" value={s.phiAllowDeg} min={0.1} max={10} step={0.05}
            onChange={setNum('phiAllowDeg')} invalid={!(s.phiAllowDeg > 0)} />
        ) : (
          <DualField label={`허용 비틀림률 θ_allow (deg per ${s.thetaLenUnit})`} value={s.thetaAllowDeg} min={0.05} max={5} step={0.01}
            onChange={setNum('thetaAllowDeg')} unitMap={LENGTH_UNITS} unit={s.thetaLenUnit}
            onUnitChange={(v) => set({ thetaLenUnit: v })} invalid={!(s.thetaAllowDeg > 0)} />
        )}

        {/* 계산 모드에서는 결과가 되는 양이라 입력 필드가 없어진다 — 대신 표시 단위만 고를 수 있게 둔다. */}
        <div className="field">
          <label>{isTorqueMode ? '결과 토크 표시 단위' : '결과 지름 표시 단위'}</label>
          <div className="input-unit-group">
            {isTorqueMode ? (
              <UnitSelect map={TORQUE_UNITS} value={s.TUnit} onChange={(v) => set({ TUnit: v })} />
            ) : (
              <UnitSelect map={LENGTH_UNITS} value={s.dimUnit} onChange={(v) => set({ dimUnit: v })} />
            )}
          </div>
        </div>

        <ResetButton onClick={() => setS(DEFAULTS)} />
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="panel">
        <h3>VISUALIZER</h3>
        {res.valid ? (
          <>
            <ShaftSVG s={s} res={res} onEditNum={setNum} onEditDim={setDim} />
            <GoverningBars s={s} res={res} />
            <Results s={s} res={res} />
            <EditableText as="div" className="ai-hint" contentKey="calc.TorsionDesign.aiHint"
              defaultText='💬 왜 최대허용토크는 "더 작은 값", 필요지름은 "더 큰 값"을 택하는지, 오른쪽 AI 튜터에게 물어보세요.' />
          </>
        ) : (
          <ErrorBox errors={res.errors} />
        )}

        <div className="steps" style={{ marginTop: 20 }}>
          <CalcGate gate={gate}>
            {(frozen) => {
              const fres = computeTorsionDesign(frozen);
              return fres.valid ? <Steps s={frozen} res={fres} /> : <InputNeededPlaceholder />;
            }}
          </CalcGate>
        </div>
      </div>

      <AiTutorPanel question="두 조건이 정확히 같아지는 지름은 어떻게 찾나요?" />
    </>
  );
}

// 설계 대상 축의 모양 — 원래는 두 조건 비교 막대만 있고 축 그림이 없었다.
// 지름과 길이를 치수로 적어 두고, 입력값인 것만 클릭해서 고칠 수 있게 한다.
// (필요 지름을 역산하는 모드에서는 지름이 결과라 고칠 수 없다)
function ShaftSVG({ s, res, onEditNum, onEditDim }) {
  const w = 460, h = 214, xL = 122, xR = 396, cy = 86;
  const isTorqueMode = res.mode === 'maxTorque';
  const dInput = s.sectionType === 'solid_circular' ? s.dims.d : s.dims.d_outer;
  const dShown = isTorqueMode ? dInput : fromBase(res.governing, s.dimUnit, LENGTH_UNITS);
  const dMM = toBase(dShown || 0, s.dimUnit, LENGTH_UNITS) * 1000;
  const ry = scaledPx(dMM, 150, 16, 46) / 2;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 460, margin: '0 auto 8px', display: 'block', overflow: 'visible' }}>
      {/* 고정단 해칭 */}
      <line x1={xL} y1={cy - ry - 8} x2={xL} y2={cy + ry + 8} stroke="#51626F" strokeWidth="2.2" />
      {Array.from({ length: 7 }).map((_, i) => {
        const yy = cy - ry - 6 + i * ((2 * ry + 12) / 7);
        return <line key={i} x1={xL} y1={yy} x2={xL - 9} y2={yy + 7} stroke="#8A97A2" strokeWidth="1.1" />;
      })}

      {/* 축 몸통 */}
      <rect x={xL} y={cy - ry} width={xR - xL} height={ry * 2} fill="var(--crimson-soft)" stroke="var(--crimson)" strokeWidth="1.5" />
      <ellipse cx={xR} cy={cy} rx="9" ry={ry} fill="#fff" stroke="var(--crimson)" strokeWidth="1.6" />
      <text x={xR + 26} y={cy + 4} fontSize="11" fontWeight="800" fill="var(--crimson)">T</text>

      {/* 치수 — 길이 L은 늘 입력값이고, 지름은 토크를 구하는 모드에서만 입력값이다. */}
      <DimLineV
        x={xL - 30}
        y1={cy - ry}
        y2={cy + ry}
        color="var(--crimson)"
        fontSize={10.5}
        value={dShown}
        unit={s.dimUnit}
        prefix={isTorqueMode ? 'd = ' : 'd_required = '}
        boxW={54}
        onChange={isTorqueMode ? onEditDim(s.sectionType === 'solid_circular' ? 'd' : 'd_outer') : undefined}
      />
      <DimLineH
        x1={xL}
        x2={xR}
        y={cy + ry + 32}
        labelDy={14}
        fontSize={10.5}
        value={s.L}
        unit={s.LUnit}
        prefix="L = "
        boxW={54}
        onChange={onEditNum('L')}
      />
    </svg>
  );
}

// 결과 표시는 모드에 따라 단위가 달라서(토크 / 길이) 한 군데로 모아 두었다.
function display(s, res) {
  if (res.mode === 'maxTorque') {
    const u = s.TUnit;
    return {
      unit: u,
      a: fromBase(res.T_stress, u, TORQUE_UNITS),
      b: fromBase(res.T_twist, u, TORQUE_UNITS),
      gov: fromBase(res.governing, u, TORQUE_UNITS),
      aLabel: '응력 기준 허용토크',
      bLabel: '비틀림 기준 허용토크',
      govLabel: '최종 허용토크 (더 작은 값)',
      decimals: 2,
    };
  }
  const u = s.dimUnit;
  return {
    unit: u,
    a: fromBase(res.d_stress, u, LENGTH_UNITS),
    b: fromBase(res.d_twist, u, LENGTH_UNITS),
    gov: fromBase(res.governing, u, LENGTH_UNITS),
    aLabel: '응력 기준 필요지름',
    bLabel: '비틀림 기준 필요지름',
    govLabel: '최종 필요지름 (더 큰 값)',
    decimals: 3,
  };
}

function Results({ s, res }) {
  const d = display(s, res);
  return (
    <ResultGrid>
      <ResultCard label={d.aLabel} value={`${fmt1(d.a, d.decimals)} ${d.unit}`} />
      <ResultCard label={d.bLabel} value={`${fmt1(d.b, d.decimals)} ${d.unit}`} />
      <ResultCard label="지배조건" value={res.governedBy === 'stress' ? '응력 조건' : '비틀림 조건'} />
      <ResultCard label={d.govLabel} value={`${fmt1(d.gov, d.decimals)} ${d.unit}`} tone="comp" full />
    </ResultGrid>
  );
}

// 두 조건의 결과를 나란히 놓고, 실제로 채택된 쪽을 강조한다.
// 막대 길이는 두 값의 비율 그대로다(둘 중 큰 값이 100%) — 어느 쪽이 얼마나 더 엄격한지가 그대로 보인다.
function GoverningBars({ s, res }) {
  const d = display(s, res);
  const max = Math.max(d.a, d.b) || 1;
  const rows = [
    { label: '응력 조건', value: d.a, win: res.governedBy === 'stress' },
    { label: '비틀림 조건', value: d.b, win: res.governedBy === 'twist' },
  ];
  const w = 460, rowH = 46, h = rows.length * rowH + 34, labelW = 92, barX = labelW + 8, barMaxW = w - barX - 96;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 460, margin: '0 auto 6px', display: 'block' }}>
      {rows.map((r, i) => {
        const y = 18 + i * rowH;
        const bw = Math.max(2, (r.value / max) * barMaxW);
        const color = r.win ? 'var(--crimson)' : 'var(--gray-soft)';
        return (
          <g key={i}>
            <text x={labelW} y={y + 17} fontSize="11" fontWeight={r.win ? 800 : 600} fill={color} textAnchor="end">
              {r.label}
            </text>
            <rect x={barX} y={y} width={bw} height="24" fill={color} opacity={r.win ? 0.28 : 0.16} stroke={color} strokeWidth={r.win ? 1.8 : 1} />
            <text x={barX + bw + 8} y={y + 17} fontSize="10.5" fontWeight={r.win ? 800 : 600} fill={color}>
              {fmt1(r.value, d.decimals)} {d.unit}
            </text>
          </g>
        );
      })}
      <text x={w / 2} y={h - 8} fontSize="10" fill="var(--gray)" textAnchor="middle">
        두 조건을 모두 만족해야 하므로 {res.mode === 'maxTorque' ? '토크는 더 작은' : '지름은 더 큰'} 쪽이 지배합니다 (빨간색)
      </text>
    </svg>
  );
}

function Steps({ s, res }) {
  const d = display(s, res);
  const govText = res.governedBy === 'stress' ? '응력' : '비틀림';

  if (res.mode === 'maxTorque') {
    const IpMM4 = res.Ip * 1e12;
    return (
      <>
        <StepCard
          title="Step 1. 응력 조건에서 허용토크"
          formula={
            <>
              T_stress = <Frac num="τ_allow · Ip" den="r" />
            </>
          }
          eqLines={[
            `Ip = ${fmt1(IpMM4, 2)} mm⁴,  r = ${fmt1((res.D / 2) * 1000, 2)} mm`,
            `τ_allow = ${s.tauAllow} ${s.tauAllowUnit}`,
          ]}
          final={`T_stress = ${fmt1(d.a, 2)} ${d.unit}`}
        />
        <StepCard
          title="Step 2. 비틀림 조건에서 허용토크"
          formula={
            s.twistMode === 'total' ? (
              <>
                T_twist = <Frac num="G·Ip·φ_allow" den="L" />
              </>
            ) : (
              'T_twist = G·Ip·θ_allow'
            )
          }
          eqLines={[
            s.twistMode === 'total'
              ? `φ_allow = ${s.phiAllowDeg}° 를 rad으로 바꾼 뒤 L = ${s.L} ${s.LUnit} 로 나눈다`
              : `θ_allow = ${s.thetaAllowDeg}°/${s.thetaLenUnit} 를 rad 단위로 환산`,
          ]}
          final={`T_twist = ${fmt1(d.b, 2)} ${d.unit}`}
        />
        <StepCard
          title="Step 3. 지배조건 판정"
          formula="T_allow = min(T_stress, T_twist)"
          eqLines={['두 조건을 모두 만족해야 하므로 더 작은(더 엄격한) 값이 지배']}
          final={`T_allow = ${fmt1(d.gov, 2)} ${d.unit} (${govText} 조건 지배)`}
        />
      </>
    );
  }

  return (
    <>
      <StepCard
        title="Step 1. 응력 조건에서 필요지름"
        formula={
          s.sectionType === 'solid_circular' ? (
            <>
              τ_allow = <Frac num="16T" den="πd³" /> → d = ∛(<Frac num="16T" den="πτ_allow" />)
            </>
          ) : (
            <>
              d³ = <Frac num="16T" den="πτ_allow(1−k⁴)" />
            </>
          )
        }
        eqLines={[`T = ${s.T} ${s.TUnit},  τ_allow = ${s.tauAllow} ${s.tauAllowUnit}`]}
        final={`d_stress = ${fmt1(d.a, 3)} ${d.unit}`}
      />
      <StepCard
        title="Step 2. 비틀림 조건에서 필요지름"
        formula="필요 Ip를 먼저 구하고 d로 역산"
        eqLines={[
          s.twistMode === 'total' ? (
            <>
              Ip_req = <Frac num="T·L" den="G·φ_allow" />
            </>
          ) : (
            <>
              Ip_req = <Frac num="T" den="G·θ_allow" />
            </>
          ),
          `Ip_req = ${fmt1(res.reqIp * 1e12, 2)} mm⁴`,
        ]}
        final={`d_twist = ${fmt1(d.b, 3)} ${d.unit}`}
      />
      <StepCard
        title="Step 3. 지배조건 판정"
        formula="d_required = max(d_stress, d_twist)"
        eqLines={['두 조건을 모두 만족하려면 더 큰 지름이 필요']}
        final={`d_required = ${fmt1(d.gov, 3)} ${d.unit} (${govText} 조건 지배)`}
      />
    </>
  );
}
