'use client';

import { useRef, useState, useMemo } from 'react';
import { UNIT_OPTIONS, cbSliderRangeFor, fmt, fmtInput, fmtSci, blockColor, EFor } from '@/lib/calc/unitOptions';
import { computeTransformed } from '@/lib/calc/transformedSection';
import FormulaSection, { Tip } from './FormulaSection';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import Frac from '@/components/Frac';
import BeamElevationSVG from './BeamElevationSVG';
import BeamElevation3D from './BeamElevation3D';
import { Dim, DimLineH, DimLineV } from './EditableDim';

// 프로토타입의 renderTransformedSection()을 React로 옮긴 버전. 블록 편집 UI(슬라이더+3분할 타일,
// 드래그 순서변경)는 CompositeBeams.jsx와 동일한 패턴으로 맞춤.

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
  const [momentRangeOverrideBase, setMomentRangeOverrideBase] = useState(null);
  const [elevation3D, setElevation3D] = useState(false);
  const dragIndexRef = useRef(null);

  const lenF = UNIT_OPTIONS.length[units.length];
  const momF = UNIT_OPTIONS.moment[units.moment];
  const disp = (base, factor) => base / factor;

  const result = useMemo(() => (blocks.length ? computeTransformed(blocks, moment) : null), [blocks, moment]);
  const refBlock = result ? result.blocks[Math.min(refIndex, result.blocks.length - 1)] : null;
  // BeamElevation3D는 블록마다 {colorId, height, widthBottom, widthTop}를 받으면 실제 사다리꼴
  // 단면(옆면이 기울어진 각기둥)으로 그려줌 — 2D 단면도(원래 단면)와 같은 모양.
  const elevationBlocks = result
    ? result.blocks.map((b) => ({ colorId: b.colorId, height: b.height, widthBottom: b.bottomWidth, widthTop: b.topWidth }))
    : null;

  function changeLengthUnit(v) {
    setUnits((p) => ({ ...p, length: v }));
  }
  function changeStressUnit(v) {
    setUnits((p) => ({ ...p, stress: v }));
  }
  function changeMomentUnit(v) {
    setUnits((p) => ({ ...p, moment: v }));
  }

  function momentEffectiveRange() {
    const momR = cbSliderRangeFor('moment', units.moment);
    if (!momentRangeOverrideBase) return momR;
    return [momentRangeOverrideBase.min / momF, momentRangeOverrideBase.max / momF, momR[2]];
  }

  function updateMoment(value) {
    const val = parseFloat(value);
    if (isNaN(val)) return;
    const newMoment = val * momF;
    const momR = cbSliderRangeFor('moment', units.moment);
    const baseMin = momR[0] * momF;
    const baseMax = momR[1] * momF;
    const curMin = momentRangeOverrideBase ? momentRangeOverrideBase.min : baseMin;
    const curMax = momentRangeOverrideBase ? momentRangeOverrideBase.max : baseMax;
    if (newMoment > curMax || newMoment < curMin) {
      setMomentRangeOverrideBase({
        min: Math.min(curMin, newMoment, baseMin),
        max: Math.max(curMax, newMoment, baseMax),
      });
    }
    setMoment(newMoment);
  }

  const momRange = momentEffectiveRange();
  const momentLabelForElevation = `${fmt(disp(moment, momF))} ${units.moment}`;
  const momRForBend = cbSliderRangeFor('moment', units.moment);
  const momentMaxForBend = Math.max(Math.abs(momRForBend[0]), Math.abs(momRForBend[1])) * momF;
  const maxBendPx = 24;
  const bendPx = momentMaxForBend > 0 ? Math.max(-maxBendPx, Math.min(maxBendPx, (moment / momentMaxForBend) * maxBendPx)) : 0;

  function updateBlockField(index, field, value) {
    const factor = field === 'E' ? UNIT_OPTIONS.E[blocks[index].EUnit] : lenF;
    const val = parseFloat(value);
    if (isNaN(val) || val <= 0) return;
    const newVal = val * factor;
    const cid = blocks[index].colorId;
    setBlocks((prev) => prev.map((b) => (b.colorId === cid ? { ...b, [field]: newVal } : b)));
  }

  // VISUALIZER 치수 라벨에서 고칠 때 — SVG 쪽은 result.blocks만 갖고 있어서 index가 아니라
  // colorId로 찾는다 (CompositeBeams와 같은 방식).
  // field가 'width'면 사다리꼴이 아니라 직사각형이라는 뜻이라 위/아래 폭을 함께 바꾼다.
  function updateBlockDimByColorId(colorId, field, value) {
    const val = parseFloat(value);
    if (isNaN(val) || val <= 0) return;
    const base = val * lenF;
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.colorId !== colorId) return b;
        if (field === 'width') return { ...b, topWidth: base, bottomWidth: base };
        return { ...b, [field]: base };
      })
    );
  }

  function changeBlockEUnit(index, v) {
    const cid = blocks[index].colorId;
    setBlocks((prev) => prev.map((b) => (b.colorId === cid ? { ...b, EUnit: v } : b)));
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

  function handleDragStart(index) {
    dragIndexRef.current = index;
  }
  function handleDrop(targetIndex) {
    const src = dragIndexRef.current;
    if (src === null || src === targetIndex) return;
    setBlocks((prev) => {
      const next = [...prev];
      const [moved] = next.splice(src, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
    setRefIndex((r) => {
      if (r === src) return targetIndex;
      if (src < r && targetIndex >= r) return r - 1;
      if (src > r && targetIndex <= r) return r + 1;
      return r;
    });
    dragIndexRef.current = null;
  }

  return (
    <>
      {/* ---------------- Setting Menu ---------------- */}
      <div className="panel">
        <h3>SETTING MENU</h3>
        {blocks.length > 1 && (
          <EditableText
            as="div"
            contentKey="transformedSection.dragHint"
            defaultText="⠿ 아이콘을 끌어서 블록 순서(위/아래)를 바꿀 수 있어요. 상단폭=하단폭이면 그냥 사각형이 돼요."
            style={{ fontSize: 11, color: 'var(--gray-soft)', marginBottom: 12 }}
          />
        )}

        {blocks
          .map((b, i) => i)
          .reverse()
          .map((i) => (
            <TransformedBlockCard
              key={i}
              block={blocks[i]}
              units={units}
              isBottom={i === 0}
              isTop={i === blocks.length - 1}
              isRef={i === refIndex}
              canRemove={blocks.length > 1}
              onFieldChange={(field, value) => updateBlockField(i, field, value)}
              onEUnitChange={(v) => changeBlockEUnit(i, v)}
              onLengthUnitChange={changeLengthUnit}
              onRemove={() => removeBlock(i)}
              onSetRef={() => setRefIndex(i)}
              onDragStart={() => handleDragStart(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(i)}
            />
          ))}

        <button className="add-block" onClick={addBlock}>
          + 블록 추가
        </button>
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="panel">
        <h3>
          VISUALIZER
        </h3>

        {result ? (
          <>
            <TransformedSVG result={result} refBlock={refBlock} units={units} onEditDim={updateBlockDimByColorId} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, margin: '14px 0' }}>
              <span style={{ fontSize: 13, color: 'var(--gray-soft)', fontWeight: 700 }}>
                ↓ 이 단면이 보의 어느 위치, 어떤 하중 상태에 있는지 (X-Y 측면도)
              </span>
              <button
                className="add-block calc-trigger"
                style={{ margin: 0, padding: '4px 12px', fontSize: 12.5 }}
                onClick={() => setElevation3D((v) => !v)}
              >
                {elevation3D ? '2D로 보기' : '3D로 보기'}
              </button>
            </div>
            {elevation3D ? (
              <BeamElevation3D momentLabel={momentLabelForElevation} bend={bendPx} blocks={elevationBlocks} />
            ) : (
              <BeamElevationSVG momentLabel={momentLabelForElevation} bend={bendPx} />
            )}

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap', margin: '20px 0 16px' }}>
              <div style={{ fontSize: 11.5, color: 'var(--gray-soft)' }}>
                응력 단위{' '}
                <select className="unit-inline" value={units.stress} onChange={(e) => changeStressUnit(e.target.value)}>
                  {Object.keys(UNIT_OPTIONS.stress).map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ width: 260, flex: '0 0 auto' }}>
                <label style={{ fontSize: 11.5, color: 'var(--gray-soft)', fontWeight: 700, display: 'block', marginBottom: 4 }}>Moment M</label>
                <div className="field-with-slider">
                  <div className="input-unit-group">
                    <input
                      key={`moment-${moment}-${units.moment}`}
                      type="number"
                      step="any"
                      defaultValue={fmtInput(disp(moment, momF))}
                      onBlur={(e) => updateMoment(e.target.value)}
                    />
                    <select className="unit-inline" value={units.moment} onChange={(e) => changeMomentUnit(e.target.value)}>
                      {Object.keys(UNIT_OPTIONS.moment).map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                  <input
                    className="mini-slider"
                    type="range"
                    min={momRange[0]}
                    max={momRange[1]}
                    step={momRange[2]}
                    value={disp(moment, momF)}
                    onChange={(e) => updateMoment(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="result-grid">
              <div className="result-card">
                <div className="l">중립축 위치 (하단 기준)</div>
                <div className="v">
                  {fmt(disp(result.ybar, lenF))} {units.length}
                </div>
              </div>
              <div className="result-card">
                <div className="l">ΣEI</div>
                <div className="v">
                  {fmtSci(disp(result.EIsum, EFor(result.blocks[0]) * Math.pow(lenF, 4)))} {result.blocks[0].EUnit}·{units.length}⁴
                </div>
              </div>
            </div>
            <div className="steps">
              <FormulaSection title="Transformed Section (환산)">
                <div className="step-formula">
                  <Tip title="블록 i의 환산 배율">nᵢ</Tip> ={' '}
                  <Frac num={<Tip title="이 블록의 탄성계수">Eᵢ</Tip>} den={<Tip title="기준 재료의 탄성계수">E_ref</Tip>} /> (폭에만 곱함, 높이는 그대로)
                </div>
                <EditableText
                  as="div"
                  contentKey="transformedSection.widthScaleHint"
                  defaultText="기준 재료를 제외한 블록들의 폭(상단·하단 모두)에 n을 곱하면, 전체 단면이 기준 재료 하나로 이루어진 것처럼 취급할 수 있어요."
                  style={{ fontSize: 11.5, color: 'var(--gray-soft)', marginBottom: 8 }}
                />
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
            <EditableText
              as="p"
              contentKey="transformedSection.equivalenceNote"
              defaultText="환산단면법으로 구해도, General Theory와 최종 응력값은 완전히 동일해요."
              style={{ fontSize: 12, color: 'var(--gray-soft)', marginTop: 12 }}
            />

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

// Width/Height/E 필드를 각자 label+input로 통째로 늘어놓던 걸 CompositeBeams.jsx와 동일한
// "활성 필드 슬라이더 1줄 + 타일 그리드" 패턴으로 압축한 버전. 이 계산기는 상단폭/하단폭이
// 따로 있어서 타일이 4개(Top/Bottom/Height/E).
function TransformedBlockCard({ block, units, isBottom, isTop, isRef, canRemove, onFieldChange, onEUnitChange, onLengthUnitChange, onRemove, onSetRef, onDragStart, onDragOver, onDrop }) {
  const c = blockColor(block);
  const lenF = UNIT_OPTIONS.length[units.length];
  const disp = (base, factor) => base / factor;
  const lenR = cbSliderRangeFor('length', units.length);
  const ER = cbSliderRangeFor('E', block.EUnit);
  const [activeField, setActiveField] = useState('topWidth');

  const FIELD_META = {
    topWidth: { label: 'Top W', value: disp(block.topWidth, lenF), range: lenR, unit: units.length, unitType: 'length' },
    bottomWidth: { label: 'Bottom W', value: disp(block.bottomWidth, lenF), range: lenR, unit: units.length, unitType: 'length' },
    height: { label: 'Height', value: disp(block.height, lenF), range: lenR, unit: units.length, unitType: 'length' },
    E: { label: 'E', value: disp(block.E, EFor(block)), range: ER, unit: block.EUnit, unitType: 'E' },
  };
  const active = FIELD_META[activeField];

  return (
    <div className="block-card" onDragOver={onDragOver} onDrop={onDrop}>
      <span className="drag-handle" draggable title="끌어서 순서 변경" onDragStart={onDragStart}>
        ⠿
      </span>
      <div className="block-title">
        <span className="color-dot" style={{ background: c.stroke }} />
        {c.name} Block{isBottom ? ' · bottom' : isTop ? ' · top' : ''}
        {isRef && (
          <span className="badge live" style={{ marginLeft: 4 }}>
            기준(n=1)
          </span>
        )}
      </div>
      {canRemove && (
        <div className="remove-block" onClick={onRemove}>
          ×
        </div>
      )}

      <div className="block-active-field" style={{ background: c.fill, borderColor: c.stroke }}>
        <div className="block-active-field-label" style={{ color: c.stroke }}>
          {c.name} Block · {active.label}
        </div>
        <div className="block-active-field-row">
          <input
            type="range"
            min={active.range[0]}
            max={active.range[1]}
            step={active.range[2]}
            value={active.value}
            onChange={(e) => onFieldChange(activeField, e.target.value)}
            style={{ flex: 1, accentColor: c.stroke }}
          />
          {active.unitType === 'E' ? (
            <select className="unit-inline" value={active.unit} onChange={(e) => onEUnitChange(e.target.value)}>
              {Object.keys(UNIT_OPTIONS.E).map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          ) : (
            <select className="unit-inline" value={active.unit} onChange={(e) => onLengthUnitChange(e.target.value)}>
              {Object.keys(UNIT_OPTIONS.length).map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="block-field-tiles" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {['topWidth', 'bottomWidth', 'height', 'E'].map((key) => {
          const meta = FIELD_META[key];
          const isActive = key === activeField;
          return (
            <div
              key={key}
              className={'block-field-tile' + (isActive ? ' active' : '')}
              style={isActive ? { background: c.fill, borderColor: c.stroke } : undefined}
              onClick={() => setActiveField(key)}
            >
              <div className="block-field-tile-label">{meta.label}</div>
              <input
                key={`${key}-${meta.value}-${meta.unit}`}
                type="number"
                step="any"
                defaultValue={fmtInput(meta.value)}
                onFocus={() => setActiveField(key)}
                onClick={(e) => e.stopPropagation()}
                onBlur={(e) => onFieldChange(key, e.target.value)}
              />
            </div>
          );
        })}
      </div>

      <button className={'add-block' + (isRef ? ' active' : '')} style={{ marginTop: 0 }} onClick={onSetRef}>
        {isRef ? '✓ 기준 재료' : '기준 재료로 지정'}
      </button>
    </div>
  );
}

// 원래 단면 | 환산 단면 | 응력 다이어그램, 세 구역을 한 SVG에 그림 (프로토타입 tsBuildVizSVG와 동일 로직)
function TransformedSVG({ result, refBlock, units, onEditDim }) {
  const lenF = UNIT_OPTIONS.length[units.length];
  const dispLen = (v) => v / lenF;

  // 원래 단면 좌우로 치수(왼쪽 높이, 오른쪽 폭)를 적을 자리를 만들려고 그림판을 넓히고
  // 두 단면 사이 간격(zoneGap)도 벌렸다 — 원래는 720×380에 zoneGap 60이었다.
  const svgW = 800,
    svgH = 392;
  const padTop = 44,
    padBottom = 56;
  const drawH = svgH - padTop - padBottom;
  const scale = drawH / result.totalHeight;

  const zoneW = 150,
    zoneGap = 130;
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
    const x1 = cx - (topW * sc) / 2,
      x2 = cx + (topW * sc) / 2;
    const x3 = cx + (botW * sc) / 2,
      x4 = cx - (botW * sc) / 2;
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
    <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%', maxWidth: 800, margin: '0 auto', display: 'block', overflow: 'visible' }}>
      <text x={zoneA_cx} y={padTop - 16} fontSize="14" fill="#8A97A2" textAnchor="middle" fontWeight="800">
        원래 단면
      </text>
      {result.blocks.map((b, i) => {
        const c = blockColor(b);
        return (
          <polygon
            key={i}
            points={trapezoidPts(zoneA_cx, scaleA, b.topWidth, b.bottomWidth, yToPx(b.yTop), yToPx(b.yBottom))}
            fill={c.fill}
            stroke={c.stroke}
            strokeWidth="1.4"
          />
        );
      })}

      {/* 치수 — 왼쪽에 블록별 높이, 오른쪽에 폭. 클릭하면 그 자리에서 값을 고칠 수 있다.
          위/아래 폭이 같은(= 사다리꼴이 아닌) 블록은 폭 하나로만 적고, 고치면 둘 다 같이 바뀐다.
          다른 경우에만 위/아래를 따로 적되, 위아래 블록의 라벨끼리 겹치지 않게 경계에서 안쪽으로 밀어 넣는다. */}
      {result.blocks.map((b, i) => {
        const c = blockColor(b);
        const yT = yToPx(b.yTop);
        const yB = yToPx(b.yBottom);
        const wx = zoneA_cx + zoneW / 2 + 10;
        const isRect = Math.abs(b.topWidth - b.bottomWidth) < 1e-9;
        return (
          <g key={`dim-${i}`}>
            <DimLineV
              x={zoneA_cx - zoneW / 2 - 16}
              y1={yT}
              y2={yB}
              color={c.stroke}
              fontSize={12}
              value={dispLen(b.height)}
              unit={units.length}
              boxW={62}
              onChange={(v) => onEditDim(b.colorId, 'height', v)}
            />
            {isRect ? (
              <Dim
                x={wx}
                y={(yT + yB) / 2 + 4}
                anchor="start"
                color={c.stroke}
                fontSize={12}
                value={dispLen(b.topWidth)}
                unit={units.length}
                suffix=" wide"
                boxW={62}
                onChange={(v) => onEditDim(b.colorId, 'width', v)}
              />
            ) : (
              <>
                <Dim
                  x={wx}
                  y={yT + 13}
                  anchor="start"
                  color={c.stroke}
                  fontSize={11.5}
                  value={dispLen(b.topWidth)}
                  unit={units.length}
                  suffix=" (top)"
                  boxW={58}
                  onChange={(v) => onEditDim(b.colorId, 'topWidth', v)}
                />
                <Dim
                  x={wx}
                  y={yB - 5}
                  anchor="start"
                  color={c.stroke}
                  fontSize={11.5}
                  value={dispLen(b.bottomWidth)}
                  unit={units.length}
                  suffix=" (bot)"
                  boxW={58}
                  onChange={(v) => onEditDim(b.colorId, 'bottomWidth', v)}
                />
              </>
            )}
          </g>
        );
      })}
      {/* 단면 맨 아래 폭 — 두 번째 스크린샷처럼 도형 밑에 치수선으로 한 번 더 적어준다. */}
      <DimLineH
        x1={zoneA_cx - (result.blocks[0].bottomWidth * scaleA) / 2}
        x2={zoneA_cx + (result.blocks[0].bottomWidth * scaleA) / 2}
        y={yToPx(0) + 14}
        labelDy={15}
        fontSize={12}
        value={dispLen(result.blocks[0].bottomWidth)}
        unit={units.length}
        boxW={62}
        onChange={(v) => onEditDim(result.blocks[0].colorId, 'bottomWidth', v)}
      />

      <line x1={zoneA_cx - zoneW / 2 - 8} y1={naY} x2={zoneA_cx + zoneW / 2 + 8} y2={naY} stroke="#51626F" strokeWidth="1.1" strokeDasharray="5 4" />

      <line
        x1={zoneA_cx + zoneW / 2 + 12}
        y1={padTop + drawH / 2}
        x2={zoneB_cx - zoneW / 2 - 20}
        y2={padTop + drawH / 2}
        stroke="#C3002F"
        strokeWidth="1.6"
      />
      <polygon
        points={`${zoneB_cx - zoneW / 2 - 12},${padTop + drawH / 2} ${zoneB_cx - zoneW / 2 - 20},${padTop + drawH / 2 - 5} ${zoneB_cx - zoneW / 2 - 20},${padTop + drawH / 2 + 5}`}
        fill="#C3002F"
      />
      <text x={(zoneA_cx + zoneB_cx) / 2} y={padTop + drawH / 2 - 12} fontSize="13" fill="#C3002F" textAnchor="middle" fontWeight="800">
        n = Eᵢ/E_ref
      </text>

      <text x={zoneB_cx} y={padTop - 16} fontSize="14" fill="#8A97A2" textAnchor="middle" fontWeight="800">
        환산 단면 ({blockColor(refBlock).name} 재료로 통일)
      </text>
      {result.blocks.map((b, i) => {
        const c = blockColor(b);
        const n = b.E / refBlock.E;
        return (
          <polygon
            key={i}
            points={trapezoidPts(zoneB_cx, scaleB, b.topWidth * n, b.bottomWidth * n, yToPx(b.yTop), yToPx(b.yBottom))}
            fill={c.fill}
            stroke={c.stroke}
            strokeWidth="1.4"
            strokeDasharray={Math.abs(n - 1) > 1e-6 ? '3 2' : undefined}
          />
        );
      })}
      <line x1={zoneB_cx - zoneW / 2 - 8} y1={naY} x2={zoneB_cx + zoneW / 2 + 8} y2={naY} stroke="#51626F" strokeWidth="1.1" strokeDasharray="5 4" />

      <line x1={diagCenterX} y1={padTop} x2={diagCenterX} y2={padTop + drawH} stroke="#8A97A2" strokeWidth="1.2" />
      {Array.from({ length: stressPts.length / 2 }).map((_, k) => {
        const p1 = stressPts[k * 2],
          p2 = stressPts[k * 2 + 1];
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
      <text x={diagCenterX} y={padTop + drawH + 22} fontSize="13.5" fill="#8A97A2" textAnchor="middle" fontWeight="700">
        STRESS DIAGRAM
      </text>
    </svg>
  );
}
