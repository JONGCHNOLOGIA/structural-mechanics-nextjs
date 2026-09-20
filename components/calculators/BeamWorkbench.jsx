'use client';

import { useMemo, useState } from 'react';
import { UNIT_OPTIONS, fmt, fmtInput, fmtSci } from '@/lib/calc/unitOptions';
import { determinacyInfo, solveBeamFull } from '@/lib/calc/beamBuilder';
import BeamBuilderSVG from './BeamBuilderSVG';
import BeamDeflect3D from './BeamDeflect3D';
import { Collapsible } from './FormulaSection';
import EditableText from '@/components/EditableText';
import FieldBlockCard from './FieldBlockCard';

/*
  CH.9·CH.10에서 "보를 직접 만들어 푸는" 화면이 공통으로 쓰는 작업대.

  예전에는 소분류마다 하중이 고정된 그림을 따로 그렸다. 그래서 하중이
  그림 밖으로 잘리기도 했고, 무엇보다 Bending-Moment Equation에서만 하중을 끌어 옮길 수 있었다.
  이 부품은 그 편집 UI 하나를 모든 소분류가 같이 쓰게 만든 것이다:

    - 지지단(고정/힌지/롤러)과 하중(집중/등분포/삼각형/모멘트)을 직접 얹고
    - 포인터로 끌어서 옮기거나 끝을 잡아 늘이고, 값 라벨을 눌러 그 자리에서 고치고
    - 반력·모멘트를 보 위에 직접 표기하고, 예상 처짐곡선과 SFD·BMD를 함께 본다.

  계산은 lib/calc/beamBuilder.js의 solveBeamFull — 정정보든 부정정보든 같은 방식으로 푼다.
  소분류마다 다른 것은 "그 다음에 무엇을 설명하느냐"뿐이라, 그 부분만 children(렌더 프롭)으로 받는다.
*/

let nextId = 1;
const genId = () => `bw-${nextId++}`;

export const SUPPORT_LABEL = { fixed: '고정', pin: '힌지', roller: '롤러' };
const LETTERS = 'ABCDEFGH';
export const letterFor = (i) => LETTERS[i] || `S${i + 1}`;

// 프리셋/초기 보를 쓰기 쉽게 하는 헬퍼 — id는 여기서 붙인다.
export const sup = (type, x) => ({ id: genId(), type, x });
export const pointLoad = (x, P) => ({ id: genId(), kind: 'point', x, P });
export const udl = (xStart, xEnd, q) => ({ id: genId(), kind: 'udl', xStart, xEnd, q });
export const triLoad = (xStart, xEnd, qStart, qEnd) => ({ id: genId(), kind: 'triangle', xStart, xEnd, qStart, qEnd });
export const momentLoad = (x, M0) => ({ id: genId(), kind: 'moment', x, M0 });

const DEFAULT_UNITS = { length: 'm', distLoad: 'kN/m', force: 'kN', moment: 'kN·m', E: 'GPa', inertia: 'mm⁴' };

export default function BeamWorkbench({
  contentPrefix,              // EditableText contentKey 접두사
  intro,                      // 설정 패널 맨 위 설명 (기본 문구)
  initial,                    // () => ({ L, supports, loads }) — 처음 보여줄 보
  presets = [],               // [{ label, hint, build: () => ({ L, supports, loads }) }]
  diagrams = ['M'],           // 'V' | 'M' | 'MoverEI', 직접 만든 정의, 또는 (std, ctx) => [...]
  show3D = true,
  solveIndeterminate = false, // CH.10: 부정정보도 끝까지 푼다. CH.9: 안내만 한다.
  extraFields = [],           // FieldBlockCard에 더 넣을 항목 [{ key,label,value,unitType,unit,set }]
  extraSettings,              // (ctx) => JSX — 설정 패널 아래쪽에 덧붙일 것
  beforeDiagrams,             // (ctx) => JSX — 그림 바로 아래
  children,                   // (ctx) => JSX — 결과/풀이 섹션
  eiSpec,                     // (ctx) => EI 숫자 또는 구간배열. 없으면 E·I
  profile,                    // (ctx) => [{ xStart, xEnd, scale }] — 구간별 보 두께 배율
}) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const init = useMemo(() => (initial ? initial() : { L: 4, supports: [], loads: [] }), []);
  const [units, setUnits] = useState(DEFAULT_UNITS);
  const [L, setL] = useState(init.L);
  const [E, setE] = useState(200 * 1e9);
  const [I, setI] = useState(60e6 * 1e-12);
  const [supports, setSupports] = useState(init.supports);
  const [loads, setLoads] = useState(init.loads);
  const [selectedId, setSelectedId] = useState(null);
  const [showDeflection, setShowDeflection] = useState(true);
  const [activeField, setActiveField] = useState('L');

  const lenF = UNIT_OPTIONS.length[units.length];
  const distF = UNIT_OPTIONS.distLoad[units.distLoad];
  const forceF = UNIT_OPTIONS.force[units.force];
  const momF = UNIT_OPTIONS.moment[units.moment];
  const EF = UNIT_OPTIONS.E[units.E];
  const inertiaF = UNIT_OPTIONS.inertia[units.inertia];
  const disp = (b, f) => b / f;

  const EI = E * I;
  const baseCtx = {
    L, E, I, EI, units, lenF, distF, forceF, momF, EF, inertiaF, disp,
    supports, loads, setL, setE, setI, setSupports, setLoads,
  };
  const ei = eiSpec ? eiSpec(baseCtx) : EI;
  // 구간별 EI는 렌더마다 새 배열로 만들어져서, 그대로 의존성에 넣으면 매번 다시 푼다.
  // 내용이 같으면 같은 키가 나오도록 문자열로 접어서 쓴다.
  const eiKey = typeof ei === 'number' ? String(ei) : JSON.stringify(ei);

  const info = useMemo(() => determinacyInfo(supports), [supports]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const solved = useMemo(() => {
    if (info.kind === 'unstable') return null;
    if (info.kind === 'indeterminate' && !solveIndeterminate) return null;
    const r = solveBeamFull(L, supports, loads, ei, 600);
    return r.determinacy === 'unstable' ? null : r;
  }, [info.kind, L, supports, loads, eiKey, solveIndeterminate]);

  const maxAbsV = solved ? Math.max(1e-9, ...solved.pts.map((p) => Math.abs(p.v))) : 0;

  // ----- 편집 동작 -----
  function nextFreeSupportX() {
    if (supports.length === 0) return { x: 0, size: L };
    const used = supports.map((s) => s.x).sort((a, b) => a - b);
    const bounds = [0, ...used, L];
    let bestStart = 0, bestEnd = L, bestSize = -1;
    for (let i = 0; i < bounds.length - 1; i++) {
      const size = bounds[i + 1] - bounds[i];
      if (size > bestSize) { bestSize = size; bestStart = bounds[i]; bestEnd = bounds[i + 1]; }
    }
    return { x: (bestStart + bestEnd) / 2, size: bestSize };
  }

  function addSupport(type) {
    const { x, size } = nextFreeSupportX();
    if (size < Math.max(L * 0.01, 1e-6)) return;
    const s = sup(type, x);
    setSupports((prev) => [...prev, s]);
    setSelectedId(s.id);
  }

  function addLoad(kind) {
    let item;
    if (kind === 'point') item = pointLoad(L / 2, 10 * forceF);
    else if (kind === 'udl') item = udl(0, L, 5 * distF);
    else if (kind === 'triangle') item = triLoad(0, L, 10 * distF, 0);
    else item = momentLoad(L / 2, 5 * momF);
    setLoads((prev) => [...prev, item]);
    setSelectedId(item.id);
  }

  function applyPreset(p) {
    const b = p.build();
    setL(b.L);
    setSupports(b.supports);
    setLoads(b.loads);
    setSelectedId(null);
  }

  function clearBeam() {
    setSupports([]);
    setLoads([]);
    setSelectedId(null);
  }

  const removeItem = (id) => {
    setSupports((prev) => prev.filter((s) => s.id !== id));
    setLoads((prev) => prev.filter((l) => l.id !== id));
    if (selectedId === id) setSelectedId(null);
  };
  const updateSupport = (id, patch) => setSupports((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const updateLoad = (id, patch) => setLoads((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  function moveX(id, newX) {
    const clamped = Math.min(L, Math.max(0, newX));
    if (supports.some((s) => s.id === id)) {
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
    if (edge === 'start') updateLoad(id, { xStart: Math.min(load.xEnd - minGap, Math.max(0, xMeters)) });
    else updateLoad(id, { xEnd: Math.max(load.xStart + minGap, Math.min(L, xMeters)) });
  }

  function commitL(newDisplayValue) {
    const newL = Math.max(0.01, newDisplayValue * lenF);
    const oldL = L;
    setL(newL);
    setSupports((prev) => prev.map((s) => ({ ...s, x: Math.min(newL, s.x) })));
    setLoads((prev) =>
      prev.map((l) => {
        if (l.kind === 'udl' || l.kind === 'triangle') {
          const touchedEnd = Math.abs(l.xEnd - oldL) < 1e-9;
          const xStart = Math.min(newL, l.xStart);
          const xEnd = touchedEnd ? newL : Math.min(newL, Math.max(xStart, l.xEnd));
          return { ...l, xStart, xEnd };
        }
        return { ...l, x: Math.min(newL, l.x) };
      })
    );
  }

  const labelForLoad = (l) => {
    if (l.kind === 'point') return `P = ${fmt(disp(l.P, forceF))} ${units.force}`;
    if (l.kind === 'udl') return `q = ${fmt(disp(l.q, distF))} ${units.distLoad}`;
    if (l.kind === 'triangle') return `q: ${fmt(disp(l.qStart, distF))}→${fmt(disp(l.qEnd, distF))} ${units.distLoad}`;
    if (l.kind === 'moment') return `M₀ = ${fmt(disp(l.M0, momF))} ${units.moment}`;
    return '';
  };
  const editValueForLoad = (l) => {
    if (l.kind === 'point') return disp(l.P, forceF);
    if (l.kind === 'udl') return disp(l.q, distF);
    if (l.kind === 'moment') return disp(l.M0, momF);
    return null;
  };
  function commitLoadEdit(id, v) {
    const load = loads.find((l) => l.id === id);
    if (!load) return;
    if (load.kind === 'point') updateLoad(id, { P: v * forceF });
    else if (load.kind === 'udl') updateLoad(id, { q: v * distF });
    else if (load.kind === 'moment') updateLoad(id, { M0: v * momF });
  }

  const DIAG_DEFS = {
    V: {
      key: 'V', axis: 'V', label: 'V(x) 전단력도 (SFD)', color: '#1E7F72', value: (p) => p.V,
      maxLabel: (m) => `|V|max = ${fmt(m / forceF)} ${units.force}`,
    },
    M: {
      key: 'M', axis: 'M', label: 'M(x) 굽힘모멘트도 (BMD)', color: '#C3002F', value: (p) => p.M,
      maxLabel: (m) => `|M|max = ${fmt(m / momF)} ${units.moment}`,
    },
    // 모멘트-면적법에서는 이 칸의 "넓이"가 곧 처짐각이라 0선까지 칠한다.
    MoverEI: {
      key: 'MoverEI', axis: 'M/EI', label: 'M/EI 다이어그램 (넓이 = 처짐각)', color: '#C3002F',
      value: (p) => p.M / p.EI, fill: '#F7E3E6',
      maxLabel: (m) => `|M/EI|max = ${fmtSci(m)} /m`,
    },
  };

  // diagrams는 문자열 키, 직접 만든 정의, 또는 "표준 정의들을 받아서 목록을 만드는 함수" 모두 받는다.
  // 소분류마다 필요한 칸이 달라서(모멘트-면적은 M/EI에 도심선까지) 바깥에서 손댈 수 있어야 한다.
  function resolveDiagrams() {
    const list = typeof diagrams === 'function' ? diagrams(DIAG_DEFS, { solved, units, lenF, forceF, momF }) : diagrams;
    return (list || []).map((d) => (typeof d === 'string' ? DIAG_DEFS[d] : d)).filter(Boolean);
  }

  const ctx = {
    ...baseCtx,
    ei, solved, info, selectedId, setSelectedId,
    showDeflection, setShowDeflection,
    maxAbsV, addSupport, addLoad, removeItem, updateSupport, updateLoad,
    letterFor,
  };

  return (
    <>
      {/* ---------------- Setting Menu ---------------- */}
      <div className="panel">
        <h3>SETTING MENU</h3>
        <EditableText
          contentKey={`${contentPrefix}.intro`}
          defaultText={intro}
          style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.6, marginBottom: 14, background: 'var(--bg)', borderRadius: 0, padding: '12px 14px' }}
        />

        {presets.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--gray-soft)', marginBottom: 6 }}>예제 보 불러오기</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {presets.map((p) => (
                <button key={p.label} className="add-block" style={{ margin: 0 }} title={p.hint} onClick={() => applyPreset(p)}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <FieldBlockCard
          title="보 조건 (L, E, I)"
          activeKey={activeField}
          onActiveChange={setActiveField}
          fields={[
            { key: 'L', label: '스팬 L', value: disp(L, lenF), unitType: 'length', unit: units.length },
            { key: 'E', label: '탄성계수 E', value: disp(E, EF), unitType: 'E', unit: units.E },
            { key: 'I', label: '단면2차모멘트 I', value: disp(I, inertiaF), unitType: 'inertia', unit: units.inertia },
            ...extraFields.map((f) => ({ key: f.key, label: f.label, value: f.value, unitType: f.unitType, unit: f.unit })),
          ]}
          onUnitChange={(unitType, v) => setUnits((prev) => ({ ...prev, [unitType]: v }))}
          onFieldChange={(key, value) => {
            const val = parseFloat(value);
            if (isNaN(val)) return;
            if (key === 'L') commitL(val);
            else if (key === 'E') setE(val * EF);
            else if (key === 'I') setI(val * inertiaF);
            else {
              const f = extraFields.find((x) => x.key === key);
              if (f) f.set(val);
            }
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
                key={s.id} s={s} L={L} lenF={lenF} lenUnit={units.length}
                selected={s.id === selectedId} onSelect={() => setSelectedId(s.id)}
                onChange={(patch) => updateSupport(s.id, patch)} onRemove={() => removeItem(s.id)}
              />
            ))}
            {loads.map((l) => (
              <LoadRow
                key={l.id} l={l} L={L} lenF={lenF} lenUnit={units.length}
                forceF={forceF} forceUnit={units.force} distF={distF} distUnit={units.distLoad}
                momF={momF} momUnit={units.moment}
                selected={l.id === selectedId} onSelect={() => setSelectedId(l.id)}
                onChange={(patch) => updateLoad(l.id, patch)} onRemove={() => removeItem(l.id)}
              />
            ))}
          </div>
        )}

        {extraSettings && <div style={{ marginTop: 14 }}>{extraSettings(ctx)}</div>}
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ margin: 0 }}>VISUALIZER</h3>
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

        <DeterminacyBadge info={info} solveIndeterminate={solveIndeterminate} />

        <BeamBuilderSVG
          L={L}
          spanLabel={`${fmt(disp(L, lenF))} ${units.length}`}
          spanValue={disp(L, lenF)}
          supports={supports}
          loads={loads}
          selectedId={selectedId}
          onSelect={setSelectedId}
          pts={solved ? solved.pts : null}
          maxAbsV={maxAbsV}
          showDeflection={showDeflection && !!solved}
          diagrams={resolveDiagrams()}
          labelFor={labelForLoad}
          getEditValue={editValueForLoad}
          onEditValue={commitLoadEdit}
          onMoveX={moveX}
          onRemoveItem={removeItem}
          onResizeLoad={resizeLoad}
          onEditL={commitL}
          formatX={(xMeters) => `${fmt(disp(xMeters, lenF))} ${units.length}`}
          profile={profile ? profile(baseCtx) : null}
          reactions={
            solved
              ? solved.supports.map((sp, i) => ({
                  x: sp.x,
                  Fy: sp.reactionFy,
                  M: sp.reactionM,
                  type: sp.type,
                  letter: letterFor(i),
                  fyLabel: `R${letterFor(i)} = ${fmt(disp(sp.reactionFy, forceF))} ${units.force}`,
                  mLabel: sp.type === 'fixed' ? `M${letterFor(i)} = ${fmt(disp(sp.reactionM, momF))} ${units.moment}` : null,
                }))
              : []
          }
        />

        {beforeDiagrams && beforeDiagrams(ctx)}

        {show3D && solved && (
          <div className="steps" style={{ marginTop: 14 }}>
            <Collapsible title="3D로 보기 — 처짐과 굽힘응력" hint="Euler-Bernoulli">
              <BeamDeflect3D pts={solved.pts} L={L} />
            </Collapsible>
          </div>
        )}

        {info.kind === 'unstable' && (
          <div className="viz-placeholder" style={{ minHeight: 100 }}>
            <EditableText
              as="span"
              contentKey={`${contentPrefix}.unstable`}
              defaultText="⚠️ 지지단이 부족하거나 배치가 불안정해요 — 반력이 최소 2개는 되도록 지지단을 얹어주세요."
            />
          </div>
        )}
        {info.kind === 'indeterminate' && !solveIndeterminate && (
          <div className="viz-placeholder" style={{ minHeight: 100 }}>
            <EditableText
              as="span"
              contentKey={`${contentPrefix}.indeterminate`}
              defaultText="⚠️ 이 보는 **부정정보**예요 — 반력 미지수가 평형방정식(2개)보다 많아서 이 챕터의 방법만으로는 못 풀어요. (CH.10 Statically Indeterminate Beams에서 다뤄요.)"
            />
          </div>
        )}

        {solved && (
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {solved.supports.map((s, i) => (
              <div key={s.id} className="step-formula" style={{ display: 'block', width: '100%', boxSizing: 'border-box' }}>
                <div>
                  R<sub>{letterFor(i)}</sub> = {fmt(disp(s.reactionFy, forceF))} {units.force}
                  {s.type === 'fixed' && (
                    <>
                      &nbsp;&nbsp;&nbsp;M<sub>{letterFor(i)}</sub> = {fmt(disp(s.reactionM, momF))} {units.moment}
                    </>
                  )}
                </div>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--gray-soft)', marginTop: 2, letterSpacing: 0 }}>
                  {SUPPORT_LABEL[s.type]} 지지단 · x = {fmt(disp(s.x, lenF))} {units.length}
                </div>
              </div>
            ))}
          </div>
        )}

        {children && children(ctx)}
      </div>
    </>
  );
}

// 정정/부정정 여부를 그림 바로 위에 항상 띄워둔다 — CH.10에서는 이게 첫 단계다.
function DeterminacyBadge({ info, solveIndeterminate }) {
  const tone =
    info.kind === 'unstable'
      ? { bg: 'var(--crimson-soft)', fg: 'var(--crimson)' }
      : info.kind === 'indeterminate'
      ? { bg: '#FFF4E0', fg: '#8A5B00' }
      : { bg: '#E7F3EF', fg: '#1E7F72' };
  const text =
    info.kind === 'unstable'
      ? `불안정 — 반력 미지수 ${info.unknowns}개 < 평형방정식 2개`
      : info.kind === 'determinate'
      ? `정정보 (statically determinate) — 반력 미지수 ${info.unknowns}개 = 평형방정식 2개`
      : `${info.degree}차 부정정보 (statically indeterminate) — 반력 미지수 ${info.unknowns}개 − 평형방정식 2개 = 여분력 ${info.degree}개`;
  return (
    <div style={{ background: tone.bg, color: tone.fg, fontSize: 11.5, fontWeight: 800, padding: '7px 11px', marginBottom: 10 }}>
      {text}
      {info.kind === 'indeterminate' && !solveIndeterminate && ' · 이 챕터의 범위 밖이에요'}
    </div>
  );
}

// ---- 설정 패널 부품들 (Bending-Moment Equation에서 쓰던 것을 공용으로 옮겨옴) ----

export function SupportIconButton({ type, title, onClick }) {
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
        borderRadius: 0,
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

export function NumField({ label, value, onCommit, width = 74 }) {
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
  return (
    <RowShell selected={selected} onSelect={onSelect} onRemove={onRemove} color="#C3002F">
      <div style={{ fontSize: 12.5, fontWeight: 800, marginBottom: 6 }}>
        <span className="color-dot" style={{ background: '#51626F' }} /> 지지단 · {SUPPORT_LABEL[s.type]}
      </div>
      <NumField
        label={`위치 (${lenUnit})`}
        value={s.x / lenF}
        onCommit={(v) => onChange({ x: Math.min(L, Math.max(0, v * lenF)) })}
      />
    </RowShell>
  );
}

function LoadRow({ l, L, lenF, lenUnit, forceF, forceUnit, distF, distUnit, momF, momUnit, selected, onSelect, onChange, onRemove }) {
  const d = (b, f) => b / f;
  const kindLabel = { point: '집중하중 P', udl: '등분포하중 q', triangle: '삼각형분포하중', moment: '모멘트 M₀' }[l.kind];
  return (
    <RowShell selected={selected} onSelect={onSelect} onRemove={onRemove} color="#1E7F72">
      <div style={{ fontSize: 12.5, fontWeight: 800, marginBottom: 6 }}>
        <span className="color-dot" style={{ background: '#1E7F72' }} /> {kindLabel}
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {l.kind === 'point' && (
          <>
            <NumField label={`위치 (${lenUnit})`} value={d(l.x, lenF)} onCommit={(v) => onChange({ x: Math.min(L, Math.max(0, v * lenF)) })} />
            <NumField label={`P (${forceUnit}, +아래)`} value={d(l.P, forceF)} onCommit={(v) => onChange({ P: v * forceF })} />
          </>
        )}
        {(l.kind === 'udl' || l.kind === 'triangle') && (
          <>
            <NumField label={`시작 (${lenUnit})`} value={d(l.xStart, lenF)} onCommit={(v) => onChange({ xStart: Math.min(L, Math.max(0, v * lenF)) })} />
            <NumField label={`끝 (${lenUnit})`} value={d(l.xEnd, lenF)} onCommit={(v) => onChange({ xEnd: Math.min(L, Math.max(0, v * lenF)) })} />
            {l.kind === 'udl' ? (
              <NumField label={`q (${distUnit}, +아래)`} value={d(l.q, distF)} onCommit={(v) => onChange({ q: v * distF })} />
            ) : (
              <>
                <NumField label={`시작세기 (${distUnit})`} value={d(l.qStart, distF)} onCommit={(v) => onChange({ qStart: v * distF })} />
                <NumField label={`끝세기 (${distUnit})`} value={d(l.qEnd, distF)} onCommit={(v) => onChange({ qEnd: v * distF })} />
              </>
            )}
          </>
        )}
        {l.kind === 'moment' && (
          <>
            <NumField label={`위치 (${lenUnit})`} value={d(l.x, lenF)} onCommit={(v) => onChange({ x: Math.min(L, Math.max(0, v * lenF)) })} />
            <NumField label={`M₀ (${momUnit})`} value={d(l.M0, momF)} onCommit={(v) => onChange({ M0: v * momF })} />
          </>
        )}
      </div>
    </RowShell>
  );
}

// "계산하기"/"다시 계산하기" 버튼 — CompositeBeams의 calc-trigger 패턴과 동일.
export function CalcTrigger({ state, onCalc }) {
  return (
    <div style={{ marginTop: 10 }}>
      {state === 'stale' && (
        <div
          style={{
            fontSize: 11, color: 'var(--crimson)', background: 'var(--crimson-soft)',
            borderRadius: 0, padding: '7px 11px', marginBottom: 8, display: 'inline-block',
          }}
        >
          <EditableText as="span" contentKey="calcGate.staleWarning" defaultText="⚠️ 입력값이 바뀌었어요 — 아래는 이전 값 기준 결과예요." />
        </div>
      )}
      <div>
        <button className="add-block calc-trigger" onClick={onCalc} style={{ margin: 0 }}>
          {state === 'idle' ? '계산하기' : '다시 계산하기'}
        </button>
      </div>
    </div>
  );
}
