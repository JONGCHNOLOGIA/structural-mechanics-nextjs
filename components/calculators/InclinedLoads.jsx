'use client';

import { useMemo, useState } from 'react';
import { UNIT_OPTIONS, cbSliderRangeFor, fmt, fmtInput, fmtSci } from '@/lib/calc/unitOptions';
import { computeInclinedLoads, slopeRatioToRad } from '@/lib/calc/inclinedLoads';
import FormulaSection, { Tip } from './FormulaSection';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import Frac from '@/components/Frac';
import InclinedLoads3D from './InclinedLoads3D';

// 참고자료(mmch6.pdf) Example 6-6 그대로: 지붕 purlin(직사각형 단면)이 경사 α만큼 기울어진 채로
// 얹혀 있고, 등분포하중 q(수직)가 그 기울어진 단면 기준 qy/qz로 분해되어 2축 굽힘(My, Mz)을 만듦.
// Composite Beams처럼 "계산하기" 버튼으로 단계별(하중·모멘트 → 단면 2차모멘트 → 굽힘응력 →
// 중립축)로 결과를 공개하고, 각도는 소수점 슬라이더 대신 "지붕 경사 1:N" 정수비로 고름.

const Q_UNITS = {
  'kN/m': 1000,
  'N/mm': 1000,
  'lb/ft': 14.5939,
};

const SLOPE_PRESETS = [1, 2, 3, 4, 6, 12];
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
  const [q, setQ] = useState(2 * 1000);
  const [L, setL] = useState(4);
  const [slopeRun, setSlopeRun] = useState(2);
  const [elevation3D, setElevation3D] = useState(true);
  const [calcState, setCalcState] = useState({ loads: 'idle', inertia: 'idle', stress: 'idle', na: 'idle' });
  const [calcSnapshot, setCalcSnapshot] = useState({ loads: null, inertia: null, stress: null, na: null });

  const lenF = UNIT_OPTIONS.length[units.length];
  const stressF = UNIT_OPTIONS.stress[units.stress];
  const qF = Q_UNITS[units.qUnit];
  const disp = (base, factor) => base / factor;
  const lenR = cbSliderRangeFor('length', units.length);

  const alphaRad = useMemo(() => slopeRatioToRad(slopeRun), [slopeRun]);
  const alphaDeg = (alphaRad * 180) / Math.PI;

  const r = useMemo(() => (b && h && L ? computeInclinedLoads(b, h, q, L, alphaRad) : null), [b, h, q, L, alphaRad]);
  const betaDeg = r ? (r.betaRad * 180) / Math.PI : 0;

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

  return (
    <>
      {/* ---------------- Setting Menu ---------------- */}
      <div className="panel">
        <h3>SETTING MENU</h3>
        <EditableText
          contentKey="calc.InclinedLoads.intro"
          defaultText="지붕 purlin처럼, 직사각형 단면이 경사 α만큼 기울어진 채로 얹혀 있어요. 등분포하중 q는 항상 수직으로 작용하지만, 기울어진 단면 기준으로는 qy·qz 두 성분으로 나뉘어서 My·Mz 2축 굽힘을 만들어요."
          style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.6, marginBottom: 16, background: 'var(--bg)', borderRadius: 10, padding: '12px 14px' }}
        />

        <div className="field">
          <label>지붕 경사 — 1 : {slopeRun} (α = {fmt(alphaDeg)}°)</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
            {SLOPE_PRESETS.map((n) => (
              <button
                key={n}
                className={'add-block' + (slopeRun === n ? ' active' : '')}
                style={{ margin: 0, flex: '1 1 60px', padding: '7px 4px', fontSize: 11.5 }}
                onClick={() => updateAndStale(setSlopeRun)(n)}
              >
                1:{n}
              </button>
            ))}
          </div>
          <input
            type="range"
            min="1"
            max="20"
            step="0.5"
            value={slopeRun}
            onChange={(e) => updateAndStale(setSlopeRun)(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
          <div style={{ fontSize: 10.5, color: 'var(--gray-soft)', marginTop: 4 }}>
            각도를 직접 입력하는 대신, "1:N" 정수 경사비로 골라요 (지붕에서 흔히 쓰는 표기).
          </div>
        </div>

        <div className="field">
          <label>폭 b — {fmt(disp(b, lenF))} {units.length}</label>
          <input type="range" min={lenR[0]} max={lenR[1]} step={lenR[2]} value={disp(b, lenF)} onChange={(e) => updateAndStale(setB)(parseFloat(e.target.value) * lenF)} style={{ width: '100%' }} />
        </div>
        <div className="field">
          <label>높이 h — {fmt(disp(h, lenF))} {units.length}</label>
          <input type="range" min={lenR[0]} max={lenR[1]} step={lenR[2]} value={disp(h, lenF)} onChange={(e) => updateAndStale(setH)(parseFloat(e.target.value) * lenF)} style={{ width: '100%' }} />
        </div>
        <div className="field">
          <label>단위 (길이 / 응력 / 하중 / 모멘트)</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <select className="unit-inline" style={{ width: '100%' }} value={units.length} onChange={(e) => setUnits((p) => ({ ...p, length: e.target.value }))}>
              {Object.keys(UNIT_OPTIONS.length).map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
            <select className="unit-inline" style={{ width: '100%' }} value={units.stress} onChange={(e) => setUnits((p) => ({ ...p, stress: e.target.value }))}>
              {Object.keys(UNIT_OPTIONS.stress).map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
            <select className="unit-inline" style={{ width: '100%' }} value={units.qUnit} onChange={(e) => setUnits((p) => ({ ...p, qUnit: e.target.value }))}>
              {Object.keys(Q_UNITS).map((u) => (
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
          <input
            type="number"
            defaultValue={fmtInput(disp(q, qF))}
            onBlur={(e) => updateAndStale(setQ)(parseFloat(e.target.value) * qF)}
          />
        </div>
        <div className="field">
          <label>스팬 길이 L — {fmt(disp(L, lenF))} {units.length}</label>
          <input type="number" defaultValue={fmtInput(disp(L, lenF))} onBlur={(e) => updateAndStale(setL)(parseFloat(e.target.value) * lenF)} />
        </div>
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="panel">
        <h3>
          VISUALIZER <span className="badge live" style={{ marginLeft: 6 }}>실시간</span>
        </h3>
        {r ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
              <button className="add-block calc-trigger" style={{ margin: 0, padding: '4px 12px', fontSize: 12.5 }} onClick={() => setElevation3D((v) => !v)}>
                {elevation3D ? '2D로 보기' : '3D로 보기'}
              </button>
            </div>
            {elevation3D ? (
              <InclinedLoads3D b={b} h={h} alphaRad={alphaRad} corners={r.corners} betaRad={r.betaRad} />
            ) : (
              <InclinedLoadsSVG b={b} h={h} alphaRad={alphaRad} betaRad={r.betaRad} corners={r.corners} stressF={stressF} unitStress={units.stress} />
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
                          <div style={{ fontSize: 11, color: 'var(--crimson)', background: 'var(--crimson-soft)', borderRadius: 8, padding: '8px 12px', marginBottom: 8, maxWidth: 180 }}>
                            ⚠️ 입력값이 바뀌었어요 — 아래는 이전 값 기준 결과예요.
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

// 경사진 단면 + D/E/F/G 코너 + 중립축(β)을 참고자료 도식 스타일로 2D 표시
function InclinedLoadsSVG({ b, h, alphaRad, betaRad, corners, stressF, unitStress }) {
  const w = 460,
    hh = 340,
    cx = w / 2,
    cy = hh / 2 + 10;
  const scale = Math.min(140 / b, 140 / h);
  const bPx = b * scale,
    hPx = h * scale;

  // 기울어진 사각형: 로컬(가로=bPx,세로=hPx) 좌표를 α만큼 회전해서 배치
  const rot = (lx, ly) => ({
    x: cx + lx * Math.cos(alphaRad) - ly * Math.sin(alphaRad),
    y: cy - (lx * Math.sin(alphaRad) + ly * Math.cos(alphaRad)),
  });
  const rectPts = [
    rot(-bPx / 2, hPx / 2),
    rot(bPx / 2, hPx / 2),
    rot(bPx / 2, -hPx / 2),
    rot(-bPx / 2, -hPx / 2),
  ];

  const naLen = Math.max(bPx, hPx) * 0.9;
  const na1 = rot(0, 0);
  const naP1 = { x: cx + naLen * Math.cos(betaRad), y: cy - naLen * Math.sin(betaRad) };
  const naP2 = { x: cx - naLen * Math.cos(betaRad), y: cy + naLen * Math.sin(betaRad) };

  const groundY = cy + hPx / 2 + bPx / 2 + 30;

  const cornerPx = {
    D: rot(bPx / 2, hPx / 2),
    E: rot(-bPx / 2, -hPx / 2),
    F: rot(-bPx / 2, hPx / 2),
    G: rot(bPx / 2, -hPx / 2),
  };

  return (
    <svg viewBox={`0 0 ${w} ${hh}`} style={{ width: '100%', maxWidth: 500, margin: '0 auto', display: 'block' }}>
      <line x1="20" y1={groundY} x2={w - 20} y2={groundY} stroke="#8A97A2" strokeWidth="1.4" />
      <text x="30" y={groundY + 18} fontSize="11" fill="#8A97A2" fontWeight="700">
        지붕면 (α = {fmt((alphaRad * 180) / Math.PI)}°)
      </text>

      <polygon points={rectPts.map((p) => `${p.x},${p.y}`).join(' ')} fill="#F7E3E6" stroke="#51626F" strokeWidth="1.6" />

      <line x1={na1.x} y1={na1.y} x2={naP1.x} y2={naP1.y} stroke="#3A3A3A" strokeWidth="1.4" strokeDasharray="6 4" />
      <line x1={na1.x} y1={na1.y} x2={naP2.x} y2={naP2.y} stroke="#3A3A3A" strokeWidth="1.4" strokeDasharray="6 4" />
      <text x={naP1.x + 6} y={naP1.y - 6} fontSize="11" fill="#3A3A3A" fontWeight="800">
        n
      </text>
      <text x={naP2.x - 12} y={naP2.y + 14} fontSize="11" fill="#3A3A3A" fontWeight="800">
        n
      </text>

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

      <text x={cx} y="20" fontSize="10.5" fill="#8A97A2" textAnchor="middle" fontWeight="700">
        점선 = 중립축(n-n), 점 색은 압축(빨강)/인장(초록)
      </text>
    </svg>
  );
}
