'use client';

import { useMemo, useState } from 'react';
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

  const lenF = UNIT_OPTIONS.length[units.length];
  const distF = UNIT_OPTIONS.distLoad[units.distLoad];
  const forceF = UNIT_OPTIONS.force[units.force];
  const momF = UNIT_OPTIONS.moment[units.moment];
  const EF = UNIT_OPTIONS.E[units.E];
  const inertiaF = UNIT_OPTIONS.inertia[units.inertia];
  const disp = (b, f) => b / f;

  const EI = E * I;

  function addSupport(type) {
    const usedX = supports.map((s) => s.x);
    let x = 0;
    if (usedX.includes(0)) x = usedX.includes(L) ? L / 2 : L;
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

  const determinacy = useMemo(() => checkDeterminacy(supports), [supports]);
  const solved = useMemo(
    () => (determinacy === 'determinate' ? solveBeam(L, supports, loads, EI) : null),
    [determinacy, L, supports, loads, EI]
  );

  const maxAbsM = solved ? Math.max(1e-9, ...solved.pts.map((p) => Math.abs(p.M))) : 0;
  const maxAbsV = solved ? Math.max(1e-9, ...solved.pts.map((p) => Math.abs(p.v))) : 0;

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
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button className="add-block" style={{ margin: 0 }} onClick={() => addSupport('fixed')}>+ 고정</button>
            <button className="add-block" style={{ margin: 0 }} onClick={() => addSupport('pin')}>+ 힌지</button>
            <button className="add-block" style={{ margin: 0 }} onClick={() => addSupport('roller')}>+ 롤러</button>
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
        <h3>
          VISUALIZER <span className="badge live" style={{ marginLeft: 6 }}>실시간</span>
        </h3>
        <BeamBuilderSVG
          L={L}
          supports={supports}
          loads={loads}
          selectedId={selectedId}
          onSelect={setSelectedId}
          maxAbsM={maxAbsM}
          momentPts={solved?.pts}
          maxAbsV={maxAbsV}
          deflectionPts={solved?.pts}
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
            <div className="result-grid">
              {solved.supports.map((s) => (
                <div className="result-card" key={s.id}>
                  <div className="l">{SUPPORT_LABEL[s.type]} 반력 (x={fmt(disp(s.x, lenF))}{units.length})</div>
                  <div className="v">
                    R={fmt(disp(s.reactionFy, forceF))} {units.force}
                    {s.type === 'fixed' && <>, M={fmt(disp(s.reactionM, momF))} {units.moment}</>}
                  </div>
                </div>
              ))}
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
              </FormulaSection>
              <FormulaSection title="② 4차 미분방정식 (EIv⁗ = q(x))">
                <div className="step-formula">EIv&#8221;&#8221; = q(x) — 하중강도를 직접 네 번 적분</div>
                <div className="step-row">
                  집중하중·모멘트는 q(x)의 특이함수(디랙 델타·모멘트항)로 표현돼요. 경계조건 4개(양 끝에서 v 또는 v',
                  M 또는 V 중 아는 것)로 적분상수 4개를 구하면, ①과 <b>완전히 같은</b> v(x)가 나와요.
                </div>
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
