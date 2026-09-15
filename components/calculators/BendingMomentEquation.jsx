'use client';

import { useEffect, useMemo, useState } from 'react';
import { UNIT_OPTIONS, fmt, fmtInput } from '@/lib/calc/unitOptions';
import { checkDeterminacy, solveBeam } from '@/lib/calc/beamBuilder';
import FormulaSection from './FormulaSection';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import FieldBlockCard from './FieldBlockCard';
import BeamBuilderSVG from './BeamBuilderSVG';

// 자유 배치 보 빌더. 처음엔 길이 L짜리 빈 보 하나만 있고, 사용자가 SETTING MENU에서
// 지지단(고정/힌지/롤러)과 하중(집중/등분포/삼각형분포/모멘트)을 추가해서 직접 만든다.
// 계산 엔진은 lib/calc/beamBuilder.js — 정정보일 때만 반력·M(x)·v(x)를 계산하고,
// 정정보가 아니면 그 사실만 알려준다 (부정정 풀이는 CH10 영역).
// v1: 클릭으로 추가 + 숫자 입력으로 정밀조정. 마우스 드래그/리사이즈는 다음 단계에서 추가 예정.

let nextId = 1;
const genId = () => `item-${nextId++}`;

const SUPPORT_LABEL = { fixed: '고정', pin: '힌지', roller: '롤러' };

export default function BendingMomentEquation() {
  const [units, setUnits] = useState({ length: 'm', distLoad: 'kN/m', force: 'kN', moment: 'kN·m', E: 'GPa', inertia: 'mm⁴' });
  const [L, setL] = useState(4);
  const [E, setE] = useState(200 * 1e9);
  const [I, setI] = useState(60e6 * 1e-12);
  const [activeField, setActiveField] = useState('L');
  const [supports, setSupports] = useState([]);
  const [loads, setLoads] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [showDeflection, setShowDeflection] = useState(false);
  const [calcState, setCalcState] = useState({ method1: 'idle', method2: 'idle' }); // idle | done | stale
  const [calcSnapshot, setCalcSnapshot] = useState({ method1: null, method2: null });

  const lenF = UNIT_OPTIONS.length[units.length];
  const distF = UNIT_OPTIONS.distLoad[units.distLoad];
  const forceF = UNIT_OPTIONS.force[units.force];
  const momF = UNIT_OPTIONS.moment[units.moment];
  const EF = UNIT_OPTIONS.E[units.E];
  const inertiaF = UNIT_OPTIONS.inertia[units.inertia];
  const disp = (b, f) => b / f;

  const EI = E * I;

  // 기존 지지단들 사이에서 가장 넓은 빈 구간의 중앙에 새 지지단을 놓는다 — 겹치는 위치에
  // 반복해서 쌓이던 문제(예: 0, L, 그다음도 계속 L/2)를 막고 항상 비어있는 자리에 배치된다.
  function nextFreeSupportX() {
    if (supports.length === 0) return { x: 0, size: L }; // 첫 지지단은 보 왼쪽 끝에서 시작
    const used = supports.map((s) => s.x).sort((a, b) => a - b);
    const bounds = [0, ...used, L];
    let bestStart = 0, bestEnd = L, bestSize = -1;
    for (let i = 0; i < bounds.length - 1; i++) {
      const size = bounds[i + 1] - bounds[i];
      if (size > bestSize) {
        bestSize = size;
        bestStart = bounds[i];
        bestEnd = bounds[i + 1];
      }
    }
    return { x: (bestStart + bestEnd) / 2, size: bestSize };
  }

  function addSupport(type) {
    const { x, size } = nextFreeSupportX();
    if (size < Math.max(L * 0.01, 1e-6)) return; // 더 이상 겹치지 않게 놓을 자리가 없음
    const id = genId();
    setSupports((prev) => [...prev, { id, x, type }]);
    setSelectedId(id);
  }

  function addLoad(kind) {
    const id = genId();
    let item;
    if (kind === 'point') item = { id, kind, x: L / 2, P: 10 * forceF };
    else if (kind === 'udl') item = { id, kind, xStart: 0, xEnd: L, q: 5 * distF };
    else if (kind === 'triangle') item = { id, kind, xStart: 0, xEnd: L, qStart: 10 * distF, qEnd: 0 };
    else if (kind === 'moment') item = { id, kind, x: L / 2, M0: 5 * momF };
    setLoads((prev) => [...prev, item]);
    setSelectedId(id);
  }

  function clearBeam() {
    setSupports([]);
    setLoads([]);
    setSelectedId(null);
    setShowDeflection(false);
    setCalcState({ method1: 'idle', method2: 'idle' });
  }

  function removeItem(id) {
    setSupports((prev) => prev.filter((s) => s.id !== id));
    setLoads((prev) => prev.filter((l) => l.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function updateSupport(id, patch) {
    setSupports((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function updateLoad(id, patch) {
    setLoads((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function moveX(id, newX) {
    const clamped = Math.min(L, Math.max(0, newX));
    if (supports.some((s) => s.id === id)) {
      // 다른 지지단과 정확히 같은 위치로 겹치지 않도록 아주 살짝 밀어낸다.
      const minGap = Math.max(L * 0.01, 1e-6);
      const others = supports.filter((s) => s.id !== id).map((s) => s.x);
      let x = clamped;
      while (others.some((ox) => Math.abs(ox - x) < minGap)) {
        x = Math.min(L, x + minGap);
        if (x >= L) { x = Math.max(0, clamped - minGap); break; }
      }
      updateSupport(id, { x });
    } else {
      const load = loads.find((l) => l.id === id);
      if (!load) return;
      if (load.kind === 'udl' || load.kind === 'triangle') {
        const span = load.xEnd - load.xStart;
        const xStart = Math.min(L - span, Math.max(0, clamped - span / 2));
        updateLoad(id, { xStart, xEnd: xStart + span });
      } else {
        updateLoad(id, { x: clamped });
      }
    }
  }

  function resizeLoad(id, edge, xMeters) {
    const load = loads.find((l) => l.id === id);
    if (!load) return;
    const minGap = Math.max(L * 0.02, 1e-6);
    if (edge === 'start') {
      const xStart = Math.min(load.xEnd - minGap, Math.max(0, xMeters));
      updateLoad(id, { xStart });
    } else {
      const xEnd = Math.max(load.xStart + minGap, Math.min(L, xMeters));
      updateLoad(id, { xEnd });
    }
  }

  function commitL(newDisplayValue) {
    const newL = Math.max(0.01, newDisplayValue * lenF);
    const oldL = L;
    setL(newL);
    setSupports((prev) => prev.map((s) => ({ ...s, x: Math.min(newL, s.x) })));
    setLoads((prev) =>
      prev.map((l) => {
        if (l.kind === 'udl' || l.kind === 'triangle') {
          // 원래 하중이 보 끝까지(0~L 전체) 덮고 있었다면, 새 길이에도 그대로 전체를 덮도록 늘려준다.
          const touchedEnd = Math.abs(l.xEnd - oldL) < 1e-9;
          const xStart = Math.min(newL, l.xStart);
          const xEnd = touchedEnd ? newL : Math.min(newL, Math.max(xStart, l.xEnd));
          return { ...l, xStart, xEnd };
        }
        return { ...l, x: Math.min(newL, l.x) };
      })
    );
  }

  function labelForLoad(l) {
    if (l.kind === 'point') return `P = ${fmt(disp(l.P, forceF))} ${units.force}`;
    if (l.kind === 'udl') return `q = ${fmt(disp(l.q, distF))} ${units.distLoad}`;
    if (l.kind === 'triangle') return `q: ${fmt(disp(l.qStart, distF))}→${fmt(disp(l.qEnd, distF))} ${units.distLoad}`;
    if (l.kind === 'moment') return `M₀ = ${fmt(disp(l.M0, momF))} ${units.moment}`;
    return '';
  }

  function editValueForLoad(l) {
    if (l.kind === 'point') return disp(l.P, forceF);
    if (l.kind === 'udl') return disp(l.q, distF);
    if (l.kind === 'moment') return disp(l.M0, momF);
    return null; // 삼각형분포는 값이 2개라 인라인 편집 대신 아래 목록에서 조정
  }

  function commitLoadEdit(id, newDisplayValue) {
    const load = loads.find((l) => l.id === id);
    if (!load) return;
    if (load.kind === 'point') updateLoad(id, { P: newDisplayValue * forceF });
    else if (load.kind === 'udl') updateLoad(id, { q: newDisplayValue * distF });
    else if (load.kind === 'moment') updateLoad(id, { M0: newDisplayValue * momF });
  }

  const determinacy = useMemo(() => checkDeterminacy(supports), [supports]);
  const solved = useMemo(
    () => (determinacy === 'determinate' ? solveBeam(L, supports, loads, EI) : null),
    [determinacy, L, supports, loads, EI]
  );

  const maxAbsM = solved ? Math.max(1e-9, ...solved.pts.map((p) => Math.abs(p.M))) : 0;
  const maxAbsV = solved ? Math.max(1e-9, ...solved.pts.map((p) => Math.abs(p.v))) : 0;

  // 입력(보 조건·지지단·하중)이 바뀌면, 이미 "계산하기"를 눌러 스냅샷을 떠놓은 방법들은
  // "다시 계산하기 전 값" 표시로 바꿔준다 (CompositeBeams의 stale 패턴과 동일).
  useEffect(() => {
    setCalcState((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        if (next[k] === 'done') { next[k] = 'stale'; changed = true; }
      }
      return changed ? next : prev;
    });
  }, [L, EI, supports, loads]);

  function calcSection(name) {
    if (!solved) return;
    setCalcSnapshot((prev) => ({
      ...prev,
      [name]: {
        L, EI, loads,
        supports: solved.supports,
        pts: solved.pts,
        units: { ...units },
        lenF, forceF, momF, distF,
      },
    }));
    setCalcState((prev) => ({ ...prev, [name]: 'done' }));
  }

  return (
    <>
      {/* ---------------- Setting Menu ---------------- */}
      <div className="panel">
        <h3>SETTING MENU</h3>
        <EditableText
          contentKey="calc.BendingMomentEquation.intro"
          defaultText="길이 L짜리 빈 보에 **지지단**과 **하중**을 직접 얹어서 나만의 문제를 만들어보세요. 정정보(statically determinate)가 되면 반력과 처짐곡선이 자동으로 계산돼요."
          style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.6, marginBottom: 14, background: 'var(--bg)', borderRadius: 10, padding: '12px 14px' }}
        />
        <FieldBlockCard
          title="보 조건 (L, E, I)"
          activeKey={activeField}
          onActiveChange={setActiveField}
          fields={[
            { key: 'L', label: '스팬 L', value: disp(L, lenF), unitType: 'length', unit: units.length },
            { key: 'E', label: '탄성계수 E', value: disp(E, EF), unitType: 'E', unit: units.E },
            { key: 'I', label: '단면2차모멘트 I', value: disp(I, inertiaF), unitType: 'inertia', unit: units.inertia },
          ]}
          onUnitChange={(unitType, v) => setUnits((prev) => ({ ...prev, [unitType]: v }))}
          onFieldChange={(key, value) => {
            const val = parseFloat(value);
            if (isNaN(val)) return;
            if (key === 'L') setL(val * lenF);
            else if (key === 'E') setE(val * EF);
            else if (key === 'I') setI(val * inertiaF);
          }}
        />

        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--gray-soft)', marginBottom: 6 }}>지지단 추가</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            <SupportIconButton type="fixed" title="Fixed" onClick={() => addSupport('fixed')} />
            <SupportIconButton type="pin" title="Hinged" onClick={() => addSupport('pin')} />
            <SupportIconButton type="roller" title="Roller" onClick={() => addSupport('roller')} />
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--gray-soft)', marginBottom: 6 }}>하중 추가</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button className="add-block" style={{ margin: 0 }} onClick={() => addLoad('point')}>+ 집중하중 P</button>
            <button className="add-block" style={{ margin: 0 }} onClick={() => addLoad('udl')}>+ 등분포 q</button>
            <button className="add-block" style={{ margin: 0 }} onClick={() => addLoad('triangle')}>+ 삼각형분포</button>
            <button className="add-block" style={{ margin: 0 }} onClick={() => addLoad('moment')}>+ 모멘트 M₀</button>
          </div>
        </div>

        {(supports.length > 0 || loads.length > 0) && (
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {supports.map((s) => (
              <SupportRow
                key={s.id}
                s={s}
                L={L}
                lenF={lenF}
                lenUnit={units.length}
                selected={s.id === selectedId}
                onSelect={() => setSelectedId(s.id)}
                onChange={(patch) => updateSupport(s.id, patch)}
                onRemove={() => removeItem(s.id)}
              />
            ))}
            {loads.map((l) => (
              <LoadRow
                key={l.id}
                l={l}
                L={L}
                lenF={lenF}
                lenUnit={units.length}
                forceF={forceF}
                forceUnit={units.force}
                distF={distF}
                distUnit={units.distLoad}
                momF={momF}
                momUnit={units.moment}
                selected={l.id === selectedId}
                onSelect={() => setSelectedId(l.id)}
                onChange={(patch) => updateLoad(l.id, patch)}
                onRemove={() => removeItem(l.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ margin: 0 }}>
            VISUALIZER <span className="badge live" style={{ marginLeft: 6 }}>실시간</span>
          </h3>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className="add-block"
              style={{ margin: 0, padding: '4px 12px', fontSize: 12.5, color: 'var(--gray-soft)' }}
              disabled={!supports.length && !loads.length}
              onClick={clearBeam}
              title="지지단·하중을 모두 지우고 처음부터 다시 만들어요"
            >
              CLEAR
            </button>
            <button
              className={'add-block calc-trigger' + (showDeflection ? ' active' : '')}
              style={{ margin: 0, padding: '4px 12px', fontSize: 12.5 }}
              disabled={!solved}
              onClick={() => setShowDeflection((v) => !v)}
            >
              {showDeflection ? '처짐곡선 숨기기' : '예상 처짐곡선 보기'}
            </button>
          </div>
        </div>
        <BeamBuilderSVG
          L={L}
          spanLabel={`${fmt(disp(L, lenF))} ${units.length}`}
          spanValue={disp(L, lenF)}
          supports={supports}
          loads={loads}
          selectedId={selectedId}
          onSelect={setSelectedId}
          maxAbsM={maxAbsM}
          momentPts={solved?.pts}
          maxAbsV={maxAbsV}
          showDeflection={showDeflection && !!solved}
          labelFor={labelForLoad}
          getEditValue={editValueForLoad}
          onEditValue={commitLoadEdit}
          onMoveX={moveX}
          onRemoveItem={removeItem}
          onResizeLoad={resizeLoad}
          onEditL={commitL}
          formatX={(xMeters) => `${fmt(disp(xMeters, lenF))} ${units.length}`}
        />

        {determinacy === 'unstable' && (
          <div className="viz-placeholder" style={{ minHeight: 100 }}>
            ⚠️ 지지단이 부족하거나 배치가 불안정해요 — 안정된 정정보/부정정보가 되도록 지지단을 조정해주세요.
          </div>
        )}
        {determinacy === 'indeterminate' && (
          <div className="viz-placeholder" style={{ minHeight: 100 }}>
            ⚠️ 이 보는 <b>부정정보(statically indeterminate)</b>예요 — 지지단 반력이 평형방정식(2개)보다 많아서, 이
            굽힘모멘트식 적분만으로는 못 풀어요. (부정정보 풀이는 CH10 "Statically Indeterminate Beams"에서 다뤄요.)
          </div>
        )}

        {solved && (
          <>
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {solved.supports.map((s, i) => {
                const letter = String.fromCharCode(65 + i); // A, B, C ...
                return (
                  <div key={s.id} className="step-formula" style={{ display: 'block', width: '100%', boxSizing: 'border-box' }}>
                    <div>
                      R<sub>{letter}</sub> = {fmt(disp(s.reactionFy, forceF))} {units.force}
                      {s.type === 'fixed' && (
                        <>
                          &nbsp;&nbsp;&nbsp;M<sub>{letter}</sub> = {fmt(disp(s.reactionM, momF))} {units.moment}
                        </>
                      )}
                    </div>
                    <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--gray-soft)', marginTop: 2, letterSpacing: 0 }}>
                      {SUPPORT_LABEL[s.type]} 지지단 · x = {fmt(disp(s.x, lenF))} {units.length}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="steps">
              <FormulaSection title="① 굽힘모멘트식을 적분 (Macaulay 방법)">
                <div className="step-formula">EIv&#8221; = M(x) — 지지단 반력 + 모든 하중을 Macaulay 괄호로 한 식에 표현</div>
                <div className="step-row">
                  왼쪽부터 절단면 x까지의 모든 반력·하중을 더해서 M(x)를 구하고, 두 번 적분한 뒤 지지단 조건(각
                  지지단에서 v=0, 고정단은 v'=0도 추가)으로 적분상수를 결정해요.
                </div>
                <div className="step-final">
                  이 보는 미지수 2개(반력)와 경계조건 2개가 정확히 맞아떨어지는 정정보라서, 이 방법으로 유일하게 풀려요.
                </div>
                <CalcTrigger name="method1" calcState={calcState} onCalc={calcSection} />
                {calcState.method1 !== 'idle' && <Method1Body snapshot={calcSnapshot.method1} />}
              </FormulaSection>
              <FormulaSection title="② 4차 미분방정식 (EIv⁗ = q(x))">
                <div className="step-formula">EIv&#8221;&#8221; = q(x) — 하중강도를 직접 네 번 적분</div>
                <div className="step-row">
                  집중하중·모멘트는 q(x)의 특이함수(디랙 델타·모멘트항)로 표현돼요. 경계조건 4개(양 끝에서 v 또는 v',
                  M 또는 V 중 아는 것)로 적분상수 4개를 구하면, ①과 <b>완전히 같은</b> v(x)가 나와요.
                </div>
                <CalcTrigger name="method2" calcState={calcState} onCalc={calcSection} />
                {calcState.method2 !== 'idle' && <Method2Body snapshot={calcSnapshot.method2} />}
              </FormulaSection>
            </div>
          </>
        )}

        <EditableText as="div" className="ai-hint" contentKey="calc.BendingMomentEquation.aiHint" defaultText="💬 지지단·하중 조합을 바꿔가며 정정/부정정이 어떻게 갈리는지 궁금하다면, 오른쪽 AI 튜터에게 물어보세요." />
      </div>

      <AiTutorPanel />
    </>
  );
}

// 지지단 추가 버튼 — 실제 지지단 기호와 같은 모양의 미니 아이콘 + 마우스오버 시 title 툴팁(Fixed/Hinged/Roller).
function SupportIconButton({ type, title, onClick }) {
  return (
    <button
      className="add-block"
      title={title}
      onClick={onClick}
      style={{ margin: 0, padding: '8px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
    >
      <svg width="32" height="28" viewBox="0 0 32 28">
        {type === 'fixed' && (
          <>
            <rect x="13" y="2" width="6" height="18" fill="#51626F" />
            {Array.from({ length: 4 }).map((_, i) => (
              <line key={i} x1="13" y1={5 + i * 4.5} x2="6" y2={9 + i * 4.5} stroke="#51626F" strokeWidth="1.2" />
            ))}
            <line x1="4" y1="22" x2="28" y2="22" stroke="#51626F" strokeWidth="1.4" />
          </>
        )}
        {type === 'pin' && (
          <>
            <polygon points="16,4 6,20 26,20" fill="none" stroke="#51626F" strokeWidth="1.6" />
            <line x1="4" y1="22" x2="28" y2="22" stroke="#51626F" strokeWidth="1.4" />
          </>
        )}
        {type === 'roller' && (
          <>
            <polygon points="16,4 6,18 26,18" fill="none" stroke="#51626F" strokeWidth="1.6" />
            <circle cx="10" cy="21.5" r="2.5" fill="#51626F" />
            <circle cx="22" cy="21.5" r="2.5" fill="#51626F" />
            <line x1="4" y1="25" x2="28" y2="25" stroke="#51626F" strokeWidth="1.4" />
          </>
        )}
      </svg>
      <span style={{ fontSize: 10.5 }}>{SUPPORT_LABEL[type]}</span>
    </button>
  );
}

function RowShell({ selected, onSelect, onRemove, color, children }) {
  return (
    <div
      onClick={onSelect}
      style={{
        border: `1.4px solid ${selected ? color : 'var(--line)'}`,
        background: selected ? 'var(--bg)' : 'transparent',
        borderRadius: 10,
        padding: '8px 10px',
        cursor: 'pointer',
        position: 'relative',
      }}
    >
      <div
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        style={{ position: 'absolute', top: 6, right: 8, fontSize: 13, color: 'var(--gray-soft)', cursor: 'pointer', fontWeight: 800 }}
        title="삭제"
      >
        ×
      </div>
      {children}
    </div>
  );
}

function NumField({ label, value, onCommit, width = 74 }) {
  return (
    <label style={{ fontSize: 11, color: 'var(--gray-soft)', display: 'flex', alignItems: 'center', gap: 4 }}>
      {label}
      <input
        // 드래그/리사이즈처럼 외부에서 값이 바뀔 때도 반영되도록, 값이 바뀌면 key를 바꿔서
        // uncontrolled input을 새 defaultValue로 다시 마운트시킨다 (포커스 중엔 안 바뀜).
        key={fmtInput(value)}
        type="number"
        step="any"
        defaultValue={fmtInput(value)}
        onClick={(e) => e.stopPropagation()}
        onBlur={(e) => {
          const v = parseFloat(e.target.value);
          if (!isNaN(v)) onCommit(v);
        }}
        style={{ width, padding: '3px 6px', fontSize: 12 }}
      />
    </label>
  );
}

function SupportRow({ s, L, lenF, lenUnit, selected, onSelect, onChange, onRemove }) {
  const disp = (b, f) => b / f;
  return (
    <RowShell selected={selected} onSelect={onSelect} onRemove={onRemove} color="#C3002F">
      <div style={{ fontSize: 12.5, fontWeight: 800, marginBottom: 6 }}>
        <span className="color-dot" style={{ background: '#51626F' }} /> 지지단 · {SUPPORT_LABEL[s.type]}
      </div>
      <NumField
        label={`위치 (${lenUnit})`}
        value={disp(s.x, lenF)}
        onCommit={(v) => onChange({ x: Math.min(L, Math.max(0, v * lenF)) })}
      />
    </RowShell>
  );
}

function LoadRow({ l, L, lenF, lenUnit, forceF, forceUnit, distF, distUnit, momF, momUnit, selected, onSelect, onChange, onRemove }) {
  const disp = (b, f) => b / f;
  const kindLabel = { point: '집중하중 P', udl: '등분포하중 q', triangle: '삼각형분포하중', moment: '모멘트 M₀' }[l.kind];
  return (
    <RowShell selected={selected} onSelect={onSelect} onRemove={onRemove} color="#1E7F72">
      <div style={{ fontSize: 12.5, fontWeight: 800, marginBottom: 6 }}>
        <span className="color-dot" style={{ background: '#1E7F72' }} /> {kindLabel}
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {l.kind === 'point' && (
          <>
            <NumField label={`위치 (${lenUnit})`} value={disp(l.x, lenF)} onCommit={(v) => onChange({ x: Math.min(L, Math.max(0, v * lenF)) })} />
            <NumField label={`P (${forceUnit}, +아래)`} value={disp(l.P, forceF)} onCommit={(v) => onChange({ P: v * forceF })} />
          </>
        )}
        {(l.kind === 'udl' || l.kind === 'triangle') && (
          <>
            <NumField label={`시작 (${lenUnit})`} value={disp(l.xStart, lenF)} onCommit={(v) => onChange({ xStart: Math.min(L, Math.max(0, v * lenF)) })} />
            <NumField label={`끝 (${lenUnit})`} value={disp(l.xEnd, lenF)} onCommit={(v) => onChange({ xEnd: Math.min(L, Math.max(0, v * lenF)) })} />
            {l.kind === 'udl' ? (
              <NumField label={`q (${distUnit}, +아래)`} value={disp(l.q, distF)} onCommit={(v) => onChange({ q: v * distF })} />
            ) : (
              <>
                <NumField label={`시작세기 (${distUnit})`} value={disp(l.qStart, distF)} onCommit={(v) => onChange({ qStart: v * distF })} />
                <NumField label={`끝세기 (${distUnit})`} value={disp(l.qEnd, distF)} onCommit={(v) => onChange({ qEnd: v * distF })} />
              </>
            )}
          </>
        )}
        {l.kind === 'moment' && (
          <>
            <NumField label={`위치 (${lenUnit})`} value={disp(l.x, lenF)} onCommit={(v) => onChange({ x: Math.min(L, Math.max(0, v * lenF)) })} />
            <NumField label={`M₀ (${momUnit})`} value={disp(l.M0, momF)} onCommit={(v) => onChange({ M0: v * momF })} />
          </>
        )}
      </div>
    </RowShell>
  );
}

// "계산하기"/"다시 계산하기" 버튼 — CompositeBeams의 calc-trigger 패턴과 동일.
function CalcTrigger({ name, calcState, onCalc }) {
  return (
    <div style={{ marginTop: 10 }}>
      {calcState[name] === 'stale' && (
        <div
          style={{
            fontSize: 11, color: 'var(--crimson)', background: 'var(--crimson-soft)',
            borderRadius: 8, padding: '7px 11px', marginBottom: 8, display: 'inline-block',
          }}
        >
          ⚠️ 입력값이 바뀌었어요 — 아래는 이전 값 기준 결과예요.
        </div>
      )}
      <div>
        <button className="add-block calc-trigger" onClick={() => onCalc(name)} style={{ margin: 0 }}>
          {calcState[name] === 'idle' ? '계산하기' : '다시 계산하기'}
        </button>
      </div>
    </div>
  );
}

const LETTERS = 'ABCDEFGH';

// mmch9 Example 9-1(단순보+등분포하중, Macaulay 적분 vs 4차 미분방정식 두 방법으로 각각 풀어서
// 같은 답이 나오는 걸 보여줌)을 레퍼런스 삼아, 자유 배치 보에서도 같은 패턴으로 숫자를 대입해
// 실제 계산 과정을 보여준다.
function buildMTerms(snap) {
  const { supports, loads, lenF, forceF, momF, distF, L } = snap;
  const terms = [];
  supports.forEach((s, i) => {
    const letter = LETTERS[i] || `S${i}`;
    terms.push({ coeff: s.reactionFy / forceF, bracket: `⟨x − ${fmt(s.x / lenF)}⟩`, label: `R_${letter}` });
    if (s.type === 'fixed') {
      terms.push({ coeff: s.reactionM / momF, bracket: `⟨x − ${fmt(s.x / lenF)}⟩⁰`, label: `M_${letter}` });
    }
  });
  const notes = [];
  loads.forEach((l) => {
    if (l.kind === 'point') {
      terms.push({ coeff: -l.P / forceF, bracket: `⟨x − ${fmt(l.x / lenF)}⟩`, label: 'P' });
    } else if (l.kind === 'moment') {
      terms.push({ coeff: -l.M0 / momF, bracket: `⟨x − ${fmt(l.x / lenF)}⟩⁰`, label: 'M₀' });
    } else if (l.kind === 'udl') {
      const q = l.q / distF;
      terms.push({ coeff: -q / 2, bracket: `⟨x − ${fmt(l.xStart / lenF)}⟩²`, label: 'q/2' });
      if (l.xEnd < L - 1e-6) {
        terms.push({ coeff: q / 2, bracket: `⟨x − ${fmt(l.xEnd / lenF)}⟩²`, label: 'q/2' });
      }
    } else if (l.kind === 'triangle') {
      notes.push(
        `삼각형분포하중(${fmt(l.qStart / distF)} → ${fmt(l.qEnd / distF)} ${snap.units.distLoad}, x=${fmt(l.xStart / lenF)}~${fmt(l.xEnd / lenF)} ${snap.units.length})은 닫힌 Macaulay 항 대신 수치적분으로 M(x)에 반영돼요.`
      );
    }
  });
  return { terms, notes };
}

function renderMExpr(terms) {
  return terms
    .map((t, i) => {
      const neg = t.coeff < 0;
      const sign = neg ? '−' : i === 0 ? '' : '+';
      return `${i > 0 ? ' ' : ''}${sign} ${fmt(Math.abs(t.coeff))}${t.bracket}`;
    })
    .join('');
}

function buildBCs(snap) {
  return snap.supports.map((s, i) => {
    const letter = LETTERS[i] || `S${i}`;
    const xDisp = fmt(s.x / snap.lenF);
    const lines = [`v(${xDisp}) = 0`];
    if (s.type === 'fixed') lines.push(`v'(${xDisp}) = 0`);
    return { letter, type: s.type, lines };
  });
}

function extremes(snap) {
  const pts = snap.pts;
  const theta0 = pts[0].slope;
  const thetaL = pts[pts.length - 1].slope;
  let maxAbs = -1, atX = 0, vAtMax = 0;
  pts.forEach((p) => {
    if (Math.abs(p.v) > maxAbs) { maxAbs = Math.abs(p.v); atX = p.x; vAtMax = p.v; }
  });
  return { theta0, thetaL, vAtMax, atX };
}

function Method1Body({ snapshot }) {
  if (!snapshot) return null;
  const { units, lenF } = snapshot;
  const { terms, notes } = buildMTerms(snapshot);
  const bcs = buildBCs(snapshot);
  const { theta0, thetaL, vAtMax, atX } = extremes(snapshot);
  return (
    <div style={{ marginTop: 10 }}>
      <div className="step-formula" style={{ display: 'block', whiteSpace: 'normal', wordBreak: 'break-word' }}>
        M(x) = {renderMExpr(terms)}
      </div>
      {notes.map((n, i) => (
        <div key={i} className="step-row" style={{ color: 'var(--gray-soft)', fontSize: 11.5 }}>※ {n}</div>
      ))}
      <div className="step-row">
        경계조건: {bcs.map((b) => b.lines.join(', ')).join('  ·  ')}
      </div>
      <div className="step-final">
        θ(0) = {fmt(theta0)} rad &nbsp;&nbsp; θ(L) = {fmt(thetaL)} rad
        <br />
        v<sub>max</sub> = {fmt(vAtMax / lenF)} {units.length} &nbsp;(x = {fmt(atX / lenF)} {units.length}에서)
      </div>
    </div>
  );
}

function Method2Body({ snapshot }) {
  if (!snapshot) return null;
  const { loads, lenF, forceF, momF, distF, units } = snapshot;
  const bcs = buildBCs(snapshot);
  const { theta0, thetaL, vAtMax, atX } = extremes(snapshot);
  const distLoads = loads.filter((l) => l.kind === 'udl' || l.kind === 'triangle');
  const pointish = loads.filter((l) => l.kind === 'point' || l.kind === 'moment');
  return (
    <div style={{ marginTop: 10 }}>
      <div className="step-formula" style={{ display: 'block' }}>EIv&#8221;&#8221; = q(x)</div>
      <div className="step-row">
        {distLoads.length > 0 ? (
          distLoads.map((l, i) => (
            <div key={i}>
              q(x) = {l.kind === 'udl' ? fmt(l.q / distF) : `${fmt(l.qStart / distF)} → ${fmt(l.qEnd / distF)}`} {units.distLoad}
              &nbsp;({fmt(l.xStart / lenF)} ≤ x ≤ {fmt(l.xEnd / lenF)} {units.length})
            </div>
          ))
        ) : (
          <div>분포하중 없음 — q(x) = 0</div>
        )}
        {pointish.map((l, i) => (
          <div key={i}>
            {l.kind === 'point' ? `P = ${fmt(l.P / forceF)} ${units.force}` : `M₀ = ${fmt(l.M0 / momF)} ${units.moment}`}
            &nbsp;은 x = {fmt(l.x / lenF)} {units.length} 위치의 특이함수(디랙 델타·모멘트항)로 등가 처리돼요.
          </div>
        ))}
      </div>
      <div className="step-row">
        경계조건(적분상수 4개 결정): {bcs.map((b) => b.lines.join(', ')).join('  ·  ')}
        {bcs.some((b) => b.type !== 'fixed') && (
          <> &nbsp;· 나머지는 자유단/절단점의 전단력·모멘트 연속조건에서 결정돼요.</>
        )}
      </div>
      <div className="step-final">
        θ(0) = {fmt(theta0)} rad &nbsp;&nbsp; θ(L) = {fmt(thetaL)} rad
        <br />
        v<sub>max</sub> = {fmt(vAtMax / lenF)} {units.length} &nbsp;(x = {fmt(atX / lenF)} {units.length}에서)
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-soft)', marginTop: 4 }}>
          → ①과 완전히 같은 값이에요. 두 방법 모두 같은 EIv&#8221; = M(x) 관계에서 출발하기 때문이에요.
        </div>
      </div>
    </div>
  );
}
