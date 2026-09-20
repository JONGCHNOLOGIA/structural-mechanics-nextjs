'use client';

import { useEffect, useMemo, useState } from 'react';
import { fmt, fmtSci } from '@/lib/calc/unitOptions';
import FormulaSection, { Collapsible, Tip } from './FormulaSection';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import Frac from '@/components/Frac';
import BeamWorkbench, { CalcTrigger, sup, udl, pointLoad } from './BeamWorkbench';
import AreaCentroidTable from './AreaCentroidTable';

// 모멘트-면적법. 보와 M/EI 다이어그램을 같은 그림 안에 위아래로 놓아서 x 눈금이 한 자에 물리게 했다
// (예전에는 M/EI만 따로 그려서, 보의 어디가 어느 면적에 해당하는지 눈으로 잇기 어려웠다).
//
// 1st 정리: 두 점 사이 접선의 각도 차이 = 그 구간 M/EI 다이어그램의 면적
// 2nd 정리: 한 점의 접선에서 다른 점까지의 편차 = 그 면적의 1차모멘트 (면적 × 도심거리)
//
// 화면의 값은 전부 solveBeamFull이 구한 M(x)/EI를 수치적분한 것이라, 하중을 어떻게 바꿔도
// 따라온다. A가 고정단이면 접선이 수평이라 정리 값이 곧 처짐각·처짐이 되는데,
// 그 경우에는 적분으로 구한 값과 풀이에서 나온 v, θ를 나란히 놓아 맞는지 확인까지 한다.

export default function MomentAreaMethod() {
  const [ab, setAb] = useState({ a: 0, b: 1 }); // 기준점 A, B (보 길이에 대한 비율)

  return (
    <>
      <BeamWorkbench
        contentPrefix="calc.MomentAreaMethod"
        intro="**1st 정리**: 두 점 사이 접선의 각도 차이 = 그 구간 M/EI 다이어그램의 **면적**. **2nd 정리**: 한 점의 접선으로부터 다른 점까지의 편차 = 그 면적의 **1차모멘트**(면적 × 도심거리). 아래 그림에서 보와 M/EI가 같은 x 눈금 위에 놓여 있어요."
        initial={() => ({ L: 4, supports: [sup('fixed', 0)], loads: [pointLoad(4, 20 * 1000)] })}
        presets={[
          {
            label: '캔틸레버 · 자유단 P',
            hint: 'M/EI가 삼각형 — 표의 A=al/2, x̄=2l/3',
            build: () => ({ L: 4, supports: [sup('fixed', 0)], loads: [pointLoad(4, 20 * 1000)] }),
          },
          {
            label: '캔틸레버 · 등분포 q',
            hint: 'M/EI가 포물선 — 표의 A=al/3, x̄=3l/4',
            build: () => ({ L: 4, supports: [sup('fixed', 0)], loads: [udl(0, 4, 10 * 1000)] }),
          },
          {
            label: '단순보 · 중앙 P',
            hint: '대칭이라 중앙 접선이 수평 — mmch9 Example',
            build: () => ({ L: 4, supports: [sup('pin', 0), sup('roller', 4)], loads: [pointLoad(2, 20 * 1000)] }),
          },
        ]}
        diagrams={(std, d) => [
          {
            ...std.MoverEI,
            marks: d.solved ? centroidMark(d.solved, ab, d) : [],
          },
        ]}
        extraSettings={() => (
          <Collapsible title="면적과 도심 표" hint="mmch9 p.24">
            <AreaCentroidTable />
          </Collapsible>
        )}
      >
        {(ctx) => <Theorems ctx={ctx} ab={ab} setAb={setAb} />}
      </BeamWorkbench>

      <AiTutorPanel />
    </>
  );
}

// M/EI 칸에 찍을 도심선. 구간 [a,b]의 도심 위치 하나만 표시한다.
function centroidMark(solved, ab, d) {
  const L = solved.pts[solved.pts.length - 1].x;
  const r = integrate(solved.pts, ab.a * L, ab.b * L);
  if (!isFinite(r.centroid) || Math.abs(r.area) < 1e-18) return [];
  return [{ x: r.centroid, label: `도심 x̄ = ${fmt(r.centroid / d.lenF)} ${d.units.length}` }];
}

// 구간 [xa, xb]에서 M/EI의 면적과 1차모멘트를 사다리꼴로 적분한다.
//   area   = ∫ M/EI dx                (1st 정리)
//   momA   = ∫ (M/EI)(x − xa) dx      (A 기준 1차모멘트 → t_A/B 계산용)
//   momB   = ∫ (M/EI)(xb − x) dx      (B 기준 1차모멘트 → t_B/A)
function integrate(pts, xa, xb) {
  let area = 0, momA = 0, momB = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const x0 = pts[i].x, x1 = pts[i + 1].x;
    if (x1 <= xa || x0 >= xb) continue;
    const lo = Math.max(x0, xa), hi = Math.min(x1, xb);
    if (hi <= lo) continue;
    const at = (x) => {
      const t = (x - x0) / (x1 - x0 || 1);
      const m0 = pts[i].M / pts[i].EI, m1 = pts[i + 1].M / pts[i + 1].EI;
      return m0 + (m1 - m0) * t;
    };
    const dx = hi - lo;
    const fLo = at(lo), fHi = at(hi);
    area += ((fLo + fHi) / 2) * dx;
    momA += ((fLo * (lo - xa) + fHi * (hi - xa)) / 2) * dx;
    momB += ((fLo * (xb - lo) + fHi * (xb - hi)) / 2) * dx;
  }
  return { area, momA, momB, centroid: area !== 0 ? xa + momA / area : NaN };
}

function Theorems({ ctx, ab, setAb }) {
  const { solved, L, supports, units, lenF, disp } = ctx;
  const [calcState, setCalcState] = useState('idle');
  const [snap, setSnap] = useState(null);

  useEffect(() => {
    setCalcState((s) => (s === 'done' ? 'stale' : s));
  }, [solved, ab]);

  const xa = ab.a * L, xb = ab.b * L;
  const r = useMemo(() => (solved ? integrate(solved.pts, Math.min(xa, xb), Math.max(xa, xb)) : null), [solved, xa, xb]);

  if (!solved || !r) return null;

  // 두 점에서의 실제 처짐·처짐각 (풀이에서 바로 읽은 값) — 정리로 구한 값과 맞춰보는 용도
  const at = (x) => {
    const i = Math.min(solved.pts.length - 1, Math.max(0, Math.round((x / L) * (solved.pts.length - 1))));
    return solved.pts[i];
  };
  const pa = at(Math.min(xa, xb));
  const pb = at(Math.max(xa, xb));

  // 부호 정리: 이 사이트의 v는 아래가 +라서 slope = dv/dx = −θ(교재의 위가 + 기준)이다.
  // 그래서 ∫M/EI dx = θ_B − θ_A = −(slope_B − slope_A).
  const thetaBA = r.area;
  const slopeDiff = -(pb.slope - pa.slope);
  const tBA = r.momB; // B가 A의 접선에서 얼마나 떨어져 있는지 (위가 +)

  // A가 고정단이면 A의 접선이 수평이라, 정리 값이 곧 B의 처짐각·처짐이 된다.
  const aIsFixed = supports.some((s) => s.type === 'fixed' && Math.abs(s.x - Math.min(xa, xb)) < L * 1e-6);
  const deflB = -tBA; // 아래가 + 인 이 사이트 기준으로 바꾼 값
  const relTheta = Math.abs(thetaBA) > 1e-15 ? Math.abs(thetaBA - slopeDiff) / Math.abs(thetaBA) : 0;
  const relDefl = Math.abs(deflB) > 1e-15 ? Math.abs(deflB - pb.v) / Math.abs(deflB) : 0;

  function doCalc() {
    setSnap({
      xa: Math.min(xa, xb), xb: Math.max(xa, xb),
      area: r.area, momB: r.momB, centroid: r.centroid,
      thetaBA, slopeDiff, tBA, deflB, vB: pb.v, aIsFixed, relTheta, relDefl,
      units: { ...units }, lenF,
    });
    setCalcState('done');
  }

  return (
    <div className="steps">
      <div className="field" style={{ marginTop: 4 }}>
        <label>
          기준점 A = {fmt(disp(Math.min(xa, xb), lenF))} {units.length} · 기준점 B = {fmt(disp(Math.max(xa, xb), lenF))} {units.length}
          &nbsp;— 이 두 점 사이의 M/EI 면적을 봅니다
        </label>
        <div style={{ display: 'flex', gap: 10 }}>
          <input type="range" min="0" max="1" step="0.005" value={ab.a}
            onChange={(e) => setAb((p) => ({ ...p, a: parseFloat(e.target.value) }))} style={{ width: '100%' }} />
          <input type="range" min="0" max="1" step="0.005" value={ab.b}
            onChange={(e) => setAb((p) => ({ ...p, b: parseFloat(e.target.value) }))} style={{ width: '100%' }} />
        </div>
      </div>

      <FormulaSection
        title={<EditableText as="span" contentKey="momentArea.title" defaultText="모멘트-면적 정리로 처짐각과 처짐 구하기" />}
      >
        <div className="step-formula">
          <Tip title="두 점 사이 접선의 각도 차이">θ<sub>B/A</sub></Tip> = ∫<sub>A</sub><sup>B</sup> <Frac num="M" den="EI" /> dx
          &nbsp;&nbsp;·&nbsp;&nbsp;
          <Tip title="A의 접선에서 B까지의 수직 편차">t<sub>B/A</sub></Tip> = ∫<sub>A</sub><sup>B</sup> <Frac num="M" den="EI" /> (x<sub>B</sub> − x) dx
        </div>
        <EditableText
          as="div"
          className="step-row"
          contentKey="momentArea.howto"
          defaultText="1단계 — 구간의 M/EI 면적을 구한다. 2단계 — 그 면적의 도심 위치를 찾는다. 3단계 — 면적 × (B에서 도심까지의 거리)가 곧 2nd 정리의 편차다. 위 그림의 빨간 음영이 그 면적이고, 파란 점선이 도심이에요."
        />
        <CalcTrigger state={calcState} onCalc={doCalc} />
        {calcState !== 'idle' && snap && <Steps snap={snap} />}
      </FormulaSection>

      <EditableText
        as="div"
        className="ai-hint"
        contentKey="calc.MomentAreaMethod.aiHint"
        defaultText="💬 왜 도심까지의 거리를 곱해야 처짐이 나오는지 궁금하다면, 오른쪽 AI 튜터에게 물어보세요."
      />
    </div>
  );
}

function Steps({ snap }) {
  const { units, lenF } = snap;
  const len = (v) => `${fmt(v / lenF)} ${units.length}`;
  const armFromB = snap.xb - snap.centroid;
  return (
    <div style={{ marginTop: 10 }}>
      <div className="step-row">
        <b>1단계 — 면적</b> (1st 정리)
        <br />
        A<sub>M/EI</sub> = ∫<sub>{len(snap.xa)}</sub><sup>{len(snap.xb)}</sup> (M/EI) dx = <b>{fmtSci(snap.area)} rad</b>
        <br />
        <span style={{ color: 'var(--gray-soft)' }}>
          → θ<sub>B/A</sub> = θ<sub>B</sub> − θ<sub>A</sub> = {fmtSci(snap.thetaBA)} rad
        </span>
      </div>

      <div className="step-row">
        <b>2단계 — 도심</b>
        <br />
        x̄ = {len(snap.centroid)} (보 왼쪽 끝 기준) · B에서 도심까지 = <b>{len(armFromB)}</b>
      </div>

      <div className="step-row">
        <b>3단계 — 1차모멘트</b> (2nd 정리)
        <br />
        t<sub>B/A</sub> = A<sub>M/EI</sub> × (B에서 도심까지) = {fmtSci(snap.area)} × {len(armFromB)} = <b>{fmt(snap.tBA * 1000)} mm</b>
        <br />
        <span style={{ color: 'var(--gray-soft)' }}>= A의 접선에서 B까지의 수직 거리 (위쪽이 +)</span>
      </div>

      {snap.aIsFixed ? (
        <div className="step-final">
          A가 고정단이라 그 접선이 수평이에요 — 정리로 구한 값이 곧 B의 처짐각·처짐입니다.
          <br />
          θ<sub>B</sub> = {fmtSci(snap.thetaBA)} rad &nbsp;·&nbsp; δ<sub>B</sub> = {fmt(snap.deflB * 1000)} mm (아래로)
          <div style={{ fontSize: 11, fontWeight: 600, color: snap.relDefl < 1e-3 ? '#1E7F72' : 'var(--crimson)', marginTop: 4 }}>
            검산 — 처짐곡선을 직접 풀어서 읽은 값: θ<sub>B</sub> = {fmtSci(snap.slopeDiff)} rad, δ<sub>B</sub> = {fmt(snap.vB * 1000)} mm
            {snap.relDefl < 1e-3 ? ' → 일치합니다.' : ' → 어긋나요, 입력을 확인해보세요.'}
          </div>
        </div>
      ) : (
        <div className="step-final">
          A가 고정단이 아니라서 A의 접선이 기울어져 있어요. 정리가 주는 건 <b>접선 기준의 상대값</b>이라,
          실제 처짐을 얻으려면 접선의 기울기를 따로 알아내야 해요 (보통 지지단 조건으로 구합니다).
          <div style={{ fontSize: 11, fontWeight: 600, color: snap.relTheta < 1e-3 ? '#1E7F72' : 'var(--crimson)', marginTop: 4 }}>
            검산 — θ<sub>B</sub> − θ<sub>A</sub>를 처짐곡선에서 직접 읽으면 {fmtSci(snap.slopeDiff)} rad
            {snap.relTheta < 1e-3 ? ' → 면적과 일치합니다.' : ' → 어긋나요.'}
          </div>
        </div>
      )}
    </div>
  );
}
