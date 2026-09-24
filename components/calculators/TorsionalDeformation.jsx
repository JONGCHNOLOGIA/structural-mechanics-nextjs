'use client';

import { useMemo, useState } from 'react';
import { computeTorsionalDeformation } from '@/lib/calc/torsion';
import { LENGTH_UNITS, STRESS_UNITS, TORQUE_UNITS, toBase, fromBase, fmt1 } from '@/lib/calc/units1';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import Frac from '@/components/Frac';
import { DualField, ToggleRow, SelectField, ResetButton, ResultGrid, ResultCard, StepCard, ErrorBox, InputNeededPlaceholder } from './sm1/Controls';
import { CalcGate, useCalcGate } from './sm1/CalcGate';
import { DimLineH, DimLineV } from './EditableDim';

// CH.3-1 Torsional Deformation and Angle of Twist — 원본 renderTorsionalDeformation()의 React 버전.

const DEFAULTS = {
  T: 250, TUnit: 'lb·ft', dir: 'cw',
  sectionType: 'solid_circular',
  dims: { d: 1.5, d_outer: 2, d_inner: 1.2 }, dimUnit: 'in',
  L: 54, LUnit: 'in',
  G: 11504, GUnit: 'ksi',
};

const SECTION_OPTIONS = [
  { value: 'solid_circular', label: 'Solid Circular' },
  { value: 'hollow_circular', label: 'Hollow Circular' },
];

export default function TorsionalDeformation() {
  const [s, setS] = useState(DEFAULTS);
  const res = useMemo(() => computeTorsionalDeformation(s), [s]);
  const gate = useCalcGate(s);
  const set = (patch) => setS((prev) => ({ ...prev, ...patch }));
  const setNum = (key) => (v) => set({ [key]: parseFloat(v) });
  const setDim = (key) => (v) => setS((prev) => ({ ...prev, dims: { ...prev.dims, [key]: parseFloat(v) } }));

  return (
    <>
      {/* ---------------- Setting Menu ---------------- */}
      <div className="panel">
        <h3>SETTING MENU</h3>
        <EditableText
          contentKey="calc.TorsionalDeformation.intro"
          defaultText="원형축에 토크를 걸면 단면이 서로 상대적으로 돌아가요. 그 회전량이 비틀림각 φ=TL/(G·Ip)이고, 표면에서 전단변형률이 가장 큽니다."
          style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.6, marginBottom: 14, background: 'var(--bg)', borderRadius: 0, padding: '12px 14px' }}
        />
        <DualField label="토크 T" value={s.T} min={0} max={1000} step={1} onChange={setNum('T')}
          unitMap={TORQUE_UNITS} unit={s.TUnit} onUnitChange={(v) => set({ TUnit: v })} invalid={!(s.T >= 0)} />
        <ToggleRow
          value={s.dir}
          onChange={(v) => set({ dir: v })}
          options={[
            { value: 'cw', label: '시계방향' },
            { value: 'ccw', label: '반시계방향' },
          ]}
        />
        <SelectField label="단면 형상" value={s.sectionType} options={SECTION_OPTIONS} onChange={(v) => set({ sectionType: v })} />
        {s.sectionType === 'solid_circular' ? (
          <DualField label="직경 d" value={s.dims.d} min={1} max={200} step={0.5} onChange={setDim('d')}
            unitMap={LENGTH_UNITS} unit={s.dimUnit} onUnitChange={(v) => set({ dimUnit: v })} invalid={!(s.dims.d > 0)} />
        ) : (
          <>
            <DualField label="외경 d₂" value={s.dims.d_outer} min={1} max={200} step={0.5} onChange={setDim('d_outer')}
              unitMap={LENGTH_UNITS} unit={s.dimUnit} onUnitChange={(v) => set({ dimUnit: v })} invalid={!(s.dims.d_outer > 0)} />
            <DualField label="내경 d₁" value={s.dims.d_inner} min={0.5} max={200} step={0.5} onChange={setDim('d_inner')}
              unitMap={LENGTH_UNITS} unit={s.dimUnit} onUnitChange={(v) => set({ dimUnit: v })}
              invalid={!(s.dims.d_inner > 0 && s.dims.d_inner < s.dims.d_outer)} />
          </>
        )}
        <DualField label="부재 길이 L" value={s.L} min={1} max={200} step={1} onChange={setNum('L')}
          unitMap={LENGTH_UNITS} unit={s.LUnit} onUnitChange={(v) => set({ LUnit: v })} invalid={!(s.L > 0)} />
        <DualField label="전단탄성계수 G" value={s.G} min={0.1} max={500} step={0.5} onChange={setNum('G')}
          unitMap={STRESS_UNITS} unit={s.GUnit} onUnitChange={(v) => set({ GUnit: v })} invalid={!(s.G > 0)} />
        <ResetButton onClick={() => setS(DEFAULTS)} />
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="panel">
        <h3>VISUALIZER</h3>
        <TwistSVG dir={s.dir} res={res} s={s} onEditNum={setNum} onEditDim={setDim} />
        {res.valid ? (
          <>
            <ResultGrid>
              <ResultCard label="극관성모멘트 Ip" value={`${fmt1(res.Ip * 1e12, 2)} mm⁴`} />
              <ResultCard label="비틀림각 φ" value={`${fmt1((res.phi_rad * 180) / Math.PI, 3)}°`} />
              <ResultCard label="단위길이당 비틀림률 θ" value={`${fmt1((res.theta * 180) / Math.PI, 5)}°/m`} />
              <ResultCard label="최대 전단변형률 γ_max" value={`${fmt1(res.gammaMax * 1e6, 1)} µrad`} full />
            </ResultGrid>
            <EditableText as="div" className="ai-hint" contentKey="calc.TorsionalDeformation.aiHint"
              defaultText="💬 왜 전단변형률이 중심에서 0이고 표면에서 최대인지, 오른쪽 AI 튜터에게 물어보세요." />
          </>
        ) : (
          <ErrorBox errors={res.errors} />
        )}

        <div className="steps" style={{ marginTop: 20 }}>
          <CalcGate gate={gate}>
            {(frozen) => {
              const fres = computeTorsionalDeformation(frozen);
              return fres.valid ? <Steps s={frozen} res={fres} /> : <InputNeededPlaceholder />;
            }}
          </CalcGate>
        </div>
      </div>

      <AiTutorPanel question="φ와 θ의 차이가 정확히 뭔가요?" />
    </>
  );
}

// 화면 수식은 N·mm / mm / MPa / mm⁴ 로 통일했다 — 적힌 숫자를 그대로 계산하면 rad이 나온다.
// θ와 γ는 길이 단위가 섞이면 값이 달라 보이므로, 길이는 항상 m로 환산해서 rad/m 기준으로 적는다.
function Steps({ s, res }) {
  const IpMM4 = res.Ip * 1e12;
  const T_Nmm = toBase(s.T, s.TUnit, TORQUE_UNITS) * 1000;
  const L_mm = toBase(s.L, s.LUnit, LENGTH_UNITS) * 1000;
  const L_m = L_mm / 1000;
  const G_MPa = fromBase(toBase(s.G, s.GUnit, STRESS_UNITS), 'MPa', STRESS_UNITS);
  const rMM = res.rOuter * 1000;
  return (
    <>
      <StepCard
        title="Step 1. 극관성모멘트"
        formula={
          s.sectionType === 'solid_circular' ? (
            <>
              Ip = <Frac num="πd⁴" den="32" />
            </>
          ) : (
            <>
              Ip = <Frac num="π(d₂⁴−d₁⁴)" den="32" />
            </>
          )
        }
        eqLines={[`d = ${fmt1(rMM * 2, 2)} mm`, `Ip = ${fmt1(IpMM4, 2)} mm⁴`]}
        final={`Ip = ${fmt1(IpMM4, 2)} mm⁴`}
      />
      <StepCard
        title="Step 2. 비틀림각"
        formula={
          <>
            φ = <Frac num="T·L" den="G·Ip" />
          </>
        }
        eqLines={[
          `T = ${fmt1(T_Nmm, 1)} N·mm,  L = ${fmt1(L_mm, 1)} mm,  G = ${fmt1(G_MPa, 1)} MPa`,
          <>
            φ = <Frac num={`${fmt1(T_Nmm, 1)} × ${fmt1(L_mm, 1)}`} den={`${fmt1(G_MPa, 1)} × ${fmt1(IpMM4, 2)}`} />
          </>,
        ]}
        final={`φ = ${fmt1(res.phi_rad, 5)} rad = ${fmt1((res.phi_rad * 180) / Math.PI, 3)}°`}
      />
      <StepCard
        title="Step 3. 단위길이당 비틀림률"
        formula={
          <>
            θ = <Frac num="φ" den="L" />
          </>
        }
        eqLines={[
          <>
            θ = <Frac num={`${fmt1(res.phi_rad, 5)} rad`} den={`${fmt1(L_m, 4)} m`} />
          </>,
        ]}
        final={`θ = ${fmt1(res.theta, 6)} rad/m = ${fmt1((res.theta * 180) / Math.PI, 4)}°/m`}
      />
      <StepCard
        title="Step 4. 최대 전단변형률"
        formula="γ_max = r · θ"
        eqLines={[`γ_max = ${fmt1(res.rOuter, 5)} m × ${fmt1(res.theta, 6)} rad/m`]}
        final={`γ_max = ${fmt1(res.gammaMax * 1e6, 1)} µrad (중심에서는 0, 표면에서 최대)`}
      />
    </>
  );
}

// 한쪽 끝이 고정된 축의 반대쪽 단면이 φ만큼 돌아간 모습.
// 실제 φ는 1~2° 정도라 그대로 그리면 아무 변화도 안 보이므로, 각도만 학습용으로 확대해서 그린다
// (숫자는 항상 실제값을 함께 적어 둔다). 확대 배율은 고정이라 슬라이더를 움직이면 비례해서 움직인다.
const TWIST_VIEW_GAIN = 8; // 화면에 보이는 각도 = 실제 φ × 8 (최대 55°에서 잘림)

function TwistSVG({ dir, res, s, onEditNum, onEditDim }) {
  // 오른쪽에 지름 치수선, 아래에 길이 치수선을 넣을 자리를 두려고 그림을 키웠다(원래 440×200).
  const w = 510, h = 238, xFix = 80, xFree = 390, cy = 100, ry = 34;
  const dirSign = dir === 'cw' ? 1 : -1;
  const phiDeg = res.valid ? (res.phi_rad * 180) / Math.PI : 0;
  const viewDeg = Math.max(-55, Math.min(55, dirSign * phiDeg * TWIST_VIEW_GAIN));
  const viewRad = (viewDeg * Math.PI) / 180;
  // 표면의 기준선이 비틀리면서 나선이 된다 — 끝점만 φ만큼 돌아간 위치로 보낸다.
  const yEnd = cy - ry * Math.cos(viewRad);
  const midX = (xFix + xFree) / 2;
  const midY = cy - ry * Math.cos(viewRad / 2);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 510, margin: '0 auto', display: 'block', overflow: 'visible' }}>
      {/* 고정단 해칭 */}
      <line x1={xFix} y1={cy - ry - 8} x2={xFix} y2={cy + ry + 8} stroke="#51626F" strokeWidth="2.4" />
      {Array.from({ length: 9 }).map((_, i) => {
        const yy = cy - ry - 6 + i * 9;
        return <line key={i} x1={xFix} y1={yy} x2={xFix - 10} y2={yy + 9} stroke="#8A97A2" strokeWidth="1.1" />;
      })}

      {/* 축 몸통 */}
      <rect x={xFix} y={cy - ry} width={xFree - xFix} height={ry * 2} fill="var(--crimson-soft)" stroke="none" />
      <line x1={xFix} y1={cy - ry} x2={xFree} y2={cy - ry} stroke="var(--crimson)" strokeWidth="1.6" />
      <line x1={xFix} y1={cy + ry} x2={xFree} y2={cy + ry} stroke="var(--crimson)" strokeWidth="1.6" />
      <ellipse cx={xFix} cy={cy} rx="11" ry={ry} fill="none" stroke="var(--crimson)" strokeWidth="1.2" strokeDasharray="3 2" />
      <ellipse cx={xFree} cy={cy} rx="11" ry={ry} fill="#fff" stroke="var(--crimson)" strokeWidth="1.8" />
      <line x1={xFix} y1={cy} x2={xFree + 26} y2={cy} stroke="#C3C3C3" strokeWidth="1" strokeDasharray="5 4" />

      {/* 비틀리기 전 기준선(점선)과 비틀린 뒤의 나선(실선) */}
      <line x1={xFix} y1={cy - ry} x2={xFree} y2={cy - ry} stroke="var(--gray)" strokeWidth="1.2" strokeDasharray="4 3" />
      <path d={`M ${xFix} ${cy - ry} Q ${midX} ${midY} ${xFree} ${yEnd}`} fill="none" stroke="var(--teal)" strokeWidth="2.4" />
      <circle cx={xFree} cy={yEnd} r="3.4" fill="var(--teal)" />

      {/* 자유단의 회전 방향 화살표 */}
      <path
        d={`M ${xFree + 16} ${cy - 22} A 22 22 0 ${dirSign > 0 ? 1 : 0} ${dirSign > 0 ? 1 : 0} ${xFree + 16} ${cy + 22}`}
        fill="none"
        stroke="var(--crimson)"
        strokeWidth="2"
      />
      <text x={xFree + 30} y={cy + 4} fontSize="11" fontWeight="800" fill="var(--crimson)">T</text>

      <text x={xFree} y={cy - ry - 14} fontSize="11.5" fontWeight="800" fill="var(--teal)" textAnchor="middle">
        φ{res.valid ? ` = ${fmt1(phiDeg, 3)}°` : ''}
      </text>
      {/* 치수 — 축 길이 L과 지름 d. 숫자를 클릭하면 그 자리에서 고칠 수 있고,
          단위는 왼쪽 SETTING MENU에서 고른 것을 그대로 쓴다. */}
      <DimLineH
        x1={xFix}
        x2={xFree}
        y={cy + ry + 22}
        labelDy={14}
        fontSize={10.5}
        value={s.L}
        unit={s.LUnit}
        prefix="L = "
        boxW={56}
        onChange={onEditNum('L')}
      />
      <DimLineV
        x={xFree + 48}
        y1={cy - ry}
        y2={cy + ry}
        side="right"
        fontSize={10.5}
        value={s.sectionType === 'solid_circular' ? s.dims.d : s.dims.d_outer}
        unit={s.dimUnit}
        prefix="d = "
        boxW={56}
        onChange={onEditDim(s.sectionType === 'solid_circular' ? 'd' : 'd_outer')}
      />
      <text x={(xFix + xFree) / 2} y={cy + ry + 58} fontSize="10" fill="var(--gray)" textAnchor="middle">
        비틀림각은 실제보다 {TWIST_VIEW_GAIN}배 확대해 그렸습니다 (숫자는 실제값)
      </text>
    </svg>
  );
}
