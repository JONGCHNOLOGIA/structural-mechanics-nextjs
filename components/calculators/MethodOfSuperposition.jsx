'use client';

import { useMemo, useState } from 'react';
import { fmt } from '@/lib/calc/unitOptions';
import { solveBeamFull } from '@/lib/calc/beamBuilder';
import FormulaSection from './FormulaSection';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import BeamWorkbench, { sup, udl, pointLoad, triLoad, momentLoad } from './BeamWorkbench';
import SuperpositionCurvesSVG from './SuperpositionCurvesSVG';

// 중첩법. 예전에는 "등분포 + 중앙 집중하중" 두 가지 고정 케이스만 표 공식으로 더했는데,
// 하중이 그림 밖으로 잘리기도 했고 표에 있는 조합 말고는 보여줄 수가 없었다.
//
// 지금은 Bending-Moment Equation과 같은 보 빌더를 쓴다. 하중을 몇 개든 얹으면
// 하나씩만 남겨 따로 푼 처짐곡선을 전부 그려주고, 그것들을 더한 값이 전부 함께 풀었을 때와
// 같은지 숫자로 맞춰본다 — 표에 없는 조합에서도 중첩이 성립하는 걸 직접 확인할 수 있다.

export default function MethodOfSuperposition() {
  const [xFrac, setXFrac] = useState(0.5); // 관측점 (보 길이에 대한 비율)

  return (
    <>
      <BeamWorkbench
        contentPrefix="calc.MethodOfSuperposition"
        intro="보가 **선형탄성**이면, 여러 하중이 함께 작용할 때의 처짐은 각 하중을 **따로 작용시켰을 때의 처짐을 그냥 더한 것**과 같아요. 하중을 얹거나 끌어서 옮겨보면, 하나씩 푼 곡선들의 합이 전부 함께 푼 곡선과 겹치는 걸 볼 수 있어요."
        initial={() => ({
          L: 4,
          supports: [sup('pin', 0), sup('roller', 4)],
          loads: [udl(0, 4, 10 * 1000), pointLoad(2, 20 * 1000)],
        })}
        presets={[
          {
            label: '단순보 · q + 중앙 P',
            hint: '표준 공식표 두 개를 더하는 가장 기본 조합',
            build: () => ({ L: 4, supports: [sup('pin', 0), sup('roller', 4)], loads: [udl(0, 4, 10 * 1000), pointLoad(2, 20 * 1000)] }),
          },
          {
            label: '단순보 · 부분 등분포 + 치우친 P',
            hint: '공식표에 없는 조합 — 중첩은 그래도 성립해요',
            build: () => ({ L: 6, supports: [sup('pin', 0), sup('roller', 6)], loads: [udl(1, 3.5, 8 * 1000), pointLoad(4.5, 15 * 1000)] }),
          },
          {
            label: '캔틸레버 · 삼각분포 + 끝 모멘트',
            hint: '고정단 하나로 버티는 보에서도 똑같이 더해져요',
            build: () => ({ L: 4, supports: [sup('fixed', 0)], loads: [triLoad(0, 4, 12 * 1000, 0), momentLoad(4, 10 * 1000)] }),
          },
        ]}
        diagrams={['M']}
      >
        {(ctx) => <Superposition ctx={ctx} xFrac={xFrac} setXFrac={setXFrac} />}
      </BeamWorkbench>

      <AiTutorPanel />
    </>
  );
}

function Superposition({ ctx, xFrac, setXFrac }) {
  const { solved, L, ei, supports, loads, units, lenF, forceF, distF, momF, disp } = ctx;

  // 하중을 하나만 남긴 보를 하중 개수만큼 따로 푼다. 지지단은 그대로 둔다 —
  // 지지단까지 바꾸면 그건 중첩이 아니라 다른 구조물이 된다.
  const cases = useMemo(() => {
    if (!solved || loads.length < 2) return [];
    return loads.map((l) => {
      // 전부 함께 푼 것과 같은 격자(N)를 써야 합이 반올림 오차 수준까지 정확히 맞는다.
      const r = solveBeamFull(L, supports, [l], ei, 600);
      return { load: l, label: labelOf(l, { units, lenF, forceF, distF, momF }), pts: r.pts || [] };
    });
  }, [solved, L, supports, loads, ei, units, lenF, forceF, distF, momF]);

  if (!solved) return null;

  const xStar = xFrac * L;
  const at = (pts) => {
    if (!pts.length) return 0;
    const i = Math.min(pts.length - 1, Math.max(0, Math.round((xStar / L) * (pts.length - 1))));
    return pts[i].v;
  };

  const totalPts = solved.pts;
  const vTotal = at(totalPts);
  const vSum = cases.reduce((s, c) => s + at(c.pts), 0);
  // 합이 맞는지 숫자로 확인 — 선형탄성이면 반올림 오차 말고는 차이가 없어야 한다.
  const gap = Math.abs(vTotal - vSum);
  const scale = Math.max(Math.abs(vTotal), ...cases.map((c) => Math.abs(at(c.pts))), 1e-15);
  const rel = gap / scale;

  const toMM = (v) => v * 1000;

  return (
    <div className="steps">
      <FormulaSection
        title={
          <EditableText
            as="span"
            contentKey="methodOfSuperposition.title"
            defaultText="하중을 하나씩 떼어내서 풀고, 그 처짐을 더하기"
          />
        }
      >
        {loads.length < 2 ? (
          <div className="step-row">
            하중을 <b>두 개 이상</b> 얹으면, 하나씩만 남겨 따로 푼 처짐곡선과 그 합을 여기에 그려줘요.
          </div>
        ) : (
          <>
            <EditableText
              as="div"
              className="step-formula"
              contentKey="methodOfSuperposition.formula"
              defaultText="v(x) = v₁(x) + v₂(x) + ⋯ — 각 하중이 혼자 있었을 때의 처짐을 그냥 더한다"
            />

            <SuperpositionCurvesSVG
              cases={cases}
              total={totalPts}
              L={L}
              lenF={lenF}
              lenUnit={units.length}
              xStar={xStar}
            />

            <div className="field" style={{ marginTop: 6 }}>
              <label>
                관측점 x = {fmt(disp(xStar, lenF))} {units.length} — 여기서의 처짐을 아래 표에서 더해봐요
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.005"
                value={xFrac}
                onChange={(e) => setXFrac(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
              {cases.map((c, i) => (
                <div key={c.load.id} className="step-row" style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <span>
                    {i === 0 ? '' : '+ '}
                    {c.label} 혼자일 때
                  </span>
                  <b>{fmt(toMM(at(c.pts)))} mm</b>
                </div>
              ))}
              <div className="step-final" style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <span>합 (중첩)</span>
                <b>{fmt(toMM(vSum))} mm</b>
              </div>
              <div className="step-final" style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <span>전부 함께 풀었을 때</span>
                <b>{fmt(toMM(vTotal))} mm</b>
              </div>
            </div>

            <div
              className="step-row"
              style={{ marginTop: 8, color: rel < 1e-4 ? '#1E7F72' : 'var(--crimson)', fontWeight: 700 }}
            >
              {rel < 1e-4
                ? `두 값의 차이는 ${(rel * 100).toExponential(1)} % — 반올림 오차 수준이에요. 중첩이 그대로 성립합니다.`
                : `두 값이 ${fmt(toMM(gap))} mm (${(rel * 100).toFixed(2)} %) 어긋나요 — 입력을 확인해보세요.`}
            </div>

            <EditableText
              as="div"
              className="step-row"
              contentKey="methodOfSuperposition.why"
              defaultText="더할 수 있는 이유는 EIv” = M(x)가 **선형** 방정식이기 때문이에요. 하중을 두 배로 하면 처짐도 정확히 두 배가 되고, 두 하중을 함께 주면 각각의 답이 그대로 더해져요. 재료가 항복하거나(소성) 처짐이 너무 커져 기하가 변하면 이 성질이 깨집니다."
            />
          </>
        )}
      </FormulaSection>

      <EditableText
        as="div"
        className="ai-hint"
        contentKey="calc.MethodOfSuperposition.aiHint"
        defaultText="💬 왜 중첩이 선형탄성 범위에서만 성립하는지 궁금하다면, 오른쪽 AI 튜터에게 물어보세요."
      />
    </div>
  );
}

function labelOf(l, u) {
  const { units, lenF, forceF, distF, momF } = u;
  if (l.kind === 'point') return `집중하중 P = ${fmt(l.P / forceF)} ${units.force} (x = ${fmt(l.x / lenF)} ${units.length})`;
  if (l.kind === 'udl') return `등분포 q = ${fmt(l.q / distF)} ${units.distLoad} (${fmt(l.xStart / lenF)}~${fmt(l.xEnd / lenF)} ${units.length})`;
  if (l.kind === 'triangle') return `삼각분포 ${fmt(l.qStart / distF)}→${fmt(l.qEnd / distF)} ${units.distLoad}`;
  return `모멘트 M₀ = ${fmt(l.M0 / momF)} ${units.moment} (x = ${fmt(l.x / lenF)} ${units.length})`;
}
