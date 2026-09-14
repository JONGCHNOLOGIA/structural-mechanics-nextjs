'use client';

import { useState, useMemo } from 'react';
import { UNIT_OPTIONS, fmt, fmtInput, fmtSci, blockColor, EFor } from '@/lib/calc/unitOptions';
import { computeTransformed } from '@/lib/calc/transformedSection';
import FormulaSection, { Tip } from './FormulaSection';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import Frac from '@/components/Frac';

// 프로토타입의 renderTransformedSection()을 React로 옮긴 버전 (CompositeBeams.jsx와 같은 방식으로 단순화).

let nextColorId = 2;

function makeInitialBlocks() {
  return [
    { colorId: 0, topWidth: 4 * 0.0254, bottomWidth: 4 * 0.0254, height: 0.5 * 0.0254, E: 30000 * 6894757, EUnit: 'ksi' },
    { colorId: 1, topWidth: 4 * 0.0254, bottomWidth: 4 * 0.0254, height: 6 * 0.0254, E: 1500 * 6894757, EUnit: 'ksi' },
  ];
}

export default function TransformedSection() {
  const [units] = useState({ length: 'in', stress: 'psi', moment: 'kip·in' });
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
    setRefIndex((r) => Math.min(r, Math.max(0, blocks.length - 2)));
  }

  return (
    <>
      {/* ---------------- Setting Menu ---------------- */}
      <div className="panel">
        <h3>SETTING MENU</h3>
        {blocks.length > 1 && (
          <div style={{ fontSize: 11, color: 'var(--gray-soft)', marginBottom: 12 }}>
            ⠿ 아이콘을 끌어서 블록 순서(위/아래)를 바꿀 수 있어요. 상단폭=하단폭이면 그냥 사각형이 돼요.
          </div>
        )}

        {blocks
          .map((b, i) => i)
          .reverse()
          .map((i) => {
            const b = blocks[i];
            const c = blockColor(b);
            const isRef = i === refIndex;
            return (
              <div key={i} className="block-card">
                <span className="drag-handle" title="끌어서 순서 변경">⠿</span>
                <div className="block-title">
                  <span className="color-dot" style={{ background: c.stroke }} />
                  {c.name} Block{i === 0 ? ' · bottom' : i === blocks.length - 1 ? ' · top' : ''}
                  {isRef && <span className="badge live" style={{ marginLeft: 4 }}>기준(n=1)</span>}
                </div>
                {blocks.length > 1 && (
                  <div className="remove-block" onClick={() => removeBlock(i)}>×</div>
                )}
                <div className="field">
                  <label>Top Width (상단폭)</label>
                  <div className="input-unit-group">
                    <input type="number" defaultValue={fmtInput(disp(b.topWidth, lenF))} onBlur={(e) => updateBlockField(i, 'topWidth', e.target.value)} />
                  </div>
                </div>
                <div className="field">
                  <label>Bottom Width (하단폭)</label>
                  <div className="input-unit-group">
                    <input type="number" defaultValue={fmtInput(disp(b.bottomWidth, lenF))} onBlur={(e) => updateBlockField(i, 'bottomWidth', e.target.value)} />
                  </div>
                </div>
                <div className="field">
                  <label>Height</label>
                  <div className="input-unit-group">
                    <input type="number" defaultValue={fmtInput(disp(b.height, lenF))} onBlur={(e) => updateBlockField(i, 'height', e.target.value)} />
                  </div>
                </div>
                <div className="field">
                  <label>E</label>
                  <div className="input-unit-group">
                    <input type="number" defaultValue={fmtInput(disp(b.E, EFor(b)))} onBlur={(e) => updateBlockField(i, 'E', e.target.value)} />
                  </div>
                </div>
                <button className={'add-block' + (isRef ? ' active' : '')} style={{ marginTop: 0 }} onClick={() => setRefIndex(i)}>
                  {isRef ? '✓ 기준 재료' : '기준 재료로 지정'}
                </button>
              </div>
            );
          })}

        <button className="add-block" onClick={addBlock}>+ 블록 추가</button>

        <div className="field">
          <label>Moment M</label>
          <input type="number" defaultValue={fmtInput(disp(moment, momF))} onBlur={(e) => setMoment(parseFloat(e.target.value) * momF)} />
        </div>
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="panel">
        <h3>
          VISUALIZER <span className="badge live" style={{ marginLeft: 6 }}>실시간</span>
        </h3>

        {result ? (
          <>
            <TransformedSVG result={result} refBlock={refBlock} />
            <div className="result-grid">
              <div className="result-card">
                <div className="l">중립축 위치 (하단 기준)</div>
                <div className="v">{fmt(disp(result.ybar, lenF))} {units.length}</div>
              </div>
              <div className="result-card">
                <div className="l">ΣEI</div>
                <div className="v">{fmtSci(result.EIsum)} N·m²</div>
              </div>
            </div>
            <div className="steps">
              <FormulaSection title="Transformed Section (환산)">
                <div className="step-formula">
                  <Tip title="블록 i의 환산 배율">nᵢ</Tip> ={' '}
                  <Frac num={<Tip title="이 블록의 탄성계수">Eᵢ</Tip>} den={<Tip title="기준 재료의 탄성계수">E_ref</Tip>} /> (폭에만 곱함, 높이는 그대로)
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--gray-soft)', marginBottom: 8 }}>
                  기준 재료를 제외한 블록들의 폭(상단·하단 모두)에 n을 곱하면, 전체 단면이 기준 재료 하나로 이루어진 것처럼 취급할 수 있어요.
                </div>
                {result.blocks.map((b, k) => {
                  const c = blockColor(b);
                  const n = b.E / refBlock.E;
                  return (
                    <div className="step-row" key={k}>
                      <span className="color-dot" style={{ background: c.stroke }} />
                      {c.name} Block &nbsp; n = <Frac num="E" den="E_ref" /> = {fmt(n)}
                      {Math.abs(n - 1) < 1e-9 ? ' (기준)' : ''} &nbsp;→ 폭 ×{fmt(n)}
                    </div>
                  );
                })}
              </FormulaSection>
            </div>
            <p style={{ fontSize: 12, color: 'var(--gray-soft)', marginTop: 12 }}>
              환산단면법으로 구해도, General Theory와 최종 응력값은 완전히 동일해요.
            </p>
            <EditableText as="div" className="ai-hint" contentKey="calc.TransformedSection.aiHint" defaultText="💬 왜 폭에만 n을 곱하고 높이는 그대로 두는지 궁금하다면, 오른쪽 AI 튜터에게 물어보세요." />
          </>
        ) : (
          <div className="viz-placeholder" style={{ minHeight: 400 }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="4" y="4" width="16" height="16" rx="2" />
              <path d="M8 9h8M8 13h5" />
            </svg>
            왼쪽에서 블록을 추가하면
            <br />
            원래 단면과 환산 단면이 여기에 나타납니다.
          </div>
        )}
      </div>

      <AiTutorPanel />
    </>
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
    <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%', maxWidth: 720, margin: '0 auto', display: 'block' }}>
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
