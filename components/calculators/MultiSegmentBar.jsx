'use client';

import { useCallback, useMemo, useState } from 'react';
import { computeMultiSegment } from '@/lib/calc/multiSegmentBar';
import { LENGTH_UNITS, FORCE_UNITS, STRESS_UNITS, AREA_UNITS, fromBase, fmt1, scaledPx } from '@/lib/calc/units1';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import { DualField, SelectField, ResetButton, ResultGrid, ResultCard, StepCard, ErrorBox, InputNeededPlaceholder } from './sm1/Controls';
import { StepDiagram } from './sm1/Diagrams';
import PracticePanel, { randInt } from './sm1/PracticePanel';

// CH.2-2 Nonuniform Bar (Multi-Segment) — 원본 renderMultiSegment()의 React 버전.

const DEFAULTS = {
  segCount: 3,
  segs: [
    { load: 150, loadUnit: 'kN', L: 1, LUnit: 'm', A: 500, AUnit: 'mm2', E: 200, EUnit: 'GPa' },
    { load: 0, loadUnit: 'kN', L: 0.6, LUnit: 'm', A: 400, AUnit: 'mm2', E: 200, EUnit: 'GPa' },
    { load: 400, loadUnit: 'kN', L: 0.8, LUnit: 'm', A: 400, AUnit: 'mm2', E: 200, EUnit: 'GPa' },
  ],
};

export default function MultiSegmentBar() {
  const [s, setS] = useState(DEFAULTS);
  const res = useMemo(() => computeMultiSegment(s), [s]);

  function setSeg(i, key, v, numeric = true) {
    setS((prev) => {
      const segs = prev.segs.map((seg, idx) => (idx === i ? { ...seg, [key]: numeric ? parseFloat(v) : v } : seg));
      return { ...prev, segs };
    });
  }

  const generate = useCallback(() => {
    const load1 = randInt(-200, 300), load2 = randInt(-200, 300);
    const L1 = randInt(5, 20) / 10, L2 = randInt(5, 20) / 10;
    const r = computeMultiSegment({
      segCount: 2,
      segs: [
        { load: load1, loadUnit: 'kN', L: L1, LUnit: 'm', A: 500, AUnit: 'mm2', E: 200, EUnit: 'GPa' },
        { load: load2, loadUnit: 'kN', L: L2, LUnit: 'm', A: 400, AUnit: 'mm2', E: 200, EUnit: 'GPa' },
      ],
    });
    if (!r.valid) return null;
    return {
      q: `왼쪽 고정단, 구간1 끝(경계1)에 ${load1}kN, 자유단(구간2 끝)에 ${load2}kN이 작용(→+)한다. L1=${L1}m, L2=${L2}m, A1=500mm², A2=400mm², E=200GPa일 때 R, N1, N2, δ_total을 구하시오.`,
      a: `R=${fmt1(fromBase(r.R_N, 'kN', FORCE_UNITS), 2)}kN, N1=${fmt1(fromBase(r.perSeg[0].N_N, 'kN', FORCE_UNITS), 2)}kN, N2=${fmt1(fromBase(r.perSeg[1].N_N, 'kN', FORCE_UNITS), 2)}kN, δ_total=${fmt1(fromBase(r.delta_total_m, 'mm', LENGTH_UNITS), 4)}mm`,
    };
  }, []);

  const segments = res.valid
    ? res.perSeg.map((p) => ({ value: fromBase(p.N_N, 'kN', FORCE_UNITS), length: fromBase(p.L_m, 'm', LENGTH_UNITS) }))
    : [];
  const checkKN = res.valid ? fmt1(fromBase(res.finalCheck_N, 'kN', FORCE_UNITS), 4) : '';

  return (
    <>
      {/* ---------------- Setting Menu ---------------- */}
      <div className="panel">
        <h3>SETTING MENU</h3>
        <div className="note-box">
          왼쪽 끝은 고정단(반력 R은 자동 계산)이고, 오른쪽 끝은 자유단입니다. 각 구간 오른쪽 경계에 외력을 직접 입력하면, 절단법으로 각 구간의 내력
          N이 유도됩니다.
        </div>
        <SelectField
          label="구간 개수"
          value={String(s.segCount)}
          options={[
            { value: '2', label: '2구간' },
            { value: '3', label: '3구간' },
          ]}
          onChange={(v) => setS((prev) => ({ ...prev, segCount: parseInt(v, 10) }))}
        />
        {s.segs.slice(0, s.segCount).map((seg, i) => (
          <div key={i} className="field" style={{ border: '1px solid var(--line)', borderRadius: 0, padding: 10, marginBottom: 10 }}>
            <label style={{ color: 'var(--crimson)' }}>구간 {i + 1} (길이 L{i + 1})</label>
            <DualField label="길이 L" value={seg.L} min={0.01} max={5} step={0.01} onChange={(v) => setSeg(i, 'L', v)}
              unitMap={LENGTH_UNITS} unit={seg.LUnit} onUnitChange={(v) => setSeg(i, 'LUnit', v, false)} invalid={!(seg.L > 0)} />
            <DualField label="단면적 A" value={seg.A} min={1} max={2000} step={1} onChange={(v) => setSeg(i, 'A', v)}
              unitMap={AREA_UNITS} unit={seg.AUnit} onUnitChange={(v) => setSeg(i, 'AUnit', v, false)} invalid={!(seg.A > 0)} />
            <DualField label="탄성계수 E" value={seg.E} min={0.1} max={500} step={0.5} onChange={(v) => setSeg(i, 'E', v)}
              unitMap={STRESS_UNITS} unit={seg.EUnit} onUnitChange={(v) => setSeg(i, 'EUnit', v, false)} invalid={!(seg.E > 0)} />
            <DualField
              label={`이 구간 오른쪽 끝(${i === s.segCount - 1 ? '자유단' : '다음 구간과의 경계'})에 작용하는 외력 (→ 방향 +)`}
              value={seg.load} min={-500} max={500} step={1} onChange={(v) => setSeg(i, 'load', v)}
              unitMap={FORCE_UNITS} unit={seg.loadUnit} onUnitChange={(v) => setSeg(i, 'loadUnit', v, false)} />
          </div>
        ))}
        <ResetButton onClick={() => setS(DEFAULTS)} />
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="panel">
        <h3>VISUALIZER</h3>
        {res.valid ? (
          <>
            <h3>전체 부재 — 반력과 외력</h3>
            <BarWithLoadsSVG res={res} />
            <ResultGrid>
              {res.perSeg.map((p, i) => (
                <ResultCard key={i} label={`구간${i + 1} δ`} value={`${fmt1(fromBase(p.delta_m, 'mm', LENGTH_UNITS), 4)} mm`} />
              ))}
              <ResultCard label="전체 변위 δ_total = Σ(NᵢLᵢ/EᵢAᵢ)" value={`${fmt1(fromBase(res.delta_total_m, 'mm', LENGTH_UNITS), 4)} mm`} full />
            </ResultGrid>
            <EditableText as="div" className="ai-hint" contentKey="calc.MultiSegmentBar.aiHint"
              defaultText="💬 각 구간의 EA가 다르면 왜 δ 기여도가 달라지는지, 오른쪽 AI 튜터에게 물어보세요." />

            <h3 style={{ marginTop: 20 }}>자유물체도 — 구간별 절단 (Free Body Diagram)</h3>
            <CutSequenceSVG res={res} />
            <div className="hint">
              각 구간을 통째로 잘라낸 자유물체는 양쪽 절단면에 크기가 같은 내력 N이 나타나며(그 구간만 보면 ΣF=0), 인장이면 양쪽 다 바깥으로,
              압축이면 양쪽 다 안쪽으로 향합니다. 구간 사이 틈의 빨간 화살표는 그 경계에 실제로 작용하는 외력이고, 이게 옆 구간과 N값을 연결해줍니다:
              N_(다음 구간) = N_(이번 구간) + (경계의 외력).
            </div>
            <div className="hint" style={{ marginTop: 8 }}>
              <b>검산 (ΣF=0):</b> 마지막 하중까지 다 지나면 자유단이므로 내력은 0이어야 합니다 → 계산값 = {checkKN} kN{' '}
              {Math.abs(res.finalCheck_N) < 1 ? '✓' : '⚠'}
            </div>

            <h3 style={{ marginTop: 20 }}>축력도 N(x) — 구간별 계단식</h3>
            <StepDiagram segments={segments} valueUnit="kN" lengthUnit="m" quantitySymbol="N" />
            <div className="hint">
              비균일 부재는 구간마다 내력 N이 달라지므로, 축력도가 CH.1의 균일 부재처럼 일정하지 않고 구간별로 계단 형태로 변합니다.
            </div>
          </>
        ) : (
          <ErrorBox errors={res.errors} />
        )}

        <div className="steps" style={{ marginTop: 20 }}>
          {res.valid ? <Steps s={s} res={res} /> : <InputNeededPlaceholder />}
        </div>
      </div>

      <AiTutorPanel question="절단할 때마다 왜 지나온 힘들을 다 더해야 하나요?" />

      <PracticePanel generate={generate} />
    </>
  );
}

function Steps({ s, res }) {
  const kN = (v) => fromBase(v, 'kN', FORCE_UNITS);
  const cards = [
    <StepCard
      key="R"
      title="Step 1. 전체 평형으로 반력 R 결정"
      formula="ΣFx=0: R + Σ(모든 외력) = 0"
      eqLines={[`R = −(${res.perSeg.map((p) => fmt1(kN(p.loadHere_N), 1)).join(' + ')})`]}
      final={`R = ${fmt1(kN(res.R_N), 3)} kN`}
    />,
  ];
  res.perSeg.forEach((p, i) => {
    cards.push(
      <StepCard
        key={`N${i}`}
        title={`Step ${i + 2}. 구간${i + 1} 절단 — 내력 N`}
        formula="N = R + (지금까지 지나온 외력의 합)"
        eqLines={[`N${i + 1} = ${fmt1(kN(p.N_N), 3)} kN`]}
        final={`N${i + 1} = ${fmt1(kN(p.N_N), 3)} kN`}
      />
    );
  });
  cards.push(
    <StepCard
      key="check"
      title={`Step ${res.perSeg.length + 2}. 검산 (ΣF=0)`}
      formula="마지막 하중까지 지나면 자유단 → 내력 0"
      eqLines={[`0 + 마지막 외력을 더한 값 = ${fmt1(kN(res.finalCheck_N), 4)} kN`]}
      final={Math.abs(res.finalCheck_N) < 1 ? '평형 만족 ✓' : '⚠ 확인 필요'}
    />
  );
  res.perSeg.forEach((p, i) => {
    const seg = s.segs[i];
    cards.push(
      <StepCard
        key={`d${i}`}
        title={`Step. 구간${i + 1} 변위`}
        formula="δᵢ = Nᵢ Lᵢ / (Eᵢ Aᵢ)"
        eqLines={[`δ = ${fmt1(kN(p.N_N), 2)} kN × ${seg.L} ${seg.LUnit} / (${seg.E} ${seg.EUnit} × ${seg.A} ${seg.AUnit})`]}
        final={`δ${i + 1} = ${fmt1(fromBase(p.delta_m, 'mm', LENGTH_UNITS), 4)} mm`}
      />
    );
  });
  cards.push(
    <StepCard
      key="total"
      title="Step 마지막. 전체 변위 (중첩)"
      formula="δ_total = Σ δᵢ"
      eqLines={res.perSeg.map((p, i) => `δ${i + 1} = ${fmt1(fromBase(p.delta_m, 'mm', LENGTH_UNITS), 4)} mm`)}
      final={`δ_total = ${fmt1(fromBase(res.delta_total_m, 'mm', LENGTH_UNITS), 4)} mm`}
    />
  );
  return <>{cards}</>;
}

// 전체 부재 한 줄 그림 — 고정단 반력 R과 각 경계의 외력 화살표
function BarWithLoadsSVG({ res }) {
  const w = 460, h = 140, x0 = 50, xEnd = 420, barY = 60;
  const totalLen = res.perSeg.reduce((a, p) => a + fromBase(p.L_m, 'm', LENGTH_UNITS), 0) || 1;
  const X = (x) => x0 + (x / totalLen) * (xEnd - x0);
  const Rdisp = fromBase(res.R_N, 'kN', FORCE_UNITS);
  const Rdir = Rdisp >= 0 ? 1 : -1;

  let cx = 0;
  const marks = res.perSeg.map((p, i) => {
    cx += fromBase(p.L_m, 'm', LENGTH_UNITS);
    const x = X(cx);
    const Ld = fromBase(p.loadHere_N, 'kN', FORCE_UNITS);
    const dir = Ld >= 0 ? 1 : -1;
    return (
      <g key={i}>
        <line x1={x} y1={barY - 16} x2={x} y2={barY + 16} stroke="#8A97A2" strokeWidth="1" strokeDasharray="3 2" />
        {Math.abs(Ld) > 1e-9 && (
          <>
            <line x1={x} y1={barY} x2={x + dir * 22} y2={barY} stroke="var(--crimson)" strokeWidth="2.4" />
            <polygon points={`${x + dir * 22},${barY} ${x + dir * 14},${barY - 5} ${x + dir * 14},${barY + 5}`} fill="var(--crimson)" />
            <text x={x} y={barY - 24} fontSize="9.5" fontWeight="800" fill="var(--crimson)" textAnchor="middle">
              {fmt1(Math.abs(Ld), 1)}
            </text>
          </>
        )}
      </g>
    );
  });

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 460, margin: '0 auto', display: 'block' }}>
      <line x1={x0} y1={barY - 22} x2={x0} y2={barY + 22} stroke="#51626F" strokeWidth="2" />
      {Array.from({ length: 6 }).map((_, i) => {
        const yy = barY - 20 + i * 8;
        return <line key={i} x1={x0} y1={yy} x2={x0 - 9} y2={yy + 8} stroke="#8A97A2" strokeWidth="1.1" />;
      })}
      <line x1={x0} y1={barY} x2={xEnd} y2={barY} stroke="var(--gray)" strokeWidth="5" />
      <line x1={x0 - 6} y1={barY} x2={x0 - 6 - Rdir * 22} y2={barY} stroke="var(--teal)" strokeWidth="2.2" />
      <polygon points={`${x0 - 6 - Rdir * 22},${barY} ${x0 - 6 - Rdir * 14},${barY - 5} ${x0 - 6 - Rdir * 14},${barY + 5}`} fill="var(--teal)" />
      <text x={x0 - 6 - Rdir * 30} y={barY - 8} fontSize="10" fontWeight="800" fill="var(--teal)" textAnchor="middle">
        R={fmt1(Math.abs(Rdisp), 1)}
      </text>
      {marks}
      <text x={x0} y={barY + 36} fontSize="9.5" fill="var(--gray-soft)" textAnchor="middle">고정단</text>
      <text x={xEnd} y={barY + 36} fontSize="9.5" fill="var(--gray-soft)" textAnchor="middle">자유단</text>
    </svg>
  );
}

// 구간을 하나씩 잘라낸 자유물체들 — 양쪽 절단면의 N과, 경계에 꽂히는 외력을 함께 보여준다.
function CutSequenceSVG({ res }) {
  const w = 460, h = 210, y = 110, gap = 54;
  const kN = (v) => fromBase(v, 'kN', FORCE_UNITS);
  const Ns = res.perSeg.map((p) => kN(p.N_N));
  const loads = res.perSeg.map((p) => kN(p.loadHere_N));
  const maxAbs = Math.max(1, ...Ns.map(Math.abs));
  const blocks = Ns.map((v) => scaledPx(Math.abs(v), maxAbs, 30, 58));
  const totalW = blocks.reduce((a, b) => a + b, 0) + gap * (blocks.length + 1);

  let x = Math.max(6, (w - totalW) / 2) + gap;
  const boxLefts = [], boxRights = [];
  const boxes = Ns.map((N, i) => {
    const size = blocks[i];
    const color = N >= 0 ? 'var(--teal)' : 'var(--crimson)';
    boxLefts.push(x);
    boxRights.push(x + size);
    const dirLeft = N >= 0 ? -1 : 1, dirRight = N >= 0 ? 1 : -1;
    const bx = x;
    x += size + gap;
    return (
      <g key={i}>
        <rect x={bx} y={y - size / 2} width={size} height={size} fill={color} opacity="0.2" stroke={color} strokeWidth="1.8" />
        <text x={bx + size / 2} y={y + size / 2 + 16} fontSize="9.5" fill={color} textAnchor="middle" fontWeight="800">
          구간{i + 1}
        </text>
        <line x1={bx - 2} y1={y} x2={bx - 2 + dirLeft * 18} y2={y} stroke={color} strokeWidth="2.4" />
        <polygon points={`${bx - 2 + dirLeft * 18},${y} ${bx - 2 + dirLeft * 11},${y - 4.5} ${bx - 2 + dirLeft * 11},${y + 4.5}`} fill={color} />
        <line x1={bx + size + 2} y1={y} x2={bx + size + 2 + dirRight * 18} y2={y} stroke={color} strokeWidth="2.4" />
        <polygon
          points={`${bx + size + 2 + dirRight * 18},${y} ${bx + size + 2 + dirRight * 11},${y - 4.5} ${bx + size + 2 + dirRight * 11},${y + 4.5}`}
          fill={color}
        />
        <text x={bx + size / 2} y={y - size / 2 - 10} fontSize="10" fontWeight="800" fill={color} textAnchor="middle">
          N={fmt1(N, 1)} kN {N >= 0 ? '(인장)' : '(압축)'}
        </text>
      </g>
    );
  });

  const wallX = boxLefts[0] - 24;
  const lastRight = boxRights[boxRights.length - 1];

  const cuts = loads.map((load, i) => {
    if (Math.abs(load) < 1e-9) return null;
    const isLast = i === loads.length - 1;
    const cutX = isLast ? lastRight : (boxRights[i] + boxLefts[i + 1]) / 2;
    const dir = load >= 0 ? 1 : -1;
    return (
      <g key={`cut${i}`}>
        <line x1={cutX} y1={y - 30} x2={cutX} y2={y + 30} stroke="var(--gray-soft)" strokeWidth="1.2" strokeDasharray="3 2" />
        <line x1={cutX - dir * 20} y1={y - 48} x2={cutX} y2={y - 32} stroke="var(--crimson)" strokeWidth="2.6" />
        <polygon points={`${cutX},${y - 32} ${cutX - 6},${y - 40} ${cutX + dir * 2},${y - 42}`} fill="var(--crimson)" />
        <circle cx={cutX} cy={y} r="3" fill="var(--crimson)" />
        <text x={cutX - dir * 20} y={y - 52} fontSize="9.5" fontWeight="800" fill="var(--crimson)" textAnchor="middle">
          {fmt1(Math.abs(load), 1)}
        </text>
      </g>
    );
  });

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 460, margin: '8px auto 0', display: 'block' }}>
      <text x={w / 2} y="16" fontSize="9.5" fill="var(--gray)" textAnchor="middle">
        각 구간을 통째로 잘라낸 자유물체 — 양쪽 절단면에 같은 크기 N (위에서 꽂히는 화살표=그 지점의 실제 외력)
      </text>
      {boxes}
      <line x1={wallX} y1={y - 20} x2={wallX} y2={y + 20} stroke="#51626F" strokeWidth="2" />
      {Array.from({ length: 5 }).map((_, i) => {
        const yy = y - 18 + i * 9;
        return <line key={i} x1={wallX} y1={yy} x2={wallX - 8} y2={yy + 7} stroke="#8A97A2" strokeWidth="1" />;
      })}
      <text x={wallX - 2} y={y - 28} fontSize="9" fill="var(--gray)" textAnchor="middle">
        고정단 (R={fmt1(kN(res.R_N), 1)})
      </text>
      <text x={lastRight + 30} y={y - 28} fontSize="9" fill="var(--gray)" textAnchor="middle">자유단</text>
      {cuts}
    </svg>
  );
}
