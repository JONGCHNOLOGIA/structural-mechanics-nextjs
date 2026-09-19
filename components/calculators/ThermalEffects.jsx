'use client';

import { useMemo, useState } from 'react';
import { computeThermal } from '@/lib/calc/thermalEffects';
import { LENGTH_UNITS, FORCE_UNITS, STRESS_UNITS, AREA_UNITS, fromBase, fmt1 } from '@/lib/calc/units1';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import { DualField, SelectField, ResetButton, ResultGrid, ResultCard, StepCard, ErrorBox, InputNeededPlaceholder } from './sm1/Controls';
import { CalcGate, useCalcGate } from './sm1/CalcGate';
import { DimLineH } from './EditableDim';

// CH.2-4 Thermal Effects and Prestrain — 원본 renderThermal()의 React 버전.

const DEFAULTS = { mode: 'free', alpha: 0.000012, deltaT: 50, L: 1, LUnit: 'm', E: 200, EUnit: 'GPa', A: 500, AUnit: 'mm2' };

export default function ThermalEffects() {
  const [s, setS] = useState(DEFAULTS);
  const set = (patch) => setS((prev) => ({ ...prev, ...patch }));
  const setNum = (key) => (v) => set({ [key]: parseFloat(v) });

  const res = useMemo(() => computeThermal(s), [s]);
  const gate = useCalcGate(s);
  const isFree = s.mode === 'free';


  return (
    <>
      {/* ---------------- Setting Menu ---------------- */}
      <div className="panel">
        <h3>SETTING MENU</h3>
        <EditableText
          contentKey="calc.ThermalEffects.intro"
          defaultText="온도가 변하면 부재는 ε_T=αΔT만큼 늘거나 줄어들려고 해요. 자유롭게 움직일 수 있으면 응력 없이 길이만 변하고, 양단이 막혀 있으면 길이는 그대로인 대신 열응력이 생깁니다."
          style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.6, marginBottom: 14, background: 'var(--bg)', borderRadius: 0, padding: '12px 14px' }}
        />
        <SelectField
          label="지지 조건"
          value={s.mode}
          onChange={(v) => set({ mode: v })}
          options={[
            { value: 'free', label: 'Free (자유 팽창/수축)' },
            { value: 'restrained', label: 'Restrained (양단 완전 구속)' },
          ]}
        />
        <DualField
          label="열팽창계수 α (×10⁻⁶ /°C)"
          value={s.alpha * 1e6}
          min={0} max={30} step={0.1}
          onChange={(v) => set({ alpha: parseFloat(v) * 1e-6 })}
          hint={
            <EditableText
              as="span"
              contentKey="thermalEffects.alphaHint"
              defaultText="α 값은 사용자가 직접 입력합니다 (특정 재료의 실제 물성치를 임의로 단정하지 않습니다)."
            />
          }
        />
        <DualField label="온도변화 ΔT (°C, 냉각시 음수)" value={s.deltaT} min={-100} max={100} step={1} onChange={setNum('deltaT')} />
        <DualField label="부재 길이 L" value={s.L} min={0.01} max={10} step={0.01} onChange={setNum('L')}
          unitMap={LENGTH_UNITS} unit={s.LUnit} onUnitChange={(v) => set({ LUnit: v })} invalid={!(s.L > 0)} />
        {!isFree && (
          <>
            <DualField label="탄성계수 E" value={s.E} min={0.1} max={500} step={0.5} onChange={setNum('E')}
              unitMap={STRESS_UNITS} unit={s.EUnit} onUnitChange={(v) => set({ EUnit: v })} invalid={!(s.E > 0)} />
            <DualField label="단면적 A" value={s.A} min={1} max={5000} step={1} onChange={setNum('A')}
              unitMap={AREA_UNITS} unit={s.AUnit} onUnitChange={(v) => set({ AUnit: v })} invalid={!(s.A > 0)} />
          </>
        )}
        <ResetButton onClick={() => setS(DEFAULTS)} />
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="panel">
        <h3>VISUALIZER</h3>
        <MemberSVG mode={s.mode} res={res} length={s.L} lengthUnit={s.LUnit} onEditL={setNum('L')} />
        {res.valid ? (
          <>
            {isFree ? (
              <ResultGrid>
                <ResultCard label="열변형률 ε_T = αΔT" value={`${fmt1(res.epsT * 1e6, 1)} µ`} />
                <ResultCard label="자유 변위 δ_T" value={`${fmt1(fromBase(res.deltaDisp_m, 'mm', LENGTH_UNITS), 4)} mm`} />
                <ResultCard label="열응력 σ_T" value="0 MPa (구속 없음)" full />
              </ResultGrid>
            ) : (
              <ResultGrid>
                <ResultCard label="열변형률 ε_T = αΔT" value={`${fmt1(res.epsT * 1e6, 1)} µ`} />
                <ResultCard label="열응력 σ_T = −EαΔT" value={`${fmt1(fromBase(res.sigmaT_Pa, 'MPa', STRESS_UNITS), 2)} MPa`}
                  tone={res.sigmaT_Pa < 0 ? 'comp' : 'tens'} />
                <ResultCard label="부재력 N_T" value={`${fmt1(fromBase(res.N_T, 'kN', FORCE_UNITS), 3)} kN`}
                  tone={res.N_T < 0 ? 'comp' : 'tens'} full />
              </ResultGrid>
            )}
            <EditableText as="div" className="ai-hint" contentKey="calc.ThermalEffects.aiHint"
              defaultText="💬 왜 구속된 부재를 가열하면 압축응력이 생기는지, 오른쪽 AI 튜터에게 물어보세요." />
          </>
        ) : (
          <ErrorBox errors={res.errors} />
        )}

        <div className="steps" style={{ marginTop: 20 }}>
          <CalcGate gate={gate}>
            {(frozen) => {
              const fres = computeThermal(frozen);
              return <Steps s={frozen} res={fres} />;
            }}
          </CalcGate>
        </div>
      </div>

      <AiTutorPanel question="구속된 부재는 왜 온도가 오르면 압축을 받나요?" />
    </>
  );
}

function Steps({ s, res }) {
  const isFree = s.mode === 'free';
  return (
    <>
          {res.valid ? (
            <>
              <StepCard title="Step 1. 열변형률" formula="ε_T = α · ΔT"
                eqLines={[`ε_T = ${fmt1(s.alpha * 1e6, 2)}×10⁻⁶ × ${s.deltaT}`]}
                final={`ε_T = ${fmt1(res.epsT * 1e6, 1)} × 10⁻⁶`} />
              {isFree ? (
                <StepCard title="Step 2. 자유 변위 (구속 없음)" formula="δ_T = ε_T · L"
                  eqLines={[`δ_T = ${fmt1(res.epsT * 1e6, 1)}×10⁻⁶ × ${s.L} ${s.LUnit}`]}
                  final={`δ_T = ${fmt1(fromBase(res.deltaDisp_m, 'mm', LENGTH_UNITS), 4)} mm`} />
              ) : (
                <>
                  <StepCard title="Step 2. 열응력 (완전 구속 — 길이 변화 = 0)" formula="σ_T = −E · α · ΔT"
                    eqLines={[`σ_T = −${s.E} ${s.EUnit} × ${fmt1(s.alpha * 1e6, 2)}×10⁻⁶ × ${s.deltaT}`]}
                    final={
                      <>
                        σ_T = <span className={res.sigmaT_Pa < 0 ? 'comp' : 'tens'}>
                          {fmt1(fromBase(res.sigmaT_Pa, 'MPa', STRESS_UNITS), 2)} MPa
                        </span>
                      </>
                    } />
                  <StepCard title="Step 3. 부재력" formula="N_T = σ_T · A"
                    eqLines={[`N_T = ${fmt1(fromBase(res.sigmaT_Pa, 'MPa', STRESS_UNITS), 2)} MPa × ${s.A} ${s.AUnit}`]}
                    final={`N_T = ${fmt1(fromBase(res.N_T, 'kN', FORCE_UNITS), 3)} kN`} />
                </>
              )}
            </>
          ) : (
            <InputNeededPlaceholder />
          )}
    </>
  );
}

// 자유단이면 길이가 변하고(과장 표현), 양단 구속이면 길이는 그대로인 대신 열응력이 생긴다.
function MemberSVG({ mode, res, length, lengthUnit, onEditL }) {
  // 아래쪽에 길이 치수선을 넣을 자리를 두려고 높이를 170에서 늘렸다.
  const w = 460, h = 206, x1 = 90, x2 = 370, barY = 85, barH = 26;
  const restrained = mode === 'restrained';
  const color = res.valid && (res.deltaDisp_m < 0 || res.sigmaT_Pa < 0) ? 'var(--crimson)' : 'var(--teal)';

  let defX2 = x2;
  if (!restrained && res.valid) {
    defX2 = x2 + Math.max(-40, Math.min(40, (res.deltaDisp_m >= 0 ? 1 : -1) * 30));
  }

  const label = restrained
    ? '길이 변화 없음 — 대신 열응력 σ_T 발생'
    : res.valid
    ? res.deltaDisp_m >= 0
      ? '자유 팽창 (elongation)'
      : '자유 수축 (shortening)'
    : '';

  const wall = (x, dir, key) => (
    <g key={key}>
      <line x1={x} y1={barY - 22} x2={x} y2={barY + barH + 22} stroke="#51626F" strokeWidth="2" />
      {Array.from({ length: 7 }).map((_, i) => {
        const yy = barY - 20 + i * 8;
        return <line key={i} x1={x} y1={yy} x2={x + dir * 9} y2={yy + 8} stroke="#8A97A2" strokeWidth="1.1" />;
      })}
    </g>
  );

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 460, margin: '0 auto', display: 'block', overflow: 'visible' }}>
      {/* 원래 길이 L 치수 — 숫자를 클릭하면 그 자리에서 고칠 수 있다(점선이 변형 전 길이) */}
      <DimLineH
        x1={x1}
        x2={x2}
        y={barY + barH + 30}
        labelDy={14}
        fontSize={10.5}
        value={length}
        unit={lengthUnit}
        prefix="L = "
        boxW={56}
        onChange={onEditL}
      />
      {wall(x1, -1, 'l')}
      {restrained && wall(x2, 1, 'r')}
      <rect x={x1} y={barY} width={x2 - x1} height={barH} fill="none" stroke="#C3C3C3" strokeWidth="1.3" strokeDasharray="4 3" />
      <rect x={x1} y={barY} width={defX2 - x1} height={barH} fill={color} opacity="0.18" stroke={color} strokeWidth="1.8" />
      <text x={(x1 + defX2) / 2} y={barY + barH + 28} fontSize="10.5" fill={color} textAnchor="middle" fontWeight="700">
        {label}
      </text>
    </svg>
  );
}
