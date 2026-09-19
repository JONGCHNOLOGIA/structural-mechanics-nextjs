'use client';

import { useRef, useState } from 'react';
import { UNIT_OPTIONS, cbSliderRangeFor, fmt, fmtInput, fmtSci, blockColor, EFor } from '@/lib/calc/unitOptions';
import { computeComposite, isDoublySymmetric } from '@/lib/calc/compositeBeams';
import { Tip } from './FormulaSection';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import Frac from '@/components/Frac';
import BeamElevation3D from './BeamElevation3D';
import BeamElevationSVG from './BeamElevationSVG';

/*
  프로토타입의 renderCompositeBeams()/cbBuildVizSVGs()/cbCalcSection() 등을 React로 그대로 옮긴 버전.
  블록 드래그 순서 변경, Doubly symmetric 토글, y 기준점 토글, 슬라이더-입력창 동기화, 섹션별
  계산하기/다시계산하기(stale 표시), Moments of Inertia · Approximate Theory 섹션, 보 측면도까지
  프로토타입과 동일하게 동작하도록 구현.
*/

function UnitSelect({ type, value, onChange }) {
  const options = Object.keys(UNIT_OPTIONS[type]);
  return (
    <select className="unit-inline" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

const SECTION_NAMES = ['na', 'io', 'stress', 'approx'];

export default function CompositeBeams() {
  const [units, setUnits] = useState({ length: 'in', stress: 'psi', moment: 'kip·in' });
  const [defaultEUnit] = useState('ksi');
  const [blocks, setBlocks] = useState([]); // 프로토타입과 동일하게 기본값 없음
  const [moment, setMoment] = useState(null);
  const [yReference, setYReference] = useState('bottom');
  const [sandwichLinked, setSandwichLinked] = useState(false);
  const [momentRangeOverrideBase, setMomentRangeOverrideBase] = useState(null);
  const [calcState, setCalcState] = useState({ na: 'idle', io: 'idle', stress: 'idle', approx: 'idle' });
  const [calcSnapshot, setCalcSnapshot] = useState({ na: null, io: null, stress: null, approx: null });

  const nextColorIdRef = useRef(0);
  const dragIndexRef = useRef(null);

  const lenF = UNIT_OPTIONS.length[units.length];
  const momF = UNIT_OPTIONS.moment[units.moment];
  const disp = (base, factor) => base / factor;

  const result = blocks.length ? computeComposite(blocks, moment || 0) : null;

  function markStale() {
    setCalcState((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) if (next[k] === 'done') next[k] = 'stale';
      return next;
    });
  }

  function updateBlockField(index, field, value) {
    const factor = field === 'E' ? UNIT_OPTIONS.E[blocks[index].EUnit] : lenF;
    const val = parseFloat(value);
    if (isNaN(val) || val <= 0) return;
    const newVal = val * factor;
    const cid = blocks[index].colorId;
    setBlocks((prev) => prev.map((b) => (b.colorId === cid ? { ...b, [field]: newVal } : b)));
    markStale();
  }

  function changeBlockEUnit(index, v) {
    const cid = blocks[index].colorId;
    setBlocks((prev) => prev.map((b) => (b.colorId === cid ? { ...b, EUnit: v } : b)));
    markStale();
  }

  // VISUALIZER 치수 라벨을 직접 클릭해서 고칠 때 씀 — SETTING MENU 쪽 index가 아니라
  // colorId로 블록을 찾는다 (VisualizerSVGs는 result.blocks만 갖고 있어서).
  function updateBlockDimByColorId(colorId, field, value) {
    const val = parseFloat(value);
    if (isNaN(val) || val <= 0) return;
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.colorId !== colorId) return b;
        const factor = field === 'E' ? UNIT_OPTIONS.E[b.EUnit] : lenF;
        return { ...b, [field]: val * factor };
      })
    );
    markStale();
  }

  function changeLengthUnit(v) {
    setUnits((p) => ({ ...p, length: v }));
    markStale();
  }
  function changeStressUnit(v) {
    setUnits((p) => ({ ...p, stress: v }));
    markStale();
  }
  function changeMomentUnit(v) {
    setUnits((p) => ({ ...p, moment: v }));
    markStale();
  }

  function setYRef(ref) {
    setYReference(ref);
    markStale();
  }

  function addBlock() {
    setSandwichLinked(false);
    setBlocks((prev) => {
      if (prev.length === 0) {
        const id = nextColorIdRef.current++;
        return [{ colorId: id, width: lenF, height: lenF, E: UNIT_OPTIONS.E[defaultEUnit], EUnit: defaultEUnit }];
      }
      const last = prev[prev.length - 1];
      const id = nextColorIdRef.current++;
      return [...prev, { colorId: id, width: last.width, height: last.height, E: last.E, EUnit: last.EUnit }];
    });
    markStale();
  }

  function removeBlock(index) {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
    setSandwichLinked(false);
    markStale();
  }

  function makeSandwich() {
    if (sandwichLinked) {
      if (blocks.length === 3) {
        const id = nextColorIdRef.current++;
        setBlocks((prev) => {
          const next = [...prev];
          next[2] = { ...next[2], colorId: id };
          return next;
        });
      }
      setSandwichLinked(false);
    } else if (blocks.length === 3) {
      setBlocks((prev) => {
        const bottom = prev[0];
        const next = [...prev];
        next[2] = { ...bottom };
        return next;
      });
      setSandwichLinked(true);
    } else {
      const EF = UNIT_OPTIONS.E[defaultEUnit];
      nextColorIdRef.current = 2;
      setBlocks([
        { colorId: 0, width: 1 * lenF, height: 1 * lenF, E: 1 * EF, EUnit: defaultEUnit },
        { colorId: 1, width: 1 * lenF, height: 1 * lenF, E: 1 * EF, EUnit: defaultEUnit },
        { colorId: 0, width: 1 * lenF, height: 1 * lenF, E: 1 * EF, EUnit: defaultEUnit },
      ]);
      setSandwichLinked(true);
    }
    markStale();
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
    dragIndexRef.current = null;
    setSandwichLinked(false);
    markStale();
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
    markStale();
  }

  function sectionTitle(name) {
    if (name === 'stress') {
      const symmetric3 = result && blocks.length === 3 && isDoublySymmetric(blocks);
      return symmetric3 ? 'Normal Stresses (General Theory)' : 'Normal Stresses';
    }
    return { na: 'Neutral Axis', io: 'Moments of Inertia', approx: 'Approximate Theory (Sandwich Beam)' }[name];
  }

  function calcSection(name) {
    if (!blocks.length || !result) return;
    setCalcSnapshot((prev) => ({ ...prev, [name]: { result, units: { ...units }, yReference, moment } }));
    setCalcState((prev) => ({ ...prev, [name]: 'done' }));
  }

  const isSandwichNow = sandwichLinked && blocks.length === 3;
  const momRange = momentEffectiveRange();

  return (
    <>
      {/* ---------------- Setting Menu ---------------- */}
      <div className="panel">
        <h3>SETTING MENU</h3>
        {blocks.length > 1 && (
          <EditableText
            as="div"
            contentKey="compositeBeams.dragHint"
            defaultText="⠿ 아이콘을 끌어서 블록 순서(위/아래)를 바꿀 수 있어요."
            style={{ fontSize: 11, color: 'var(--gray-soft)', marginBottom: 12 }}
          />
        )}

        {blocks.map((_, vi) => {
          const i = blocks.length - 1 - vi;
          const b = blocks[i];
          return (
            <BlockCard
              key={i}
              block={b}
              units={units}
              isBottom={i === 0}
              isTop={i === blocks.length - 1}
              onFieldChange={(field, value) => updateBlockField(i, field, value)}
              onEUnitChange={(v) => changeBlockEUnit(i, v)}
              onLengthUnitChange={changeLengthUnit}
              onRemove={() => removeBlock(i)}
              onDragStart={() => handleDragStart(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(i)}
            />
          );
        })}

        <button className="add-block" onClick={addBlock}>
          + 블록 추가
        </button>
        <button className={'add-block' + (isSandwichNow ? ' active' : '')} onClick={makeSandwich}>
          {isSandwichNow ? '✓ 샌드위치 모드 (Doubly symmetric)' : 'Doubly symmetric section'}
        </button>
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="panel">
        <h3>VISUALIZER</h3>

        {result ? (
          <>
            <VisualizerSVGs result={result} units={units} moment={moment} onEditDim={updateBlockDimByColorId} />

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap', margin: '12px 0 16px' }}>
              <div style={{ fontSize: 11.5, color: 'var(--gray-soft)' }}>
                응력 단위 <UnitSelect type="stress" value={units.stress} onChange={changeStressUnit} />
              </div>
              <div style={{ width: 260, flex: '0 0 auto' }}>
                <label style={{ fontSize: 11.5, color: 'var(--gray-soft)', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                  Moment M
                </label>
                <div className="field-with-slider">
                  <div className="input-unit-group">
                    <input
                      key={`moment-${moment}-${units.moment}`}
                      type="number"
                      step="any"
                      placeholder="값 입력"
                      defaultValue={moment === null ? '' : fmtInput(disp(moment, momF))}
                      onBlur={(e) => updateMoment(e.target.value)}
                    />
                    <UnitSelect type="moment" value={units.moment} onChange={changeMomentUnit} />
                  </div>
                  <input
                    className="mini-slider"
                    type="range"
                    min={momRange[0]}
                    max={momRange[1]}
                    step={momRange[2]}
                    value={moment === null ? 0 : disp(moment, momF)}
                    onChange={(e) => updateMoment(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="steps">
              <div className="y-ref-toggle">
                <span>y 기준점</span>
                <button type="button" className={yReference === 'bottom' ? 'active' : ''} onClick={() => setYRef('bottom')}>
                  하단 기준
                </button>
                <button type="button" className={yReference === 'top' ? 'active' : ''} onClick={() => setYRef('top')}>
                  상단 기준
                </button>
              </div>

              {SECTION_NAMES.map((name) => (
                <div className="step-card" key={name}>
                  <div className="step-header static">{sectionTitle(name)}</div>
                  <div className="step-body">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 12 }}>
                      <div className="step-formula" style={{ flex: '1 1 240px', margin: 0 }}>
                        <SectionFormulaPreview name={name} yReference={yReference} />
                      </div>
                      <div style={{ flexShrink: 0, textAlign: 'right' }}>
                        {calcState[name] === 'stale' && (
                          <div
                            style={{
                              fontSize: 11,
                              color: 'var(--crimson)',
                              background: 'var(--crimson-soft)',
                              borderRadius: 0,
                              padding: '8px 12px',
                              marginBottom: 8,
                              maxWidth: 180,
                            }}
                          >
                            <EditableText as="span" contentKey="calcGate.staleWarning" defaultText="⚠️ 입력값이 바뀌었어요 — 아래는 이전 값 기준 결과예요." />
                          </div>
                        )}
                        <button className="add-block calc-trigger" onClick={() => calcSection(name)} style={{ margin: 0 }}>
                          {calcState[name] === 'idle' ? '계산하기' : '다시 계산하기'}
                        </button>
                      </div>
                    </div>
                    {calcState[name] !== 'idle' && <CalcBody name={name} snapshot={calcSnapshot[name]} />}
                  </div>
                </div>
              ))}
            </div>

            <EditableText as="div" className="ai-hint" contentKey="calc.CompositeBeams.aiHint" defaultText="💬 이 식이 왜 이런 형태인지 궁금하다면, 오른쪽 AI 튜터에게 물어보세요." />
          </>
        ) : (
          <div className="viz-placeholder" style={{ minHeight: 400 }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="4" y="4" width="16" height="16" rx="2" />
              <path d="M8 9h8M8 13h5" />
            </svg>
            왼쪽에서 블록을 추가하면
            <br />
            단면과 응력 분포가 여기에 나타납니다.
          </div>
        )}
      </div>

      <AiTutorPanel />
    </>
  );
}

// 블록 하나(폭/높이/E, 단위 셀렉트 + 슬라이더, 드래그 손잡이, 삭제)
// Width/Height/E 세 필드를 각자 label+input+unit+slider로 통째로 늘어놓던 걸 압축한 버전.
// 세 필드 중 하나를 "활성 필드"로 골라 위쪽 슬라이더 한 줄로만 조작하고, 아래 3분할 타일은
// 값 확인 + 직접 타이핑 + 활성 필드 전환(클릭)을 겸함.
function BlockCard({ block, units, isBottom, isTop, onFieldChange, onEUnitChange, onLengthUnitChange, onRemove, onDragStart, onDragOver, onDrop }) {
  const c = blockColor(block);
  const lenF = UNIT_OPTIONS.length[units.length];
  const disp = (base, factor) => base / factor;
  const lenR = cbSliderRangeFor('length', units.length);
  const ER = cbSliderRangeFor('E', block.EUnit);
  const [activeField, setActiveField] = useState('width');

  const FIELD_META = {
    width: { label: 'Width', value: disp(block.width, lenF), range: lenR, unit: units.length, unitType: 'length', onUnitChange: onLengthUnitChange },
    height: { label: 'Height', value: disp(block.height, lenF), range: lenR, unit: units.length, unitType: 'length', onUnitChange: onLengthUnitChange },
    E: { label: 'E', value: disp(block.E, EFor(block)), range: ER, unit: block.EUnit, unitType: 'E', onUnitChange: onEUnitChange },
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
      </div>
      <div className="remove-block" onClick={onRemove}>
        ×
      </div>

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
          <UnitSelect type={active.unitType} value={active.unit} onChange={active.onUnitChange} />
        </div>
      </div>

      <div className="block-field-tiles">
        {['width', 'height', 'E'].map((key) => {
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
    </div>
  );
}

// 섹션별 "기본 공식" — 스냅샷 없이도(계산 전에도) 보여줄 수 있는 순수 기호식이라, 계산하기/
// 다시 계산하기 버튼 옆(왼쪽)에 항상 떠 있게 따로 뺌. stress만 y 기준점에 따라 부호 순서가 바뀜.
function SectionFormulaPreview({ name, yReference }) {
  if (name === 'na') {
    return (
      <>
        Σ <Tip title="각 블록의 탄성계수 (Elastic Modulus)">Eᵢ</Tip> <Tip title="각 블록의 단면적">Aᵢ</Tip> (
        <Tip title="각 블록 중심의 y좌표">yᵢ</Tip> − <Tip title="전체 단면의 중립축(Neutral Axis) 위치">ȳ</Tip>) = 0
      </>
    );
  }
  if (name === 'io') {
    return (
      <>
        <Tip title="각 블록의 관성모멘트">Iᵢ</Tip> ={' '}
        <Tip title="블록 자체 중심 기준 관성모멘트">
          <Frac num="bᵢhᵢ³" den="12" />
        </Tip>{' '}
        + <Tip title="평행축 정리 보정항">Aᵢdᵢ²</Tip> &nbsp;(d = yᵢ − ȳ)
      </>
    );
  }
  if (name === 'stress') {
    return (
      <>
        <Tip title="이 지점의 굽힘응력">σᵢ</Tip> = −
        <Frac
          num={
            <>
              <Tip title="굽힘모멘트">M</Tip>(
              {yReference === 'top' ? (
                <>
                  <Tip title="중립축 위치">ȳ</Tip>−<Tip title="이 지점의 y좌표">y</Tip>
                </>
              ) : (
                <>
                  <Tip title="이 지점의 y좌표">y</Tip>−<Tip title="중립축 위치">ȳ</Tip>
                </>
              )}
              )<Tip title="이 재료의 탄성계수">Eᵢ</Tip>
            </>
          }
          den={<Tip title="전체 단면의 굽힘강성">ΣEI</Tip>}
        />
      </>
    );
  }
  if (name === 'approx') {
    return (
      <>
        σ_face ≈ −<Frac num="M·(y−ȳ)" den="I_faces" /> &nbsp;(core 기여 무시)
      </>
    );
  }
  return null;
}

// 섹션별(na/io/stress/approx) 계산 결과 — calcSection()에서 찍어둔 스냅샷 기준으로만 렌더링됨
function CalcBody({ name, snapshot }) {
  if (!snapshot) return null;
  if (name === 'na') return <NaBody snapshot={snapshot} />;
  if (name === 'io') return <IoBody snapshot={snapshot} />;
  if (name === 'stress') return <StressBody snapshot={snapshot} />;
  if (name === 'approx') return <ApproxBody snapshot={snapshot} />;
  return null;
}

function NaBody({ snapshot }) {
  const { result, units, yReference } = snapshot;
  const lenF = UNIT_OPTIONS.length[units.length];
  const areaF = lenF * lenF;
  const disp = (base, factor) => base / factor;
  const yDisp = (yBottomBased) => (yReference === 'top' ? result.totalHeight - yBottomBased : yBottomBased);
  const refLabel = yReference === 'top' ? '상단 기준' : '하단 기준';

  return (
    <>
      <div style={{ fontSize: 11.5, color: 'var(--gray-soft)', marginBottom: 8 }}>
        각 재료가 중립축 위/아래로 미는 "1차모멘트"의 합이 0이 되는 지점이 중립축이에요.
      </div>
      {result.blocks.map((b, i) => {
        const c = blockColor(b);
        return (
          <div className="step-row" key={i}>
            <span className="color-dot" style={{ background: c.stroke }} />
            {c.name} Block &nbsp; A=<Tip title="이 블록의 단면적 (폭×높이)">{fmt(disp(b.area, areaF))}</Tip> {units.length}² &nbsp; y=
            <Tip title="이 블록 중심의 y좌표">{fmt(disp(yDisp(b.yc), lenF))}</Tip> {units.length} &nbsp; E=
            <Tip title="이 블록의 탄성계수">{fmt(disp(b.E, EFor(b)))}</Tip> {b.EUnit}
          </div>
        );
      })}
      <div className="step-eq">
        {result.blocks
          .map((b) => `${fmt(disp(b.E, EFor(b)))}×${fmt(disp(b.area, areaF))}×(${fmt(disp(yDisp(b.yc), lenF))}−ȳ)`)
          .join(' + ')}{' '}
        = 0
      </div>
      <div className="step-eq">
        → ȳ = <Frac num="ΣEᵢAᵢyᵢ" den="ΣEᵢAᵢ" />
      </div>
      <div className="step-final">
        ȳ = {fmt(disp(yDisp(result.ybar), lenF))} {units.length} &nbsp;({refLabel})
      </div>
    </>
  );
}

function IoBody({ snapshot }) {
  const { result, units } = snapshot;
  const lenF = UNIT_OPTIONS.length[units.length];
  const areaF = lenF * lenF;
  const I4F = Math.pow(lenF, 4);
  const disp = (base, factor) => base / factor;

  return (
    <>
      {result.blocks.map((b, i) => {
        const c = blockColor(b);
        const I0 = (b.width * Math.pow(b.height, 3)) / 12;
        const Ad2 = b.area * b.d * b.d;
        return (
          <div className="material-block" key={i}>
            <div className="material-title">
              <span className="color-dot" style={{ background: c.stroke }} />
              {c.name} Block
            </div>
            <div className="step-eq">
              I ={' '}
              <Frac
                num={
                  <>
                    (<Tip title="이 블록의 폭">{fmt(disp(b.width, lenF))}</Tip>×
                    <Tip title="이 블록의 높이">{fmt(disp(b.height, lenF))}</Tip>³)
                  </>
                }
                den="12"
              />{' '}
              + (
              <Tip title="이 블록의 단면적">{fmt(disp(b.area, areaF))}</Tip>)×(
              <Tip title="중립축까지의 거리 d = yᵢ − ȳ">{fmt(disp(b.d, lenF))}</Tip>)² ={' '}
              <Tip title="블록 자체의 관성모멘트 (자체 중심 기준)">{fmt(disp(I0, I4F))}</Tip> +{' '}
              <Tip title="평행축 보정항 (A·d²)">{fmt(disp(Ad2, I4F))}</Tip> ={' '}
              <Tip title="이 블록의 최종 관성모멘트 I">{fmt(disp(b.I, I4F))}</Tip> {units.length}⁴
            </div>
          </div>
        );
      })}
      <div className="step-final">
        ΣEI = {fmtSci(disp(result.EIsum, EFor(result.blocks[0]) * I4F))} {result.blocks[0].EUnit}·{units.length}⁴
      </div>
    </>
  );
}

function StressBody({ snapshot }) {
  const { result, units, yReference, moment } = snapshot;
  const lenF = UNIT_OPTIONS.length[units.length];
  const stressF = UNIT_OPTIONS.stress[units.stress];
  const momF = UNIT_OPTIONS.moment[units.moment];
  const disp = (base, factor) => base / factor;
  const yDisp = (yBottomBased) => (yReference === 'top' ? result.totalHeight - yBottomBased : yBottomBased);
  const Mdisp = fmt(disp(moment || 0, momF));
  const ybarDisp = fmt(disp(yDisp(result.ybar), lenF));
  const EIfull = `${fmtSci(disp(result.EIsum, EFor(result.blocks[0]) * Math.pow(lenF, 4)))} ${result.blocks[0].EUnit}·${units.length}⁴`;

  return (
    <>
      <EditableText
        as="div"
        contentKey="calc.CompositeBeams.stressNote"
        defaultText="※ 아래 식의 E, ΣEI는 화면에 설정된 단위 기준으로 표시돼요. 실제 계산은 내부적으로 항상 단위를 통일해서 정확히 수행됩니다."
        style={{ fontSize: 10.5, color: 'var(--gray-soft)', marginBottom: 8 }}
      />
      {result.blocks.map((b, k) => {
        const c = blockColor(b);
        const sBottom = result.stressAt(b.yBottom, b.E);
        const sTop = result.stressAt(b.yTop, b.E);
        const bottomLabel = k === 0 ? '최하단' : '경계면';
        const topLabel = k === result.blocks.length - 1 ? '최상단' : '경계면';
        const Ed = fmt(disp(b.E, EFor(b)));
        const yB = fmt(disp(yDisp(b.yBottom), lenF));
        const yT = fmt(disp(yDisp(b.yTop), lenF));
        const termB = yReference === 'top' ? `(${ybarDisp}−${yB})` : `(${yB}−${ybarDisp})`;
        const termT = yReference === 'top' ? `(${ybarDisp}−${yT})` : `(${yT}−${ybarDisp})`;
        return (
          <div className="material-block" key={k}>
            <div className="material-title">
              <span className="color-dot" style={{ background: c.stroke }} />
              {c.name} Block
            </div>
            <div className="step-eq">
              σ({bottomLabel}) = −<Tip title="이 단면에 작용하는 굽힘모멘트 M">{Mdisp}</Tip>×{termB}×
              <Tip title={`${c.name} Block의 탄성계수`}>{Ed}</Tip> /{' '}
              <Tip title="전체 단면의 굽힘강성 ΣEI (재료별 E×I의 합)">{EIfull}</Tip> ={' '}
              <b className={sBottom >= 0 ? 'tens' : 'comp'}>
                {fmt(disp(sBottom, stressF))} {units.stress}
              </b>
            </div>
            <div className="step-eq">
              σ({topLabel}) = −{Mdisp}×{termT}×{Ed} / {EIfull} ={' '}
              <b className={sTop >= 0 ? 'tens' : 'comp'}>
                {fmt(disp(sTop, stressF))} {units.stress}
              </b>
            </div>
          </div>
        );
      })}
    </>
  );
}

function ApproxBody({ snapshot }) {
  const { result, units, moment } = snapshot;
  const symmetric3 = result.blocks.length === 3 && isDoublySymmetric(result.blocks);
  if (!symmetric3) {
    return (
      <EditableText
        as="div"
        contentKey="compositeBeams.approxUnavailableHint"
        defaultText='현재 구조는 좌우상하 대칭 샌드위치(3블록, 위/아래 face가 같은 재료)가 아니라서 근사이론을 적용할 수 없어요. Setting Menu의 "Doubly symmetric section" 버튼으로 샌드위치 구조를 먼저 만들어보세요.'
        style={{ fontSize: 12.5, color: 'var(--gray-soft)', lineHeight: 1.6 }}
      />
    );
  }
  const lenF = UNIT_OPTIONS.length[units.length];
  const stressF = UNIT_OPTIONS.stress[units.stress];
  const I4F = Math.pow(lenF, 4);
  const disp = (base, factor) => base / factor;
  const faceBottom = result.blocks[0];
  const faceTop = result.blocks[2];
  const faceI = faceBottom.I + faceTop.I;
  const cFace = blockColor(faceBottom);
  const m = moment || 0;
  const sTopApprox = (-m * (faceTop.yTop - result.ybar)) / faceI;
  const sBottomApprox = (-m * (faceBottom.yBottom - result.ybar)) / faceI;

  return (
    <>
      <EditableText
        as="div"
        contentKey="calc.CompositeBeams.approxNote"
        defaultText="코어(core)는 굽힘강성 기여가 작다고 보고 무시한 근사식이에요. 두 face가 같은 재료라 식에서 E가 서로 상쇄돼요."
        style={{ fontSize: 11.5, color: 'var(--gray-soft)', marginBottom: 8 }}
      />
      <div className="step-eq">
        I_faces = I(하단 face) + I(상단 face) = {fmt(disp(faceI, I4F))} {units.length}⁴
      </div>
      <div className="material-block">
        <div className="material-title">
          <span className="color-dot" style={{ background: cFace.stroke }} />
          Face (상/하 동일 재료)
        </div>
        <div className="step-eq">
          σ(최상단) ≈ {fmt(disp(sTopApprox, stressF))} {units.stress}
        </div>
        <div className="step-eq">
          σ(최하단) ≈ {fmt(disp(sBottomApprox, stressF))} {units.stress}
        </div>
      </div>
      <div className="step-row" style={{ color: 'var(--gray-soft)' }}>
        Core 응력 ≈ 0 (근사이론에서는 core가 굽힘에 기여하지 않는다고 가정)
      </div>
    </>
  );
}

// VISUALIZER의 치수 라벨(예: "1.00 in.")을 클릭하면 그 자리에 바로 입력칸이 뜨는 컴포넌트.
// SVG 안이라 <input>을 직접 못 쓰고 <foreignObject>로 감싸서 띄움.
function EditableDimText({ editing, x, y, textAnchor, fill, fontSize, fontWeight, displayText, currentValue, boxW, boxH, onStartEdit, onCommit, onCancel }) {
  if (editing) {
    const boxX = textAnchor === 'end' ? x - boxW : textAnchor === 'middle' ? x - boxW / 2 : x;
    return (
      <foreignObject x={boxX} y={y - boxH / 2 - 2} width={boxW} height={boxH} style={{ overflow: 'visible' }}>
        <input
          type="number"
          step="any"
          autoFocus
          defaultValue={fmtInput(currentValue)}
          style={{
            width: '100%',
            height: '100%',
            fontSize,
            fontWeight,
            color: fill,
            border: `1.3px solid ${fill}`,
            borderRadius: 0,
            textAlign: 'center',
            padding: '0 2px',
            fontFamily: "'JetBrains Mono',monospace",
            background: '#fff',
            boxSizing: 'border-box',
          }}
          onClick={(e) => e.stopPropagation()}
          onBlur={(e) => onCommit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.target.blur();
            if (e.key === 'Escape') onCancel();
          }}
        />
      </foreignObject>
    );
  }
  return (
    <text x={x} y={y} fontSize={fontSize} fill={fill} textAnchor={textAnchor} fontWeight={fontWeight} style={{ cursor: 'pointer' }} onClick={onStartEdit}>
      {displayText}
    </text>
  );
}

// 단면 + 응력 다이어그램 + 보 측면도. 프로토타입의 cbBuildVizSVGs()와 로직은 동일.
function VisualizerSVGs({ result, units, moment, onEditDim }) {
  const lenF = UNIT_OPTIONS.length[units.length];
  const stressF = UNIT_OPTIONS.stress[units.stress];
  const momF = UNIT_OPTIONS.moment[units.moment];
  const disp = (base, factor) => base / factor;
  const [elevation3D, setElevation3D] = useState(false);
  const [editingTarget, setEditingTarget] = useState(null); // { index, field } | null

  const svgW = 920;
  const svgH = 700;
  const padTop = 55;
  const padBottom = 55;
  const padLeft = 80;
  const padRight = 380;
  const drawH = svgH - padTop - padBottom;
  const drawW = svgW - padLeft - padRight;
  const maxWidth = Math.max(...result.blocks.map((b) => b.width));
  const scale = Math.min(drawW / maxWidth, drawH / result.totalHeight);
  const centerX = padLeft + drawW / 2;
  const yToPx = (y) => padTop + (result.totalHeight - y) * scale;

  const leftDimX = centerX - (maxWidth * scale) / 2 - 26;
  const axisOx = centerX - (maxWidth * scale) / 2 - 4;
  const axisOy = 8;

  const widestBlock = result.blocks.reduce((a, b) => (b.width > a.width ? b : a), result.blocks[0]);
  const wLabel = `${fmt(disp(widestBlock.width, lenF))} ${units.length}.`;
  const dimY = yToPx(0) + 20;
  const xLeft = centerX - (maxWidth * scale) / 2;
  const xRight = centerX + (maxWidth * scale) / 2;

  const momentLabelForElevation = moment === null ? '미입력' : `${fmt(disp(moment, momF))} ${units.moment}`;
  const momRForBend = cbSliderRangeFor('moment', units.moment);
  const momentMaxForBend = Math.max(Math.abs(momRForBend[0]), Math.abs(momRForBend[1])) * momF;
  const maxBendPx = 24;
  const bendPx =
    momentMaxForBend > 0 ? Math.max(-maxBendPx, Math.min(maxBendPx, ((moment || 0) / momentMaxForBend) * maxBendPx)) : 0;

  const stressPts = [];
  result.blocks.forEach((b, i) => {
    stressPts.push({ y: b.yBottom, s: result.stressAt(b.yBottom, b.E), blockIdx: i });
    stressPts.push({ y: b.yTop, s: result.stressAt(b.yTop, b.E), blockIdx: i });
  });
  // 응력 다이어그램의 폭은 "지금 이 순간의 최대 응력"이 아니라 모멘트 슬라이더가 낼 수 있는
  // 최댓값(momentMaxForBend) 기준 응력으로 고정 스케일링한다 — 그래야 슬라이더를 왼쪽 끝(0)에서
  // 오른쪽 끝으로 움직일 때 다이어그램이 처음부터 꽉 차 있지 않고 실제로 점점 커지는 게 보인다.
  // (값 라벨 자체는 그대로 지금 모멘트 기준 정확한 응력을 보여줌 — 바뀌는 건 폭 스케일뿐.)
  const resultAtMaxMoment = computeComposite(result.blocks, momentMaxForBend || 1);
  const maxAbsStress = Math.max(
    1e-9,
    ...result.blocks.flatMap((b) => [
      Math.abs(resultAtMaxMoment.stressAt(b.yBottom, b.E)),
      Math.abs(resultAtMaxMoment.stressAt(b.yTop, b.E)),
    ])
  );
  const diagCenterX = centerX + (maxWidth * scale) / 2 + 200;
  const diagHalfW = 120;
  const sToPx = (s) => diagCenterX + (s / maxAbsStress) * diagHalfW;
  const naY = yToPx(result.ybar);

  return (
    <>
      <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%', maxWidth: 760, margin: '0 auto', display: 'block', overflow: 'visible' }}>
        <line x1={axisOx} y1={axisOy + 28} x2={axisOx} y2={axisOy} stroke="#51626F" strokeWidth="1.4" />
        <polygon points={`${axisOx},${axisOy} ${axisOx - 3.5},${axisOy + 7} ${axisOx + 3.5},${axisOy + 7}`} fill="#51626F" />
        <text x={axisOx + 7} y={axisOy + 4} fontSize="14" fill="#51626F" fontWeight="800">
          Y
        </text>
        <line x1={axisOx} y1={axisOy + 28} x2={axisOx + 28} y2={axisOy + 28} stroke="#51626F" strokeWidth="1.4" />
        <polygon points={`${axisOx + 28},${axisOy + 28} ${axisOx + 21},${axisOy + 24.5} ${axisOx + 21},${axisOy + 31.5}`} fill="#51626F" />
        <text x={axisOx + 32} y={axisOy + 32} fontSize="14" fill="#51626F" fontWeight="800">
          Z
        </text>
        <text x={axisOx} y={axisOy + 46} fontSize="12.5" fill="var(--gray-soft)">
          단면 (Y-Z 평면)
        </text>

        {result.blocks.map((b, i) => {
          const c = blockColor(b);
          const wPx = b.width * scale;
          const x = centerX - wPx / 2;
          const yTopPx = yToPx(b.yTop);
          const yBottomPx = yToPx(b.yBottom);
          const hPx = b.height * scale;
          const labelY = yTopPx + hPx / 2;
          const hLabel = `${fmt(disp(b.height, lenF))} ${units.length}.`;
          const wLabelForBlock = `${fmt(disp(b.width, lenF))} ${units.length}. wide`;
          return (
            <g key={i}>
              <rect x={x} y={yTopPx} width={wPx} height={hPx} fill={c.fill} stroke={c.stroke} strokeWidth="1.4" />
              <text x={centerX + (maxWidth * scale) / 2 + 10} y={labelY + 3.5} fontSize="13.5" fontWeight="800" fill={c.stroke}>
                {c.name}
              </text>
              <EditableDimText
                editing={editingTarget && editingTarget.index === i && editingTarget.field === 'width'}
                x={centerX + (maxWidth * scale) / 2 + 10}
                y={labelY + 20}
                textAnchor="start"
                fill={c.stroke}
                fontSize="12"
                fontWeight="700"
                displayText={wLabelForBlock}
                currentValue={disp(b.width, lenF)}
                boxW={68}
                boxH={20}
                onStartEdit={() => setEditingTarget({ index: i, field: 'width' })}
                onCommit={(v) => {
                  onEditDim(b.colorId, 'width', v);
                  setEditingTarget(null);
                }}
                onCancel={() => setEditingTarget(null)}
              />
              <line x1={leftDimX} y1={yTopPx} x2={leftDimX} y2={yBottomPx} stroke={c.stroke} strokeWidth="1" />
              <line x1={leftDimX - 4} y1={yTopPx} x2={leftDimX + 4} y2={yTopPx} stroke={c.stroke} strokeWidth="1" />
              <line x1={leftDimX - 4} y1={yBottomPx} x2={leftDimX + 4} y2={yBottomPx} stroke={c.stroke} strokeWidth="1" />
              <EditableDimText
                editing={editingTarget && editingTarget.index === i && editingTarget.field === 'height'}
                x={leftDimX - 7}
                y={labelY + 4.5}
                textAnchor="end"
                fill={c.stroke}
                fontSize="13"
                fontWeight="700"
                displayText={hLabel}
                currentValue={disp(b.height, lenF)}
                boxW={64}
                boxH={20}
                onStartEdit={() => setEditingTarget({ index: i, field: 'height' })}
                onCommit={(v) => {
                  onEditDim(b.colorId, 'height', v);
                  setEditingTarget(null);
                }}
                onCancel={() => setEditingTarget(null)}
              />
            </g>
          );
        })}

        <line x1={xLeft} y1={dimY} x2={xRight} y2={dimY} stroke="#51626F" strokeWidth="1" />
        <line x1={xLeft} y1={dimY - 4} x2={xLeft} y2={dimY + 4} stroke="#51626F" strokeWidth="1" />
        <line x1={xRight} y1={dimY - 4} x2={xRight} y2={dimY + 4} stroke="#51626F" strokeWidth="1" />
        <EditableDimText
          editing={editingTarget && editingTarget.index === 'widest' && editingTarget.field === 'width'}
          x={(xLeft + xRight) / 2}
          y={dimY + 16}
          textAnchor="middle"
          fill="#51626F"
          fontSize="13"
          fontWeight="700"
          displayText={wLabel}
          currentValue={disp(widestBlock.width, lenF)}
          boxW={68}
          boxH={20}
          onStartEdit={() => setEditingTarget({ index: 'widest', field: 'width' })}
          onCommit={(v) => {
            onEditDim(widestBlock.colorId, 'width', v);
            setEditingTarget(null);
          }}
          onCancel={() => setEditingTarget(null)}
        />

        <line
          x1={padLeft - 10}
          y1={naY}
          x2={diagCenterX + diagHalfW + 18}
          y2={naY}
          stroke="#51626F"
          strokeWidth="1.2"
          strokeDasharray="5 4"
        />
        <text x={padLeft - 10} y={naY - 8} fontSize="14" fill="#51626F" fontWeight="700">
          N.A. (중립축)
        </text>

        <line x1={diagCenterX} y1={padTop} x2={diagCenterX} y2={padTop + drawH} stroke="#8A97A2" strokeWidth="1.5" />
        <text x={diagCenterX - diagHalfW - 4} y={padTop - 10} fontSize="13" fill="var(--gray-soft)" textAnchor="middle" fontWeight="700">
          압축 (−)
        </text>
        <text x={diagCenterX + diagHalfW + 4} y={padTop - 10} fontSize="13" fill="var(--gray-soft)" textAnchor="middle" fontWeight="700">
          인장 (+)
        </text>

        {Array.from({ length: stressPts.length / 2 }).map((_, k) => {
          const p1 = stressPts[k * 2];
          const p2 = stressPts[k * 2 + 1];
          const c = blockColor(result.blocks[p1.blockIdx]);
          const x1 = sToPx(p1.s);
          const y1 = yToPx(p1.y);
          const x2 = sToPx(p2.s);
          const y2 = yToPx(p2.y);
          const label1 = `${fmt(disp(p1.s, stressF))} ${units.stress}`;
          const label2 = `${fmt(disp(p2.s, stressF))} ${units.stress}`;
          const anchor1 = p1.s >= 0 ? 'start' : 'end';
          const anchor2 = p2.s >= 0 ? 'start' : 'end';
          return (
            <g key={k}>
              <polygon
                points={`${diagCenterX},${y1} ${x1},${y1} ${x2},${y2} ${diagCenterX},${y2}`}
                fill={c.fill}
                stroke={c.stroke}
                strokeWidth="1.6"
                opacity="0.9"
                style={{ transition: 'all 0.3s ease' }}
              />
              <circle cx={x1} cy={y1} r="2.5" fill={c.stroke} style={{ transition: 'all 0.3s ease' }} />
              <circle cx={x2} cy={y2} r="2.5" fill={c.stroke} style={{ transition: 'all 0.3s ease' }} />
              <text x={x1 + (p1.s >= 0 ? 6 : -6)} y={y1 + 3} fontSize="13" fill="#3A3A3A" textAnchor={anchor1} style={{ transition: 'all 0.3s ease' }}>
                {label1}
              </text>
              {Math.abs(y2 - y1) > 16 && (
                <text x={x2 + (p2.s >= 0 ? 6 : -6)} y={y2 + 3} fontSize="13" fill="#3A3A3A" textAnchor={anchor2} style={{ transition: 'all 0.3s ease' }}>
                  {label2}
                </text>
              )}
            </g>
          );
        })}
        <text x={diagCenterX} y={padTop + drawH + 20} fontSize="13.5" fill="#8A97A2" textAnchor="middle" fontWeight="700">
          STRESS DIAGRAM (중립축 = 0)
        </text>
      </svg>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 2 }}>
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
        <BeamElevation3D momentLabel={momentLabelForElevation} bend={bendPx} blocks={result.blocks} />
      ) : (
        <BeamElevationSVG momentLabel={momentLabelForElevation} bend={bendPx} />
      )}
    </>
  );
}
