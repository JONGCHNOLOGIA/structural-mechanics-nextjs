'use client';

import { useMemo } from 'react';
import { fmt, fmtSci } from '@/lib/calc/unitOptions';
import { solveBeamFull } from '@/lib/calc/beamBuilder';
import { bendingEnergy, externalWork } from '@/lib/calc/beamEnergy';
import FormulaSection, { Tip } from './FormulaSection';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import Frac from '@/components/Frac';
import BeamWorkbench, { sup, udl, pointLoad, momentLoad } from './BeamWorkbench';

// Strain Energy of Bending — 이 소분류는 "에너지가 무엇인가"만 다룬다.
// 그 에너지로 처짐을 뽑아내는 방법(편미분·가상일)은 다음 소분류 Castigliano's Theorem이 맡는다.
// 두 소분류가 같은 보를 다루면서 역할만 나뉘도록 짰다.
//
// 여기서 보여주는 것 세 가지:
//   1) U = ∫ M²/2EI dx 가 M²/2EI 곡선 아래 넓이라는 것 (다이어그램으로 직접 보여준다)
//   2) 하중이 한 일 W = ½ΣPδ + ½∫qv dx + ½ΣM₀θ 가 그 U와 같다는 것 (Clapeyron — 숫자로 확인)
//   3) 처짐과 달리 **에너지는 중첩되지 않는다**는 것 (교차항) — 바로 앞 소분류와의 대비

export default function StrainEnergyOfBending() {
  return (
    <>
      <BeamWorkbench
        contentPrefix="calc.StrainEnergyOfBending"
        intro="보가 휘면 그만큼 **에너지가 보 안에 저장**돼요. 그게 변형에너지 U = ∫ M²/2EI dx 예요. 하중을 천천히 얹으면서 한 일이 고스란히 이 에너지가 되는데, 아래에서 두 값을 따로 구해 나란히 놓고 정말 같은지 확인해봐요."
        initial={() => ({ L: 4, supports: [sup('fixed', 0)], loads: [pointLoad(4, 20 * 1000)] })}
        presets={[
          {
            label: '캔틸레버 · 선단 P',
            hint: 'U = P²L³/6EI',
            build: () => ({ L: 4, supports: [sup('fixed', 0)], loads: [pointLoad(4, 20 * 1000)] }),
          },
          {
            label: '캔틸레버 · 선단 M₀',
            hint: 'U = M₀²L/2EI',
            build: () => ({ L: 4, supports: [sup('fixed', 0)], loads: [momentLoad(4, 15 * 1000)] }),
          },
          {
            label: '캔틸레버 · P + M₀',
            hint: '교차항이 생겨서 단순 합보다 작거나 커져요',
            build: () => ({ L: 4, supports: [sup('fixed', 0)], loads: [pointLoad(4, 20 * 1000), momentLoad(4, 15 * 1000)] }),
          },
          {
            label: '단순보 · 등분포 q',
            hint: 'U = q²L⁵/240EI',
            build: () => ({ L: 4, supports: [sup('pin', 0), sup('roller', 4)], loads: [udl(0, 4, 10 * 1000)] }),
          },
        ]}
        diagrams={(std) => [
          std.M,
          {
            key: 'U',
            axis: 'M²/2EI',
            label: 'M²/2EI — 이 곡선 아래 넓이가 곧 U',
            color: '#B0790A',
            fill: '#FBF1DC',
            value: (p) => (p.M * p.M) / (2 * p.EI),
            maxLabel: (m) => `최대 ${fmtSci(m)} J/m`,
          },
        ]}
      >
        {(ctx) => <Energy ctx={ctx} />}
      </BeamWorkbench>

      <AiTutorPanel />
    </>
  );
}

function Energy({ ctx }) {
  const { solved, L, supports, loads, ei, units, forceF, distF, momF, lenF, disp } = ctx;

  // 하중을 하나씩만 남겨서 따로 구한 에너지 — 합쳐도 전체 U가 되지 않는다는 걸 보여주려고.
  const singles = useMemo(() => {
    if (!solved || loads.length < 2) return [];
    return loads.map((l) => {
      const r = solveBeamFull(L, supports, [l], ei, 600);
      return { load: l, U: bendingEnergy(r.pts, r.midPts) };
    });
  }, [solved, L, supports, loads, ei]);

  if (!solved) return null;

  const U = bendingEnergy(solved.pts, solved.midPts);
  const W = externalWork(solved.pts, loads, L);
  const gap = Math.abs(U - W);
  const rel = U !== 0 ? gap / Math.abs(U) : gap;

  const sumSingles = singles.reduce((a, s) => a + s.U, 0);
  const cross = U - sumSingles;

  return (
    <div className="steps">
      <FormulaSection
        title={<EditableText as="span" contentKey="strainEnergy.title" defaultText="① 저장된 에너지 U = ∫ M²/2EI dx" />}
      >
        <div className="step-formula">
          U = ∫₀<sup>L</sup> <Frac num="M(x)²" den="2EI" /> dx = <b>{fmtSci(U)} J</b>
        </div>
        <EditableText
          as="div"
          className="step-row"
          contentKey="strainEnergy.meaning"
          defaultText="위 그림의 노란 칸이 M²/2EI 예요. 그 곡선 아래 넓이가 곧 U입니다. M이 큰 곳일수록 제곱으로 들어가서, 굽힘모멘트가 몰린 구간 하나가 전체 에너지를 거의 다 차지하기도 해요."
        />
        <div className="step-row">
          가장 많이 저장된 지점: x = {fmt(disp(argmaxDensity(solved.pts).x, lenF))} {units.length} ·{' '}
          {fmtSci(argmaxDensity(solved.pts).d)} J/m
        </div>
      </FormulaSection>

      <FormulaSection
        title={<EditableText as="span" contentKey="strainEnergy.workTitle" defaultText="② 하중이 한 일 = 저장된 에너지 (Clapeyron)" />}
      >
        <div className="step-formula">
          W = ½ Σ P·δ &nbsp;+&nbsp; ½ ∫ q·v dx &nbsp;+&nbsp; ½ Σ M₀·θ
        </div>
        <EditableText
          as="div"
          className="step-row"
          contentKey="strainEnergy.workWhy"
          defaultText="하중을 0에서 천천히 키우면 처짐도 같이 커져요. 그래서 한 일이 P·δ가 아니라 **½P·δ**입니다 (힘-처짐 그래프 아래 삼각형 넓이). 재료가 탄성이면 이 일이 전부 보 안에 저장되고, 하중을 없애면 그대로 돌려받아요."
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div className="step-row" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>하중이 한 일 W</span>
            <b>{fmtSci(W)} J</b>
          </div>
          <div className="step-row" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>보에 저장된 에너지 U</span>
            <b>{fmtSci(U)} J</b>
          </div>
        </div>
        <div className="step-final" style={{ color: rel < 1e-4 ? '#1E7F72' : 'var(--crimson)' }}>
          {rel < 1e-4
            ? `두 값의 차이 ${(rel * 100).toExponential(1)} % — 반올림 오차 수준이에요. W = U 가 그대로 확인됩니다.`
            : `두 값이 ${(rel * 100).toFixed(2)} % 어긋나요.`}
        </div>
      </FormulaSection>

      {singles.length >= 2 && (
        <FormulaSection
          title={<EditableText as="span" contentKey="strainEnergy.crossTitle" defaultText="③ 처짐은 더해지지만, 에너지는 더해지지 않아요" />}
        >
          <EditableText
            as="div"
            className="step-row"
            contentKey="strainEnergy.crossWhy"
            defaultText="바로 앞 소분류에서 처짐은 하중별로 구해 더하면 됐어요. 그런데 U는 M의 **제곱**이라 (M₁+M₂)² = M₁² + 2M₁M₂ + M₂² 처럼 교차항이 남아요. 그래서 에너지는 따로 구해 더할 수 없습니다."
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {singles.map((s, i) => (
              <div key={s.load.id} className="step-row" style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <span>{i === 0 ? '' : '+ '}{shortLabel(s.load, { units, forceF, distF, momF })} 혼자일 때</span>
                <b>{fmtSci(s.U)} J</b>
              </div>
            ))}
            <div className="step-row" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>따로 구해 더한 값</span>
              <b>{fmtSci(sumSingles)} J</b>
            </div>
            <div className="step-row" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>함께 작용시켰을 때의 실제 U</span>
              <b>{fmtSci(U)} J</b>
            </div>
            <div className="step-final" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>차이 = 교차항 2∫M₁M₂/2EI dx</span>
              <b>{fmtSci(cross)} J</b>
            </div>
          </div>
          <div className="step-row" style={{ color: 'var(--gray-soft)' }}>
            {cross > 0
              ? '교차항이 양수 — 두 하중이 같은 방향으로 휘게 해서, 따로 줄 때보다 에너지가 더 많이 쌓여요.'
              : cross < 0
              ? '교차항이 음수 — 두 하중이 서로 반대로 휘게 해서, 따로 줄 때의 합보다 에너지가 적어요.'
              : '교차항이 0 — 두 하중의 M 분포가 서로 직교해요.'}
          </div>
        </FormulaSection>
      )}

      <EditableText
        as="div"
        className="ai-hint"
        contentKey="calc.StrainEnergyOfBending.aiHint"
        defaultText="💬 여기까지는 “에너지가 얼마나 쌓였나”예요. 이 에너지를 써서 처짐을 거꾸로 꺼내는 방법은 다음 소분류 Castigliano's Theorem에서 네 가지로 비교합니다."
      />
    </div>
  );
}

function argmaxDensity(pts) {
  let best = { x: 0, d: -1 };
  pts.forEach((p) => {
    const d = (p.M * p.M) / (2 * p.EI);
    if (d > best.d) best = { x: p.x, d };
  });
  return best;
}

function shortLabel(l, u) {
  const { units, forceF, distF, momF } = u;
  if (l.kind === 'point') return `P = ${fmt(l.P / forceF)} ${units.force}`;
  if (l.kind === 'udl') return `q = ${fmt(l.q / distF)} ${units.distLoad}`;
  if (l.kind === 'triangle') return `삼각분포 ${fmt(l.qStart / distF)}→${fmt(l.qEnd / distF)} ${units.distLoad}`;
  return `M₀ = ${fmt(l.M0 / momF)} ${units.moment}`;
}
