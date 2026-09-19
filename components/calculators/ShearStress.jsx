'use client';

import { useMemo, useState } from 'react';
import { computeShear } from '@/lib/calc/shearStress';
import { LENGTH_UNITS, FORCE_UNITS, STRESS_UNITS, toBase, fromBase, fmt1, scaledPx } from '@/lib/calc/units1';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import {
  DualField,
  SelectField,
  ResetButton,
  ResultGrid,
  ResultCard,
  StepCard,
  ErrorBox,
  InputNeededPlaceholder,
  DiagramSkipNote,
} from './sm1/Controls';
import { Dim, DimLineH } from './EditableDim';
import { CalcGate, useCalcGate } from './sm1/CalcGate';

// CH.1-4 Shear Stress and Strain — 원본 renderShearStress()의 React 버전.

const DEFAULTS = { mode: 'single', d: 20, dimUnit: 'mm', t: 10, P: 15, PUnit: 'kN', gammaDeg: 5, G: 80, GUnit: 'GPa' };

const MODE_OPTIONS = [
  { value: 'single', label: 'Single Shear' },
  { value: 'double', label: 'Double Shear' },
  { value: 'bearing', label: 'Bearing Stress' },
  { value: 'strain', label: 'Shear Strain (Pure Shear)' },
];

export default function ShearStress() {
  const [s, setS] = useState(DEFAULTS);
  const set = (patch) => setS((prev) => ({ ...prev, ...patch }));
  const setNum = (key) => (v) => set({ [key]: parseFloat(v) });

  const res = useMemo(() => computeShear(s), [s]);
  const gate = useCalcGate(s);
  const areaScale = Math.pow(LENGTH_UNITS[s.dimUnit], 2);


  return (
    <>
      {/* ---------------- Setting Menu ---------------- */}
      <div className="panel">
        <h3>SETTING MENU</h3>
        <EditableText
          contentKey="calc.ShearStress.intro"
          defaultText="볼트·핀 연결부에서 생기는 전단응력(τ=P/A)과 지압응력(σᵦ=P/dt)을 비교해봐요. 전단면이 2개인 이중전단은 같은 하중에서도 응력이 절반이 됩니다."
          style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.6, marginBottom: 14, background: 'var(--bg)', borderRadius: 0, padding: '12px 14px' }}
        />
        <SelectField label="Mode" value={s.mode} options={MODE_OPTIONS} onChange={(v) => set({ mode: v })} />

        {(s.mode === 'single' || s.mode === 'double') && (
          <>
            <DualField label="하중 P" value={s.P} min={0} max={200} step={0.5} onChange={setNum('P')}
              unitMap={FORCE_UNITS} unit={s.PUnit} onUnitChange={(v) => set({ PUnit: v })} invalid={!(s.P >= 0)} />
            <DualField label="볼트/핀 직경 d" value={s.d} min={1} max={100} step={0.5} onChange={setNum('d')}
              unitMap={LENGTH_UNITS} unit={s.dimUnit} onUnitChange={(v) => set({ dimUnit: v })} invalid={!(s.d > 0)} />
          </>
        )}
        {s.mode === 'bearing' && (
          <>
            <DualField label="하중 P" value={s.P} min={0} max={200} step={0.5} onChange={setNum('P')}
              unitMap={FORCE_UNITS} unit={s.PUnit} onUnitChange={(v) => set({ PUnit: v })} invalid={!(s.P >= 0)} />
            <DualField label="볼트/핀 직경 d" value={s.d} min={1} max={100} step={0.5} onChange={setNum('d')}
              unitMap={LENGTH_UNITS} unit={s.dimUnit} onUnitChange={(v) => set({ dimUnit: v })} invalid={!(s.d > 0)} />
            <DualField label="판 두께 t" value={s.t} min={1} max={100} step={0.5} onChange={setNum('t')}
              unitMap={LENGTH_UNITS} unit={s.dimUnit} onUnitChange={(v) => set({ dimUnit: v })} invalid={!(s.t > 0)} />
          </>
        )}
        {s.mode === 'strain' && (
          <>
            <DualField label="전단변형각 γ (degree)" value={s.gammaDeg} min={-45} max={45} step={0.1} onChange={setNum('gammaDeg')} />
            <DualField label="전단탄성계수 G (선택, τ=Gγ 계산용)" value={s.G === null ? 0 : s.G} min={0} max={500} step={0.5}
              onChange={(v) => set({ G: v === '' ? null : parseFloat(v) })}
              unitMap={STRESS_UNITS} unit={s.GUnit} onUnitChange={(v) => set({ GUnit: v })} />
          </>
        )}
        <ResetButton onClick={() => setS(DEFAULTS)} />
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="panel">
        <h3>VISUALIZER</h3>
        {(s.mode === 'single' || s.mode === 'double') && <BoltSVG s={s} nPlanes={s.mode === 'single' ? 1 : 2} onEditNum={setNum} />}
        {s.mode === 'bearing' && <BearingSVG s={s} onEditNum={setNum} />}
        {s.mode === 'strain' && <StrainSVG gammaDeg={s.gammaDeg} />}

        {res.valid ? (
          <ResultGrid>
            {(s.mode === 'single' || s.mode === 'double') && (
              <>
                <ResultCard label="전단면적 A" value={`${fmt1(res.A_m2 / areaScale, 3)} ${s.dimUnit}²`} />
                <ResultCard label="전단면 개수" value={res.nPlanes} />
                <ResultCard label="전단응력 τ" value={`${fmt1(fromBase(res.tau_Pa, 'MPa', STRESS_UNITS), 2)} MPa`} full />
              </>
            )}
            {s.mode === 'bearing' && (
              <>
                <ResultCard label="지압 투영면적 Aᵦ" value={`${fmt1(res.Ab_m2 / areaScale, 3)} ${s.dimUnit}²`} />
                <ResultCard label="지압응력 σᵦ" value={`${fmt1(fromBase(res.sigma_b_Pa, 'MPa', STRESS_UNITS), 2)} MPa`} />
              </>
            )}
            {s.mode === 'strain' && (
              <>
                <ResultCard label="전단변형률 γ" value={`${fmt1(res.gamma_rad, 5)} rad`} />
                <ResultCard
                  label="전단응력 τ = Gγ"
                  value={res.tau_Pa !== null ? `${fmt1(fromBase(res.tau_Pa, 'MPa', STRESS_UNITS), 2)} MPa` : 'G 미입력'}
                />
              </>
            )}
          </ResultGrid>
        ) : (
          <ErrorBox errors={res.errors} />
        )}

        <EditableText as="div" className="ai-hint" contentKey="calc.ShearStress.aiHint"
          defaultText="💬 Double shear에서 왜 분모에 2A가 들어가는지, 오른쪽 AI 튜터에게 물어보세요." />
        <DiagramSkipNote>
          전단/지압응력은 볼트·핀 연결부의 한 단면에서 일어나는 국부적인 응력이라, 부재 길이를 따라 값이 변하는 축력도·전단력도 개념 자체가 적용되지
          않습니다.
        </DiagramSkipNote>

        <div className="steps" style={{ marginTop: 20 }}>
          <CalcGate gate={gate}>
            {(frozen) => {
              const fres = computeShear(frozen);
              return fres.valid ? <Steps s={frozen} res={fres} /> : <InputNeededPlaceholder />;
            }}
          </CalcGate>
        </div>
      </div>

      <AiTutorPanel question="Bearing stress는 왜 전단응력과 다른 면적을 쓰나요?" />
    </>
  );
}

function Steps({ s, res }) {
  const areaScale = Math.pow(LENGTH_UNITS[s.dimUnit], 2);
  if (s.mode === 'single' || s.mode === 'double') {
    const A_disp = res.A_m2 / areaScale;
    return (
      <>
        <StepCard
          title="Step 1. Shear Area"
          formula="A = (π/4)·d²"
          eqLines={[`A = (π/4) × (${s.d} ${s.dimUnit})² = ${fmt1(A_disp, 3)} ${s.dimUnit}²`]}
          final={`A = ${fmt1(A_disp, 3)} ${s.dimUnit}²`}
        />
        <StepCard
          title="Step 2. Shear Stress"
          formula={s.mode === 'single' ? 'τ = P / A' : 'τ = P / (2A)  (전단면 2개)'}
          eqLines={[
            s.mode === 'single'
              ? `τ = ${s.P} ${s.PUnit} / ${fmt1(A_disp, 3)} ${s.dimUnit}²`
              : `τ = ${s.P} ${s.PUnit} / (2 × ${fmt1(A_disp, 3)} ${s.dimUnit}²)`,
          ]}
          final={`τ = ${fmt1(fromBase(res.tau_Pa, 'MPa', STRESS_UNITS), 2)} MPa`}
        />
      </>
    );
  }
  if (s.mode === 'bearing') {
    const Ab_disp = res.Ab_m2 / areaScale;
    return (
      <>
        <StepCard
          title="Step 1. Projected Bearing Area"
          formula="A_b = d × t"
          eqLines={[`A_b = ${s.d} ${s.dimUnit} × ${s.t} ${s.dimUnit} = ${fmt1(Ab_disp, 3)} ${s.dimUnit}²`]}
          final={`A_b = ${fmt1(Ab_disp, 3)} ${s.dimUnit}²`}
        />
        <StepCard
          title="Step 2. Bearing Stress"
          formula="σ_b = P / A_b"
          eqLines={[`σ_b = ${s.P} ${s.PUnit} / ${fmt1(Ab_disp, 3)} ${s.dimUnit}²`]}
          final={`σ_b = ${fmt1(fromBase(res.sigma_b_Pa, 'MPa', STRESS_UNITS), 2)} MPa`}
        />
      </>
    );
  }
  return (
    <>
      <StepCard
        title="Step 1. Shear Strain (radian 변환)"
        formula="γ(rad) = γ(deg) × π/180"
        eqLines={[`γ = ${s.gammaDeg}° × π/180`]}
        final={`γ = ${fmt1(res.gamma_rad, 5)} rad`}
      />
      <StepCard
        title="Step 2. Hooke's Law in Shear"
        formula="τ = G × γ"
        eqLines={[
          res.tau_Pa !== null
            ? `τ = ${fmt1(toBase(s.G, s.GUnit, STRESS_UNITS), 0)} Pa × ${fmt1(res.gamma_rad, 5)} rad`
            : 'G가 입력되지 않아 τ는 계산되지 않습니다.',
        ]}
        final={res.tau_Pa !== null ? `τ = ${fmt1(fromBase(res.tau_Pa, 'MPa', STRESS_UNITS), 2)} MPa` : 'τ = —'}
      />
    </>
  );
}

// 단일/이중 전단 — 겹친 판 사이를 지나는 볼트와, 붉은 점선으로 표시한 전단면
function BoltSVG({ s, nPlanes, onEditNum }) {
  // 아래쪽 치수선 자리를 두려고 높이를 200에서 늘렸다.
  const w = 440, h = 248, plateW = 110, gap = 6, cx = w / 2, midY = 96;
  const boltR = scaledPx(s.d, 150, 12, 34);
  const plateH = Math.max(60, boltR * 5);
  const arrowLen = scaledPx(s.P, 200, 16, 42);
  const plate = (x, y, width, height, key) => (
    <rect key={key} x={x} y={y} width={width} height={height} fill="var(--bg)" stroke="#8A97A2" strokeWidth="1.4" />
  );

  if (nPlanes === 1) {
    return (
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 440, margin: '0 auto', display: 'block' }}>
        {plate(cx - plateW - gap, midY - plateH / 2, plateW, plateH, 'l')}
        {plate(cx + gap, midY - plateH / 2, plateW, plateH, 'r')}
        <circle cx={cx} cy={midY} r={boltR} fill="#D9DDE0" stroke="#51626F" strokeWidth="1.4" />
        <line x1={cx} y1={midY - plateH / 2} x2={cx} y2={midY + plateH / 2} stroke="var(--crimson)" strokeWidth="2.4" strokeDasharray="5 3" />
        <text x={cx} y={midY - plateH / 2 - 26} fontSize="10.5" fill="var(--crimson)" textAnchor="middle" fontWeight="800">
          전단면 1개
        </text>
        {/* 볼트 지름 치수 — 클릭하면 그 자리에서 고칠 수 있다 */}
        <DimLineH
          x1={cx - boltR}
          x2={cx + boltR}
          y={midY + plateH / 2 + 14}
          labelDy={14}
          color="var(--crimson)"
          fontSize={10.5}
          value={s.d}
          unit={s.dimUnit}
          prefix="d = "
          boxW={54}
          onChange={onEditNum('d')}
        />
        <line x1={cx - plateW - gap - arrowLen} y1={midY} x2={cx - plateW - gap} y2={midY} stroke="#51626F" strokeWidth="2" />
        <line x1={cx + plateW + gap} y1={midY} x2={cx + plateW + gap + arrowLen} y2={midY} stroke="#51626F" strokeWidth="2" />
        <text x={cx - plateW - gap - arrowLen - 6} y={midY - 6} fontSize="9.5" fill="var(--gray)" textAnchor="end">P</text>
      </svg>
    );
  }

  const midW = Math.max(30, boltR * 1.6);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 440, margin: '0 auto', display: 'block' }}>
      {plate(cx - plateW - gap - midW / 2, midY - plateH / 2, plateW, plateH, 'l')}
      {plate(cx - midW / 2, midY - plateH / 2 - 10, midW, plateH + 20, 'm')}
      {plate(cx + gap + midW / 2, midY - plateH / 2, plateW, plateH, 'r')}
      <circle cx={cx} cy={midY} r={boltR * 0.9} fill="#D9DDE0" stroke="#51626F" strokeWidth="1.4" />
      <line x1={cx - midW / 2} y1={midY - plateH / 2} x2={cx - midW / 2} y2={midY + plateH / 2} stroke="var(--crimson)" strokeWidth="2.2" strokeDasharray="5 3" />
      <line x1={cx + midW / 2} y1={midY - plateH / 2} x2={cx + midW / 2} y2={midY + plateH / 2} stroke="var(--crimson)" strokeWidth="2.2" strokeDasharray="5 3" />
      <text x={cx} y={midY - plateH / 2 - 30} fontSize="10.5" fill="var(--crimson)" textAnchor="middle" fontWeight="800">
        전단면 2개 (2A)
      </text>
      <DimLineH
        x1={cx - boltR * 0.9}
        x2={cx + boltR * 0.9}
        y={midY + plateH / 2 + 14}
        labelDy={14}
        color="var(--crimson)"
        fontSize={10.5}
        value={s.d}
        unit={s.dimUnit}
        prefix="d = "
        boxW={54}
        onChange={onEditNum('d')}
      />
      <line x1={cx - plateW - gap - midW / 2 - arrowLen} y1={midY} x2={cx - plateW - gap - midW / 2} y2={midY} stroke="#51626F" strokeWidth="2" />
      <line x1={cx + plateW + gap + midW / 2} y1={midY} x2={cx + plateW + gap + midW / 2 + arrowLen} y2={midY} stroke="#51626F" strokeWidth="2" />
      <text x={cx - plateW - gap - midW / 2 - arrowLen - 6} y={midY - 6} fontSize="9.5" fill="var(--gray)" textAnchor="end">P</text>
    </svg>
  );
}

// 지압응력 — 볼트가 판 구멍 벽을 누르는 "투영 접촉면적" d×t를 강조해서 보여준다.
function BearingSVG({ s, onEditNum }) {
  // 아래쪽 치수선 자리를 두려고 높이를 200에서 늘렸다.
  const w = 440, h = 252, plateW = 200, cx = w / 2, cy = 96;
  const boltR = scaledPx(s.d, 150, 14, 40);
  const plateH = Math.max(70, boltR * 4.5);
  const barW = boltR * 2;
  const barH = scaledPx(s.t, 100, 8, 30);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 440, margin: '0 auto', display: 'block' }}>
      <rect x={cx - plateW / 2} y={cy - plateH / 2} width={plateW} height={plateH} fill="var(--bg)" stroke="#8A97A2" strokeWidth="1.4" />
      <circle cx={cx} cy={cy} r={boltR} fill="#D9DDE0" stroke="#51626F" strokeWidth="1.4" />
      <rect x={cx - barW / 2} y={cy - barH / 2} width={barW} height={barH} fill="var(--crimson)" opacity="0.35" stroke="var(--crimson)" strokeWidth="1.6" />
      {/* 투영 접촉면적 A_b = d×t — d와 t 모두 클릭해서 고칠 수 있다 */}
      <DimLineH
        x1={cx - barW / 2}
        x2={cx + barW / 2}
        y={cy + plateH / 2 + 14}
        labelDy={14}
        color="var(--crimson)"
        fontSize={10.5}
        value={s.d}
        unit={s.dimUnit}
        prefix="d = "
        boxW={54}
        onChange={onEditNum('d')}
      />
      <Dim
        x={cx + barW / 2 + 12}
        y={cy + 4}
        anchor="start"
        color="var(--crimson)"
        fontSize={10.5}
        value={s.t}
        unit={s.dimUnit}
        prefix="t = "
        boxW={54}
        onChange={onEditNum('t')}
      />
      <text x={cx} y={cy + plateH / 2 + 44} fontSize="10.5" fill="var(--gray)" textAnchor="middle">
        투영 접촉면적 A_b = d×t (강조된 영역)
      </text>
    </svg>
  );
}

// 순수전단 — 정사각형 요소가 γ만큼 기울어지는 모습
function StrainSVG({ gammaDeg }) {
  const w = 300, h = 220, size = 140, cx = w / 2, cy = h / 2;
  const gammaRad = (gammaDeg * Math.PI) / 180;
  const shear = size * Math.tan(gammaRad);
  const x0 = cx - size / 2, y0 = cy - size / 2, x1 = cx + size / 2, y1 = cy + size / 2;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 260, margin: '0 auto', display: 'block' }}>
      <polygon points={`${x0},${y0} ${x1},${y0} ${x1},${y1} ${x0},${y1}`} fill="none" stroke="#C3C3C3" strokeWidth="1.3" strokeDasharray="4 3" />
      <polygon points={`${x0 + shear},${y0} ${x1 + shear},${y0} ${x1},${y1} ${x0},${y1}`} fill="var(--crimson-soft)" stroke="var(--crimson)" strokeWidth="2" />
      <line x1={x0} y1={y1} x2={x0 + 50} y2={y1} stroke="#8A97A2" strokeWidth="1" />
      <path
        d={`M ${x0 + 34} ${y1} A 34 34 0 0 0 ${x0 + 34 * Math.cos(gammaRad)} ${y1 - 34 * Math.sin(gammaRad)}`}
        fill="none"
        stroke="var(--gray)"
        strokeWidth="1.2"
      />
      <text x={x0 + 46} y={y1 - 10} fontSize="11" fill="var(--gray)" fontWeight="800">
        γ = {fmt1(gammaDeg, 2)}°
      </text>
    </svg>
  );
}
