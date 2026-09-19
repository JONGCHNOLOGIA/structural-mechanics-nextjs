'use client';

import { useMemo, useState } from 'react';
import { computeStrengthToWeight } from '@/lib/calc/torsion';
import { LENGTH_UNITS, toBase, fmt1, scaledPx } from '@/lib/calc/units1';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import { DualField, ResetButton, ResultGrid, ResultCard, StepCard, ErrorBox, InputNeededPlaceholder } from './sm1/Controls';
import { CalcGate, useCalcGate } from './sm1/CalcGate';
import { DimLineH } from './EditableDim';

// CH.3-5 Strength-to-Weight Ratio (Hollow vs Solid) — 원본 renderStrengthToWeight()의 React 버전.

const DEFAULTS = { D: 100, DUnit: 'mm', k: 0.6 };

export default function StrengthToWeight() {
  const [s, setS] = useState(DEFAULTS);
  const res = useMemo(() => computeStrengthToWeight(s), [s]);
  const gate = useCalcGate(s);
  const set = (patch) => setS((prev) => ({ ...prev, ...patch }));
  const setNum = (key) => (v) => set({ [key]: parseFloat(v) });

  return (
    <>
      {/* ---------------- Setting Menu ---------------- */}
      <div className="panel">
        <h3>SETTING MENU</h3>
        <EditableText
          as="div"
          className="note-box"
          contentKey="calc.StrengthToWeight.note"
          defaultText="같은 외경 D를 갖는 중공축과 중실축을 비교합니다. 비틀림 전단응력은 표면에서 가장 크고 중심에서 0이므로, 가운데 재료를 덜어내면 무게는 많이 줄어드는데 비틀림 저항은 조금만 줄어듭니다. (k = d₁/d₂ = 0.6이면 교재 Example 3-3과 같은 조건)"
        />
        <DualField label="외경 D (두 축 공통)" value={s.D} min={10} max={300} step={1} onChange={setNum('D')}
          unitMap={LENGTH_UNITS} unit={s.DUnit} onUnitChange={(v) => set({ DUnit: v })} invalid={!(s.D > 0)} />
        <DualField label="중공축 내외경비 k = d₁/d₂" value={s.k} min={0.05} max={0.95} step={0.01} onChange={setNum('k')}
          invalid={!(s.k > 0 && s.k < 1)}
          hint="k가 1에 가까울수록 얇은 관이 됩니다. 실제로는 너무 얇으면 국부 좌굴(buckling)이 생겨 이 비교가 성립하지 않습니다." />
        <ResetButton onClick={() => setS(DEFAULTS)} />
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="panel">
        <h3>VISUALIZER</h3>
        <CompareSVG s={s} onEditNum={setNum} />
        {res.valid ? (
          <>
            <ResultGrid>
              <ResultCard label="τ_max 비 (동일 T, 중공/중실)" value={fmt1(res.tauRatio, 3)} />
              <ResultCard label="무게 비 (중공/중실)" value={fmt1(res.weightRatio, 3)} />
              <ResultCard label="(T/W) 비 (동일 τ_allow, 중공/중실)" value={fmt1(res.TW_ratio, 3)} tone="tens" full />
            </ResultGrid>
            <EditableText
              as="div"
              className="hint"
              contentKey="strengthToWeight.ratioHint"
              defaultText="(T/W)비가 1보다 크면, 무게 1kg당 버틸 수 있는 토크가 중실축보다 크다는 뜻입니다 — 같은 무게라면 중공축이 더 강합니다."
            />
            <EditableText as="div" className="ai-hint" contentKey="calc.StrengthToWeight.aiHint"
              defaultText="💬 (T/W)비가 1보다 크면 무슨 뜻인지, 오른쪽 AI 튜터에게 물어보세요." />
          </>
        ) : (
          <ErrorBox errors={res.errors} />
        )}

        <div className="steps" style={{ marginTop: 20 }}>
          <CalcGate gate={gate}>
            {(frozen) => {
              const fres = computeStrengthToWeight(frozen);
              return fres.valid ? <Steps s={frozen} res={fres} /> : <InputNeededPlaceholder />;
            }}
          </CalcGate>
        </div>
      </div>

      <AiTutorPanel question="실제 구조물에서 중공축을 잘 안 쓰는 경우도 있나요?" />
    </>
  );
}

function Steps({ s, res }) {
  return (
    <>
      <StepCard
        title="Step 1. 극관성모멘트"
        formula="Ip_solid = πD⁴/32,  Ip_hollow = π(D⁴−(kD)⁴)/32"
        eqLines={[
          `Ip_solid = ${fmt1(res.IpSol * 1e12, 1)} mm⁴`,
          `Ip_hollow = ${fmt1(res.IpHol * 1e12, 1)} mm⁴`,
        ]}
        final={`Ip_hollow / Ip_solid = 1 − k⁴ = ${fmt1(res.IpHol / res.IpSol, 4)}`}
      />
      <StepCard
        title="Step 2. 같은 토크일 때 응력비"
        formula="τ_hollow / τ_solid = Ip_solid / Ip_hollow"
        eqLines={['τ = T·r/Ip 에서 r(=D/2)이 같으므로 Ip만 남는다']}
        final={`τ 비 = ${fmt1(res.tauRatio, 3)}`}
      />
      <StepCard
        title="Step 3. 무게비"
        formula="W_hollow / W_solid = A_hollow / A_solid = 1 − k²"
        eqLines={[
          `A_solid = ${fmt1(res.Asol * 1e6, 1)} mm²,  A_hollow = ${fmt1(res.Ahol * 1e6, 1)} mm²`,
        ]}
        final={`무게비 = ${fmt1(res.weightRatio, 3)}`}
      />
      <StepCard
        title="Step 4. 강도/무게비"
        formula="(T/W)비 = (Ip_hollow/Ip_solid) / (무게비) = (1−k⁴)/(1−k²)"
        eqLines={[`= ${fmt1(res.T_ratio, 4)} / ${fmt1(res.weightRatio, 4)}`]}
        final={`(T/W)비 = ${fmt1(res.TW_ratio, 3)} ${res.TW_ratio > 1 ? '→ 중공축이 무게 대비 더 효율적' : '→ 중실축이 더 유리'}`}
      />
    </>
  );
}

// 같은 외경의 두 단면을 나란히 — 중공축 안쪽 빈 부분이 k에 따라 커진다.
function CompareSVG({ s, onEditNum }) {
  // 아래쪽에 외경 치수선 자리를 두려고 높이를 200에서 늘렸다.
  const w = 320, h = 236, cy = 88;
  // 원 크기는 입력 단위와 무관하게 실제 mm 기준으로 정한다.
  const dMM = toBase(s.D || 0, s.DUnit, LENGTH_UNITS) * 1000;
  const r = scaledPx(dMM, 300, 40, 75);
  const kSafe = s.k > 0 && s.k < 1 ? s.k : 0;
  const cxH = w * 0.28, cxS = w * 0.72;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 320, margin: '0 auto', display: 'block', overflow: 'visible' }}>
      <circle cx={cxH} cy={cy} r={r} fill="var(--teal-soft)" stroke="var(--teal)" strokeWidth="1.6" />
      <circle cx={cxH} cy={cy} r={r * kSafe} fill="var(--bg)" stroke="var(--teal)" strokeWidth="1.4" strokeDasharray="3 2" />
      <text x={cxH} y={cy + r + 20} fontSize="11" fill="var(--teal)" textAnchor="middle" fontWeight="800">중공축 (Hollow)</text>
      <circle cx={cxS} cy={cy} r={r} fill="var(--crimson-soft)" stroke="var(--crimson)" strokeWidth="1.6" />
      <text x={cxS} y={cy + r + 20} fontSize="11" fill="var(--crimson)" textAnchor="middle" fontWeight="800">중실축 (Solid)</text>
      {/* 외경 D 치수 — 두 축이 같은 값이라 한 번만 적고, 클릭해서 고치면 양쪽 그림이 함께 바뀐다. */}
      <DimLineH
        x1={cxS - r}
        x2={cxS + r}
        y={cy + r + 34}
        labelDy={14}
        color="var(--crimson)"
        fontSize={10.5}
        value={s.D}
        unit={s.DUnit}
        prefix="D = "
        boxW={54}
        onChange={onEditNum('D')}
      />
      <text x={w / 2} y={h - 8} fontSize="10" fill="var(--gray)" textAnchor="middle">
        외경 D는 동일 — 중공축은 안쪽 k·D 만큼을 덜어낸 단면
      </text>
    </svg>
  );
}
