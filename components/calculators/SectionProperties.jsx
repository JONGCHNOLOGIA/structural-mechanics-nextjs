'use client';

import { useMemo, useState } from 'react';
import { fmt, fmtSci } from '@/lib/calc/unitOptions';
import { sectionResults } from '@/lib/calc/sectionProperties';
import SectionShapeDiagram from './SectionShapeDiagram';
import FormulaSection from './FormulaSection';
import AiTutorPanel from './AiTutorPanel';
import Frac from '@/components/Frac';
import EditableText from '@/components/EditableText';

// mechsimulator.com의 "Moment of Inertia — Simulation Trainer"에서 영감을 받아, 저희 스타일로
// 새로 만든 독립 도구. 챕터의 특정 소주제에 종속되지 않고, ch6(Composite/Transformed Section)에서
// 반복적으로 나오는 "단면 특성(A, I, S, r) 계산" 자체를 떼어내 자유롭게 탐색할 수 있게 한다.

const SHAPES = {
  rectangle: {
    name: '사각형 (Rectangle)',
    fields: [
      { key: 'b', label: '폭 b (mm)', min: 20, max: 300, step: 5, def: 120 },
      { key: 'h', label: '높이 h (mm)', min: 20, max: 300, step: 5, def: 200 },
    ],
  },
  circle: {
    name: '원형 (Circle)',
    fields: [{ key: 'dia', label: '지름 d (mm)', min: 20, max: 300, step: 5, def: 150 }],
  },
  hollowCircle: {
    name: '중공원형 (Hollow Circle)',
    fields: [
      { key: 'diaOuter', label: '외경 dₒ (mm)', min: 40, max: 300, step: 5, def: 180 },
      { key: 'diaInner', label: '내경 dᵢ (mm)', min: 10, max: 280, step: 5, def: 120 },
    ],
  },
  hollowRect: {
    name: '중공사각형 (Box)',
    fields: [
      { key: 'B', label: '외곽 폭 B (mm)', min: 40, max: 300, step: 5, def: 180 },
      { key: 'H', label: '외곽 높이 H (mm)', min: 40, max: 300, step: 5, def: 220 },
      { key: 'b', label: '내곽 폭 b (mm)', min: 10, max: 280, step: 5, def: 140 },
      { key: 'h', label: '내곽 높이 h (mm)', min: 10, max: 280, step: 5, def: 180 },
    ],
  },
  iBeam: {
    name: 'I형 (Wide-Flange)',
    fields: [
      { key: 'bf', label: '플랜지 폭 bf (mm)', min: 40, max: 300, step: 5, def: 150 },
      { key: 'h', label: '전체 높이 h (mm)', min: 60, max: 400, step: 5, def: 250 },
      { key: 'tf', label: '플랜지 두께 tf (mm)', min: 5, max: 40, step: 1, def: 14 },
      { key: 'tw', label: '웨브 두께 tw (mm)', min: 4, max: 30, step: 1, def: 9 },
    ],
  },
  tSection: {
    name: 'T형 (T-Section)',
    fields: [
      { key: 'bf', label: '플랜지 폭 bf (mm)', min: 40, max: 300, step: 5, def: 160 },
      { key: 'h', label: '전체 높이 h (mm)', min: 60, max: 400, step: 5, def: 220 },
      { key: 'tf', label: '플랜지 두께 tf (mm)', min: 5, max: 40, step: 1, def: 16 },
      { key: 'tw', label: '웨브 두께 tw (mm)', min: 4, max: 30, step: 1, def: 12 },
    ],
  },
};

// 슬라이더를 독립적으로 움직여도 기하학적으로 말이 안 되는 조합(중공부가 외곽보다 큼 등)이 안 나오게 보정
function clampDims(shape, raw) {
  const d = { ...raw };
  if (shape === 'hollowCircle') {
    d.diaInner = Math.min(d.diaInner, d.diaOuter - 10);
  } else if (shape === 'hollowRect') {
    d.b = Math.min(d.b, d.B - 10);
    d.h = Math.min(d.h, d.H - 10);
  } else if (shape === 'iBeam') {
    d.tf = Math.min(d.tf, d.h / 2 - 5);
    d.tw = Math.min(d.tw, d.bf - 10);
  } else if (shape === 'tSection') {
    d.tf = Math.min(d.tf, d.h - 10);
    d.tw = Math.min(d.tw, d.bf - 10);
  }
  return d;
}

export default function SectionProperties() {
  const [shape, setShape] = useState('iBeam');
  const [dims, setDims] = useState(() => {
    const init = {};
    Object.values(SHAPES).forEach((s) => s.fields.forEach((f) => (init[f.key] = f.def)));
    return init;
  });

  const clamped = useMemo(() => clampDims(shape, dims), [shape, dims]);
  const r = useMemo(() => sectionResults(shape, clamped), [shape, clamped]);

  function setDim(key, value) {
    setDims((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <>
      {/* ---------------- Setting Menu ---------------- */}
      <div className="panel">
        <h3>SETTING MENU</h3>
        <EditableText
          contentKey="calc.SectionProperties.intro"
          defaultText="단면 형태와 치수를 바꿔가며 단면적 A, 단면 2차모멘트 I, 단면계수 S, 회전반경 r이 어떻게 달라지는지 확인해보세요. Composite Beams · Transformed Section에서 반복적으로 나오는 단면 특성 계산을 독립적으로 연습하는 도구예요."
          style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.6, marginBottom: 14, background: 'var(--bg)', borderRadius: 0, padding: '12px 14px' }}
        />
        <div className="field">
          <label>단면 형태</label>
          <select className="unit-inline" style={{ width: '100%' }} value={shape} onChange={(e) => setShape(e.target.value)}>
            {Object.entries(SHAPES).map(([key, s]) => (
              <option key={key} value={key}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        {SHAPES[shape].fields.map((f) => (
          <div className="field" key={f.key}>
            <label>
              {f.label} — {clamped[f.key]}
              {clamped[f.key] !== dims[f.key] && <span style={{ color: 'var(--gray-soft)' }}> (다른 치수에 맞춰 자동 조정됨)</span>}
            </label>
            <input
              type="range"
              min={f.min}
              max={f.max}
              step={f.step}
              value={dims[f.key]}
              onChange={(e) => setDim(f.key, parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        ))}
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="panel">
        <h3>
          VISUALIZER
        </h3>
        <SectionShapeDiagram shape={shape} d={clamped} ybar={r.ybar} onEditDim={setDim} />

        <div className="result-grid">
          <div className="result-card">
            <div className="l">단면적 A</div>
            <div className="v">{fmt(r.A)} mm²</div>
          </div>
          <div className="result-card">
            <div className="l">Ix (강축)</div>
            <div className="v">{fmtSci(r.Ix)} mm⁴</div>
          </div>
          <div className="result-card">
            <div className="l">Iy (약축)</div>
            <div className="v">{fmtSci(r.Iy)} mm⁴</div>
          </div>
          <div className="result-card">
            <div className="l">단면계수 Sx</div>
            <div className="v">{fmtSci(r.Sx)} mm³</div>
          </div>
          <div className="result-card">
            <div className="l">회전반경 rx</div>
            <div className="v">{fmt(r.rx)} mm</div>
          </div>
          <div className="result-card">
            <div className="l">도심 ȳ (바닥 기준)</div>
            <div className="v">{fmt(r.ybar)} mm</div>
          </div>
        </div>

        <div className="steps">
          <FormulaSection title="단면계수 · 회전반경 정의 (형태와 무관하게 공통)">
            <div className="step-formula">
              S<sub>x</sub> = <Frac num="Ix" den="c" /> &nbsp; (c = 도심에서 가장 먼 표면까지 거리)
            </div>
            <div className="step-formula">
              r<sub>x</sub> = √(<Frac num="Ix" den="A" />) &nbsp; r<sub>y</sub> = √(<Frac num="Iy" den="A" />)
            </div>
            <div className="step-final">
              지금 형태({SHAPES[shape].name})는 굽힘에 더 위험한 쪽(더 작은 S<sub>x</sub>) 기준 S<sub>x</sub> = {fmtSci(r.Sx)} mm³를 썼어요.
            </div>
          </FormulaSection>
          {shape === 'tSection' && (
            <FormulaSection title="비대칭 단면의 도심 (평행축 정리)">
              <div className="step-formula">
                ȳ = <Frac num="ΣAᵢyᵢ" den="ΣAᵢ" /> &nbsp; Ix = Σ(I₀ᵢ + Aᵢ(yᵢ−ȳ)²)
              </div>
              <EditableText
                as="div"
                className="step-row"
                contentKey="sectionProperties.tShapeHint"
                defaultText="T형은 상하 대칭이 아니라서, 각 조각(플랜지·웨브)의 자체 도심을 먼저 구하고 평행축 정리로 전체 도심(ȳ)과 Ix를 합산해요."
              />
            </FormulaSection>
          )}
        </div>
        <EditableText
          as="div"
          className="ai-hint"
          contentKey="calc.SectionProperties.aiHint"
          defaultText="💬 단면계수(S)가 왜 굽힘응력 계산에서 중요한지 궁금하다면, 오른쪽 AI 튜터에게 물어보세요."
        />
      </div>

      <AiTutorPanel />
    </>
  );
}
