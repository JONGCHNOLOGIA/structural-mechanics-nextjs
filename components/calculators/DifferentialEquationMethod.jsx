'use client';

import { useEffect, useMemo, useState } from 'react';
import { fmt } from '@/lib/calc/unitOptions';
import { conditionsFor } from '@/lib/calc/beamBuilder';
import { analyzeRedundant, redundantOptions } from '@/lib/calc/redundant';
import { CH10_EXAMPLES, buildExample } from '@/lib/calc/ch10Examples';
import FormulaSection from './FormulaSection';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import BeamWorkbench, { CalcTrigger, sup, udl, pointLoad, momentLoad } from './BeamWorkbench';
import ConditionList from './ConditionList';
import ReleasedStructureSVG from './ReleasedStructureSVG';
import RedundantResult from './RedundantResult';

/*
  CH.10 — 미분방정식법.

  참고자료 mmch10.pdf Example 10-1의 9단계를 그대로 따라간다:
    1 여분력 고르기 → 2 반력을 여분력으로 표현 → 3 M(x) 세우기 → 4 EIv"=M 적분
    → 5 경계조건 적용 → 6 여분력 결정 → 7 반력 전부 → 8 SFD·BMD → 9 처짐곡선

  예전 화면은 "돌출 캔틸레버 + UDL"과 "양단고정 + 중앙하중" 두 가지만 고정으로 보여줬다.
  지금은 CH.9와 같은 보 빌더 위에서 아무 보나 만들 수 있고, 부정정보면 그대로 끝까지 푼다.
  교재 예제들은 프리셋으로 그대로 불러올 수 있다.
*/

export default function DifferentialEquationMethod() {
  const [redundantKey, setRedundantKey] = useState(null);

  return (
    <>
      <BeamWorkbench
        contentPrefix="calc.DifferentialEquationMethod"
        intro="반력이 평형방정식 2개보다 많으면 **부정정보**예요. 그중 하나를 **여분력(redundant)**으로 남겨두고 EIv” = M(x)를 적분하면, 다 쓰지 못한 조건이 하나 남습니다. 그 조건으로 여분력을 거꾸로 구하는 게 이 방법이에요."
        initial={() => buildExample(CH10_EXAMPLES[0], { sup, pointLoad, udl, momentLoad })}
        presets={CH10_EXAMPLES.map((ex) => ({
          label: ex.label,
          hint: ex.hint,
          build: () => buildExample(ex, { sup, pointLoad, udl, momentLoad }),
        }))}
        diagrams={['V', 'M']}
        solveIndeterminate
      >
        {(ctx) => <Steps ctx={ctx} redundantKey={redundantKey} setRedundantKey={setRedundantKey} />}
      </BeamWorkbench>

      <AiTutorPanel />
    </>
  );
}

function Steps({ ctx, redundantKey, setRedundantKey }) {
  const { solved, info, L, supports, loads, ei, units, lenF, forceF, momF, disp } = ctx;
  const [state, setState] = useState('idle');
  const [snap, setSnap] = useState(null);

  useEffect(() => {
    setState((s) => (s === 'done' ? 'stale' : s));
  }, [solved, redundantKey]);

  const options = useMemo(() => redundantOptions(supports), [supports]);
  const chosen = options.find((o) => o.key === redundantKey) || options[0];
  const analysis = useMemo(
    () => (solved && chosen && info.kind === 'indeterminate' ? analyzeRedundant(L, supports, loads, ei, chosen, 600) : null),
    [solved, chosen, info.kind, L, supports, loads, ei]
  );

  if (!solved) return null;

  if (info.kind === 'determinate') {
    return (
      <div className="steps">
        <FormulaSection title="이 보는 정정보예요">
          <EditableText
            as="div"
            className="step-row"
            contentKey="ch10.diffeq.determinateNote"
            defaultText="반력 미지수가 평형방정식 2개와 딱 맞아떨어져서, 여분력을 따로 둘 필요가 없어요. 지지단을 하나 더 얹거나 힌지를 고정단으로 바꿔서 부정정보로 만들어보세요 — 위의 예제 버튼을 눌러도 됩니다."
          />
        </FormulaSection>
      </div>
    );
  }

  return (
    <div className="steps">
      <FormulaSection
        title={<EditableText as="span" contentKey="ch10.diffeq.title" defaultText="여분력을 남겨두고 적분하기" />}
      >
        <div className="step-row" style={{ display: 'block' }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>
            1단계 — 여분력(redundant)을 하나 고르세요
          </div>
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
          <div style={{ fontSize: 10.5, color: 'var(--gray-soft)', marginTop: 6, lineHeight: 1.6 }}>
            {info.degree}차 부정정이라 여분력이 {info.degree}개 필요해요. 여기서는 하나씩 짚어가며 과정을 보여주고,
            나머지는 풀이가 한꺼번에 처리합니다. <b>어느 것을 골라도 최종 답은 같아요.</b>
          </div>
        </div>

        {analysis && analysis.ok && (
          <>
            <div className="step-row" style={{ display: 'block' }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>
                2단계 — 그 구속을 풀어주면 정정보가 됩니다 ({chosen.releasedName})
              </div>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
                <ReleasedStructureSVG
                  L={L}
                  supports={analysis.relSupports}
                  loads={loads}
                  pts={analysis.released.pts}
                  dofX={analysis.x0}
                  dofKind={chosen.kind}
                  dofLabel={chosen.kind === 'force' ? 'δ' : 'θ'}
                  caption="실제 하중만 받는 released structure"
                />
                <ReleasedStructureSVG
                  L={L}
                  supports={analysis.relSupports}
                  loads={analysis.unitCase ? [unitLoadShape(chosen, supports)] : []}
                  pts={analysis.unitCase.pts}
                  dofX={analysis.x0}
                  dofKind={chosen.kind}
                  dofLabel={chosen.kind === 'force' ? 'δ₁₁' : 'θ₁₁'}
                  caption={`${chosen.symbol} 자리에 크기 1만 줬을 때`}
                  unit
                />
              </div>
            </div>

            <EditableText
              as="div"
              className="step-formula"
              contentKey="ch10.diffeq.moment"
              defaultText="3단계 — M(x) = (하중이 만드는 M) + X · (여분력 1이 만드는 m) — 아직 X는 모르는 값으로 둡니다"
            />
            <EditableText
              as="div"
              className="step-row"
              contentKey="ch10.diffeq.integrate"
              defaultText="4단계 — EIv” = M(x)를 두 번 적분해요. X가 식 안에 그대로 남은 채로 v(x)가 나옵니다."
            />

            <div className="step-row" style={{ display: 'block' }}>
              <div style={{ fontWeight: 800, marginBottom: 4 }}>5단계 — 조건을 적용합니다</div>
              <ConditionList
                conditions={conditionsFor(L, supports, loads, (x) => `${fmt(disp(x, lenF))} ${units.length}`)}
                title=""
              />
              <div style={{ fontSize: 11, color: 'var(--gray-soft)', marginTop: 4, lineHeight: 1.6 }}>
                적분상수 2개를 정하고 나면 조건이 {info.degree}개 <b>남아요</b>. 정정보였다면 딱 떨어졌을 텐데,
                반력을 하나 더 모르는 채로 뒀으니 그만큼 조건이 남는 거예요. 그게 곧 여분력을 구하는 식이 됩니다.
              </div>
            </div>

            <CalcTrigger state={state} onCalc={() => { setSnap(analysis); setState('done'); }} />
            {state !== 'idle' && snap && snap.ok && (
              <RedundantResult
                analysis={snap}
                chosen={chosen}
                supports={supports}
                units={units}
                lenF={lenF}
                forceF={forceF}
                momF={momF}
                startStep={6}
              />
            )}
          </>
        )}

        {analysis && !analysis.ok && (
          <div className="step-row" style={{ color: 'var(--crimson)' }}>
            이 여분력을 풀어주면 남은 구조가 불안정해져요 — 다른 여분력을 골라보세요.
          </div>
        )}
      </FormulaSection>

      <TextbookAnswer ctx={ctx} />

      <EditableText
        as="div"
        className="ai-hint"
        contentKey="calc.DifferentialEquationMethod.aiHint"
        defaultText="💬 왜 '남는 조건' 하나로 미지수를 구할 수 있는지 궁금하다면, 오른쪽 AI 튜터에게 물어보세요."
      />
    </div>
  );
}

// 단위하중 그림에 쓸 모양 (값은 1이라 숫자를 안 적는다)
function unitLoadShape(opt, supports) {
  const s = supports[opt.supIdx];
  return opt.kind === 'force'
    ? { kind: 'point', x: s.x, P: -1 }
    : { kind: 'moment', x: s.x, M0: -1 };
}

// 지금 만든 보가 교재 예제와 같은 구성이면, 교재의 닫힌 식과 화면 값을 나란히 놓는다.
export function TextbookAnswer({ ctx }) {
  const { solved, L, supports, loads, units, forceF, momF } = ctx;
  if (!solved) return null;

  const match = CH10_EXAMPLES.find((ex) => sameShape(ex, L, supports, loads));
  if (!match) return null;

  const params = { L, q: firstOf(loads, 'udl', 'q'), P: firstOf(loads, 'point', 'P'), M0: firstOf(loads, 'moment', 'M0') };
  const rows = match.answer(params).filter((r) => r.value !== null);

  const got = (r) => {
    const letter = r.sym.replace(/[^A-Z]/g, '').slice(-1);
    const idx = 'ABCDEFGH'.indexOf(letter);
    const s = solved.supports[idx];
    if (!s) return null;
    return r.unitType === 'moment' ? Math.abs(s.reactionM) : s.reactionFy;
  };

  return (
    <FormulaSection title={`교재 ${match.label}의 답과 맞춰보기`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {rows.map((r) => {
          const mine = got(r);
          const f = r.unitType === 'moment' ? momF : forceF;
          const unit = r.unitType === 'moment' ? units.moment : units.force;
          const near = mine !== null && Math.abs(Math.abs(mine) - Math.abs(r.value)) <= Math.abs(r.value) * 5e-3;
          return (
            <div key={r.sym} className="step-row" style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <span>
                {r.sym} = <b>{r.text}</b>
              </span>
              <span>
                교재 {fmt(Math.abs(r.value) / f)} {unit}
                {mine !== null && (
                  <>
                    {' · '}
                    <b style={{ color: near ? '#1E7F72' : 'var(--crimson)' }}>
                      화면 {fmt(Math.abs(mine) / f)} {unit}
                    </b>
                  </>
                )}
              </span>
            </div>
          );
        })}
      </div>
      <div className="step-row" style={{ fontSize: 10.5, color: 'var(--gray-soft)' }}>
        ※ 부호는 이 사이트의 내부 규약(굽힘모멘트는 아래로 볼록할 때 +)으로 적혀요. 크기를 비교합니다.
      </div>
    </FormulaSection>
  );
}

function firstOf(loads, kind, key) {
  const l = loads.find((x) => x.kind === kind);
  return l ? l[key] : 0;
}

function sameShape(ex, L, supports, loads) {
  if (Math.abs(ex.L - L) > 1e-6) return false;
  if (ex.supports.length !== supports.length || ex.loads.length !== loads.length) return false;
  const supOk = ex.supports.every(([type, x], i) => supports[i] && supports[i].type === type && Math.abs(supports[i].x - x) < 1e-6);
  const loadOk = ex.loads.every((l, i) => loads[i] && loads[i].kind === l[0]);
  return supOk && loadOk;
}
