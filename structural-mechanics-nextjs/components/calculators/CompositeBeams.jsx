'use client';

import { useState, useMemo } from 'react';
import { UNIT_OPTIONS, fmt, fmtSci, blockColor, EFor, cbSliderRangeFor } from '@/lib/calc/unitOptions';
import { computeComposite, isDoublySymmetric } from '@/lib/calc/compositeBeams';

/*
  프로토타입(HTML 데모)의 renderCompositeBeams()를 React로 옮긴 버전.

  ▸ 달라진 점 (React가 대신 해주는 부분)
    - 예전엔 슬라이더가 재생성되며 드래그가 끊기지 않도록 #cbVizWrap만 따로
      innerHTML로 갱신하는 우회 코드가 필요했음. React에서는 그냥 useState로
      값만 바꾸면 되고, React가 알아서 "바뀐 DOM만" 업데이트해줘서 그 우회
      코드가 통째로 필요 없어짐.
    - onclick="cbUpdateBlock(...)" 같은 문자열 기반 핸들러 → onChange={...} 로 교체.

  ▸ 아직 이 파일에 옮기지 않은 것 (프로토타입 HTML에는 있음, 다음 포팅 대상)
    - 블록 드래그로 순서 바꾸기 (cbDragStart/cbDrop)
    - "Doubly symmetric section" On/Off 토글 (cbMakeSandwich)
    - 계산식 각 기호에 마우스 올리면 설명 뜨는 tip() 툴팁
    - y 기준점(하단/상단) 토글
    - Neutral Axis/Inertia/Stress 섹션을 버튼 눌러야 계산하는 "on-demand" 방식
      (여기서는 단순화해서 값 바뀌면 바로 다시 계산되게 함 — React라 매번
      다시 계산해도 성능 부담이 거의 없어서, 오히려 이 방식이 더 자연스러움)
*/

let nextColorId = 2; // 컴포넌트 바깥에 두면 리렌더링 때마다 리셋 안 됨(리렌더마다 새로 만들면 안 되니까)

function makeInitialBlocks() {
  return [
    { colorId: 0, width: 4 * 0.0254, height: 0.5 * 0.0254, E: 30000 * 6894757, EUnit: 'ksi' },
    { colorId: 1, width: 4 * 0.0254, height: 6 * 0.0254, E: 1500 * 6894757, EUnit: 'ksi' },
  ];
}

export default function CompositeBeams() {
  const [units, setUnits] = useState({ length: 'in', stress: 'psi', moment: 'kip·in' });
  const [blocks, setBlocks] = useState(makeInitialBlocks); // 시작값은 예시로 채워둠(실제 배포 시 빈 배열로 바꿔도 됨)
  const [moment, setMoment] = useState(60 * 112.9848);

  const lenF = UNIT_OPTIONS.length[units.length];
  const stressF = UNIT_OPTIONS.stress[units.stress];
  const momF = UNIT_OPTIONS.moment[units.moment];
  const disp = (base, factor) => base / factor;

  // 값이 바뀔 때마다 다시 계산 (React라 이 정도는 매번 계산해도 전혀 부담 없음)
  const result = useMemo(() => (blocks.length ? computeComposite(blocks, moment) : null), [blocks, moment]);
  const symmetric3 = blocks.length === 3 && result && isDoublySymmetric(blocks);

  function updateBlockField(index, field, value) {
    const factor = field === 'E' ? UNIT_OPTIONS.E[blocks[index].EUnit] : lenF;
    const val = parseFloat(value);
    if (isNaN(val) || val <= 0) return;
    const newVal = val * factor;
    const cid = blocks[index].colorId;
    setBlocks((prev) => prev.map((b, j) => (b.colorId === cid ? { ...b, [field]: newVal } : b)));
  }

  function addBlock() {
    setBlocks((prev) => {
      const last = prev[prev.length - 1];
      const next = last
        ? { colorId: nextColorId++, width: last.width, height: last.height, E: last.E, EUnit: last.EUnit }
        : { colorId: nextColorId++, width: 1 * lenF, height: 1 * lenF, E: 1 * UNIT_OPTIONS.E.ksi, EUnit: 'ksi' };
      return [...prev, next];
    });
  }

  function removeBlock(index) {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="grid grid-cols-[280px_1fr_300px] gap-6 max-w-[1600px] mx-auto p-6">
      {/* ---------------- Setting Menu ---------------- */}
      <div className="bg-white border border-line rounded-2xl p-5">
        <h3 className="text-crimson text-xs font-extrabold mb-4">SETTING MENU</h3>

        {blocks
          .slice()
          .map((b, i) => i) // 원본 인덱스 유지하며 위→아래(top→bottom) 순서로 보여주기
          .reverse()
          .map((i) => {
            const b = blocks[i];
            const c = blockColor(b);
            return (
              <div key={i} className="border border-line rounded-xl p-3 mb-3 bg-bg relative">
                <div className="text-xs font-extrabold text-ink mb-2">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-sm mr-1.5 align-middle"
                    style={{ background: c.stroke }}
                  />
                  {c.name} Block{i === 0 ? ' · bottom' : i === blocks.length - 1 ? ' · top' : ''}
                </div>
                <button
                  className="absolute top-2 right-2 w-5 h-5 rounded-full border border-line text-graySoft text-xs"
                  onClick={() => removeBlock(i)}
                >
                  ×
                </button>
                <Field label="Width">
                  <input
                    type="number"
                    className="field-input"
                    defaultValue={fmt(disp(b.width, lenF))}
                    onBlur={(e) => updateBlockField(i, 'width', e.target.value)}
                  />
                </Field>
                <Field label="Height">
                  <input
                    type="number"
                    className="field-input"
                    defaultValue={fmt(disp(b.height, lenF))}
                    onBlur={(e) => updateBlockField(i, 'height', e.target.value)}
                  />
                </Field>
                <Field label="E">
                  <input
                    type="number"
                    className="field-input"
                    defaultValue={fmt(disp(b.E, EFor(b)))}
                    onBlur={(e) => updateBlockField(i, 'E', e.target.value)}
                  />
                </Field>
              </div>
            );
          })}

        <button
          className="w-full py-2 mb-4 border border-dashed border-crimson text-crimson rounded-xl text-sm font-bold"
          onClick={addBlock}
        >
          + 블록 추가
        </button>

        <Field label="Moment M">
          <input
            type="number"
            className="field-input"
            defaultValue={fmt(disp(moment, momF))}
            onBlur={(e) => setMoment(parseFloat(e.target.value) * momF)}
          />
        </Field>
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="bg-white border border-line rounded-2xl p-6">
        <h3 className="text-crimson text-xs font-extrabold mb-4">
          VISUALIZER <span className="ml-2 text-[10px] bg-tealSoft text-teal rounded-full px-2 py-0.5">실시간</span>
        </h3>

        {result ? (
          <>
            <CrossSectionSVG result={result} lenF={lenF} stressF={stressF} units={units} />
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <ResultCard label="중립축 위치 (하단 기준)" value={`${fmt(disp(result.ybar, lenF))} ${units.length}`} />
              <ResultCard label="ΣEI" value={`${fmtSci(result.EIsum)} N·m²`} />
            </div>
            {symmetric3 && (
              <p className="text-xs text-graySoft mt-3">
                ✓ 좌우상하 대칭 샌드위치 구조 감지됨 — Approximate Theory 섹션도 추가 가능 (프로토타입 참고)
              </p>
            )}
          </>
        ) : (
          <div className="text-graySoft text-sm border-2 border-dashed border-line rounded-xl p-16 text-center">
            왼쪽에서 블록을 추가하면 단면과 응력 분포가 여기에 나타납니다.
          </div>
        )}
      </div>

      {/* ---------------- AI Tutor (자리만, 다음 단계에서 실제 API 연결) ---------------- */}
      <div className="bg-white border border-line rounded-2xl p-5 sticky top-6 self-start">
        <h3 className="text-crimson text-xs font-extrabold mb-4">
          AI TUTOR <span className="ml-2 text-[10px] bg-crimsonSoft text-crimson rounded-full px-2 py-0.5">준비중</span>
        </h3>
        <div className="text-sm text-gray bg-crimsonSoft rounded-xl p-3 mb-3">
          여기서 계산된 값을 컨텍스트로 Claude API를 호출하는 서버 라우트(app/api/tutor/route.js)를
          다음 단계에서 연결하면 돼요.
        </div>
        <input className="field-input mb-2" placeholder="질문을 입력하세요" disabled />
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="mb-3">
      <label className="block text-xs text-gray font-bold mb-1">{label}</label>
      {children}
    </div>
  );
}

function ResultCard({ label, value }) {
  return (
    <div className="bg-bg border border-line rounded-xl p-3">
      <div className="text-[11px] text-graySoft font-bold">{label}</div>
      <div className="text-sm font-extrabold mt-0.5">{value}</div>
    </div>
  );
}

// 단면 + 응력 다이어그램 SVG. 프로토타입의 cbBuildVizSVGs()와 로직은 동일하고,
// 문자열 조립 대신 JSX로 값만 바꿔서 그림 (React 표준 방식)
function CrossSectionSVG({ result, lenF, stressF, units }) {
  const disp = (b, f) => b / f;
  const svgW = 420, svgH = 320;
  const padTop = 30, padBottom = 30, padLeft = 60, padRight = 160;
  const drawH = svgH - padTop - padBottom;
  const drawW = svgW - padLeft - padRight;
  const maxWidth = Math.max(...result.blocks.map((b) => b.width));
  const scale = Math.min(drawW / maxWidth, drawH / result.totalHeight);
  const centerX = padLeft + drawW / 2;
  const yToPx = (y) => padTop + (result.totalHeight - y) * scale;

  const stressPts = [];
  result.blocks.forEach((b, i) => {
    stressPts.push({ y: b.yBottom, s: result.stressAt(b.yBottom, b.E), blockIdx: i });
    stressPts.push({ y: b.yTop, s: result.stressAt(b.yTop, b.E), blockIdx: i });
  });
  const maxAbsStress = Math.max(1e-9, ...stressPts.map((p) => Math.abs(p.s)));
  const diagCenterX = centerX + (maxWidth * scale) / 2 + 90;
  const diagHalfW = 60;
  const sToPx = (s) => diagCenterX + (s / maxAbsStress) * diagHalfW;
  const naY = yToPx(result.ybar);

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-[460px] mx-auto block">
      <line x1={padLeft - 10} y1={naY} x2={diagCenterX + diagHalfW + 10} y2={naY} stroke="#51626F" strokeWidth="1.2" strokeDasharray="5 4" />
      <text x={padLeft - 10} y={naY - 6} fontSize="10" fill="#51626F" fontWeight="700">N.A.</text>

      {result.blocks.map((b, i) => {
        const c = blockColor(b);
        const wPx = b.width * scale;
        const x = centerX - wPx / 2;
        const yTopPx = yToPx(b.yTop);
        const hPx = b.height * scale;
        return (
          <g key={i}>
            <rect x={x} y={yTopPx} width={wPx} height={hPx} fill={c.fill} stroke={c.stroke} strokeWidth="1.4" />
            <text x={centerX + maxWidth * scale / 2 + 8} y={yTopPx + hPx / 2 + 3} fontSize="10" fontWeight="800" fill={c.stroke}>
              {c.name}
            </text>
          </g>
        );
      })}

      <line x1={diagCenterX} y1={padTop} x2={diagCenterX} y2={padTop + drawH} stroke="#8A97A2" strokeWidth="1.2" />
      {Array.from({ length: stressPts.length / 2 }).map((_, k) => {
        const p1 = stressPts[k * 2], p2 = stressPts[k * 2 + 1];
        const c = blockColor(result.blocks[p1.blockIdx]);
        const x1 = sToPx(p1.s), y1 = yToPx(p1.y);
        const x2 = sToPx(p2.s), y2 = yToPx(p2.y);
        return (
          <polygon
            key={k}
            points={`${diagCenterX},${y1} ${x1},${y1} ${x2},${y2} ${diagCenterX},${y2}`}
            fill={c.fill}
            stroke={c.stroke}
            strokeWidth="1.6"
            opacity="0.9"
          />
        );
      })}
    </svg>
  );
}
