'use client';

import { useState } from 'react';
import { UNIT_OPTIONS, cbSliderRangeFor, fmtInput } from '@/lib/calc/unitOptions';

// σx/σy/τxy를 Composite Beams·Inclined Loads의 블록 카드(활성 필드 슬라이더 1줄 + 3분할 타일)와
// 같은 패턴으로 묶은 카드. 활성 필드를 클릭해서 바꾸면 슬라이더가 그 값을 가리킴.
// Plane Stress / Mohr's Circle / Hooke's Law가 공통으로 사용.
export default function StressStateCard({ sigmaX, sigmaY, tauXY, units, onFieldChange, onUnitChange, title = '응력 상태 (σx, σy, τxy)' }) {
  const stressF = UNIT_OPTIONS.stress[units.stress];
  const disp = (base, factor) => base / factor;
  const stressR = cbSliderRangeFor('stress', units.stress);
  const [activeField, setActiveField] = useState('sigmaX');
  const color = { fill: '#F7E3E6', stroke: '#C3002F' };

  const FIELD_META = {
    sigmaX: { label: 'σx', value: disp(sigmaX, stressF) },
    sigmaY: { label: 'σy', value: disp(sigmaY, stressF) },
    tauXY: { label: 'τxy', value: disp(tauXY, stressF) },
  };
  const active = FIELD_META[activeField];

  return (
    <div className="block-card">
      <div className="block-title">
        <span className="color-dot" style={{ background: color.stroke }} />
        {title}
      </div>

      <div className="block-active-field" style={{ background: color.fill, borderColor: color.stroke }}>
        <div className="block-active-field-label" style={{ color: color.stroke }}>
          응력 · {active.label}
        </div>
        <div className="block-active-field-row">
          <input
            type="range"
            min={stressR[0]}
            max={stressR[1]}
            step={stressR[2]}
            value={active.value}
            onChange={(e) => onFieldChange(activeField, e.target.value)}
            style={{ flex: 1, accentColor: color.stroke }}
          />
          <select className="unit-inline" value={units.stress} onChange={(e) => onUnitChange(e.target.value)}>
            {Object.keys(UNIT_OPTIONS.stress).map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="block-field-tiles">
        {['sigmaX', 'sigmaY', 'tauXY'].map((key) => {
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
                key={`${key}-${meta.value}-${units.stress}`}
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
