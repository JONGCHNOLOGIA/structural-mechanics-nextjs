'use client';

import { useState, useMemo } from 'react';
import { UNIT_OPTIONS, fmt, fmtInput, fmtSci, blockColor, EFor } from '@/lib/calc/unitOptions';
import { computeComposite, isDoublySymmetric } from '@/lib/calc/compositeBeams';
import FormulaSection, { Tip } from './FormulaSection';
import AiTutorPanel from './AiTutorPanel';

/*
  프로토타입의 renderCompositeBeams()를 React로 옮긴 버전. 클래스명은 프로토타입과 동일
  (.panel/.field/.block-card/.add-block/.step-card 등)하게 맞춰서 디자인이 원본과 같아 보이게 함.

  ▸ 아직 이 파일에 옮기지 않은 것 (프로토타입 HTML에는 있음, 다음 포팅 대상)
    - 블록 드래그로 순서 바꾸기 (cbDragStart/cbDrop) — ⠿ 손잡이는 표시만 하고 동작은 비활성
    - "Doubly symmetric section" On/Off 토글 (cbMakeSandwich)
    - y 기준점(하단/상단) 토글
*/

let nextColorId = 2;

function makeInitialBlocks() {
  return [
    { colorId: 0, width: 4 * 0.0254, height: 0.5 * 0.0254, E: 30000 * 6894757, EUnit: 'ksi' },
    { colorId: 1, width: 4 * 0.0254, height: 6 * 0.0254, E: 1500 * 6894757, EUnit: 'ksi' },
  ];
}

export default function CompositeBeams() {
  const [units, setUnits] = useState({ length: 'in', stress: 'psi', moment: 'kip·in' });
  const [blocks, setBlocks] = useState(makeInitialBlocks);
  const [moment, setMoment] = useState(60 * 112.9848);

  const lenF = UNIT_OPTIONS.length[units.length];
  const stressF = UNIT_OPTIONS.stress[units.stress];
  const momF = UNIT_OPTIONS.moment[units.moment];
  const disp = (base, factor) => base / factor;

  const result = useMemo(() => (blocks.length ? computeComposite(blocks, moment) : null), [blocks, moment]);
  const symmetric3 = blocks.length === 3 && result && isDoublySymmetric(blocks);

  function updateBlockField(index, field, value) {
    const factor = field === 'E' ? UNIT_OPTIONS.E[blocks[index].EUnit] : lenF;
    const val = parseFloat(value);
    if (isNaN(val) || val <= 0) return;
    const newVal = val * factor;
    const cid = blocks[index].colorId;
    setBlocks((prev) => prev.map((b) => (b.colorId === cid ? { ...b, [field]: newVal } : b)));
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
    <>
      {/* ---------------- Setting Menu ---------------- */}
      <div className="panel">
        <h3>SETTING MENU</h3>
        {blocks.length > 1 && <div style={{ fontSize: 11, color: 'var(--gray-soft)', marginBottom: 12 }}>⠿ 아이콘을 끌어서 블록 순서(위/아래)를 바꿀 수 있어요.</div>}

        {blocks
          .map((b, i) => i)
          .reverse()
          .map((i) => {
            const b = blocks[i];
            const c = blockColor(b);
            return (
              <div key={i} className="block-card">
                <span className="drag-handle" title="끌어서 순서 변경">⠿</span>
                <div className="block-title">
                  <span className="color-dot" style={{ background: c.stroke }} />
                  {c.name} Block{i === 0 ? ' · bottom' : i === blocks.length - 1 ? ' · top' : ''}
                </div>
                <div className="remove-block" onClick={() => removeBlock(i)}>×</div>
                <div className="field">
                  <label>Width</label>
                  <div className="input-unit-group">
                    <input type="number" defaultValue={fmtInput(disp(b.width, lenF))} onBlur={(e) => updateBlockField(i, 'width', e.target.value)} />
                  </div>
                </div>
                <div className="field">
                  <label>Height</label>
                  <div className="input-unit-group">
                    <input type="number" defaultValue={fmtInput(disp(b.height, lenF))} onBlur={(e) => updateBlockField(i, 'height', e.target.value)} />
                  </div>
                </div>
                <div className="field">
                  <label>E</label>
                  <div className="input-unit-group">
                    <input type="number" defaultValue={fmtInput(disp(b.E, EFor(b)))} onBlur={(e) => updateBlockField(i, 'E', e.target.value)} />
                  </div>
                </div>
              </div>
            );
          })}

        <button className="add-block" onClick={addBlock}>+ 블록 추가</button>

        <div className="field">
          <label>Moment M</label>
          <input type="number" defaultValue={fmtInput(disp(moment, momF))} onBlur={(e) => setMoment(parseFloat(e.target.value) * momF)} />
        </div>
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="panel">
        <h3>
          VISUALIZER <span className="badge live" style={{ marginLeft: 6 }}>실시간</span>
        </h3>

        {result ? (
          <>
            <CrossSectionSVG result={result} />
            <div className="result-grid">
              <div className="result-card">
                <div className="l">중립축 위치 (하단 기준)</div>
                <div className="v">{fmt(disp(result.ybar, lenF))} {units.length}</div>
              </div>
              <div className="result-card">
                <div className="l">ΣEI</div>
                <div className="v">{fmtSci(result.EIsum)} N·m²</div>
              </div>
            </div>
            {symmetric3 && (
              <p style={{ fontSize: 12, color: 'var(--gray-soft)', marginTop: 12 }}>
                ✓ 좌우상하 대칭 샌드위치 구조 감지됨 — Approximate Theory 섹션도 추가 가능 (프로토타입 참고)
              </p>
            )}
            <div className="steps">
              <FormulaSection title="Neutral Axis">
                <div className="step-formula">
                  Σ <Tip title="각 블록의 탄성계수">Eᵢ</Tip> <Tip title="각 블록의 단면적">Aᵢ</Tip> (<Tip title="각 블록 중심의 y좌표">yᵢ</Tip> − <Tip title="중립축 위치">ȳ</Tip>) = 0
                </div>
                <div className="step-final">ȳ = {fmt(disp(result.ybar, lenF))} {units.length} (하단 기준)</div>
              </FormulaSection>
              <FormulaSection title="Normal Stresses">
                <div className="step-formula">
                  <Tip title="이 지점의 굽힘응력">σ</Tip> = −<Tip title="굽힘모멘트">M</Tip>(<Tip title="이 지점의 y좌표">y</Tip> − ȳ)<Tip title="이 재료의 탄성계수">E</Tip> / <Tip title="전체 단면의 굽힘강성">ΣEI</Tip>
                </div>
                {result.blocks.map((b, k) => {
                  const c = blockColor(b);
                  const sBottom = result.stressAt(b.yBottom, b.E);
                  const sTop = result.stressAt(b.yTop, b.E);
                  return (
                    <div className="material-block" key={k}>
                      <div className="material-title">
                        <span className="color-dot" style={{ background: c.stroke }} />
                        {c.name} Block
                      </div>
                      <div className="step-eq">
                        σ(하단) = <b className={sBottom >= 0 ? 'tens' : 'comp'}>{fmt(disp(sBottom, stressF))} {units.stress}</b>
                      </div>
                      <div className="step-eq">
                        σ(상단) = <b className={sTop >= 0 ? 'tens' : 'comp'}>{fmt(disp(sTop, stressF))} {units.stress}</b>
                      </div>
                    </div>
                  );
                })}
              </FormulaSection>
            </div>
            <div className="ai-hint">💬 이 식이 왜 이런 형태인지 궁금하다면, 오른쪽 AI 튜터에게 물어보세요.</div>
          </>
        ) : (
          <div className="viz-placeholder" style={{ minHeight: 400 }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="4" y="4" width="16" height="16" rx="2" />
              <path d="M8 9h8M8 13h5" />
            </svg>
            왼쪽에서 블록을 추가하면
            <br />
            단면과 응력 분포가 여기에 나타납니다.
          </div>
        )}
      </div>

      <AiTutorPanel />
    </>
  );
}

// 단면 + 응력 다이어그램 SVG. 프로토타입의 cbBuildVizSVGs()와 로직은 동일.
function CrossSectionSVG({ result }) {
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
    <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%', maxWidth: 460, margin: '0 auto', display: 'block' }}>
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
            <text x={centerX + (maxWidth * scale) / 2 + 8} y={yTopPx + hPx / 2 + 3} fontSize="10" fontWeight="800" fill={c.stroke}>
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
          <polygon key={k} points={`${diagCenterX},${y1} ${x1},${y1} ${x2},${y2} ${diagCenterX},${y2}`} fill={c.fill} stroke={c.stroke} strokeWidth="1.6" opacity="0.9" />
        );
      })}
    </svg>
  );
}
