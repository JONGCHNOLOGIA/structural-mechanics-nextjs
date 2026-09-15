'use client';

import { useRef, useState } from 'react';

// 보 빌더(Bending-Moment Equation)의 VISUALIZER — 지지단·하중 아이콘을 실제 위치에 그리고,
// 드래그로 옮기거나(쓰레기통에 놓으면 삭제) 값 라벨을 클릭해서 바로 수정할 수 있게 함.
// support 아이콘: fixed=벽(해칭), pin=삼각형, roller=삼각형+원.
// load 아이콘: point=화살표(위=아래로 꽂힘, 아래=위로 꽂힘), udl/triangle=화살표 열+상단선, moment=곡선 화살표.

const GRAY = '#51626F';
const CRIMSON = '#C3002F';
const TEAL = '#1E7F72';

export default function BeamBuilderSVG({
  L,
  spanLabel,
  supports,
  loads,
  selectedId,
  onSelect,
  maxAbsM,
  momentPts,
  maxAbsV,
  showDeflection,
  labelFor, // (load) => string, 실제 값 라벨 (예: "q = 5.0 kN/m")
  getEditValue, // (item) => number|null, 인라인 편집칸에 보여줄 표시값(단위 환산됨) — null이면 편집 불가
  onEditValue, // (id, newDisplayValue) => void
  onMoveX, // (id, newXInMeters) => void — 드래그로 위치 이동
  onRemoveItem, // (id) => void — 드래그해서 쓰레기통에 놓거나 삭제
}) {
  const svgRef = useRef(null);
  const [drag, setDrag] = useState(null); // { id, x, overTrash }
  const [editingId, setEditingId] = useState(null);

  const w = 680;
  const beamY = 140;
  const padL = 40, padR = 70;
  const drawW = w - padL - padR;
  const xToPx = (x) => padL + (x / L) * drawW;
  const pxToX = (px) => Math.min(L, Math.max(0, ((px - padL) / drawW) * L));

  const trashCx = w - 30, trashCy = beamY - 50, trashR = 18;

  const hasDiagram = Array.isArray(momentPts) && momentPts.length > 1;
  const diagH = 80;
  const diagTop = 220;
  const mToPx = (m) => diagTop + diagH / 2 - (maxAbsM > 0 ? (m / maxAbsM) * (diagH / 2 - 6) : 0);
  const h = hasDiagram ? diagTop + diagH + 30 : beamY + 110;

  const spanY = beamY + 60;
  const maxBendPx = 26;
  const bendScale = showDeflection && maxAbsV > 0 ? maxBendPx / maxAbsV : 0;

  function svgPoint(clientX, clientY) {
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    return pt.matrixTransform(ctm.inverse());
  }

  // 마우스 이벤트로 드래그 구현. window 리스너를 useEffect로 걸면 React가 실제로 등록하기 전에
  // (특히 자동화 도구가 mousedown 직후 곧바로 mousemove/mouseup을 연달아 보내는 경우) 이벤트를
  // 놓칠 수 있어서, mousedown 핸들러 안에서 즉시(동기적으로) 등록/해제한다.
  function computeFromClient(clientX, clientY) {
    const p = svgPoint(clientX, clientY);
    const dx = p.x - trashCx, dy = p.y - trashCy;
    const overTrash = Math.sqrt(dx * dx + dy * dy) < trashR + 6;
    return { x: pxToX(p.x), overTrash };
  }

  function startDrag(e, id, currentX) {
    e.stopPropagation();
    e.preventDefault();
    let current = { id, x: currentX, overTrash: false };
    setDrag(current);
    onSelect(id);

    function handleMove(ev) {
      const { x, overTrash } = computeFromClient(ev.clientX, ev.clientY);
      current = { ...current, x, overTrash };
      setDrag(current);
    }
    function handleUp(ev) {
      const { x, overTrash } = computeFromClient(ev.clientX, ev.clientY);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      setDrag(null);
      if (overTrash) onRemoveItem(id);
      else onMoveX(id, x);
    }
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }

  const effectiveX = (id, fallback) => (drag && drag.id === id ? drag.x : fallback);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${w} ${h}`}
      style={{ width: '100%', maxWidth: 720, margin: '0 auto', display: 'block', overflow: 'visible', touchAction: 'none' }}
    >
      {/* 스팬 치수선 */}
      <line x1={padL} y1={spanY} x2={padL + drawW} y2={spanY} stroke="#8A97A2" strokeWidth="1" />
      <line x1={padL} y1={spanY - 4} x2={padL} y2={spanY + 4} stroke="#8A97A2" strokeWidth="1" />
      <line x1={padL + drawW} y1={spanY - 4} x2={padL + drawW} y2={spanY + 4} stroke="#8A97A2" strokeWidth="1" />
      <text x={padL + drawW / 2} y={spanY + 16} fontSize="12.5" fill="#8A97A2" textAnchor="middle" fontWeight="700">
        L = {spanLabel}
      </text>

      {/* 보 본체 */}
      <line x1={padL} y1={beamY} x2={padL + drawW} y2={beamY} stroke={GRAY} strokeWidth="4" />

      {/* 예상 처짐곡선 (점선, 실제 위치에 겹쳐서) */}
      {showDeflection && Array.isArray(momentPts) && momentPts.length > 1 && (
        <polyline
          points={momentPts.map((p) => `${xToPx(p.x)},${beamY + p.v * bendScale}`).join(' ')}
          fill="none"
          stroke={CRIMSON}
          strokeWidth="2"
          strokeDasharray="6 4"
        />
      )}

      {/* 드래그 중이면 쓰레기통 아이콘 표시 */}
      {drag && (
        <g opacity={drag.overTrash ? 1 : 0.45}>
          <circle cx={trashCx} cy={trashCy} r={trashR} fill={drag.overTrash ? CRIMSON : '#fff'} stroke={CRIMSON} strokeWidth="1.6" />
          <rect x={trashCx - 6} y={trashCy - 4} width="12" height="10" fill="none" stroke={drag.overTrash ? '#fff' : CRIMSON} strokeWidth="1.4" />
          <line x1={trashCx - 8} y1={trashCy - 6} x2={trashCx + 8} y2={trashCy - 6} stroke={drag.overTrash ? '#fff' : CRIMSON} strokeWidth="1.4" />
          <line x1={trashCx - 2} y1={trashCy - 9} x2={trashCx + 2} y2={trashCy - 9} stroke={drag.overTrash ? '#fff' : CRIMSON} strokeWidth="1.4" />
        </g>
      )}

      {/* 지지단 */}
      {supports.map((s) => {
        const x = xToPx(effectiveX(s.id, s.x));
        const isSel = s.id === selectedId;
        const isDragging = drag && drag.id === s.id;
        const ring = isSel ? <circle cx={x} cy={beamY} r="18" fill="none" stroke={CRIMSON} strokeWidth="1.5" strokeDasharray="3 2" /> : null;
        const opacity = isDragging && drag.overTrash ? 0.3 : 1;
        if (s.type === 'fixed') {
          return (
            <g key={s.id} opacity={opacity} onMouseDown={(e) => startDrag(e, s.id, s.x)} style={{ cursor: 'grab' }}>
              {ring}
              <rect x={x - 5} y={beamY - 22} width="10" height="44" fill={GRAY} />
              {Array.from({ length: 6 }).map((_, i) => (
                <line key={i} x1={x - 5} y1={beamY - 18 + i * 8} x2={x - 15} y2={beamY - 10 + i * 8} stroke={GRAY} strokeWidth="1.2" />
              ))}
            </g>
          );
        }
        return (
          <g key={s.id} opacity={opacity} onMouseDown={(e) => startDrag(e, s.id, s.x)} style={{ cursor: 'grab' }}>
            {ring}
            <polygon points={`${x},${beamY} ${x - 10},${beamY + 17} ${x + 10},${beamY + 17}`} fill="none" stroke={GRAY} strokeWidth="1.6" />
            {s.type === 'roller' && (
              <>
                <circle cx={x - 5} cy={beamY + 21} r="2.5" fill={GRAY} />
                <circle cx={x + 5} cy={beamY + 21} r="2.5" fill={GRAY} />
              </>
            )}
          </g>
        );
      })}

      {/* 하중 */}
      {loads.map((l) => {
        const isSel = l.id === selectedId;
        const stroke = isSel ? CRIMSON : TEAL;
        const isDragging = drag && drag.id === l.id;
        const opacity = isDragging && drag.overTrash ? 0.3 : 1;
        const label = labelFor ? labelFor(l) : '';
        const editVal = getEditValue ? getEditValue(l) : null;
        const isEditing = editingId === l.id;

        if (l.kind === 'point') {
          const x = xToPx(effectiveX(l.id, l.x));
          const down = l.P >= 0;
          const y1 = down ? beamY - 40 : beamY + 40;
          const y2 = down ? beamY - 4 : beamY + 4;
          const labelY = down ? y1 - 20 : y1 + 30;
          return (
            <g key={l.id} opacity={opacity}>
              <g onMouseDown={(e) => startDrag(e, l.id, l.x)} style={{ cursor: 'grab' }}>
                <line x1={x} y1={y1} x2={x} y2={y2} stroke={stroke} strokeWidth="2" />
                <polygon
                  points={
                    down
                      ? `${x},${y2 + 4} ${x - 5},${y2 - 6} ${x + 5},${y2 - 6}`
                      : `${x},${y2 - 4} ${x - 5},${y2 + 6} ${x + 5},${y2 + 6}`
                  }
                  fill={stroke}
                />
              </g>
              <EditableLabel
                x={x}
                y={labelY}
                text={label}
                color={stroke}
                editing={isEditing}
                editValue={editVal}
                onStartEdit={() => setEditingId(l.id)}
                onCommit={(v) => { onEditValue(l.id, v); setEditingId(null); }}
                onCancel={() => setEditingId(null)}
              />
            </g>
          );
        }
        if (l.kind === 'udl' || l.kind === 'triangle') {
          const xS = xToPx(l.xStart), xE = xToPx(l.xEnd);
          const qStart = l.kind === 'udl' ? l.q : l.qStart;
          const qEnd = l.kind === 'udl' ? l.q : l.qEnd;
          const maxQ = Math.max(Math.abs(qStart), Math.abs(qEnd), 1e-9);
          const scale = 34 / maxQ;
          const n = Math.max(2, Math.round((xE - xS) / 22));
          const arrows = [];
          for (let i = 0; i <= n; i++) {
            const t = i / n;
            const x = xS + (xE - xS) * t;
            const q = qStart + (qEnd - qStart) * t;
            const down = q >= 0;
            const len = Math.max(6, Math.abs(q) * scale);
            const yTail = down ? beamY - 6 - len : beamY + 6 + len;
            const yHead = down ? beamY - 6 : beamY + 6;
            arrows.push(
              <g key={i}>
                <line x1={x} y1={yTail} x2={x} y2={yHead} stroke={stroke} strokeWidth="1.4" />
                <polygon
                  points={
                    down
                      ? `${x},${yHead + 3} ${x - 3.5},${yHead - 5} ${x + 3.5},${yHead - 5}`
                      : `${x},${yHead - 3} ${x - 3.5},${yHead + 5} ${x + 3.5},${yHead + 5}`
                  }
                  fill={stroke}
                />
              </g>
            );
          }
          const topPts = Array.from({ length: n + 1 }).map((_, i) => {
            const t = i / n;
            const x = xS + (xE - xS) * t;
            const q = qStart + (qEnd - qStart) * t;
            const down = q >= 0;
            const len = Math.max(6, Math.abs(q) * scale);
            const y = down ? beamY - 6 - len : beamY + 6 + len;
            return `${x},${y}`;
          });
          return (
            <g key={l.id} opacity={opacity} onClick={() => onSelect(l.id)}>
              <polyline points={topPts.join(' ')} fill="none" stroke={stroke} strokeWidth="1.4" style={{ cursor: 'pointer' }} />
              {arrows}
              <EditableLabel
                x={(xS + xE) / 2}
                y={beamY - 6 - 34 - 10}
                text={label}
                color={stroke}
                editing={isEditing}
                editValue={editVal}
                onStartEdit={() => (l.kind === 'udl' ? setEditingId(l.id) : null)}
                onCommit={(v) => { onEditValue(l.id, v); setEditingId(null); }}
                onCancel={() => setEditingId(null)}
              />
            </g>
          );
        }
        if (l.kind === 'moment') {
          const x = xToPx(effectiveX(l.id, l.x));
          const ccw = l.M0 >= 0;
          const r = 16;
          const cy = beamY - 34;
          const start = ccw ? -0.3 : Math.PI + 0.3;
          const end = ccw ? Math.PI - 0.3 : -Math.PI + 0.3;
          const p1 = { x: x + r * Math.cos(start), y: cy + r * Math.sin(start) };
          const p2 = { x: x + r * Math.cos(end), y: cy + r * Math.sin(end) };
          const sweep = ccw ? 0 : 1;
          const tipAng = end + (ccw ? -0.5 : 0.5);
          return (
            <g key={l.id} opacity={opacity}>
              <g onMouseDown={(e) => startDrag(e, l.id, l.x)} style={{ cursor: 'grab' }}>
                <path d={`M ${p1.x} ${p1.y} A ${r} ${r} 0 0 ${sweep} ${p2.x} ${p2.y}`} fill="none" stroke={stroke} strokeWidth="2" />
                <polygon
                  points={`${p2.x},${p2.y} ${p2.x - 6 * Math.cos(tipAng - 0.4)},${p2.y - 6 * Math.sin(tipAng - 0.4)} ${p2.x - 6 * Math.cos(tipAng + 0.4)},${p2.y - 6 * Math.sin(tipAng + 0.4)}`}
                  fill={stroke}
                />
                <line x1={x} y1={cy + r} x2={x} y2={beamY} stroke={stroke} strokeWidth="1.2" strokeDasharray="2 2" />
              </g>
              <EditableLabel
                x={x}
                y={cy - r - 10}
                text={label}
                color={stroke}
                editing={isEditing}
                editValue={editVal}
                onStartEdit={() => setEditingId(l.id)}
                onCommit={(v) => { onEditValue(l.id, v); setEditingId(null); }}
                onCancel={() => setEditingId(null)}
              />
            </g>
          );
        }
        return null;
      })}

      {/* M(x) 다이어그램 */}
      {hasDiagram && (
        <g>
          <line x1={padL} y1={diagTop + diagH / 2} x2={padL + drawW} y2={diagTop + diagH / 2} stroke="#8A97A2" strokeWidth="1" />
          <polyline
            points={momentPts.map((p) => `${xToPx(p.x)},${mToPx(p.M)}`).join(' ')}
            fill="none"
            stroke={CRIMSON}
            strokeWidth="1.8"
          />
          <text x={padL} y={diagTop - 8} fontSize="12.5" fill="#8A97A2" fontWeight="700">
            M(x) 다이어그램
          </text>
        </g>
      )}
    </svg>
  );
}

// 하중 값 라벨 — 클릭하면 바로 입력칸으로 바뀌는 작은 헬퍼 (CompositeBeams의 EditableDimText와 같은 패턴).
function EditableLabel({ x, y, text, color, editing, editValue, onStartEdit, onCommit, onCancel }) {
  const boxW = 96, boxH = 20;
  if (editing && editValue !== null && editValue !== undefined) {
    return (
      <foreignObject x={x - boxW / 2} y={y - boxH / 2 - 2} width={boxW} height={boxH} style={{ overflow: 'visible' }}>
        <input
          type="number"
          step="any"
          autoFocus
          defaultValue={editValue}
          style={{
            width: '100%',
            height: '100%',
            fontSize: 12.5,
            fontWeight: 700,
            color,
            border: `1.3px solid ${color}`,
            borderRadius: 4,
            textAlign: 'center',
            padding: '0 2px',
            fontFamily: "'JetBrains Mono',monospace",
            background: '#fff',
            boxSizing: 'border-box',
          }}
          onClick={(e) => e.stopPropagation()}
          onBlur={(e) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v)) onCommit(v);
            else onCancel();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.target.blur();
            if (e.key === 'Escape') onCancel();
          }}
        />
      </foreignObject>
    );
  }
  const clickable = editValue !== null && editValue !== undefined;
  return (
    <text
      x={x}
      y={y}
      fontSize="13"
      fontWeight="800"
      fill={color}
      textAnchor="middle"
      style={{ cursor: clickable ? 'pointer' : 'default' }}
      onClick={(e) => {
        e.stopPropagation();
        if (clickable) onStartEdit();
      }}
    >
      {text}
    </text>
  );
}
