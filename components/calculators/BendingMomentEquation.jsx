'use client';

import { useEffect, useState } from 'react';
import { fmt } from '@/lib/calc/unitOptions';
import { conditionsFor } from '@/lib/calc/beamBuilder';
import FormulaSection from './FormulaSection';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import BeamWorkbench, { CalcTrigger, letterFor, sup, udl } from './BeamWorkbench';
import ConditionList from './ConditionList';

// 자유 배치 보 빌더. 지지단(고정/힌지/롤러)과 하중(집중/등분포/삼각형분포/모멘트)을 직접 얹어
// 나만의 문제를 만들고, 그 보를 ① 굽힘모멘트식 적분 ② 4차 미분방정식 두 방법으로 푼다.
//
// 보를 만들고 푸는 부분은 BeamWorkbench가 맡는다 — CH.9·CH.10의 다른 소분류들도 같은 것을 쓴다.
// 이 파일에 남은 것은 "그 보를 어떻게 설명하느냐"뿐이다.

export default function BendingMomentEquation() {
  return (
    <>
      <BeamWorkbench
        contentPrefix="calc.BendingMomentEquation"
        intro="길이 L짜리 빈 보에 **지지단**과 **하중**을 직접 얹어서 나만의 문제를 만들어보세요. 아이콘을 끌어서 옮기고, 값 라벨을 눌러 그 자리에서 고칠 수 있어요. 정정보(statically determinate)가 되면 반력과 처짐곡선이 자동으로 계산돼요."
        initial={() => ({ L: 4, supports: [], loads: [] })}
        presets={[
          {
            label: '단순보 + 등분포하중',
            hint: 'mmch9 Example 9-1',
            build: () => ({ L: 4, supports: [sup('pin', 0), sup('roller', 4)], loads: [udl(0, 4, 10 * 1000)] }),
          },
          {
            label: '캔틸레버 + 등분포하중',
            hint: '고정단 하나로 버티는 보',
            build: () => ({ L: 4, supports: [sup('fixed', 0)], loads: [udl(0, 4, 10 * 1000)] }),
          },
        ]}
        diagrams={['V', 'M']}
      >
        {(ctx) => <Methods ctx={ctx} />}
      </BeamWorkbench>

      <AiTutorPanel />
    </>
  );
}

function Methods({ ctx }) {
  const { solved, L, EI, supports, loads, units, lenF, forceF, momF, distF } = ctx;
  const [calcState, setCalcState] = useState({ method1: 'idle', method2: 'idle' });
  const [calcSnapshot, setCalcSnapshot] = useState({ method1: null, method2: null });

  // 입력이 바뀌면, 이미 "계산하기"를 눌러 떠놓은 스냅샷은 "다시 계산하기 전 값" 표시로 바꾼다.
  useEffect(() => {
    setCalcState((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        if (next[k] === 'done') { next[k] = 'stale'; changed = true; }
      }
      return changed ? next : prev;
    });
  }, [L, EI, supports, loads]);

  if (!solved) return null;

  function calcSection(name) {
    setCalcSnapshot((prev) => ({
      ...prev,
      [name]: {
        L, EI, loads,
        supports: solved.supports,
        pts: solved.pts,
        conditions: conditionsFor(L, supports, loads, (x) => `${fmt(x / lenF)} ${units.length}`),
        units: { ...units },
        lenF, forceF, momF, distF,
      },
    }));
    setCalcState((prev) => ({ ...prev, [name]: 'done' }));
  }

  return (
    <div className="steps">
      <FormulaSection
        title={
          <EditableText
            as="span"
            contentKey="bendingMomentEquation.method1Title"
            defaultText="① 굽힘모멘트식을 적분 (Macaulay 방법)"
          />
        }
      >
        <EditableText
          as="div"
          className="step-formula"
          contentKey="bendingMomentEquation.method1Formula"
          defaultText="EIv” = M(x) — 지지단 반력 + 모든 하중을 Macaulay 괄호로 한 식에 표현"
        />
        <EditableText
          as="div"
          className="step-row"
          contentKey="bendingMomentEquation.method1Row"
          defaultText="왼쪽부터 절단면 x까지의 모든 반력·하중을 더해서 M(x)를 구하고, 두 번 적분한 뒤 지지단 조건으로 적분상수를 결정해요."
        />
        <CalcTrigger state={calcState.method1} onCalc={() => calcSection('method1')} />
        {calcState.method1 !== 'idle' && <Method1Body snapshot={calcSnapshot.method1} />}
      </FormulaSection>

      <FormulaSection
        title={
          <EditableText
            as="span"
            contentKey="bendingMomentEquation.method2Title"
            defaultText="② 4차 미분방정식 (EIv⁗ = q(x))"
          />
        }
      >
        <EditableText
          as="div"
          className="step-formula"
          contentKey="bendingMomentEquation.method2Formula"
          defaultText="EIv”” = q(x) — 하중강도를 직접 네 번 적분"
        />
        <EditableText
          as="div"
          className="step-row"
          contentKey="bendingMomentEquation.method2Row"
          defaultText="집중하중·모멘트는 q(x)의 특이함수(디랙 델타·모멘트항)로 표현돼요. 적분상수 4개를 조건으로 결정하면, ①과 **완전히 같은** v(x)가 나와요."
        />
        <CalcTrigger state={calcState.method2} onCalc={() => calcSection('method2')} />
        {calcState.method2 !== 'idle' && <Method2Body snapshot={calcSnapshot.method2} />}
      </FormulaSection>

      <EditableText
        as="div"
        className="ai-hint"
        contentKey="calc.BendingMomentEquation.aiHint"
        defaultText="💬 지지단·하중 조합을 바꿔가며 정정/부정정이 어떻게 갈리는지 궁금하다면, 오른쪽 AI 튜터에게 물어보세요."
      />
    </div>
  );
}

// mmch9 Example 9-1(단순보+등분포하중, Macaulay 적분 vs 4차 미분방정식 두 방법으로 각각 풀어서
// 같은 답이 나오는 걸 보여줌)을 레퍼런스 삼아, 자유 배치 보에서도 같은 패턴으로 숫자를 대입해
// 실제 계산 과정을 보여준다.
function buildMTerms(snap) {
  const { supports, loads, lenF, forceF, momF, distF, L } = snap;
  const terms = [];
  supports.forEach((s, i) => {
    const letter = letterFor(i);
    terms.push({ coeff: s.reactionFy / forceF, bracket: `⟨x − ${fmt(s.x / lenF)}⟩`, label: `R_${letter}` });
    if (s.type === 'fixed') {
      terms.push({ coeff: s.reactionM / momF, bracket: `⟨x − ${fmt(s.x / lenF)}⟩⁰`, label: `M_${letter}` });
    }
  });
  const notes = [];
  loads.forEach((l) => {
    if (l.kind === 'point') {
      terms.push({ coeff: -l.P / forceF, bracket: `⟨x − ${fmt(l.x / lenF)}⟩`, label: 'P' });
    } else if (l.kind === 'moment') {
      terms.push({ coeff: -l.M0 / momF, bracket: `⟨x − ${fmt(l.x / lenF)}⟩⁰`, label: 'M₀' });
    } else if (l.kind === 'udl') {
      const q = l.q / distF;
      terms.push({ coeff: -q / 2, bracket: `⟨x − ${fmt(l.xStart / lenF)}⟩²`, label: 'q/2' });
      if (l.xEnd < L - 1e-6) {
        terms.push({ coeff: q / 2, bracket: `⟨x − ${fmt(l.xEnd / lenF)}⟩²`, label: 'q/2' });
      }
    } else if (l.kind === 'triangle') {
      notes.push(
        `삼각형분포하중(${fmt(l.qStart / distF)} → ${fmt(l.qEnd / distF)} ${snap.units.distLoad}, x=${fmt(l.xStart / lenF)}~${fmt(l.xEnd / lenF)} ${snap.units.length})은 닫힌 Macaulay 항 대신 수치적분으로 M(x)에 반영돼요.`
      );
    }
  });
  return { terms, notes };
}

function renderMExpr(terms) {
  return terms
    .map((t, i) => {
      const neg = t.coeff < 0;
      const sign = neg ? '−' : i === 0 ? '' : '+';
      return `${i > 0 ? ' ' : ''}${sign} ${fmt(Math.abs(t.coeff))}${t.bracket}`;
    })
    .join('');
}

function extremes(snap) {
  const pts = snap.pts;
  const theta0 = pts[0].slope;
  const thetaL = pts[pts.length - 1].slope;
  let maxAbs = -1, atX = 0, vAtMax = 0;
  pts.forEach((p) => {
    if (Math.abs(p.v) > maxAbs) { maxAbs = Math.abs(p.v); atX = p.x; vAtMax = p.v; }
  });
  return { theta0, thetaL, vAtMax, atX };
}

function Method1Body({ snapshot }) {
  if (!snapshot) return null;
  const { units, lenF } = snapshot;
  const { terms, notes } = buildMTerms(snapshot);
  const { theta0, thetaL, vAtMax, atX } = extremes(snapshot);
  return (
    <div style={{ marginTop: 10 }}>
      <div className="step-formula" style={{ display: 'block', whiteSpace: 'normal', wordBreak: 'break-word' }}>
        M(x) = {renderMExpr(terms)}
      </div>
      {notes.map((n, i) => (
        <div key={i} className="step-row" style={{ color: 'var(--gray-soft)', fontSize: 11.5 }}>※ {n}</div>
      ))}
      <ConditionList conditions={snapshot.conditions} />
      <div className="step-final">
        θ(0) = {fmt(theta0)} rad &nbsp;&nbsp; θ(L) = {fmt(thetaL)} rad
        <br />
        v<sub>max</sub> = {fmt(vAtMax / lenF)} {units.length} &nbsp;(x = {fmt(atX / lenF)} {units.length}에서)
      </div>
    </div>
  );
}

function Method2Body({ snapshot }) {
  if (!snapshot) return null;
  const { loads, lenF, forceF, momF, distF, units } = snapshot;
  const { theta0, thetaL, vAtMax, atX } = extremes(snapshot);
  const distLoads = loads.filter((l) => l.kind === 'udl' || l.kind === 'triangle');
  const pointish = loads.filter((l) => l.kind === 'point' || l.kind === 'moment');
  return (
    <div style={{ marginTop: 10 }}>
      <div className="step-formula" style={{ display: 'block' }}>EIv&#8221;&#8221; = q(x)</div>
      <div className="step-row">
        {distLoads.length > 0 ? (
          distLoads.map((l, i) => (
            <div key={i}>
              q(x) = {l.kind === 'udl' ? fmt(l.q / distF) : `${fmt(l.qStart / distF)} → ${fmt(l.qEnd / distF)}`} {units.distLoad}
              &nbsp;({fmt(l.xStart / lenF)} ≤ x ≤ {fmt(l.xEnd / lenF)} {units.length})
            </div>
          ))
        ) : (
          <div>분포하중 없음 — q(x) = 0</div>
        )}
        {pointish.map((l, i) => (
          <div key={i}>
            {l.kind === 'point' ? `P = ${fmt(l.P / forceF)} ${units.force}` : `M₀ = ${fmt(l.M0 / momF)} ${units.moment}`}
            &nbsp;은 x = {fmt(l.x / lenF)} {units.length} 위치의 특이함수(디랙 델타·모멘트항)로 등가 처리돼요.
          </div>
        ))}
      </div>
      <ConditionList conditions={snapshot.conditions} title="적분상수 4개를 정하는 조건" />
      <div className="step-final">
        θ(0) = {fmt(theta0)} rad &nbsp;&nbsp; θ(L) = {fmt(thetaL)} rad
        <br />
        v<sub>max</sub> = {fmt(vAtMax / lenF)} {units.length} &nbsp;(x = {fmt(atX / lenF)} {units.length}에서)
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-soft)', marginTop: 4 }}>
          → ①과 완전히 같은 값이에요. 두 방법 모두 같은 EIv&#8221; = M(x) 관계에서 출발하기 때문이에요.
        </div>
      </div>
    </div>
  );
}
