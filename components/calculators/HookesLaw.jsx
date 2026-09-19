'use client';

import { useMemo, useState } from 'react';
import { UNIT_OPTIONS, fmt, fmtInput, fmtSci } from '@/lib/calc/unitOptions';
import { computeHookesLaw } from '@/lib/calc/hookesLaw';
import FormulaSection, { Collapsible } from './FormulaSection';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import Frac from '@/components/Frac';
import StressStateCard from './StressStateCard';
import { Dim } from './EditableDim';
import PlateDeform3D from './PlateDeform3D';

// 프로토타입 renderHookesLaw()를 React로 옮긴 버전.

export default function HookesLaw() {
  const [units, setUnits] = useState({ stress: 'psi', length: 'in' });
  const [mode, setMode] = useState('stressToStrain');
  const [E, setE] = useState(30000 * 6894757);
  const [nu, setNu] = useState(0.3);
  const [sigmaX, setSigmaX] = useState(10000 * 6894.757);
  const [sigmaY, setSigmaY] = useState(-4000 * 6894.757);
  const [tauXY, setTauXY] = useState(3000 * 6894.757);
  const [epsX, setEpsX] = useState(0.001);
  const [epsY, setEpsY] = useState(-0.0003);
  const [gammaXY, setGammaXY] = useState(0.0005);
  const [thickness, setThickness] = useState(null);

  const stressF = UNIT_OPTIONS.stress[units.stress];
  const lenF = UNIT_OPTIONS.length[units.length];
  const disp = (b, f) => b / f;

  const r = useMemo(
    () => (E && nu !== null ? computeHookesLaw({ mode, E, nu, sigmaX, sigmaY, tauXY, epsX, epsY, gammaXY, thickness }) : null),
    [mode, E, nu, sigmaX, sigmaY, tauXY, epsX, epsY, gammaXY, thickness]
  );

  return (
    <>
      {/* ---------------- Setting Menu ---------------- */}
      <div className="panel">
        <h3>SETTING MENU</h3>
        <EditableText
          contentKey="calc.HookesLaw.intro"
          defaultText="평면응력 상태에서 응력↔변형률을 서로 변환해요. 어느 쪽 값을 알고 있는지 선택하세요."
          style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.6, marginBottom: 14, background: 'var(--bg)', borderRadius: 0, padding: '12px 14px' }}
        />
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          <button className={'add-block' + (mode === 'stressToStrain' ? ' active' : '')} style={{ margin: 0 }} onClick={() => setMode('stressToStrain')}>
            응력 → 변형률
          </button>
          <button className={'add-block' + (mode === 'strainToStress' ? ' active' : '')} style={{ margin: 0 }} onClick={() => setMode('strainToStress')}>
            변형률 → 응력
          </button>
        </div>
        <div className="field">
          <label>단위 (응력 / 길이)</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <select className="unit-inline" style={{ width: '100%' }} value={units.stress} onChange={(e) => setUnits((p) => ({ ...p, stress: e.target.value }))}>
              {Object.keys(UNIT_OPTIONS.stress).map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
            <select className="unit-inline" style={{ width: '100%' }} value={units.length} onChange={(e) => setUnits((p) => ({ ...p, length: e.target.value }))}>
              {Object.keys(UNIT_OPTIONS.length).map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="field">
          <label>탄성계수 E — {fmt(disp(E, stressF))} {units.stress}</label>
          <input type="number" defaultValue={fmtInput(disp(E, stressF))} onBlur={(e) => setE(parseFloat(e.target.value) * stressF)} />
        </div>
        <div className="field">
          <label>포아송비 ν — {nu}</label>
          {/* 슬라이더를 같이 둔 이유: ν를 0 → 0.3 → 0.5로 훑으면 가로로 당길 때 세로가
              얼마나 따라 줄어드는지(포아송 효과)가 그림에서 바로 보인다. */}
          <input
            type="range"
            min="0"
            max="0.5"
            step="0.01"
            value={nu}
            onChange={(e) => setNu(parseFloat(e.target.value))}
            style={{ width: '100%', marginBottom: 6 }}
          />
          <input
            key={`nu-${nu}`}
            type="number"
            step="0.01"
            placeholder="0~0.5"
            defaultValue={nu}
            onBlur={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v)) setNu(Math.max(0, Math.min(0.5, v)));
            }}
          />
        </div>
        {mode === 'stressToStrain' ? (
          <StressStateCard
            sigmaX={sigmaX}
            sigmaY={sigmaY}
            tauXY={tauXY}
            units={units}
            onFieldChange={(field, value) => {
              const val = parseFloat(value);
              if (isNaN(val)) return;
              const newVal = val * stressF;
              if (field === 'sigmaX') setSigmaX(newVal);
              else if (field === 'sigmaY') setSigmaY(newVal);
              else if (field === 'tauXY') setTauXY(newVal);
            }}
            onUnitChange={(v) => setUnits((p) => ({ ...p, stress: v }))}
          />
        ) : (
          <StrainStateCard
            epsX={epsX}
            epsY={epsY}
            gammaXY={gammaXY}
            onFieldChange={(field, value) => {
              const val = parseFloat(value);
              if (isNaN(val)) return;
              if (field === 'epsX') setEpsX(val);
              else if (field === 'epsY') setEpsY(val);
              else if (field === 'gammaXY') setGammaXY(val);
            }}
          />
        )}
        <div className="field">
          <label>두께 t (선택, Δt 계산용){thickness !== null ? ` — ${fmt(disp(thickness, lenF))} ${units.length}` : ''}</label>
          <input
            type="number"
            placeholder="값 입력"
            defaultValue={thickness === null ? '' : fmt(disp(thickness, lenF))}
            onBlur={(e) => setThickness(e.target.value === '' ? null : parseFloat(e.target.value) * lenF)}
          />
        </div>
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="panel">
        <h3>VISUALIZER</h3>
        {r ? (
          <>
            <DeformSVG
              r={r}
              stressF={stressF}
              unitStress={units.stress}
              thickness={thickness === null ? null : disp(thickness, lenF)}
              lengthUnit={units.length}
              onEditThickness={(v) => setThickness(v * lenF)}
            />
            <Collapsible
              title="두께 방향 (εz) — 얇은 판 3D"
              hint="평면응력인데 왜 z로도 변형되는가"
            >
              <EditableText
                as="div"
                contentKey="calc.HookesLaw.ezNote"
                defaultText="평면응력은 **σz = 0**이라는 뜻이지, **εz = 0**이라는 뜻이 아니에요. σx와 σy가 옆으로 당기거나 미는 만큼 판은 두께 방향으로도 줄거나 늘어납니다 — εz = −(ν/E)(σx+σy). 아래 판을 보면 XY 방향으로만 힘을 줬는데도 두께가 바뀌는 게 보여요."
                style={{ fontSize: 11.5, color: 'var(--gray-soft)', marginBottom: 10, lineHeight: 1.7 }}
              />
              <PlateDeform3D ex={r.ex} ey={r.ey} ez={r.ez} gxy={r.gxy} />
            </Collapsible>
            <div className="steps" style={{ marginTop: 12 }}>
              {mode === 'stressToStrain' ? (
                <FormulaSection title="응력 → 변형률">
                  <div className="step-formula">
                    εx = <Frac num="σx − ν·σy" den="E" /> &nbsp; εy = <Frac num="σy − ν·σx" den="E" /> &nbsp; γxy = <Frac num="τxy" den="G" />
                  </div>
                  <div className="step-row">
                    G = <Frac num="E" den="2(1+ν)" /> = {fmtSci(r.G)} Pa
                  </div>
                  <div className="step-final">
                    εx={r.ex.toExponential(3)} &nbsp; εy={r.ey.toExponential(3)} &nbsp; γxy={r.gxy.toExponential(3)}
                  </div>
                </FormulaSection>
              ) : (
                <FormulaSection title="변형률 → 응력">
                  <div className="step-formula">
                    σx = <Frac num="E" den="1−ν²" />·(εx + ν·εy) &nbsp; σy = <Frac num="E" den="1−ν²" />·(εy + ν·εx) &nbsp; τxy = G·γxy
                  </div>
                  <div className="step-final">
                    σx={fmt(disp(r.sx, stressF))} {units.stress} &nbsp; σy={fmt(disp(r.sy, stressF))} {units.stress} &nbsp; τxy={fmt(disp(r.txy, stressF))} {units.stress}
                  </div>
                </FormulaSection>
              )}
              <FormulaSection title="두께변형 · 체적변형 · 변형에너지">
                <div className="step-row">
                  εz (두께방향) = −(<Frac num="ν" den="E" />)(σx+σy) = {r.ez.toExponential(3)}
                </div>
                <div className="step-row">체적변형(dilatation) e = εx+εy+εz = {r.e.toExponential(3)}</div>
                <div className="step-row">변형에너지밀도 u = ½(σx·εx + σy·εy + τxy·γxy) = {fmtSci(r.u)} J/m³</div>
                {r.deltaT !== null ? (
                  <div className="step-final">두께 변화 Δt = εz × t = {fmtSci(r.deltaT)} m</div>
                ) : (
                  <EditableText
                    as="div"
                    contentKey="hookesLaw.thicknessHint"
                    defaultText="두께(t)를 입력하면 Δt(두께 변화)도 계산돼요."
                    style={{ fontSize: 11, color: 'var(--gray-soft)' }}
                  />
                )}
              </FormulaSection>
            </div>
            <EditableText as="div" className="ai-hint" contentKey="calc.HookesLaw.aiHint" defaultText="💬 왜 εz가 σx, σy로만 결정되는지 궁금하다면, 오른쪽 AI 튜터에게 물어보세요." />
          </>
        ) : (
          <div className="viz-placeholder" style={{ minHeight: 300 }}>E와 ν를 입력하면 계산 결과가 나타납니다.</div>
        )}
      </div>

      <AiTutorPanel />
    </>
  );
}

// StressStateCard와 같은 패턴이지만, εx/εy/γxy는 무차원(단위 없음)이라 단위 선택기가 없음.
function StrainStateCard({ epsX, epsY, gammaXY, onFieldChange }) {
  const [activeField, setActiveField] = useState('epsX');
  const color = { fill: '#F7E3E6', stroke: '#C3002F' };
  const range = [-0.01, 0.01, 0.0001];

  const FIELD_META = {
    epsX: { label: 'εx', value: epsX },
    epsY: { label: 'εy', value: epsY },
    gammaXY: { label: 'γxy', value: gammaXY },
  };
  const active = FIELD_META[activeField];

  return (
    <div className="block-card">
      <div className="block-title">
        <span className="color-dot" style={{ background: color.stroke }} />
        변형률 상태 (εx, εy, γxy)
      </div>

      <div className="block-active-field" style={{ background: color.fill, borderColor: color.stroke }}>
        <div className="block-active-field-label" style={{ color: color.stroke }}>
          변형률 · {active.label}
        </div>
        <div className="block-active-field-row">
          <input
            type="range"
            min={range[0]}
            max={range[1]}
            step={range[2]}
            value={active.value}
            onChange={(e) => onFieldChange(activeField, e.target.value)}
            style={{ flex: 1, accentColor: color.stroke }}
          />
        </div>
      </div>

      <div className="block-field-tiles">
        {['epsX', 'epsY', 'gammaXY'].map((key) => {
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
                key={`${key}-${meta.value}`}
                type="number"
                step="any"
                defaultValue={meta.value}
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

function DeformSVG({ r, stressF, unitStress, thickness, lengthUnit, onEditThickness }) {
  const w = 620, h = 330;
  const cx = 190, cy = 148, s0 = 80; // 변형 전 반변

  // 세 변형률 중 가장 큰 것이 반변의 55%만큼 움직이도록 배수를 정한다 —
  // 어떤 입력이 와도 "보이긴 하되 화면을 뚫지는 않는" 크기가 된다.
  const maxStrain = Math.max(Math.abs(r.ex), Math.abs(r.ey), Math.abs(r.gxy), 1e-12);
  const gain = 0.55 / maxStrain;
  const ax = r.ex * gain;
  const ay = r.ey * gain;
  const sh = r.gxy * gain;

  const hw = s0 * (1 + ax);
  const hh = s0 * (1 + ay);
  // 전단은 위쪽이 한쪽으로 밀리는 평행사변형으로 그린다 (γ는 두 변 사이 각의 변화)
  const skew = s0 * sh;
  const P = [
    [cx - hw - skew, cy - hh],
    [cx + hw - skew, cy - hh],
    [cx + hw + skew, cy + hh],
    [cx - hw + skew, cy + hh],
  ];

  const CRIMSON = '#C3002F', TEAL = '#1E7F72', GRAY = '#8A97A2', INK = '#51626F';
  const pct = (v) => {
    const p2 = v * 100;
    return (Math.abs(p2) < 0.001 ? p2.toExponential(2) : p2.toFixed(3)) + '%';
  };

  const rows = [
    { name: 'εx', v: r.ex, color: CRIMSON, note: '가로 (x방향)' },
    { name: 'εy', v: r.ey, color: TEAL, note: '세로 (y방향)' },
    { name: 'γxy', v: r.gxy, color: '#4A5FBF', note: '기울어짐 (전단)' },
    { name: 'εz', v: r.ez, color: '#B0790A', note: '두께 (z방향)' },
  ];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 660, margin: '0 auto', display: 'block', overflow: 'visible' }}>
      <rect x={cx - s0} y={cy - s0} width={s0 * 2} height={s0 * 2} fill="none" stroke={GRAY} strokeWidth="1.3" strokeDasharray="5 4" />
      <text x={cx - s0} y={cy - s0 - 10} fontSize="11" fill={GRAY}>변형 전</text>

      <polygon points={P.map((q) => q.join(',')).join(' ')} fill={INK} fillOpacity="0.14" stroke={INK} strokeWidth="1.8" />

      {/* 어느 방향으로 당기고 미는지 */}
      {[
        { x1: cx + hw, dir: r.sx >= 0 ? 1 : -1, key: 'rx' },
        { x1: cx - hw, dir: r.sx >= 0 ? -1 : 1, key: 'lx' },
      ].map((a) => (
        <g key={a.key}>
          <line x1={a.x1} y1={cy} x2={a.x1 + a.dir * 30} y2={cy} stroke={CRIMSON} strokeWidth="2" />
          <polygon points={`${a.x1 + a.dir * 30},${cy} ${a.x1 + a.dir * 22},${cy - 5} ${a.x1 + a.dir * 22},${cy + 5}`} fill={CRIMSON} />
        </g>
      ))}
      {[
        { y1: cy - hh, dir: r.sy >= 0 ? -1 : 1, key: 'ty' },
        { y1: cy + hh, dir: r.sy >= 0 ? 1 : -1, key: 'by' },
      ].map((a) => (
        <g key={a.key}>
          <line x1={cx} y1={a.y1} x2={cx} y2={a.y1 + a.dir * 30} stroke={TEAL} strokeWidth="2" />
          <polygon points={`${cx},${a.y1 + a.dir * 30} ${cx - 5},${a.y1 + a.dir * 22} ${cx + 5},${a.y1 + a.dir * 22}`} fill={TEAL} />
        </g>
      ))}
      <text x={cx + hw + 36} y={cy + 4} fontSize="11" fill={CRIMSON} fontWeight="800">σx</text>
      <text x={cx + 8} y={cy - hh - 36} fontSize="11" fill={TEAL} fontWeight="800">σy</text>

      <text x={cx} y={cy + s0 + 62} fontSize="10.5" fill={GRAY} textAnchor="middle">
        변형은 실제보다 약 {gain >= 1e4 ? gain.toExponential(1) : Math.round(gain).toLocaleString('en-US')}배 부풀려 그렸습니다
      </text>
      <text x={cx} y={cy + s0 + 78} fontSize="10.5" fill={GRAY} textAnchor="middle">(오른쪽 숫자는 실제값)</text>

      {rows.map((row, i) => {
        const y = 46 + i * 36;
        return (
          <g key={row.name}>
            <text x={396} y={y} fontSize="13" fill={row.color} fontWeight="800">{row.name}</text>
            <text x={434} y={y} fontSize="12.5" fill="#3A3A3A" fontFamily="'JetBrains Mono',monospace">
              {row.v.toExponential(3)}
            </text>
            <text x={434} y={y + 14} fontSize="10" fill={GRAY}>
              {pct(row.v)} · {row.note}
            </text>
          </g>
        );
      })}
      <line x1={392} y1={198} x2={604} y2={198} stroke="#E3E0D8" strokeWidth="1" />
      <text x={396} y={218} fontSize="11" fill={GRAY}>σx = {fmt(r.sx / stressF)} {unitStress}</text>
      <text x={396} y={236} fontSize="11" fill={GRAY}>σy = {fmt(r.sy / stressF)} {unitStress}</text>
      <text x={396} y={254} fontSize="11" fill={GRAY}>τxy = {fmt(r.txy / stressF)} {unitStress}</text>
      {thickness !== null && (
        <Dim
          x={396}
          y={276}
          anchor="start"
          color={INK}
          fontSize={11}
          value={thickness}
          unit={lengthUnit}
          prefix="두께 t = "
          boxW={58}
          onChange={onEditThickness}
        />
      )}
    </svg>
  );
}
