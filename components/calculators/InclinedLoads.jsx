'use client';

import { useMemo, useState } from 'react';
import { UNIT_OPTIONS, cbSliderRangeFor, fmt, fmtInput, fmtSci } from '@/lib/calc/unitOptions';
import { computeInclinedLoads } from '@/lib/calc/inclinedLoads';
import { Tip } from './FormulaSection';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import Frac from '@/components/Frac';
import InclinedLoads3D from './InclinedLoads3D';
import { Dim } from './EditableDim';

// 참고자료(mmch6.pdf) Example 6-6 그대로: 지붕 purlin(직사각형 단면)이 경사 α만큼 기울어진 채로
// 얹혀 있고, 등분포하중 q(수직)가 그 기울어진 단면 기준 qy/qz로 분해되어 2축 굽힘(My, Mz)을 만듦.
// SETTING MENU는 Composite Beams의 블록 카드(슬라이더 1줄 + 타일 그리드)를 그대로 가져와서
// Width/Height/α 세 칸으로 씀 — 다른 점은 하중 q, 스팬 길이 L을 추가로 설정한다는 것뿐.

const SECTION_NAMES = ['loads', 'inertia', 'stress', 'na'];

function sectionTitle(name) {
  if (name === 'loads') return 'Loads and Moments';
  if (name === 'inertia') return 'Moments of Inertia';
  if (name === 'stress') return 'Bending Stresses';
  if (name === 'na') return 'Neutral Axis';
  return name;
}

export default function InclinedLoads() {
  const [units, setUnits] = useState({ length: 'mm', stress: 'MPa', qUnit: 'kN/m', moment: 'kN·m' });
  const [b, setB] = useState(100 * 0.001);
  const [h, setH] = useState(150 * 0.001);
  const [alphaDeg, setAlphaDeg] = useState(0);
  const [q, setQ] = useState(2 * 1000);
  const [L, setL] = useState(4);
  const [qRangeOverrideBase, setQRangeOverrideBase] = useState(null);
  const [lRangeOverrideBase, setLRangeOverrideBase] = useState(null);
  const [elevation3D, setElevation3D] = useState(false);
  const [calcState, setCalcState] = useState({ loads: 'idle', inertia: 'idle', stress: 'idle', na: 'idle' });
  const [calcSnapshot, setCalcSnapshot] = useState({ loads: null, inertia: null, stress: null, na: null });

  const lenF = UNIT_OPTIONS.length[units.length];
  const stressF = UNIT_OPTIONS.stress[units.stress];
  const qF = UNIT_OPTIONS.distLoad[units.qUnit];
  const disp = (base, factor) => base / factor;

  function qEffectiveRange() {
    const r0 = cbSliderRangeFor('distLoad', units.qUnit);
    if (!qRangeOverrideBase) return r0;
    return [qRangeOverrideBase.min / qF, qRangeOverrideBase.max / qF, r0[2]];
  }
  function lEffectiveRange() {
    const r0 = cbSliderRangeFor('span', units.length);
    if (!lRangeOverrideBase) return r0;
    return [lRangeOverrideBase.min / lenF, lRangeOverrideBase.max / lenF, r0[2]];
  }
  function updateQ(value) {
    const val = parseFloat(value);
    if (isNaN(val)) return;
    const newQ = val * qF;
    const r0 = cbSliderRangeFor('distLoad', units.qUnit);
    const baseMin = r0[0] * qF, baseMax = r0[1] * qF;
    const curMin = qRangeOverrideBase ? qRangeOverrideBase.min : baseMin;
    const curMax = qRangeOverrideBase ? qRangeOverrideBase.max : baseMax;
    if (newQ > curMax || newQ < curMin) {
      setQRangeOverrideBase({ min: Math.min(curMin, newQ, baseMin), max: Math.max(curMax, newQ, baseMax) });
    }
    updateAndStale(setQ)(newQ);
  }
  function updateL(value) {
    const val = parseFloat(value);
    if (isNaN(val)) return;
    const newL = val * lenF;
    const r0 = cbSliderRangeFor('span', units.length);
    const baseMin = r0[0] * lenF, baseMax = r0[1] * lenF;
    const curMin = lRangeOverrideBase ? lRangeOverrideBase.min : baseMin;
    const curMax = lRangeOverrideBase ? lRangeOverrideBase.max : baseMax;
    if (newL > curMax || newL < curMin) {
      setLRangeOverrideBase({ min: Math.min(curMin, newL, baseMin), max: Math.max(curMax, newL, baseMax) });
    }
    updateAndStale(setL)(newL);
  }

  const alphaRad = (alphaDeg * Math.PI) / 180;
  const r = useMemo(() => (b && h && L ? computeInclinedLoads(b, h, q, L, alphaRad) : null), [b, h, q, L, alphaRad]);
  const betaDeg = r ? (r.betaRad * 180) / Math.PI : 0;
  // 3D 뷰의 응력 색상 강도를 "지금 이 순간의 최대 응력"이 아니라 q 슬라이더가 낼 수 있는
  // 최댓값 기준 응력으로 고정 정규화 — 그래야 하중이 작을 땐 색이 연하고 슬라이더를 올릴수록
  // 점점 진해지는 게 보인다 (Composite Beams 응력 다이어그램과 같은 방식).
  const qMaxBase = qEffectiveRange()[1] * qF;
  const maxSigma = useMemo(() => {
    if (!(b && h && L)) return 1e-9;
    const rMax = computeInclinedLoads(b, h, qMaxBase, L, alphaRad);
    return Math.max(1e-9, ...rMax.corners.map((c) => Math.abs(c.sigma)));
  }, [b, h, L, alphaRad, qMaxBase]);

  function markStale() {
    setCalcState((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (next[k] === 'done') next[k] = 'stale';
      });
      return next;
    });
  }

  function calcSection(name) {
    if (!r) return;
    setCalcState((prev) => ({ ...prev, [name]: 'done' }));
    setCalcSnapshot((prev) => ({ ...prev, [name]: { r, units, b, h, q, L, alphaDeg, betaDeg } }));
  }

  function updateAndStale(setter) {
    return (v) => {
      setter(v);
      markStale();
    };
  }

  function updateField(field, value) {
    const val = parseFloat(value);
    if (isNaN(val)) return;
    if (field === 'width') updateAndStale(setB)(val * lenF);
    else if (field === 'height') updateAndStale(setH)(val * lenF);
    else if (field === 'alpha') updateAndStale(setAlphaDeg)(Math.max(0, Math.min(90, val)));
  }

  return (
    <>
      {/* ---------------- Setting Menu ---------------- */}
      <div className="panel">
        <h3>SETTING MENU</h3>
        <EditableText
          contentKey="calc.InclinedLoads.intro"
          defaultText="지붕 purlin처럼, 직사각형 단면이 경사 α만큼 기울어진 채로 얹혀 있어요. 등분포하중 q는 항상 수직으로 작용하지만, 기울어진 단면 기준으로는 qy·qz 두 성분으로 나뉘어서 My·Mz 2축 굽힘을 만들어요."
          style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.6, marginBottom: 16, background: 'var(--bg)', borderRadius: 0, padding: '12px 14px' }}
        />

        <SectionBlockCard
          b={b}
          h={h}
          alphaDeg={alphaDeg}
          units={units}
          onFieldChange={updateField}
          onLengthUnitChange={(v) => setUnits((p) => ({ ...p, length: v }))}
        />

        <div className="field">
          <label>단위 (응력 / 하중 / 모멘트)</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <select className="unit-inline" style={{ width: '100%' }} value={units.stress} onChange={(e) => setUnits((p) => ({ ...p, stress: e.target.value }))}>
              {Object.keys(UNIT_OPTIONS.stress).map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
            <select className="unit-inline" style={{ width: '100%' }} value={units.qUnit} onChange={(e) => setUnits((p) => ({ ...p, qUnit: e.target.value }))}>
              {Object.keys(UNIT_OPTIONS.distLoad).map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
            <select className="unit-inline" style={{ width: '100%' }} value={units.moment} onChange={(e) => setUnits((p) => ({ ...p, moment: e.target.value }))}>
              {Object.keys(UNIT_OPTIONS.moment).map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label>등분포하중 q — {fmt(disp(q, qF))} {units.qUnit}</label>
          <div className="field-with-slider">
            <div className="input-unit-group">
              <input
                key={`q-${q}-${units.qUnit}`}
                type="number"
                step="any"
                defaultValue={fmtInput(disp(q, qF))}
                onBlur={(e) => updateQ(e.target.value)}
              />
              <select className="unit-inline" value={units.qUnit} onChange={(e) => setUnits((p) => ({ ...p, qUnit: e.target.value }))}>
                {Object.keys(UNIT_OPTIONS.distLoad).map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <input
              className="mini-slider"
              type="range"
              min={qEffectiveRange()[0]}
              max={qEffectiveRange()[1]}
              step={qEffectiveRange()[2]}
              value={disp(q, qF)}
              onChange={(e) => updateQ(e.target.value)}
            />
          </div>
        </div>
        <div className="field">
          <label>스팬 길이 L — {fmt(disp(L, lenF))} {units.length}</label>
          <div className="field-with-slider">
            <div className="input-unit-group">
              <input
                key={`L-${L}-${units.length}`}
                type="number"
                step="any"
                defaultValue={fmtInput(disp(L, lenF))}
                onBlur={(e) => updateL(e.target.value)}
              />
              <select className="unit-inline" value={units.length} onChange={(e) => setUnits((p) => ({ ...p, length: e.target.value }))}>
                {Object.keys(UNIT_OPTIONS.length).map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <input
              className="mini-slider"
              type="range"
              min={lEffectiveRange()[0]}
              max={lEffectiveRange()[1]}
              step={lEffectiveRange()[2]}
              value={disp(L, lenF)}
              onChange={(e) => updateL(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="panel">
        <h3>
          VISUALIZER
        </h3>
        {r ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
              <button className="add-block calc-trigger" style={{ margin: 0, padding: '4px 12px', fontSize: 12.5 }} onClick={() => setElevation3D((v) => !v)}>
                {elevation3D ? '2D로 보기' : '3D로 보기'}
              </button>
            </div>
            {elevation3D ? (
              <InclinedLoads3D b={b} h={h} alphaRad={alphaRad} corners={r.corners} betaRad={r.betaRad} maxSigma={maxSigma} />
            ) : (
              <InclinedLoadsSVG
                b={b}
                h={h}
                alphaRad={alphaRad}
                betaRad={r.betaRad}
                corners={r.corners}
                stressF={stressF}
                unitStress={units.stress}
                units={units}
                onCommitDim={updateField}
              />
            )}

            <div className="steps" style={{ marginTop: 14 }}>
              {SECTION_NAMES.map((name) => (
                <div className="step-card" key={name}>
                  <div className="step-header static">{sectionTitle(name)}</div>
                  <div className="step-body">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 12 }}>
                      <div className="step-formula" style={{ flex: '1 1 240px', margin: 0 }}>
                        <SectionFormulaPreview name={name} />
                      </div>
                      <div style={{ flexShrink: 0, textAlign: 'right' }}>
                        {calcState[name] === 'stale' && (
                          <div style={{ fontSize: 11, color: 'var(--crimson)', background: 'var(--crimson-soft)', borderRadius: 0, padding: '8px 12px', marginBottom: 8, maxWidth: 180 }}>
                            <EditableText as="span" contentKey="calcGate.staleWarning" defaultText="⚠️ 입력값이 바뀌었어요 — 아래는 이전 값 기준 결과예요." />
                          </div>
                        )}
                        <button className="add-block calc-trigger" style={{ margin: 0 }} onClick={() => calcSection(name)}>
                          {calcState[name] === 'idle' ? '계산하기' : '다시 계산하기'}
                        </button>
                      </div>
                    </div>
                    {calcState[name] !== 'idle' && <SectionBody name={name} snapshot={calcSnapshot[name]} />}
                  </div>
                </div>
              ))}
            </div>
            <EditableText as="div" className="ai-hint" contentKey="calc.InclinedLoads.aiHint" defaultText="💬 중립축이 왜 하중 방향(α)과 다른지 궁금하다면, 오른쪽 AI 튜터에게 물어보세요." />
          </>
        ) : (
          <div className="viz-placeholder" style={{ minHeight: 400 }}>폭·높이·스팬을 입력하면 단면과 응력 분포가 나타납니다.</div>
        )}
      </div>

      <AiTutorPanel />
    </>
  );
}

// Composite Beams의 블록 카드(슬라이더 1줄 + 3분할 타일)를 그대로 가져온 버전 — Width/Height/α.
// 여기선 블록이 하나뿐이라 colorId 없이 고정 크림슨 색을 씀.
function SectionBlockCard({ b, h, alphaDeg, units, onFieldChange, onLengthUnitChange }) {
  const lenF = UNIT_OPTIONS.length[units.length];
  const disp = (base, factor) => base / factor;
  const lenR = cbSliderRangeFor('length', units.length);
  const [activeField, setActiveField] = useState('width');

  const FIELD_META = {
    width: { label: 'Width', value: disp(b, lenF), range: lenR, unit: units.length, hasUnit: true },
    height: { label: 'Height', value: disp(h, lenF), range: lenR, unit: units.length, hasUnit: true },
    alpha: { label: 'α (기울기)', value: alphaDeg, range: [0, 90, 0.5], unit: '°', hasUnit: false },
  };
  const active = FIELD_META[activeField];
  const color = { fill: '#F7E3E6', stroke: '#C3002F' };

  return (
    <div className="block-card">
      <div className="block-title">
        <span className="color-dot" style={{ background: color.stroke }} />
        단면 (Rectangular)
      </div>

      <div className="block-active-field" style={{ background: color.fill, borderColor: color.stroke }}>
        <div className="block-active-field-label" style={{ color: color.stroke }}>
          단면 · {active.label}
        </div>
        <div className="block-active-field-row">
          <input
            type="range"
            min={active.range[0]}
            max={active.range[1]}
            step={active.range[2]}
            value={active.value}
            onChange={(e) => onFieldChange(activeField, e.target.value)}
            style={{ flex: 1, accentColor: color.stroke }}
          />
          {active.hasUnit ? (
            <select className="unit-inline" value={active.unit} onChange={(e) => onLengthUnitChange(e.target.value)}>
              {Object.keys(UNIT_OPTIONS.length).map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          ) : (
            <span className="unit-inline" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>°</span>
          )}
        </div>
      </div>

      <div className="block-field-tiles">
        {['width', 'height', 'alpha'].map((key) => {
          const meta = FIELD_META[key];
          const isActive = key === activeField;
          return (
            <div
              key={key}
              className={'block-field-tile' + (isActive ? ' active' : '')}
              style={isActive ? { background: color.fill, borderColor: color.stroke } : undefined}
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

function SectionFormulaPreview({ name }) {
  if (name === 'loads') {
    return (
      <>
        <Tip title="기울어진 단면 기준 y방향 성분">qy</Tip> = q·cos α, &nbsp;
        <Tip title="기울어진 단면 기준 z방향 성분">qz</Tip> = q·sin α &nbsp;→&nbsp;
        <Tip title="단순보 최대모멘트">M</Tip> = <Frac num="qL²" den="8" />
      </>
    );
  }
  if (name === 'inertia') {
    return (
      <>
        I<sub>y</sub> = <Frac num="hb³" den="12" /> &nbsp; I<sub>z</sub> = <Frac num="bh³" den="12" />
      </>
    );
  }
  if (name === 'stress') {
    return (
      <>
        <Tip title="단면 내 임의 지점의 굽힘응력">σ</Tip> = −
        <Frac num={<><Tip title="y축 모멘트">My</Tip>·z</>} den="Iy" /> −
        <Frac num={<><Tip title="z축 모멘트">Mz</Tip>·y</>} den="Iz" />
      </>
    );
  }
  if (name === 'na') {
    return (
      <>
        tan β = <Frac num="h²" den="b²" /> · tan α
      </>
    );
  }
  return null;
}

function SectionBody({ name, snapshot }) {
  if (!snapshot) return null;
  const { r, units, b, h, q, L, alphaDeg, betaDeg } = snapshot;
  const lenF = UNIT_OPTIONS.length[units.length];
  const stressF = UNIT_OPTIONS.stress[units.stress];
  const qF = Q_UNITS[units.qUnit];
  const momF = UNIT_OPTIONS.moment[units.moment];
  const I4F = Math.pow(lenF, 4);
  const disp = (base, factor) => base / factor;

  if (name === 'loads') {
    return (
      <>
        <div className="step-row">
          q = {fmt(disp(q, qF))} {units.qUnit} &nbsp; α = {fmt(alphaDeg)}°
        </div>
        <div className="step-row">
          qy = q·cos α = {fmt(disp(r.qy, qF))} {units.qUnit} &nbsp; qz = q·sin α = {fmt(disp(r.qz, qF))} {units.qUnit}
        </div>
        <div className="step-final">
          My = qz·L²/8 = {fmt(disp(r.My, momF))} {units.moment} &nbsp; Mz = qy·L²/8 = {fmt(disp(r.Mz, momF))} {units.moment}
        </div>
      </>
    );
  }
  if (name === 'inertia') {
    return (
      <>
        <div className="step-row">
          b = {fmt(disp(b, lenF))} {units.length} &nbsp; h = {fmt(disp(h, lenF))} {units.length}
        </div>
        <div className="step-final">
          Iy = {fmtSci(disp(r.Iy, I4F))} {units.length}⁴ &nbsp; Iz = {fmtSci(disp(r.Iz, I4F))} {units.length}⁴
        </div>
      </>
    );
  }
  if (name === 'stress') {
    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: 'var(--bg)' }}>
              <th style={{ textAlign: 'left', padding: '6px 10px' }}>지점</th>
              <th style={{ textAlign: 'right', padding: '6px 10px' }}>My 항</th>
              <th style={{ textAlign: 'right', padding: '6px 10px' }}>Mz 항</th>
              <th style={{ textAlign: 'right', padding: '6px 10px' }}>Σ (합)</th>
            </tr>
          </thead>
          <tbody>
            {r.corners.map((c) => (
              <tr key={c.name} style={{ borderTop: '1px solid var(--line)' }}>
                <td style={{ padding: '6px 10px', fontWeight: 800 }}>{c.name}</td>
                <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                  {fmt(disp(c.sMy, stressF))} {units.stress}
                </td>
                <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                  {fmt(disp(c.sMz, stressF))} {units.stress}
                </td>
                <td
                  style={{
                    padding: '6px 10px',
                    textAlign: 'right',
                    fontWeight: 800,
                    color: c.sigma >= 0 ? 'var(--teal)' : 'var(--crimson)',
                  }}
                >
                  {fmt(disp(c.sigma, stressF))} {units.stress}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (name === 'na') {
    return (
      <div className="step-final">
        β = {fmt(betaDeg)}° &nbsp;
        <span style={{ fontWeight: 400, color: 'var(--gray-soft)', fontSize: 11 }}>
          (α = {fmt(alphaDeg)}°, Iz ≠ Iy라서 β ≠ α — 이게 2축 굽힘의 핵심이에요)
        </span>
      </div>
    );
  }
  return null;
}


// 중심을 지나는 고정 수직 기준선(0°) + 그 기준선에서 α만큼 돌아간 단면. D/E/F/G 코너와
// 중립축(β)을 참고자료 도식 스타일로 표시. 폭/높이 라벨은 클릭해서 바로 수정 가능.
function InclinedLoadsSVG({ b, h, alphaRad, betaRad, corners, stressF, unitStress, units, onCommitDim }) {
  const w = 460,
    hh = 360,
    cx = w / 2,
    cy = hh / 2;
  const scale = Math.min(130 / b, 130 / h);
  const bPx = b * scale,
    hPx = h * scale;
  const lenF = UNIT_OPTIONS.length[units.length];
  const disp = (base, factor) => base / factor;

  // 중심 기준 회전: α=0일 때 세로로 선 직사각형(기준 수직선과 나란함)이 되도록 회전
  const rot2 = (lx, ly) => {
    const ang = alphaRad;
    return {
      x: cx + lx * Math.cos(ang) - ly * Math.sin(ang),
      y: cy - (lx * Math.sin(ang) + ly * Math.cos(ang)),
    };
  };
  const rectPts = [rot2(-bPx / 2, hPx / 2), rot2(bPx / 2, hPx / 2), rot2(bPx / 2, -hPx / 2), rot2(-bPx / 2, -hPx / 2)];

  const refLen = Math.max(bPx, hPx) / 2 + 55;
  const naLen = Math.max(bPx, hPx) * 0.85;
  const naP1 = { x: cx + naLen * Math.cos(betaRad), y: cy - naLen * Math.sin(betaRad) };
  const naP2 = { x: cx - naLen * Math.cos(betaRad), y: cy + naLen * Math.sin(betaRad) };

  const cornerPx = {
    D: rot2(bPx / 2, hPx / 2),
    E: rot2(-bPx / 2, -hPx / 2),
    F: rot2(-bPx / 2, hPx / 2),
    G: rot2(bPx / 2, -hPx / 2),
  };

  // 치수 라벨은 이 그림에서 가장 바깥까지 뻗는 것(중립축 선과 그 끝의 n 글씨)보다 더 바깥에 둔다.
  // 단면 크기 기준으로만 띄우면(예전엔 22/30이었다) α를 돌릴 때 n이나 모서리(D·E·F·G) 글씨와
  // 겹치는 각도가 생긴다. 중립축 길이(naLen)를 기준으로 잡으면 어떤 각도에서도 겹치지 않는다.
  const labelRadius = naLen + 24;
  const widthLabelPos = rot2(0, labelRadius);
  const heightLabelPos = rot2(labelRadius, 0);

  return (
    <svg viewBox={`0 0 ${w} ${hh}`} style={{ width: '100%', maxWidth: 500, margin: '0 auto', display: 'block', overflow: 'visible' }}>
      <text x={cx} y="20" fontSize="10.5" fill="#8A97A2" textAnchor="middle" fontWeight="700">
        점선 = 중립축(n-n), 회색 세로선 = 기준(α=0°)
      </text>

      {/* 중심을 뚫는 고정 수직 기준선 */}
      <line x1={cx} y1={cy - refLen} x2={cx} y2={cy + refLen} stroke="#8A97A2" strokeWidth="1.3" strokeDasharray="3 3" />

      <polygon points={rectPts.map((p) => `${p.x},${p.y}`).join(' ')} fill="#F7E3E6" stroke="#51626F" strokeWidth="1.6" />

      <line x1={naP2.x} y1={naP2.y} x2={naP1.x} y2={naP1.y} stroke="#3A3A3A" strokeWidth="1.4" strokeDasharray="6 4" />
      <text x={naP1.x + 6} y={naP1.y - 6} fontSize="11" fill="#3A3A3A" fontWeight="800">
        n
      </text>
      <text x={naP2.x - 12} y={naP2.y + 14} fontSize="11" fill="#3A3A3A" fontWeight="800">
        n
      </text>

      {/* 치수 — 폭 b와 높이 h. 숫자를 클릭하면 그 자리에서 고칠 수 있고, 단위는 SETTING MENU 설정을 따른다. */}
      <Dim
        x={widthLabelPos.x}
        y={widthLabelPos.y}
        fontSize={12}
        value={disp(b, lenF)}
        unit={units.length}
        prefix="b = "
        boxW={70}
        onChange={(v) => onCommitDim('width', v)}
      />
      <Dim
        x={heightLabelPos.x}
        y={heightLabelPos.y}
        anchor="start"
        fontSize={12}
        value={disp(h, lenF)}
        unit={units.length}
        prefix="h = "
        boxW={70}
        onChange={(v) => onCommitDim('height', v)}
      />

      {corners.map((c) => {
        const p = cornerPx[c.name];
        const col = c.sigma >= 0 ? '#1E7F72' : '#C3002F';
        return (
          <g key={c.name}>
            <circle cx={p.x} cy={p.y} r="4.5" fill={col} />
            <text x={p.x} y={p.y - 10} fontSize="12" fontWeight="800" fill={col} textAnchor="middle">
              {c.name}
            </text>
            <text x={p.x} y={p.y + 20} fontSize="10" fontWeight="700" fill={col} textAnchor="middle">
              {fmt(c.sigma / stressF)} {unitStress}
            </text>
          </g>
        );
      })}

      <text x={cx} y={hh - 12} fontSize="11" fill="#8A97A2" textAnchor="middle" fontWeight="700">
        α = {fmt((alphaRad * 180) / Math.PI)}°
      </text>
    </svg>
  );
}
