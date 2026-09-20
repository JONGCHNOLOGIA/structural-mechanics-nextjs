'use client';

import { useEffect, useMemo, useState } from 'react';
import { fmt, fmtSci } from '@/lib/calc/unitOptions';
import { bendingEnergy, castiglianoDeflection, unitLoadCase, virtualWork } from '@/lib/calc/beamEnergy';
import FormulaSection, { Tip } from './FormulaSection';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import Frac from '@/components/Frac';
import BeamWorkbench, { CalcTrigger, sup, udl, pointLoad, momentLoad } from './BeamWorkbench';

/*
  Castigliano's Theorem — 앞 소분류(Strain Energy)가 "에너지가 무엇인가"였다면,
  여기는 "그 에너지로 무엇을 하느냐"다. 한 문제를 네 가지 방법으로 푼다:

    A. Castigliano 제2정리        δ = ∂U/∂P      — 힘으로 편미분하면 그 방향 처짐
    B. 단위 가상하중법            δ = ∫ M·m/EI dx — 그 점에 가상의 단위하중 1을 얹고 적분
    C. Castigliano 제1정리        P = ∂U/∂δ      — 거꾸로, 변위로 편미분하면 그 자리 힘
    D. 단위 가상변위법            P = ∫ M·κ̄ dx   — 그 점에 가상의 단위변위 1을 주고 적분

  A·B는 "힘을 알고 처짐을 구한다", C·D는 "변위를 알고 힘을 구한다" — 같은 관계를 양쪽에서
  읽은 것뿐이다. 네 값이 모두 같은 답으로 모이는지 화면에서 숫자로 확인할 수 있게 했다.

  편미분은 손으로 할 때처럼 U를 식으로 쓴 다음 미분하는 대신, 가상하중 Q를 ±h만큼 넣어
  U(Q)를 두 번 구하고 중앙차분한다 — 정의 그대로다.
*/

export default function CastiglianosTheorem() {
  const [xFrac, setXFrac] = useState(0.5);

  return (
    <>
      <BeamWorkbench
        contentPrefix="calc.CastiglianosTheorem"
        intro="변형에너지 U 하나로 처짐도 구하고 힘도 구할 수 있어요. **하중으로 편미분하면 처짐**(제2정리), **변위로 편미분하면 힘**(제1정리)이 나옵니다. 같은 보·같은 지점을 네 가지 방법으로 풀어서, 정말 같은 답이 나오는지 아래에서 맞춰봐요."
        initial={() => ({ L: 4, supports: [sup('pin', 0), sup('roller', 4)], loads: [udl(0, 4, 10 * 1000)] })}
        presets={[
          {
            label: '단순보 · 등분포 q',
            hint: '중앙 처짐 5qL⁴/384EI — mmch9의 기본 예제',
            build: () => ({ L: 4, supports: [sup('pin', 0), sup('roller', 4)], loads: [udl(0, 4, 10 * 1000)] }),
          },
          {
            label: '캔틸레버 · 선단 P + M₀',
            hint: '자유단에서 δ와 θ를 함께 보기 좋아요',
            build: () => ({ L: 4, supports: [sup('fixed', 0)], loads: [pointLoad(4, 20 * 1000), momentLoad(4, 15 * 1000)] }),
          },
          {
            label: '단순보 · 치우친 P',
            hint: '공식표에 없는 위치에서도 그대로 통해요',
            build: () => ({ L: 6, supports: [sup('pin', 0), sup('roller', 6)], loads: [pointLoad(2, 25 * 1000)] }),
          },
        ]}
        diagrams={['M']}
      >
        {(ctx) => <FourMethods ctx={ctx} xFrac={xFrac} setXFrac={setXFrac} />}
      </BeamWorkbench>

      <AiTutorPanel />
    </>
  );
}

function FourMethods({ ctx, xFrac, setXFrac }) {
  const { solved, L, supports, loads, ei, units, lenF, forceF, disp } = ctx;
  const [state, setState] = useState('idle');
  const [snap, setSnap] = useState(null);

  useEffect(() => {
    setState((s) => (s === 'done' ? 'stale' : s));
  }, [solved, xFrac]);

  const xStar = xFrac * L;

  const unit = useMemo(
    () => (solved ? unitLoadCase(L, supports, ei, xStar, 'force', 600) : null),
    [solved, L, supports, ei, xStar]
  );
  const unitMoment = useMemo(
    () => (solved ? unitLoadCase(L, supports, ei, xStar, 'moment', 600) : null),
    [solved, L, supports, ei, xStar]
  );

  if (!solved || !unit || !unit.pts || !unitMoment || !unitMoment.pts) return null;

  const at = (pts, x) => {
    const i = Math.min(pts.length - 1, Math.max(0, Math.round((x / L) * (pts.length - 1))));
    return pts[i];
  };
  const refPt = at(solved.pts, xStar);
  // 대칭보의 중앙처럼 답이 정확히 0인 자리에서는 수치오차만 남아 1e-19 rad 같은 값이 찍힌다.
  // 보 전체에서 가장 큰 기울기를 기준으로, 그보다 아홉 자리 작은 값은 0으로 본다.
  const slopeScale = Math.max(1e-30, ...solved.pts.map((p) => Math.abs(p.slope)));
  const snapZero = (v) => (Math.abs(v) < slopeScale * 1e-9 ? 0 : v);

  function run() {
    // A — 제2정리: 그 점에 가상하중 Q를 얹고 U를 Q로 편미분
    const cast2 = castiglianoDeflection(L, supports, loads, ei, xStar, 600);
    // B — 단위 가상하중법
    const vw = virtualWork(solved, unit);
    // C·D — 그 점의 유연도 f = 단위하중 1을 줬을 때의 그 점 처짐 = ∫m²/EI dx
    const fFromShape = at(unit.pts, xStar).v;
    const fFromIntegral = virtualWork(unit, unit);
    const k = 1 / fFromIntegral;
    // D — 단위가상변위 1에 해당하는 곡률 κ̄ = m/(EI·f), 내부 가상일 = ∫ M·κ̄ dx
    const dForce = virtualWork(solved, unit) / fFromIntegral;

    setSnap({
      xStar,
      delta: refPt.v,
      U: bendingEnergy(solved.pts, solved.midPts),
      cast2: cast2.value,
      h: cast2.h,
      vw,
      theta: snapZero(-refPt.slope),
      vwMoment: snapZero(virtualWork(solved, unitMoment)),
      f: fFromIntegral,
      fShape: fFromShape,
      k,
      dForce,
      units: { ...units },
      lenF,
      forceF,
    });
    setState('done');
  }

  return (
    <div className="steps">
      <div className="field" style={{ marginTop: 4 }}>
        <label>
          구할 지점 x = {fmt(disp(xStar, lenF))} {units.length} — 여기서의 처짐 δ와 처짐각 θ를 네 가지로 구해봐요
        </label>
        <input type="range" min="0" max="1" step="0.005" value={xFrac}
          onChange={(e) => setXFrac(parseFloat(e.target.value))} style={{ width: '100%' }} />
      </div>

      <FormulaSection
        title={<EditableText as="span" contentKey="castigliano.title" defaultText="한 문제, 네 가지 풀이" />}
      >
        <EditableText
          as="div"
          className="step-row"
          contentKey="castigliano.intro2"
          defaultText="A·B는 **힘을 알고 처짐을 구하는** 쪽이고, C·D는 **변위를 알고 힘을 구하는** 쪽이에요. 방향만 다를 뿐 뿌리는 같은 변형에너지 하나입니다."
        />
        <CalcTrigger state={state} onCalc={run} />
        {state !== 'idle' && snap && <Results snap={snap} />}
      </FormulaSection>

      <EditableText
        as="div"
        className="ai-hint"
        contentKey="calc.CastiglianosTheorem.aiHint"
        defaultText="💬 왜 가상의 단위하중을 줘도 결과가 맞는지 궁금하다면, 오른쪽 AI 튜터에게 물어보세요."
      />
    </div>
  );
}

function Results({ snap }) {
  const { units, lenF, forceF } = snap;
  const mm = (v) => `${fmt(v * 1000)} mm`;
  const relTo = (a, b) => (Math.abs(b) > 1e-15 ? Math.abs(a - b) / Math.abs(b) : Math.abs(a - b));
  const okA = relTo(snap.cast2, snap.delta) < 5e-3;
  const okB = relTo(snap.vw, snap.delta) < 5e-3;
  const okD = relTo(snap.dForce, snap.k * snap.delta) < 5e-3;
  const okF = relTo(snap.fShape, snap.f) < 5e-3;

  return (
    <div style={{ marginTop: 10 }}>
      <div className="step-formula" style={{ display: 'block' }}>
        U = {fmtSci(snap.U)} J &nbsp;·&nbsp; 이 보를 실제로 풀어서 읽은 값: δ = {mm(snap.delta)}, θ ={' '}
        {fmtSci(snap.theta)} rad
        <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--gray-soft)', marginTop: 3 }}>
          아래 네 방법이 이 값으로 모이는지 보면 됩니다.
        </div>
      </div>

      <Method
        tag="A"
        name="Castigliano 제2정리 — 힘으로 편미분"
        formula={<>δ = <Frac num="∂U" den="∂P" /></>}
        how={`그 점에 가상의 집중하중 Q를 얹고 U(Q)를 구한 뒤, Q로 미분하고 Q=0을 대입해요. 여기서는 Q = ±${fmt(snap.h / forceF)} ${units.force}로 U를 두 번 구해 중앙차분했습니다.`}
        value={mm(snap.cast2)}
        ok={okA}
        steps="U를 구한다 → Q로 편미분 → Q=0"
      />

      <Method
        tag="B"
        name="단위 가상하중법 (unit dummy load)"
        formula={<>δ = ∫ <Frac num="M · m" den="EI" /> dx</>}
        how="구하려는 점에 단위하중 1을 혼자 얹은 보를 따로 풀어 m(x)를 얻고, 실제 M(x)와 곱해 적분해요. U를 세우지 않아도 되니 손으로 풀 때는 이쪽이 빠릅니다."
        value={mm(snap.vw)}
        ok={okB}
        steps="m(x)를 구한다 → ∫M·m/EI"
        extra={
          <>
            같은 방법으로 처짐각도: 단위 <b>모멘트</b> 1을 얹으면 θ = ∫M·m̄/EI dx = {fmtSci(snap.vwMoment)} rad
            &nbsp;(실제 θ = {fmtSci(snap.theta)} rad)
          </>
        }
      />

      <Method
        tag="C"
        name="Castigliano 제1정리 — 변위로 편미분"
        formula={<>P = <Frac num="∂U" den="∂δ" /></>}
        how={`이번엔 반대로 묻습니다 — 그 점을 ${mm(snap.delta)}만큼 눌러 붙잡아두려면 힘이 얼마나 필요할까요? 그 점의 유연도 f = ${fmtSci(snap.f)} m/N 이라, 강성 k = 1/f = ${fmtSci(snap.k)} N/m. U = ½kδ² 이니 ∂U/∂δ = kδ 입니다.`}
        value={`${fmt((snap.k * snap.delta) / forceF)} ${units.force}`}
        ok
        steps="f를 구한다 → k = 1/f → P = kδ"
      />

      <Method
        tag="D"
        name="단위 가상변위법 (unit dummy displacement)"
        formula={<>P · 1 = ∫ M · κ̄ dx</>}
        how="그 점에 가상의 단위변위 1을 주면 보 전체에 곡률 κ̄ = m /(EI·f)가 생겨요. 외부 가상일(P × 1)이 내부 가상일(∫M·κ̄ dx)과 같다고 놓으면 힘이 나옵니다 — C와 같은 답을 다른 길로 얻는 셈이에요."
        value={`${fmt(snap.dForce / forceF)} ${units.force}`}
        ok={okD}
        steps="κ̄를 구한다 → ∫M·κ̄"
      />

      <div className="step-final">
        네 방법이 모두 같은 곳으로 모였어요.
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-soft)', marginTop: 4, lineHeight: 1.7 }}>
          · <b>손으로 풀 때</b>는 B(단위 가상하중)가 가장 짧아요 — U를 식으로 쓸 필요가 없으니까요.
          <br />· <b>A</b>는 하중이 여러 개고 그중 하나의 방향 처짐만 필요할 때 깔끔해요. 구하려는 곳에 하중이
          없으면 가상하중 Q를 새로 얹어야 하는데, 그게 결국 B와 같은 일이 됩니다.
          <br />· <b>C·D</b>는 변위를 정해놓고 힘을 묻는 문제(예: 지점 침하, 조립 오차)에서 쓰입니다. CH.10에서
          여분력을 구할 때 바로 이 방향을 씁니다.
          <br />· 검산: 단위하중을 준 보에서 그 점의 처짐을 바로 읽으면 {fmtSci(snap.fShape)} m,
          ∫m²/EI dx로 구하면 {fmtSci(snap.f)} m — {okF ? '일치합니다.' : '어긋나요.'}
        </div>
      </div>
    </div>
  );
}

function Method({ tag, name, formula, how, value, ok, steps, extra }) {
  return (
    <div className="step-row" style={{ display: 'block', borderLeft: `3px solid ${ok ? '#1E7F72' : 'var(--crimson)'}`, paddingLeft: 10, marginTop: 8 }}>
      <div style={{ fontWeight: 800, marginBottom: 2 }}>
        {tag}. {name}
      </div>
      <div style={{ marginBottom: 3 }}>{formula}</div>
      <div style={{ fontSize: 11, color: 'var(--gray-soft)', lineHeight: 1.6 }}>{how}</div>
      {extra && <div style={{ fontSize: 11, color: 'var(--gray-soft)', lineHeight: 1.6, marginTop: 3 }}>{extra}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4, gap: 10 }}>
        <span style={{ fontSize: 10.5, color: 'var(--gray-soft)' }}>단계: {steps}</span>
        <b>{value}</b>
      </div>
    </div>
  );
}
