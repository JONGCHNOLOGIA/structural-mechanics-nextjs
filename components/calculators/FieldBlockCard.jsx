'use client';

import { UNIT_OPTIONS, cbSliderRangeFor, fmtInput, fmtSci } from '@/lib/calc/unitOptions';

// Composite Beams/Inclined Loads/Transformed Section의 블록 카드(활성 필드 슬라이더 1줄 +
// N분할 타일)를 임의의 필드 묶음에 쓸 수 있게 일반화한 버전. 서로 다른 단위 카테고리(길이,
// 응력, 힘, 모멘트, 단면2차모멘트...)가 섞여도 활성 필드에 맞는 단위 선택기가 자동으로 나옴.
//
// fields: [{ key, label, value(표시값, 이미 단위 환산됨), unitType: 'length'|'stress'|'E'|'moment'
//            |'distLoad'|'force'|'inertia'|'span'|'none', unit, range?: [min,max,step] }]
// onFieldChange(key, rawInputString) / onUnitChange(unitType, newUnit) / onActiveChange(key)
export default function FieldBlockCard({ title, fields, activeKey, onActiveChange, onFieldChange, onUnitChange, color = { fill: '#F7E3E6', stroke: '#C3002F' } }) {
  const active = fields.find((f) => f.key === activeKey) || fields[0];
  const range = active.range || (active.unitType !== 'none' ? cbSliderRangeFor(active.unitType, active.unit) : [0, 1, 0.01]);
  const shortTitle = title.split('(')[0].trim();

  return (
    <div className="block-card">
      <div className="block-title">
        <span className="color-dot" style={{ background: color.stroke }} />
        {title}
      </div>

      <div className="block-active-field" style={{ background: color.fill, borderColor: color.stroke }}>
        <div className="block-active-field-label" style={{ color: color.stroke }}>
          {shortTitle} · {active.label}
          {active.unitType === 'inertia' && active.value > 0 && (
            <span style={{ fontWeight: 600, opacity: 0.75 }}> ({fmtSci(active.value)} {active.unit})</span>
          )}
        </div>
        <div className="block-active-field-row">
          <input
            type="range"
            min={range[0]}
            max={range[1]}
            step={range[2]}
            value={active.value}
            onChange={(e) => onFieldChange(active.key, e.target.value)}
            style={{ flex: 1, accentColor: color.stroke }}
          />
          {active.unitType && active.unitType !== 'none' && (
            <select className="unit-inline" value={active.unit} onChange={(e) => onUnitChange(active.unitType, e.target.value)}>
              {Object.keys(UNIT_OPTIONS[active.unitType]).map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="block-field-tiles" style={{ gridTemplateColumns: `repeat(${fields.length}, 1fr)` }}>
        {fields.map((f) => {
          const isActive = f.key === activeKey;
          return (
            <div
              key={f.key}
              className={'block-field-tile' + (isActive ? ' active' : '')}
              style={isActive ? { background: color.fill, borderColor: color.stroke } : undefined}
              onClick={() => onActiveChange(f.key)}
            >
              <div className="block-field-tile-label">{f.label}</div>
              <input
                key={`${f.key}-${f.value}-${f.unit}`}
                type="number"
                step="any"
                defaultValue={fmtInput(f.value)}
                onFocus={() => onActiveChange(f.key)}
                onClick={(e) => e.stopPropagation()}
                onBlur={(e) => onFieldChange(f.key, e.target.value)}
              />
              {f.unitType === 'inertia' && f.value > 0 && (
                <div style={{ fontSize: 9.5, color: 'var(--gray-soft)', marginTop: 2, fontWeight: 600 }}>
                  {fmtSci(f.value)} {f.unit}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
