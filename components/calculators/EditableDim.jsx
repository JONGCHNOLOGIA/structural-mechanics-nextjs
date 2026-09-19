'use client';

import { useState } from 'react';
import { fmt, fmtInput } from '@/lib/calc/unitOptions';

/*
  VISUALIZER 위에 그리는 "치수" 표기 공용 부품.

  원래 CompositeBeams / BeamBuilderSVG / InclinedLoads가 각자 똑같은 걸 복사해서 갖고 있었는데,
  같은 표기를 모든 시각화 자료에 붙이기로 하면서 여기 하나로 합쳤다.

  핵심 동작: 치수 숫자를 클릭하면 그 자리에서 바로 입력칸이 뜨고, 고치면 입력값이 반영된다.
  단위는 좌측 SETTING MENU에서 고르는 값을 그대로 받아 쓰기만 하고 여기서는 바꾸지 않는다
  (사용자가 치수 라벨에서 건드리는 건 숫자뿐).

  editing 상태를 각 라벨이 스스로 들고 있어서, 쓰는 쪽에서는 useState를 따로 만들 필요가 없다.
  이게 40곳 가까운 시각화에 같은 표기를 붙일 수 있게 해준 가장 큰 이유다.

  SVG 안에는 <input>을 직접 넣을 수 없어서 <foreignObject>로 감싸 띄운다.
*/

const INK = '#51626F';

// 치수 숫자 하나. 클릭 → 입력칸 → Enter/포커스 아웃이면 반영, Esc면 취소.
// onChange가 없으면(= 이 값이 계산 결과라 고칠 수 없는 경우) 그냥 글씨로만 그린다.
export function Dim({
  x,
  y,
  value,
  unit = '',
  prefix = '',
  suffix = '',
  // 이미 다른 데서 만들어 둔 라벨 문자열을 그대로 쓰고 싶을 때(예: "q = 5.0 kN/m").
  // 넘기면 prefix/unit/suffix 대신 이 문자열을 그린다.
  text: textOverride,
  anchor = 'middle',
  color = INK,
  fontSize = 13,
  fontWeight = 700,
  boxW = 72,
  boxH = 20,
  min = 0,
  title,
  onChange,
}) {
  const [editing, setEditing] = useState(false);
  const text = textOverride !== undefined ? textOverride : `${prefix}${fmt(value)}${unit ? ` ${unit}` : ''}${suffix}`;

  function commit(raw) {
    setEditing(false);
    const v = parseFloat(raw);
    if (isNaN(v)) return;
    if (min !== null && v <= min) return;
    onChange(v);
  }

  if (!onChange) {
    return (
      <text x={x} y={y} fontSize={fontSize} fill={color} textAnchor={anchor} fontWeight={fontWeight}>
        {text}
      </text>
    );
  }

  if (editing) {
    const boxX = anchor === 'end' ? x - boxW : anchor === 'middle' ? x - boxW / 2 : x;
    return (
      <foreignObject x={boxX} y={y - boxH / 2 - 4} width={boxW} height={boxH} style={{ overflow: 'visible' }}>
        <input
          type="number"
          step="any"
          autoFocus
          defaultValue={fmtInput(value)}
          style={{
            width: '100%',
            height: '100%',
            fontSize,
            fontWeight,
            color,
            border: `1.3px solid ${color}`,
            borderRadius: 0,
            textAlign: 'center',
            padding: '0 2px',
            fontFamily: "'JetBrains Mono',monospace",
            background: '#fff',
            boxSizing: 'border-box',
          }}
          onClick={(e) => e.stopPropagation()}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.target.blur();
            if (e.key === 'Escape') setEditing(false);
          }}
        />
      </foreignObject>
    );
  }

  return (
    <text
      x={x}
      y={y}
      fontSize={fontSize}
      fill={color}
      textAnchor={anchor}
      fontWeight={fontWeight}
      className="dim-label"
      onClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
    >
      <title>{title || '클릭해서 값 수정'}</title>
      {text}
    </text>
  );
}

// 가로 치수선 — 양 끝에 짧은 수직 눈금(|——|)을 긋고 가운데 아래에 숫자를 놓는다.
// 두 번째 스크린샷의 "1.000 in." 같은 표기가 이 모양이다.
export function DimLineH({ x1, x2, y, value, unit, color = INK, onChange, labelDy = 15, fontSize = 13, tick = 4, ...rest }) {
  return (
    <g>
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={color} strokeWidth="1" />
      <line x1={x1} y1={y - tick} x2={x1} y2={y + tick} stroke={color} strokeWidth="1" />
      <line x1={x2} y1={y - tick} x2={x2} y2={y + tick} stroke={color} strokeWidth="1" />
      <Dim
        x={(x1 + x2) / 2}
        y={y + labelDy}
        value={value}
        unit={unit}
        color={color}
        fontSize={fontSize}
        anchor="middle"
        onChange={onChange}
        {...rest}
      />
    </g>
  );
}

// 세로 치수선 — 기본은 도형 왼쪽에 긋고 숫자를 왼쪽에 붙인다(side="left").
// side="right"면 눈금은 그대로, 숫자만 오른쪽으로 보낸다.
export function DimLineV({
  x,
  y1,
  y2,
  value,
  unit,
  color = INK,
  onChange,
  side = 'left',
  labelDx = 7,
  fontSize = 13,
  tick = 4,
  ...rest
}) {
  return (
    <g>
      <line x1={x} y1={y1} x2={x} y2={y2} stroke={color} strokeWidth="1" />
      <line x1={x - tick} y1={y1} x2={x + tick} y2={y1} stroke={color} strokeWidth="1" />
      <line x1={x - tick} y1={y2} x2={x + tick} y2={y2} stroke={color} strokeWidth="1" />
      <Dim
        x={side === 'left' ? x - labelDx : x + labelDx}
        y={(y1 + y2) / 2 + 4}
        value={value}
        unit={unit}
        color={color}
        fontSize={fontSize}
        anchor={side === 'left' ? 'end' : 'start'}
        onChange={onChange}
        {...rest}
      />
    </g>
  );
}
