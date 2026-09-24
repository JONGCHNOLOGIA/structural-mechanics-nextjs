'use client';

import { useMemo, useState } from 'react';
import { computeCombined } from '@/lib/calc/beamStresses';
import { LENGTH_UNITS, FORCE_UNITS, STRESS_UNITS, TORQUE_UNITS, toBase, fromBase, fmt1, scaledPx } from '@/lib/calc/units1';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import Frac from '@/components/Frac';
import { DualField, SelectField, ResetButton, ResultGrid, ResultCard, StepCard, ErrorBox, InputNeededPlaceholder } from './sm1/Controls';
import { CalcGate, useCalcGate } from './sm1/CalcGate';
import { DimLineH, DimLineV } from './EditableDim';

// CH.5-5 Combined Loading (Axial + Bending / Eccentric Load) — 원본 renderCombined()의 React 버전.

const DEFAULTS = {
  mode: 'axial_bending',
  N: 5000, NUnit: 'N',
  M: 800, MUnit: 'N·m',
  P: 5000, PUnit: 'N',
  e: 20, eUnit: 'mm',
  b: 50, h: 100, dimUnit: 'mm',
};

const MODE_OPTIONS = [
  { value: 'axial_bending', label: '축력 N + 굽힘모멘트 M 직접입력' },
  { value: 'eccentric', label: '편심하중 P (M = P·e 로 환산)' },
];

const MPa = (v) => fromBase(v, 'MPa', STRESS_UNITS);

export default function CombinedLoading() {
  const [s, setS] = useState(DEFAULTS);
  const res = useMemo(() => computeCombined(s), [s]);
  const gate = useCalcGate(s);
  const set = (patch) => setS((prev) => ({ ...prev, ...patch }));
  const setNum = (key) => (v) => set({ [key]: parseFloat(v) });

  const isEcc = s.mode === 'eccentric';

  return (
    <>
      {/* ---------------- Setting Menu ---------------- */}
      <div className="panel">
        <h3>SETTING MENU</h3>
        <EditableText
          as="div"
          className="note-box"
          contentKey={`calc.CombinedLoading.note.${s.mode}`}
          defaultText={
            isEcc
              ? '편심하중은 "편심이 있는 쪽"을 상단(top)으로 정의합니다 — 그 쪽은 응력이 보강되고(더 큰 인장/압축), 반대쪽은 완화됩니다.'
              : '굽힘모멘트 M은 양수(+, sagging)로 가정합니다 — 상단은 압축 기여, 하단은 인장 기여로 계산됩니다.'
          }
        />
        <SelectField label="모드" value={s.mode} options={MODE_OPTIONS} onChange={(v) => set({ mode: v })} />
        {isEcc ? (
          <>
            <DualField label="편심하중 P" value={s.P} min={0} max={5000} step={10} onChange={setNum('P')}
              unitMap={FORCE_UNITS} unit={s.PUnit} onUnitChange={(v) => set({ PUnit: v })} invalid={!(s.P >= 0)} />
            <DualField label="편심거리 e" value={s.e} min={0} max={200} step={1} onChange={setNum('e')}
              unitMap={LENGTH_UNITS} unit={s.eUnit} onUnitChange={(v) => set({ eUnit: v })} />
          </>
        ) : (
          <>
            <DualField label="축력 N (인장 +)" value={s.N} min={-5000} max={5000} step={10} onChange={setNum('N')}
              unitMap={FORCE_UNITS} unit={s.NUnit} onUnitChange={(v) => set({ NUnit: v })} />
            <DualField label="굽힘모멘트 M" value={s.M} min={0} max={5000} step={10} onChange={setNum('M')}
              unitMap={TORQUE_UNITS} unit={s.MUnit} onUnitChange={(v) => set({ MUnit: v })} />
          </>
        )}
        <DualField label="단면 폭 b" value={s.b} min={1} max={300} step={1} onChange={setNum('b')}
          unitMap={LENGTH_UNITS} unit={s.dimUnit} onUnitChange={(v) => set({ dimUnit: v })} invalid={!(s.b > 0)} />
        <DualField label="단면 높이 h" value={s.h} min={1} max={300} step={1} onChange={setNum('h')}
          unitMap={LENGTH_UNITS} unit={s.dimUnit} onUnitChange={(v) => set({ dimUnit: v })} invalid={!(s.h > 0)} />
        <ResetButton onClick={() => setS(DEFAULTS)} />
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="panel">
        <h3>VISUALIZER</h3>
        <CombinedSectionSVG s={s} res={res} onEditNum={setNum} />
        {res.valid ? (
          <>
            <ResultGrid>
              <ResultCard label="축응력 성분 σ_N = N/A" value={`${fmt1(MPa(res.sigmaAxial), 3)} MPa`} />
              <ResultCard label="굽힘응력 성분 σ_M = M·c/I" value={`${fmt1(MPa(res.sigmaBend), 3)} MPa`} />
              <ResultCard label="상단 응력 σ_top" value={`${fmt1(MPa(res.sigmaTop), 3)} MPa`} tone={res.sigmaTop >= 0 ? 'tens' : 'comp'} />
              <ResultCard label="하단 응력 σ_bottom" value={`${fmt1(MPa(res.sigmaBottom), 3)} MPa`} tone={res.sigmaBottom >= 0 ? 'tens' : 'comp'} full />
            </ResultGrid>
            <div className="hint">
              두 응력의 부호가 서로 반대면 단면 안 어딘가에서 응력이 0이 되는 선(중립축)이 도심에서 벗어나 생깁니다. 굽힘 성분이
              축응력보다 작으면 단면 전체가 한 가지 부호(전부 인장 또는 전부 압축)로 유지됩니다.
            </div>
            <EditableText as="div" className="ai-hint" contentKey="calc.CombinedLoading.aiHint"
              defaultText="💬 편심하중이 어느 정도면 한쪽 응력이 0이 되는지, 오른쪽 AI 튜터에게 물어보세요." />
          </>
        ) : (
          <ErrorBox errors={res.errors} />
        )}

        <div className="steps" style={{ marginTop: 20 }}>
          <CalcGate gate={gate}>
            {(frozen) => {
              const fres = computeCombined(frozen);
              return fres.valid ? <Steps s={frozen} res={fres} /> : <InputNeededPlaceholder />;
            }}
          </CalcGate>
        </div>
      </div>

      <AiTutorPanel question="중첩원리는 왜 성립하나요?" />
    </>
  );
}

function Steps({ s, res }) {
  const isEcc = s.mode === 'eccentric';
  const cards = [];

  if (isEcc) {
    cards.push(
      <StepCard key="m0" title="Step 0. 편심 → 등가 모멘트" formula="M = P × e"
        eqLines={[`M = ${s.P} ${s.PUnit} × ${s.e} ${s.eUnit}`]}
        final={`M = ${fmt1(res.M_Nm, 2)} N·m (축력은 그대로 도심에 작용)`} />
    );
  }
  cards.push(
    <StepCard
      key="n"
      title="Step 1. 축응력 성분"
      formula={
        <>
          σ_N = <Frac num="N" den="A" />
        </>
      }
      eqLines={[
        <>
          σ_N = <Frac num={`${fmt1(res.N_N, 1)} N`} den={`${fmt1(res.A * 1e6, 2)} mm²`} />
        </>,
      ]}
      final={`σ_N = ${fmt1(MPa(res.sigmaAxial), 3)} MPa`}
    />,
    <StepCard
      key="m"
      title="Step 2. 굽힘응력 성분"
      formula={
        <>
          σ_M = <Frac num="M·c" den="I" />
        </>
      }
      eqLines={[
        `I = ${fmt1(res.I * 1e12, 2)} mm⁴,  c = ${fmt1(res.c * 1000, 2)} mm`,
        <>
          σ_M = <Frac num={`${fmt1(res.M_Nm * 1000, 1)} N·mm × ${fmt1(res.c * 1000, 2)} mm`} den={`${fmt1(res.I * 1e12, 2)} mm⁴`} />
        </>,
      ]}
      final={`σ_M = ${fmt1(MPa(res.sigmaBend), 3)} MPa`}
    />,
    <StepCard key="sum" title="Step 3. 중첩 (Superposition)"
      formula={isEcc ? 'σ = σ_N ± σ_M (편심측이 보강)' : 'σ = σ_N ± σ_M (sagging 기준)'}
      eqLines={
        isEcc
          ? ['상단(편심측): σ_N + σ_M', '하단: σ_N − σ_M']
          : ['상단: σ_N − σ_M (굽힘이 압축으로 기여)', '하단: σ_N + σ_M (굽힘이 인장으로 기여)']
      }
      final={`σ_top = ${fmt1(MPa(res.sigmaTop), 2)} MPa, σ_bottom = ${fmt1(MPa(res.sigmaBottom), 2)} MPa`} />
  );
  return <>{cards}</>;
}

// 단면을 위/아래로 나눠 색으로 인장(teal)·압축(crimson)을 보여주고, 옆에 합성 응력 분포를 직선으로 그린다.
function CombinedSectionSVG({ s, res, onEditNum }) {
  // 왼쪽 높이 치수선과 아래 폭 치수선 자리를 두려고 그림을 키웠다(원래 300×210, cx=110).
  const w = 360, h = 252, cx = 156, cy = 100;
  const bMM = toBase(s.b || 0, s.dimUnit, LENGTH_UNITS) * 1000;
  const hMM = toBase(s.h || 0, s.dimUnit, LENGTH_UNITS) * 1000;
  const shapeW = scaledPx(bMM, 300, 50, 100);
  const shapeH = scaledPx(hMM, 300, 60, 150);

  if (!res.valid) {
    return (
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 360, margin: '0 auto', display: 'block', overflow: 'visible' }}>
        <rect x={cx - shapeW / 2} y={cy - shapeH / 2} width={shapeW} height={shapeH} fill="var(--bg)" stroke="#8A97A2" strokeWidth="1.2" />

      {/* 단면 치수 b, h — 숫자를 클릭하면 그 자리에서 고칠 수 있다(단위는 SETTING MENU 설정). */}
      <DimLineV
        x={cx - shapeW / 2 - 14}
        y1={cy - shapeH / 2}
        y2={cy + shapeH / 2}
        fontSize={10.5}
        value={s.h}
        unit={s.dimUnit}
        prefix="h = "
        boxW={54}
        onChange={onEditNum('h')}
      />
      <DimLineH
        x1={cx - shapeW / 2}
        x2={cx + shapeW / 2}
        y={cy + shapeH / 2 + 14}
        labelDy={14}
        fontSize={10.5}
        value={s.b}
        unit={s.dimUnit}
        prefix="b = "
        boxW={54}
        onChange={onEditNum('b')}
      />
      </svg>
    );
  }

  const top = MPa(res.sigmaTop);
  const bottom = MPa(res.sigmaBottom);
  const peak = Math.max(Math.abs(top), Math.abs(bottom)) || 1;
  const armX = cx + shapeW / 2 + 22;
  const maxLen = 62;
  const lenTop = (Math.abs(top) / peak) * maxLen;
  const lenBot = (Math.abs(bottom) / peak) * maxLen;
  const dirTop = top >= 0 ? 1 : -1;
  const dirBot = bottom >= 0 ? 1 : -1;
  const colTop = top >= 0 ? 'var(--teal)' : 'var(--crimson)';
  const colBot = bottom >= 0 ? 'var(--teal)' : 'var(--crimson)';
  const yTop = cy - shapeH / 2;
  const yBot = cy + shapeH / 2;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 360, margin: '0 auto', display: 'block', overflow: 'visible' }}>
      <rect x={cx - shapeW / 2} y={yTop} width={shapeW} height={shapeH / 2}
        fill={top >= 0 ? 'var(--teal-soft)' : 'var(--crimson-soft)'} stroke="#8A97A2" strokeWidth="1.2" />
      <rect x={cx - shapeW / 2} y={cy} width={shapeW} height={shapeH / 2}
        fill={bottom >= 0 ? 'var(--teal-soft)' : 'var(--crimson-soft)'} stroke="#8A97A2" strokeWidth="1.2" />

      {/* 합성 응력은 y에 대해 1차라, 위·아래 끝값을 이으면 그대로 분포가 된다 */}
      <line x1={armX} y1={yTop} x2={armX} y2={yBot} stroke="#8A97A2" strokeWidth="1" />
      <line x1={armX} y1={yTop} x2={armX + dirTop * lenTop} y2={yTop} stroke={colTop} strokeWidth="2" />
      <line x1={armX} y1={yBot} x2={armX + dirBot * lenBot} y2={yBot} stroke={colBot} strokeWidth="2" />

      {/* 단면 치수 b, h — 숫자를 클릭하면 그 자리에서 고칠 수 있다(단위는 SETTING MENU 설정). */}
      <DimLineV
        x={cx - shapeW / 2 - 14}
        y1={cy - shapeH / 2}
        y2={cy + shapeH / 2}
        fontSize={10.5}
        value={s.h}
        unit={s.dimUnit}
        prefix="h = "
        boxW={54}
        onChange={onEditNum('h')}
      />
      <DimLineH
        x1={cx - shapeW / 2}
        x2={cx + shapeW / 2}
        y={cy + shapeH / 2 + 14}
        labelDy={14}
        fontSize={10.5}
        value={s.b}
        unit={s.dimUnit}
        prefix="b = "
        boxW={54}
        onChange={onEditNum('b')}
      />

      <line x1={armX + dirTop * lenTop} y1={yTop} x2={armX + dirBot * lenBot} y2={yBot} stroke="var(--gray)" strokeWidth="1.6" />

      <text x={armX + dirTop * lenTop} y={yTop - 6} fontSize="9.5" fontWeight="800" fill={colTop} textAnchor="middle">
        {fmt1(top, 1)}
      </text>
      <text x={armX + dirBot * lenBot} y={yBot + 14} fontSize="9.5" fontWeight="800" fill={colBot} textAnchor="middle">
        {fmt1(bottom, 1)}
      </text>
      <text x={cx - shapeW / 2 - 8} y={cy - shapeH / 4} fontSize="10" fill="var(--gray)" textAnchor="end">top</text>
      <text x={cx - shapeW / 2 - 8} y={cy + shapeH / 4 + 4} fontSize="10" fill="var(--gray)" textAnchor="end">bottom</text>
      <text x={w / 2} y={h - 6} fontSize="9.5" fill="var(--gray)" textAnchor="middle">
        합성 응력 분포 (MPa) — 초록=인장, 빨강=압축
      </text>
    </svg>
  );
}
