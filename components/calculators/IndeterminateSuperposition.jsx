'use client';

import { useEffect, useMemo, useState } from 'react';
import { fmt, fmtSci } from '@/lib/calc/unitOptions';
import { analyzeRedundant, redundantOptions } from '@/lib/calc/redundant';
import { CH10_EXAMPLES, buildExample } from '@/lib/calc/ch10Examples';
import FormulaSection from './FormulaSection';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import BeamWorkbench, { CalcTrigger, sup, udl, pointLoad, momentLoad } from './BeamWorkbench';
import ReleasedStructureSVG from './ReleasedStructureSVG';
import RedundantResult from './RedundantResult';
import SuperpositionCurvesSVG from './SuperpositionCurvesSVG';
import { TextbookAnswer } from './DifferentialEquationMethod';

/*
  CH.10 — 중첩법(Method of Superposition).

  미분방정식법과 같은 보를 다루되, 푸는 길이 다르다. 참고자료 mmch10.pdf p.9~11의 흐름:

    released structure가 실제 하중만으로 움직인 양(δB)  +  여분력이 되돌린 양(RB·δbb)  =  0

  이 페이지의 핵심은 그 합이 정말 실제 보의 처짐곡선이 된다는 걸 그림으로 보여주는 것이다.
  CH.9의 중첩 그림(SuperpositionCurvesSVG)을 그대로 다시 쓴다 — 같은 원리이기 때문이다.

  그리고 "어느 것을 여분력으로 고르든 답은 같다"(Fig.10-1의 (b)와 (c))를 실제로 두 가지를
  모두 풀어 나란히 놓고 확인한다.
*/

export default function IndeterminateSuperposition() {
  const [redundantKey, setRedundantKey] = useState(null);

  return (
    <>
      <BeamWorkbench
        contentPrefix="calc.IndeterminateSuperposition"
        intro="부정정보를 풀려면 반력 하나를 **여분력(redundant)**으로 남기고, 그 구속을 **풀어준(released)** 정정보로 바꿔요. 그러면 그 자리가 움직여버리는데, 여분력이 딱 그만큼 되돌려 놓아야 한다는 게 **적합조건**이에요. 어디를 풀어주든 최종 답은 같습니다."
        initial={() => buildExample(CH10_EXAMPLES[0], { sup, pointLoad, udl, momentLoad })}
        presets={CH10_EXAMPLES.map((ex) => ({
          label: ex.label,
          hint: ex.hint,
          build: () => buildExample(ex, { sup, pointLoad, udl, momentLoad }),
        }))}
        diagrams={['V', 'M']}
        solveIndeterminate
      >
        {(ctx) => <Process ctx={ctx} redundantKey={redundantKey} setRedundantKey={setRedundantKey} />}
      </BeamWorkbench>

      <AiTutorPanel />
    </>
  );
}

function Process({ ctx, redundantKey, setRedundantKey }) {
  const { solved, info, L, supports, loads, ei, units, lenF, forceF, momF } = ctx;
  const [state, setState] = useState('idle');
  const [snap, setSnap] = useState(null);

  useEffect(() => {
    setState((s) => (s === 'done' ? 'stale' : s));
  }, [solved, redundantKey]);

  const options = useMemo(() => redundantOptions(supports), [supports]);
  const chosen = options.find((o) => o.key === redundantKey) || options[0];

  // 고른 여분력으로 푼 것, 그리고 "다른 것을 골랐다면" 비교용으로 전부 풀어본 것
  const all = useMemo(() => {
    if (!solved || info.kind !== 'indeterminate') return [];
    return options.map((o) => ({ opt: o, res: analyzeRedundant(L, supports, loads, ei, o, 600) }));
  }, [solved, info.kind, options, L, supports, loads, ei]);

  const analysis = all.find((a) => chosen && a.opt.key === chosen.key)?.res || null;

  if (!solved) return null;

  if (info.kind === 'determinate') {
    return (
      <div className="steps">
        <FormulaSection title="이 보는 정정보예요">
          <EditableText
            as="div"
            className="step-row"
            contentKey="ch10.super.determinateNote"
            defaultText="여분력을 남길 것이 없어요 — 평형방정식만으로 반력이 다 정해집니다. 위 예제 버튼으로 부정정보를 불러오거나, 지지단을 하나 더 얹어보세요."
          />
        </FormulaSection>
      </div>
    );
  }

  return (
    <div className="steps">
      <FormulaSection
        title={<EditableText as="span" contentKey="ch10.super.title" defaultText="여분력을 풀어주고, 중첩으로 되돌리기" />}
      >
        <div className="step-row" style={{ display: 'block' }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>어느 구속을 풀어줄까요? (= 무엇을 여분력으로 둘까요)</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {options.map((o) => (
              <button
                key={o.key}
                className={'add-block' + (chosen && chosen.key === o.key ? ' active' : '')}
                style={{ margin: 0 }}
                title={o.releasedName}
                onClick={() => setRedundantKey(o.key)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {analysis && analysis.ok && (
          <>
            <div className="step-row" style={{ display: 'block' }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>{chosen.releasedName}</div>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
                <ReleasedStructureSVG
                  L={L}
                  supports={analysis.relSupports}
                  loads={loads}
                  pts={analysis.released.pts}
                  dofX={analysis.x0}
                  dofKind={chosen.kind}
                  dofLabel={chosen.kind === 'force' ? 'δ' : 'θ'}
                  caption="① 실제 하중만 — 그 자리가 움직여버려요"
                />
                <ReleasedStructureSVG
                  L={L}
                  supports={analysis.relSupports}
                  loads={[
                    chosen.kind === 'force'
                      ? { kind: 'point', x: analysis.x0, P: -1 }
                      : { kind: 'moment', x: analysis.x0, M0: -1 },
                  ]}
                  pts={analysis.unitCase.pts}
                  dofX={analysis.x0}
                  dofKind={chosen.kind}
                  dofLabel={chosen.kind === 'force' ? 'δ₁₁' : 'θ₁₁'}
                  caption={`② ${chosen.symbol} 자리에 크기 1만 — 되돌리는 쪽`}
                  unit
                />
              </div>
            </div>

            <EditableText
              as="div"
              className="step-formula"
              contentKey="ch10.super.compat"
              defaultText="적합조건: ①이 움직인 양 + 여분력이 ②로 되돌린 양 = 0 — 실제 보에서는 그 자리가 꼼짝하지 않으니까요"
            />

            <CalcTrigger state={state} onCalc={() => { setSnap(analysis); setState('done'); }} />

            {state !== 'idle' && snap && snap.ok && (
              <>
                <RedundantResult
                  analysis={snap}
                  chosen={chosen}
                  supports={supports}
                  units={units}
                  lenF={lenF}
                  forceF={forceF}
                  momF={momF}
                  startStep={1}
                />
                <CurveCheck analysis={snap} chosen={chosen} L={L} lenF={lenF} units={units} forceF={forceF} momF={momF} />
              </>
            )}
          </>
        )}

        {analysis && !analysis.ok && (
          <div className="step-row" style={{ color: 'var(--crimson)' }}>
            이 구속을 풀어주면 남은 구조가 불안정해져요 — 다른 것을 골라보세요.
          </div>
        )}
      </FormulaSection>

      {all.filter((a) => a.res.ok).length >= 2 && <SameAnswer all={all} units={units} forceF={forceF} momF={momF} />}

      <TextbookAnswer ctx={ctx} />

      <EditableText
        as="div"
        className="ai-hint"
        contentKey="calc.IndeterminateSuperposition.aiHint"
        defaultText="💬 어느 쪽을 풀어줘도 결국 같은 보인데 왜 같은 답이 나오는지 궁금하다면, 오른쪽 AI 튜터에게 물어보세요."
      />
    </div>
  );
}

// 중첩이 실제로 실제 보의 처짐곡선을 만들어내는지 곡선으로 확인한다.
function CurveCheck({ analysis, chosen, L, lenF, units, forceF, momF }) {
  const f = chosen.kind === 'force' ? forceF : momF;
  const unit = chosen.kind === 'force' ? units.force : units.moment;

  // ② 곡선은 "크기 1"짜리라, 구한 여분력만큼 키워야 실제 기여분이 된다.
  const scaled = analysis.unitCase.pts.map((p) => ({ x: p.x, v: p.v * analysis.value }));

  const at = (pts, x) => {
    const i = Math.min(pts.length - 1, Math.max(0, Math.round((x / L) * (pts.length - 1))));
    return pts[i].v;
  };
  const xMid = L / 2;
  const a = at(analysis.released.pts, xMid);
  const b = at(scaled, xMid);
  const total = at(analysis.full.pts, xMid);
  const rel = Math.abs(total) > 1e-15 ? Math.abs(a + b - total) / Math.abs(total) : Math.abs(a + b - total);

  return (
    <div style={{ marginTop: 12 }}>
      <div className="step-row" style={{ display: 'block' }}>
        <div style={{ fontWeight: 800, marginBottom: 4 }}>두 곡선을 더하면 실제 보의 처짐곡선이 됩니다</div>
        <SuperpositionCurvesSVG
          cases={[
            { label: '① released structure · 실제 하중만', pts: analysis.released.pts },
            { label: `② ${chosen.symbol} = ${fmt(analysis.value / f)} ${unit} 를 준 것`, pts: scaled },
          ]}
          total={analysis.full.pts}
          L={L}
          lenF={lenF}
          lenUnit={units.length}
          xStar={xMid}
        />
      </div>
      <div className="step-row" style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
        <span>보 중앙에서: ① {fmt(a * 1000)} mm + ② {fmt(b * 1000)} mm</span>
        <b>= {fmt((a + b) * 1000)} mm (실제 {fmt(total * 1000)} mm)</b>
      </div>
      <div className="step-row" style={{ color: rel < 1e-3 ? '#1E7F72' : 'var(--crimson)', fontWeight: 700 }}>
        {rel < 1e-3
          ? `차이 ${(rel * 100).toExponential(1)} % — 중첩이 그대로 맞아떨어집니다.`
          : `차이가 ${(rel * 100).toFixed(2)} % 나요.`}
      </div>
      <div className="step-row" style={{ display: 'block' }}>
        <b>여분력이 있으면 그 자리가 안 움직인다</b>는 게 ①의 끝점 화살표와 ②의 반대 방향 화살표가
        정확히 상쇄되는 것으로 보여요. 여분력이 하는 일은 딱 그것뿐입니다.
      </div>
    </div>
  );
}

// "어느 것을 여분력으로 골라도 답은 같다"를 실제로 다 풀어서 보여준다 (교재 Fig.10-1의 (b) vs (c)).
function SameAnswer({ all, units, forceF, momF }) {
  const rows = all.filter((a) => a.res.ok);
  return (
    <FormulaSection
      title={<EditableText as="span" contentKey="ch10.super.sameTitle" defaultText="어느 것을 여분력으로 골라도 답은 같아요" />}
    >
      <EditableText
        as="div"
        className="step-row"
        contentKey="ch10.super.sameWhy"
        defaultText="교재 Fig.10-1의 (b)와 (c)가 바로 이 얘기예요. 풀어주는 자리가 달라지면 released structure도, 중간에 나오는 δ 값도 전혀 다른 숫자가 되지만, 최종 반력은 똑같이 나옵니다 — 원래 보가 하나뿐이니까요."
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {rows.map(({ opt, res }) => {
          const f = opt.kind === 'force' ? forceF : momF;
          const unit = opt.kind === 'force' ? units.force : units.moment;
          return (
            <div key={opt.key} className="step-row" style={{ display: 'block' }}>
              <div style={{ fontWeight: 800 }}>{opt.releasedName}</div>
              <div style={{ fontSize: 11, color: 'var(--gray-soft)', lineHeight: 1.6 }}>
                중간값: {fmtSci(res.dofLoad)} / {fmtSci(res.dofUnit)}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 2 }}>
                <span>→ {opt.symbol}</span>
                <b>{fmt(res.value / f)} {unit}</b>
              </div>
            </div>
          );
        })}
      </div>
      <div className="step-final">
        {rows.every((r) => r.res.matches)
          ? '모두 이 보를 통째로 푼 결과와 일치합니다.'
          : '일부가 통째로 푼 결과와 어긋나요 — 입력을 확인해보세요.'}
      </div>
    </FormulaSection>
  );
}
