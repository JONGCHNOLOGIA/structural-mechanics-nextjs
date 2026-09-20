'use client';

import { useRef, useState } from 'react';
import { Dim } from './EditableDim';

// 보 빌더(Bending-Moment Equation)의 VISUALIZER — 지지단·하중 아이콘을 실제 위치에 그리고,
// 드래그로 옮기거나(쓰레기통에 놓으면 삭제) 값 라벨을 클릭해서 바로 수정할 수 있게 함.
// support 아이콘: fixed=벽(해칭), pin=삼각형, roller=삼각형+원.
// load 아이콘: point=화살표(위=아래로 꽂힘, 아래=위로 꽂힘), udl/triangle=화살표 열+상단선, moment=곡선 화살표.

const GRAY = '#51626F';
const CRIMSON = '#C3002F';
const TEAL = '#1E7F72';
const BLUE = '#2D6CDF';

const SUPPORT_GHOST_LABEL = { fixed: '고정', pin: '힌지', roller: '롤러' };

export default function BeamBuilderSVG({
  L,
  spanLabel,
  spanValue, // spanLabel의 숫자 부분(표시 단위 기준) — L 라벨 인라인 편집용
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
  onResizeLoad, // (id, edge:'start'|'end', newXInMeters) => void — 분포하중 양 끝 리사이즈
  onEditL, // (newDisplayValue) => void — 스팬 L 라벨 클릭 편집
  formatX, // (xInMeters) => string — 집중하중 위치 치수선 라벨 포맷터
  // 계산이 끝났을 때 각 지점의 반력을 보 위에 직접 그려준다. 결과 표를 따로 읽지 않아도
  // "어디서 얼마로 받치고 있는지"가 그림에서 보여야 한다는 요청 때문.
  // [{ x, Fy, M, type, letter, fyLabel, mLabel }] — 라벨은 단위를 아는 부르는 쪽에서 만들어 넘긴다.
  reactions = [],
}) {
  const svgRef = useRef(null);
  const [drag, setDrag] = useState(null); // { id, overTrash, px, py, ghostLabel }

  const w = 680;
  const beamY = 140;
  // 보의 반두께(px). 실제 단면 치수가 아니라 "보처럼 보이게" 하는 그림용 두께다.
  const BEAM_HALF = 9;
  // 드래그 과녁의 반지름(px). 보이는 아이콘과 별개로, 투명한 원을 덧대 여기까지 잡히게 한다.
  const HIT_R = 14;
  const padL = 40, padR = 70;
  const drawW = w - padL - padR;
  const xToPx = (x) => padL + (x / L) * drawW;
  const pxToX = (px) => Math.min(L, Math.max(0, ((px - padL) / drawW) * L));

  const trashCx = w - 30, trashCy = beamY - 50, trashR = 18;

  // 반력을 그리면 보 아래로 화살표 + 값이 한 줄 더 들어가므로, 스팬 치수선과 다이어그램을
  // 그만큼 아래로 민다. 반력이 없으면 예전 간격 그대로다.
  const hasReactions = reactions.length > 0;
  const reactTop = beamY + 34;   // 화살촉이 닿는 높이
  const reactBase = beamY + 66;  // 화살표 꼬리
  const spanShift = hasReactions ? 62 : 0;

  const hasDiagram = Array.isArray(momentPts) && momentPts.length > 1;
  const diagH = 80;
  const diagTop = 260 + spanShift;
  const mToPx = (m) => diagTop + diagH / 2 - (maxAbsM > 0 ? (m / maxAbsM) * (diagH / 2 - 6) : 0);
  const h = hasDiagram ? diagTop + diagH + 30 : beamY + 110 + spanShift;

  const spanY = beamY + 60 + spanShift;
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

  // 포인터 이벤트로 드래그 구현 — 마우스 전용(onMouseDown)이던 걸 바꿨다. 태블릿·터치스크린에서
  // 하중을 못 잡겠다는 얘기가 있었는데, 마우스 이벤트는 터치에서 브라우저가 흉내만 내주는 거라
  // 놓치는 경우가 잦다. 포인터 이벤트는 마우스·터치·펜을 한 종류로 받는다.
  //
  // window 리스너를 useEffect로 걸면 React가 실제로 등록하기 전에 (특히 자동화 도구가 down 직후
  // 곧바로 move/up을 연달아 보내는 경우) 이벤트를 놓칠 수 있어서, down 핸들러 안에서
  // 즉시(동기적으로) 등록/해제한다.
  function computeFromClient(clientX, clientY) {
    const p = svgPoint(clientX, clientY);
    const dx = p.x - trashCx, dy = p.y - trashCy;
    const overTrash = Math.sqrt(dx * dx + dy * dy) < trashR + 6;
    return { x: pxToX(p.x), px: p.x, py: p.y, overTrash };
  }

  // 항목을 집어드는 것처럼 보이도록, 실제 아이콘은 원래 자리에 흐리게 남겨두고 커서를 따라다니는
  // "고스트"(그림자 달린 작은 배지)만 이동시킨다. 마우스를 떼면 그제서야 실제 위치가 갱신된다.
  function startDrag(e, id, currentX, ghostLabel) {
    e.stopPropagation();
    e.preventDefault();
    const start = computeFromClient(e.clientX, e.clientY);
    let current = { id, overTrash: false, px: start.px, py: start.py, ghostLabel };
    setDrag(current);
    onSelect(id);

    function handleMove(ev) {
      const { px, py, overTrash } = computeFromClient(ev.clientX, ev.clientY);
      current = { ...current, px, py, overTrash };
      setDrag(current);
    }
    function handleUp(ev) {
      const { x, overTrash } = computeFromClient(ev.clientX, ev.clientY);
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
      setDrag(null);
      if (overTrash) onRemoveItem(id);
      else onMoveX(id, x);
    }
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
  }

  // 분포하중(UDL/삼각형)의 양 끝을 잡아 span을 늘리거나 줄이는 리사이즈 드래그.
  function startResizeDrag(e, id, edge) {
    e.stopPropagation();
    e.preventDefault();

    function handleMove(ev) {
      const { x } = computeFromClient(ev.clientX, ev.clientY);
      onResizeLoad(id, edge, x);
    }
    function handleUp() {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    }
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
  }

  const isDraggingId = (id) => !!(drag && drag.id === id);

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
      <EditableLabel
        x={padL + drawW / 2}
        y={spanY + 16}
        text={`L = ${spanLabel}`}
        color="#8A97A2"
        editValue={onEditL ? spanValue : null}
        onCommit={onEditL}
      />

      {/* 보 본체 */}
      {/* 보 본체 — 선 한 줄이 아니라 실제 보처럼 위아래로 두께를 준다.
          두꺼워야 "보"로 보이기도 하고, 하중을 끌어다 놓을 과녁도 그만큼 넓어진다. */}
      <rect
        x={padL}
        y={beamY - BEAM_HALF}
        width={drawW}
        height={BEAM_HALF * 2}
        fill="#E7E4DC"
        stroke={GRAY}
        strokeWidth="1.4"
      />
      <line x1={padL} y1={beamY} x2={padL + drawW} y2={beamY} stroke="#B9C2C9" strokeWidth="1" strokeDasharray="5 4" />

      {/* 반력 — 위로 받치면 화살표가 위를 향하고, 아래로 당기면(들림) 반대로 향한다.
          고정단은 힘에 더해 모멘트도 받으므로 회전 화살표를 같이 그린다. */}
      {reactions.map((rx, i) => {
        const x = xToPx(rx.x);
        const up = (rx.Fy || 0) >= 0;
        const tail = up ? reactBase : reactTop;
        const head = up ? reactTop : reactBase;
        return (
          <g key={`react-${i}`}>
            <line x1={x} y1={tail} x2={x} y2={head} stroke={TEAL} strokeWidth="2.2" />
            <polygon
              points={
                up
                  ? `${x},${head - 2} ${x - 5},${head + 8} ${x + 5},${head + 8}`
                  : `${x},${head + 2} ${x - 5},${head - 8} ${x + 5},${head - 8}`
              }
              fill={TEAL}
            />
            <text x={x} y={reactBase + 14} fontSize="10.5" fill={TEAL} textAnchor="middle" fontWeight="800">
              {rx.fyLabel}
            </text>
            {rx.type === 'fixed' && rx.mLabel && (
              <>
                <path
                  d={`M ${x - 17} ${beamY + 2} A 17 17 0 1 ${(rx.M || 0) >= 0 ? 1 : 0} ${x + 17} ${beamY + 2}`}
                  fill="none"
                  stroke={TEAL}
                  strokeWidth="1.8"
                />
                <polygon points={`${x + 17},${beamY + 2} ${x + 11},${beamY - 6} ${x + 23},${beamY - 4}`} fill={TEAL} />
                <text x={x} y={reactBase + 27} fontSize="10.5" fill={TEAL} textAnchor="middle" fontWeight="800">
                  {rx.mLabel}
                </text>
              </>
            )}
          </g>
        );
      })}

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

      {/* 드래그 "고스트" — 실제 아이콘은 원래 자리에 흐리게 남기고, 그림자 달린 배지가 커서를 따라다녀서
          손으로 집어 든 느낌을 준다. 놓으면(mouseup) 그제서야 실제 위치가 갱신된다. */}
      {drag && (
        <g
          transform={`translate(${drag.px}, ${drag.py - 22})`}
          style={{ pointerEvents: 'none', filter: 'drop-shadow(0px 5px 6px rgba(20,20,30,0.35))', transition: 'opacity 120ms' }}
          opacity={drag.overTrash ? 0.5 : 1}
        >
          <rect x="-24" y="-14" width="48" height="28" rx="8" fill="#fff" stroke={drag.overTrash ? CRIMSON : GRAY} strokeWidth="1.6" />
          <text x="0" y="5" fontSize="12.5" fontWeight="800" fill={drag.overTrash ? CRIMSON : GRAY} textAnchor="middle">
            {drag.ghostLabel}
          </text>
        </g>
      )}

      {/* 지지단 */}
      {supports.map((s) => {
        const x = xToPx(s.x);
        const isSel = s.id === selectedId;
        const isDragging = isDraggingId(s.id);
        const ring = isSel ? <circle cx={x} cy={beamY} r="18" fill="none" stroke={CRIMSON} strokeWidth="1.5" strokeDasharray="3 2" /> : null;
        const opacity = isDragging ? 0.3 : 1;
        if (s.type === 'fixed') {
          return (
            <g key={s.id} opacity={opacity} onPointerDown={(e) => startDrag(e, s.id, s.x, SUPPORT_GHOST_LABEL.fixed)} style={{ cursor: 'grab' }}>
              <rect x={x - HIT_R} y={beamY - HIT_R - 10} width={HIT_R * 2} height={HIT_R * 2 + 24} fill="transparent" />
              {ring}
              <rect x={x - 5} y={beamY - 22} width="10" height="44" fill={GRAY} />
              {Array.from({ length: 6 }).map((_, i) => (
                <line key={i} x1={x - 5} y1={beamY - 18 + i * 8} x2={x - 15} y2={beamY - 10 + i * 8} stroke={GRAY} strokeWidth="1.2" />
              ))}
            </g>
          );
        }
        return (
          <g key={s.id} opacity={opacity} onPointerDown={(e) => startDrag(e, s.id, s.x, SUPPORT_GHOST_LABEL[s.type])} style={{ cursor: 'grab' }}>
            <rect x={x - HIT_R} y={beamY - 8} width={HIT_R * 2} height={HIT_R * 2 + 14} fill="transparent" />
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
        const isDragging = isDraggingId(l.id);
        const opacity = isDragging ? 0.3 : 1;
        const label = labelFor ? labelFor(l) : '';
        const editVal = getEditValue ? getEditValue(l) : null;

        if (l.kind === 'point') {
          const x = xToPx(l.x);
          const down = l.P >= 0;
          const y1 = down ? beamY - 40 : beamY + 40;
          const y2 = down ? beamY - 4 : beamY + 4;
          const labelY = down ? y1 - 20 : y1 + 30;
          return (
            <g key={l.id} opacity={opacity}>
              <g onPointerDown={(e) => startDrag(e, l.id, l.x, 'P')} style={{ cursor: 'grab' }}>
                <rect x={x - HIT_R} y={Math.min(y1, y2) - 6} width={HIT_R * 2} height={Math.abs(y2 - y1) + 12} fill="transparent" />
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
                editValue={editVal}
                onCommit={(v) => onEditValue(l.id, v)}
              />
              {/* 선택되어 있을 때만, 왼쪽 끝에서 하중 위치까지 치수선 표시 (분포하중 스팬 표시와 같은 느낌) */}
              {isSel && x > padL + 6 && (
                <g>
                  <line x1={padL} y1={spanY - 22} x2={x} y2={spanY - 22} stroke={stroke} strokeWidth="1" strokeDasharray="3 2" />
                  <line x1={padL} y1={spanY - 26} x2={padL} y2={spanY - 18} stroke={stroke} strokeWidth="1" />
                  <line x1={x} y1={spanY - 26} x2={x} y2={spanY - 18} stroke={stroke} strokeWidth="1" />
                  <text x={(padL + x) / 2} y={spanY - 30} fontSize="11" fill={stroke} textAnchor="middle" fontWeight="700">
                    {formatX ? `x = ${formatX(l.x)}` : ''}
                  </text>
                </g>
              )}
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
          const handleY = Math.min(
            qStart >= 0 ? beamY - 6 - Math.max(6, Math.abs(qStart) * scale) : beamY + 6 + Math.max(6, Math.abs(qStart) * scale),
            qEnd >= 0 ? beamY - 6 - Math.max(6, Math.abs(qEnd) * scale) : beamY + 6 + Math.max(6, Math.abs(qEnd) * scale)
          );
          return (
            <g key={l.id} opacity={opacity} onClick={() => onSelect(l.id)}>
              <polyline points={topPts.join(' ')} fill="none" stroke={stroke} strokeWidth="1.4" style={{ cursor: 'pointer' }} />
              {arrows}
              {/* 양 끝 리사이즈 핸들 — PPT 사각형처럼 잡고 끌면 xStart/xEnd가 바뀐다 (보 길이 안에서만) */}
              {onResizeLoad && (
                <>
                  {/* 손잡이는 작게 보이는 게 예쁘지만 그대로는 잡기가 너무 어렵다(지름 12px).
                      보이는 원은 그대로 두고, 그 위에 투명한 큰 원을 덧대 과녁만 28px로 넓힌다. */}
                  <circle cx={xS} cy={handleY} r="6" fill="#fff" stroke={stroke} strokeWidth="1.8" style={{ pointerEvents: 'none' }} />
                  <circle cx={xS} cy={handleY} r={HIT_R} fill="transparent" style={{ cursor: 'ew-resize' }}
                    onPointerDown={(e) => startResizeDrag(e, l.id, 'start')} />
                  <circle cx={xE} cy={handleY} r="6" fill="#fff" stroke={stroke} strokeWidth="1.8" style={{ pointerEvents: 'none' }} />
                  <circle cx={xE} cy={handleY} r={HIT_R} fill="transparent" style={{ cursor: 'ew-resize' }}
                    onPointerDown={(e) => startResizeDrag(e, l.id, 'end')} />
                </>
              )}
              <EditableLabel
                x={(xS + xE) / 2}
                y={beamY - 6 - 34 - 10}
                text={label}
                color={stroke}
                editValue={l.kind === 'udl' ? editVal : null}
                onCommit={(v) => onEditValue(l.id, v)}
              />
              {/* 선택되어 있을 때(또는 끝을 리사이즈하는 중일 때) 현재 span 길이를 치수선으로 표시 —
                  양 끝을 끌어서 줄이거나 늘리는 만큼 실시간으로 갱신된다. */}
              {isSel && (
                <g>
                  <line x1={xS} y1={spanY - 22} x2={xE} y2={spanY - 22} stroke={stroke} strokeWidth="1" strokeDasharray="3 2" />
                  <line x1={xS} y1={spanY - 26} x2={xS} y2={spanY - 18} stroke={stroke} strokeWidth="1" />
                  <line x1={xE} y1={spanY - 26} x2={xE} y2={spanY - 18} stroke={stroke} strokeWidth="1" />
                  <text x={(xS + xE) / 2} y={spanY - 30} fontSize="11" fill={stroke} textAnchor="middle" fontWeight="700">
                    {formatX ? formatX(l.xEnd - l.xStart) : ''}
                  </text>
                </g>
              )}
              {/* 하중이 보 전체를 덮지 않을 때, 남는 구간(하중이 없는 부분) 길이를 파란색으로 별도 표시 */}
              {isSel && l.xEnd < L - 1e-6 && (
                <g>
                  <line x1={xE} y1={spanY - 22} x2={padL + drawW} y2={spanY - 22} stroke={BLUE} strokeWidth="1" strokeDasharray="3 2" />
                  <line x1={xE} y1={spanY - 26} x2={xE} y2={spanY - 18} stroke={BLUE} strokeWidth="1" />
                  <line x1={padL + drawW} y1={spanY - 26} x2={padL + drawW} y2={spanY - 18} stroke={BLUE} strokeWidth="1" />
                  <text x={(xE + padL + drawW) / 2} y={spanY - 30} fontSize="11" fill={BLUE} textAnchor="middle" fontWeight="700">
                    {formatX ? formatX(L - l.xEnd) : ''}
                  </text>
                </g>
              )}
              {isSel && l.xStart > 1e-6 && (
                <g>
                  <line x1={padL} y1={spanY - 22} x2={xS} y2={spanY - 22} stroke={BLUE} strokeWidth="1" strokeDasharray="3 2" />
                  <line x1={padL} y1={spanY - 26} x2={padL} y2={spanY - 18} stroke={BLUE} strokeWidth="1" />
                  <line x1={xS} y1={spanY - 26} x2={xS} y2={spanY - 18} stroke={BLUE} strokeWidth="1" />
                  <text x={(padL + xS) / 2} y={spanY - 30} fontSize="11" fill={BLUE} textAnchor="middle" fontWeight="700">
                    {formatX ? formatX(l.xStart) : ''}
                  </text>
                </g>
              )}
            </g>
          );
        }
        if (l.kind === 'moment') {
          const x = xToPx(l.x);
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
              <g onPointerDown={(e) => startDrag(e, l.id, l.x, 'M₀')} style={{ cursor: 'grab' }}>
                <rect x={x - r - 4} y={cy - r - 4} width={(r + 4) * 2} height={r + 4 + (beamY - cy)} fill="transparent" />
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
                editValue={editVal}
                onCommit={(v) => onEditValue(l.id, v)}
              />
            </g>
          );
        }
        return null;
      })}

      {/* M(x) 다이어그램 — 가로축(x)과 세로축(M)을 화살표로 그려서 어느 쪽이 무엇인지 보이게 한다.
          예전에는 0 기준선 한 줄뿐이라 "무엇에 대한 그래프인지"가 그림에 없었다. */}
      {hasDiagram && (
        <g>
          {/* 세로축 M */}
          <line x1={padL - 14} y1={diagTop + diagH + 4} x2={padL - 14} y2={diagTop - 6} stroke="#8A97A2" strokeWidth="1.1" />
          <polygon points={`${padL - 14},${diagTop - 10} ${padL - 17.5},${diagTop - 3} ${padL - 10.5},${diagTop - 3}`} fill="#8A97A2" />
          <text x={padL - 20} y={diagTop - 6} fontSize="11" fill="#8A97A2" textAnchor="end" fontWeight="800">M</text>

          {/* 가로축 x (= 0 기준선) */}
          <line x1={padL - 14} y1={diagTop + diagH / 2} x2={padL + drawW + 16} y2={diagTop + diagH / 2} stroke="#8A97A2" strokeWidth="1.1" />
          <polygon
            points={`${padL + drawW + 20},${diagTop + diagH / 2} ${padL + drawW + 13},${diagTop + diagH / 2 - 3.5} ${padL + drawW + 13},${diagTop + diagH / 2 + 3.5}`}
            fill="#8A97A2"
          />
          <text x={padL + drawW + 24} y={diagTop + diagH / 2 + 4} fontSize="11" fill="#8A97A2" fontWeight="800">x</text>
          <text x={padL - 20} y={diagTop + diagH / 2 + 4} fontSize="10" fill="#8A97A2" textAnchor="end">0</text>

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

// 하중 값 라벨. 라벨 문자열은 부르는 쪽에서 이미 만들어 두므로(예: "q = 5.0 kN/m") 그대로 넘기고,
// 클릭 → 입력칸 동작은 공용 치수 부품(EditableDim)에 맡긴다. editValue가 null이면 고칠 수 없는 값이라
// 글씨로만 그린다.
function EditableLabel({ x, y, text, color, editValue, onCommit }) {
  const editable = editValue !== null && editValue !== undefined;
  return (
    <Dim
      x={x}
      y={y}
      text={text}
      value={editValue}
      color={color}
      fontSize={12.5}
      fontWeight={700}
      boxW={96}
      min={null}
      onChange={editable ? onCommit : undefined}
    />
  );
}

