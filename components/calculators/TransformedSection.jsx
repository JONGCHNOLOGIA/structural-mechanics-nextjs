'use client';

import { useState, useMemo } from 'react';
import { UNIT_OPTIONS, fmt, fmtSci, blockColor, EFor } from '@/lib/calc/unitOptions';
import { computeTransformed } from '@/lib/calc/transformedSection';

/*
  프로토타입의 renderTransformedSection()을 React로 옮긴 버전 (CompositeBeams.jsx와 같은 방식으로 단순화).

  ▸ 아직 옮기지 않은 것 (프로토타입에는 있음)
    - 블록 드래그로 순서 바꾸기
    - 슬라이더 입력
    - 계산식 각 기호 툴팁
*/

let nextColorId = 2;

function makeInitialBlocks() {
  return [
    { colorId: 0, topWidth: 4 * 0.0254, bottomWidth: 4 * 0.0254, height: 0.5 * 0.0254, E: 30000 * 6894757, EUnit: 'ksi' },
    { colorId: 1, topWidth: 4 * 0.0254, bottomWidth: 4 * 0.0254, height: 6 * 0.0254, E: 1500 * 6894757, EUnit: 'ksi' },
  ];
}

export default function TransformedSection() {
  const [units, setUnits] = useState({ length: 'in', stress: 'psi', moment: 'kip·in' });
  const [blocks, setBlocks] = useState(makeInitialBlocks);
  const [refIndex, setRefIndex] = useState(0);
  const [moment, setMoment] = useState(60 * 112.9848);

  const lenF = UNIT_OPTIONS.length[units.length];
  const momF = UNIT_OPTIONS.moment[units.moment];
  const disp = (base, factor) => base / factor;

  const result = useMemo(() => (blocks.length ? computeTransformed(blocks, moment) : null), [blocks, moment]);
  const refBlock = result ? result.blocks[Math.min(refIndex, result.blocks.length - 1)] : null;

  function updateBlockField(index, field, value) {
    const factor = field === 'E' ? UNIT_OPTIONS.E[blocks[index].EUnit] : lenF;
    const val = parseFloat(value);
    if (isNaN(val) || val <= 0) return;
    const newVal = val * factor;
    const cid = blocks[index].colorId;
    setBlocks((prev) => prev.map((b) => (b.colorId === cid ? { ...b, [field]: newVal } : b)));
  }

  function addBlock() {
    setBlocks((prev) => {
      const last = prev[prev.length - 1];
      const next = last
        ? { colorId: nextColorId++, topWidth: last.topWidth, bottomWidth: last.bottomWidth, height: last.height, E: last.E, EUnit: last.EUnit }
        : { colorId: nextColorId++, topWidth: 1 * lenF, bottomWidth: 1 * lenF, height: 1 * lenF, E: 1 * UNIT_OPTIONS.E.ksi, EUnit: 'ksi' };
      return [...prev, next];
    });
  }

  function removeBlock(index) {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
    setRefIndex((r) => Math.min(r, blocks.length - 2 < 0 ? 0 : blocks.length - 2));
  }

  return (
    <div className="grid grid-cols-[300px_1fr_300px] gap-6 max-w-[1700px] mx-auto p-6">
      {/* ---------------- Setting Menu ---------------- */}
      <div className="bg-white border border-line rounded-2xl p-5">
        <h3 className="text-crimson text-xs font-extrabold mb-4">SETTING MENU</h3>

        {blocks
          .map((b, i) => i)
          .reverse()
          .map((i) => {
            const b = blocks[i];
            const c = blockColor(b);
            const isRef = i === refIndex;
            return (
              <div key={i} className="border border-line rounded-xl p-3 mb-3 bg-bg relative">
                <div className="text-xs font-extrabold text-ink mb-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-sm mr-1.5 align-middle" style={{ background: c.stroke }} />
                  {c.name} Block{i === 0 ? ' · bottom' : i === blocks.length - 1 ? ' · top' : ''}
                  {isRef && <span className="ml-1.5 text-[10px] bg-tealSoft text-teal rounded-full px-2 py-0.5">기준(n=1)</span>}
                </div>
                {blocks.length > 1 && (
                  <button className="absolute top-2 right-2 w-5 h-5 rounded-full border border-line text-graySoft text-xs" onClick={() => removeBlock(i)}>
                    ×
                  </button>
                )}
                <Field label="Top Width (상단폭)">
                  <input type="number" className="field-input" defaultValue={fmt(disp(b.topWidth, lenF))} onBlur={(e) => updateBlockField(i, 'topWidth', e.target.value)} />
                </Field>
                <Field label="Bottom Width (하단폭)">
                  <input type="number" className="field-input" defaultValue={fmt(disp(b.bottomWidth, lenF))} onBlur={(e) => updateBlockField(i, 'bottomWidth', e.target.value)} />
                </Field>
                <Field label="Height">
                  <input type="number" className="field-input" defaultValue={fmt(disp(b.height, lenF))} onBlur={(e) => updateBlockField(i, 'height', e.target.value)} />
                </Field>
                <Field label="E">
                  <input type="number" className="field-input" defaultValue={fmt(disp(b.E, EFor(b)))} onBlur={(e) => updateBlockField(i, 'E', e.target.value)} />
                </Field>
                <button
                  className={'w-full py-1.5 rounded-lg text-xs font-bold ' + (isRef ? 'bg-tealSoft text-teal' : 'border border-line text-gray')}
                  onClick={() => setRefIndex(i)}
                >
                  {isRef ? '✓ 기준 재료' : '기준 재료로 지정'}
                </button>
              </div>
            );
          })}

        <button className="w-full py-2 mb-4 border border-dashed border-crimson text-crimson rounded-xl text-sm font-bold" onClick={addBlock}>
          + 블록 추가
        </button>

        <Field label="Moment M">
          <input type="number" className="field-input" defaultValue={fmt(disp(moment, momF))} onBlur={(e) => setMoment(parseFloat(e.target.value) * momF)} />
        </Field>
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="bg-white border border-line rounded-2xl p-6">
        <h3 className="text-crimson text-xs font-extrabold mb-4">
          VISUALIZER <span className="ml-2 text-[10px] bg-tealSoft text-teal rounded-full px-2 py-0.5">실시간</span>
        </h3>

        {result ? (
          <>
            <TransformedSVG result={result} refBlock={refBlock} />
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <ResultCard label="중립축 위치 (하단 기준)" value={`${fmt(disp(result.ybar, lenF))} ${units.length}`} />
              <ResultCard label="ΣEI" value={`${fmtSci(result.EIsum)} N·m²`} />
            </div>
            <p className="text-xs text-graySoft mt-3">
              환산 단면법: n = Eᵢ / E_ref 를 각 블록의 폭(상단·하단)에 곱해서, 전체를 기준 재료 하나로 이루어진 단면처럼 바꿔서 풉니다. 높이는 그대로 둡니다.
            </p>
          </>
        ) : (
          <div className="text-graySoft text-sm border-2 border-dashed border-line rounded-xl p-16 text-center">
            왼쪽에서 블록을 추가하면 원래 단면과 환산 단면이 여기에 나타납니다.
          </div>
        )}
      </div>

      {/* ---------------- AI Tutor ---------------- */}
      <div className="bg-white border border-line rounded-2xl p-5 sticky top-6 self-start">
        <h3 className="text-crimson text-xs font-extrabold mb-4">
          AI TUTOR <span className="ml-2 text-[10px] bg-crimsonSoft text-crimson rounded-full px-2 py-0.5">준비중</span>
        </h3>
        <div className="text-sm text-gray bg-crimsonSoft rounded-xl p-3 mb-3">
          왜 폭에만 n을 곱하고 높이는 그대로 두는지 궁금하다면, 다음 단계에서 연결될 AI 튜터에게 물어보세요.
        </div>
        <input className="field-input mb-2" placeholder="질문을 입력하세요" disabled />
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="mb-3">
      <label className="block text-xs text-gray font-bold mb-1">{label}</label>
      {children}
    </div>
  );
}

function ResultCard({ label, value }) {
  return (
    <div className="bg-bg border border-line rounded-xl p-3">
      <div className="text-[11px] text-graySoft font-bold">{label}</div>
      <div className="text-sm font-extrabold mt-0.5">{value}</div>
    </div>
  );
}

// 원래 단면 | 환산 단면 | 응력 다이어그램, 세 구역을 한 SVG에 그림 (프로토타입 tsBuildVizSVG와 동일 로직)
function TransformedSVG({ result, refBlock }) {
  const svgW = 720, svgH = 340;
  const padTop = 40, padBottom = 40;
  const drawH = svgH - padTop - padBottom;
  const scale = drawH / result.totalHeight;

  const zoneW = 150, zoneGap = 60;
  const zoneA_cx = 90 + zoneW / 2;
  const zoneB_cx = 90 + zoneW + zoneGap + zoneW / 2;
  const diagCenterX = 90 + 2 * zoneW + zoneGap + 110;
  const diagHalfW = 90;

  const yToPx = (y) => padTop + (result.totalHeight - y) * scale;

  const maxWidthOrig = Math.max(...result.blocks.map((b) => Math.max(b.topWidth, b.bottomWidth)));
  const maxWidthTrans = Math.max(
    ...result.blocks.map((b) => {
      const n = b.E / refBlock.E;
      return Math.max(b.topWidth * n, b.bottomWidth * n);
    })
  );
  const scaleA = Math.min(zoneW / maxWidthOrig, 1e9);
  const scaleB = Math.min(zoneW / maxWidthTrans, 1e9);

  function trapezoidPts(cx, sc, topW, botW, yTopPx, yBottomPx) {
    const x1 = cx - (topW * sc) / 2, x2 = cx + (topW * sc) / 2;
    const x3 = cx + (botW * sc) / 2, x4 = cx - (botW * sc) / 2;
    return `${x1},${yTopPx} ${x2},${yTopPx} ${x3},${yBottomPx} ${x4},${yBottomPx}`;
  }

  const naY = yToPx(result.ybar);

  const stressPts = [];
  result.blocks.forEach((b, i) => {
    stressPts.push({ y: b.yBottom, s: result.stressAt(b.yBottom, b.E), blockIdx: i });
    stressPts.push({ y: b.yTop, s: result.stressAt(b.yTop, b.E), blockIdx: i });
  });
  const maxAbsStress = Math.max(1e-9, ...stressPts.map((p) => Math.abs(p.s)));
  const sToPx = (s) => diagCenterX + (s / maxAbsStress) * diagHalfW;

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-[720px] mx-auto block">
      <text x={zoneA_cx} y={padTop - 14} fontSize="11" fill="#8A97A2" textAnchor="middle" fontWeight="800">원래 단면</text>
      {result.blocks.map((b, i) => {
        const c = blockColor(b);
        return <polygon key={i} points={trapezoidPts(zoneA_cx, scaleA, b.topWidth, b.bottomWidth, yToPx(b.yTop), yToPx(b.yBottom))} fill={c.fill} stroke={c.stroke} strokeWidth="1.4" />;
      })}
      <line x1={zoneA_cx - zoneW / 2 - 8} y1={naY} x2={zoneA_cx + zoneW / 2 + 8} y2={naY} stroke="#51626F" strokeWidth="1.1" strokeDasharray="5 4" />

      <line x1={zoneA_cx + zoneW / 2 + 12} y1={padTop + drawH / 2} x2={zoneB_cx - zoneW / 2 - 20} y2={padTop + drawH / 2} stroke="#C3002F" strokeWidth="1.6" />
      <polygon points={`${zoneB_cx - zoneW / 2 - 12},${padTop + drawH / 2} ${zoneB_cx - zoneW / 2 - 20},${padTop + drawH / 2 - 5} ${zoneB_cx - zoneW / 2 - 20},${padTop + drawH / 2 + 5}`} fill="#C3002F" />
      <text x={(zoneA_cx + zoneB_cx) / 2} y={padTop + drawH / 2 - 10} fontSize="10" fill="#C3002F" textAnchor="middle" fontWeight="800">n = Eᵢ/E_ref</text>

      <text x={zoneB_cx} y={padTop - 14} fontSize="11" fill="#8A97A2" textAnchor="middle" fontWeight="800">환산 단면 ({blockColor(refBlock).name} 재료로 통일)</text>
      {result.blocks.map((b, i) => {
        const c = blockColor(b);
        const n = b.E / refBlock.E;
        return <polygon key={i} points={trapezoidPts(zoneB_cx, scaleB, b.topWidth * n, b.bottomWidth * n, yToPx(b.yTop), yToPx(b.yBottom))} fill={c.fill} stroke={c.stroke} strokeWidth="1.4" strokeDasharray={Math.abs(n - 1) > 1e-6 ? '3 2' : undefined} />;
      })}
      <line x1={zoneB_cx - zoneW / 2 - 8} y1={naY} x2={zoneB_cx + zoneW / 2 + 8} y2={naY} stroke="#51626F" strokeWidth="1.1" strokeDasharray="5 4" />

      <line x1={diagCenterX} y1={padTop} x2={diagCenterX} y2={padTop + drawH} stroke="#8A97A2" strokeWidth="1.2" />
      {Array.from({ length: stressPts.length / 2 }).map((_, k) => {
        const p1 = stressPts[k * 2], p2 = stressPts[k * 2 + 1];
        const c = blockColor(result.blocks[p1.blockIdx]);
        return (
          <polygon
            key={k}
            points={`${diagCenterX},${yToPx(p1.y)} ${sToPx(p1.s)},${yToPx(p1.y)} ${sToPx(p2.s)},${yToPx(p2.y)} ${diagCenterX},${yToPx(p2.y)}`}
            fill={c.fill}
            stroke={c.stroke}
            strokeWidth="1.6"
            opacity="0.9"
          />
        );
      })}
      <text x={diagCenterX} y={padTop + drawH + 20} fontSize="10.5" fill="#8A97A2" textAnchor="middle" fontWeight="700">STRESS DIAGRAM</text>
    </svg>
  );
}
