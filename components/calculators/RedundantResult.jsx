'use client';

import { fmt, fmtSci } from '@/lib/calc/unitOptions';
import { letterFor } from './BeamWorkbench';

/*
  여분력을 구하고 나머지 반력까지 정리하는 마무리 단계.
  CH.10의 두 소분류(미분방정식법·중첩법)가 이 부분을 똑같이 쓴다 —
  풀어가는 길만 다를 뿐 도착점은 같기 때문이다.

  값은 lib/calc/redundant.js의 analyzeRedundant가 구한 것이고, 그 결과를
  "부정정보를 통째로 푼 값"과 나란히 놓아 맞는지 확인까지 보여준다.
*/

export default function RedundantResult({ analysis, chosen, supports, units, lenF, forceF, momF, startStep = 6 }) {
  const isForce = chosen.kind === 'force';
  const f = isForce ? forceF : momF;
  const unit = isForce ? units.force : units.moment;

  // 교재(mmch10 p.9~11)가 쓰는 이름 그대로
  const nameLoad = isForce ? 'δ' : 'θ';
  const nameUnit = isForce ? 'δ' : 'θ';
  const subLoad = chosen.symbol.replace(/^[RM]/, '');
  const relVW = Math.abs(analysis.dofLoad) > 1e-30
    ? Math.abs(analysis.vwLoad - analysis.dofLoad) / Math.abs(analysis.dofLoad)
    : Math.abs(analysis.vwLoad);

  return (
    <div style={{ marginTop: 10 }}>
      <div className="step-row" style={{ display: 'block' }}>
        <div style={{ fontWeight: 800, marginBottom: 4 }}>
          {startStep}단계 — 적합조건(compatibility)으로 여분력 결정
        </div>
        <div style={{ lineHeight: 1.9 }}>
          실제 구조에서는 {chosen.symbol} 자리가 {isForce ? '내려앉지 않아요' : '돌아가지 않아요'} — 그러니까{' '}
          <b>
            {nameLoad}
            <sub>{subLoad}</sub> + {chosen.symbol} · {nameUnit}
            <sub>{subLoad.toLowerCase()}{subLoad.toLowerCase()}</sub> = 0
          </b>
          <br />
          {nameLoad}
          <sub>{subLoad}</sub> = {fmtSci(analysis.dofLoad)} {isForce ? 'm' : 'rad'} — released structure가 실제 하중만으로 움직인 양
          <br />
          {nameUnit}
          <sub>{subLoad.toLowerCase()}{subLoad.toLowerCase()}</sub> = {fmtSci(analysis.dofUnit)} {isForce ? 'm/N' : 'rad/(N·m)'} — 그 자리에 크기 1만 줬을 때 움직인 양
        </div>
        <div style={{ fontSize: 10.5, color: relVW < 5e-3 ? '#1E7F72' : 'var(--crimson)', marginTop: 4, lineHeight: 1.6 }}>
          같은 값을 교재처럼 가상일로 적분해도: ∫M·δM/EI dx = {fmtSci(analysis.vwLoad)}, ∫(δM)²/EI dx ={' '}
          {fmtSci(analysis.vwUnit)} — {relVW < 5e-3 ? '위 값과 일치합니다.' : '어긋나요.'}
        </div>
      </div>

      <div className="step-final">
        {chosen.symbol} = −{nameLoad}
        <sub>{subLoad}</sub> / {nameUnit}
        <sub>{subLoad.toLowerCase()}{subLoad.toLowerCase()}</sub> = <b>{fmt(analysis.value / f)} {unit}</b>
        <div style={{ fontSize: 11, fontWeight: 600, color: analysis.matches ? '#1E7F72' : 'var(--crimson)', marginTop: 4 }}>
          검산 — 이 보를 통째로 푼 결과에서 같은 반력을 읽으면 {fmt(analysis.fullValue / f)} {unit}
          {analysis.matches ? ' → 일치합니다.' : ' → 어긋나요.'}
        </div>
      </div>

      <div className="step-row" style={{ display: 'block' }}>
        <div style={{ fontWeight: 800, marginBottom: 4 }}>{startStep + 1}단계 — 나머지 반력은 평형으로</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {analysis.full.supports.map((s, i) => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <span style={{ color: i === chosen.supIdx ? 'var(--crimson)' : 'inherit', fontWeight: i === chosen.supIdx ? 800 : 400 }}>
                R<sub>{letterFor(i)}</sub>
                {s.type === 'fixed' && <> · M<sub>{letterFor(i)}</sub></>}
                {i === chosen.supIdx && ' ← 여분력으로 고른 것'}
              </span>
              <b>
                {fmt(s.reactionFy / forceF)} {units.force}
                {s.type === 'fixed' && <> · {fmt(s.reactionM / momF)} {units.moment}</>}
              </b>
            </div>
          ))}
        </div>
      </div>

      <div className="step-row">
        <b>{startStep + 2}단계 — SFD·BMD</b>, <b>{startStep + 3}단계 — 처짐곡선</b>: 위 VISUALIZER의 보 그림과 그 아래 두 칸이
        이미 이 반력으로 그려진 것이에요. 여분력이 정해지는 순간 나머지는 정정보와 똑같이 따라 나옵니다.
      </div>
    </div>
  );
}
