'use client';

import { useMemo, useState } from 'react';
import {
  computeMaterialProperties,
  curveFor,
  markersFor,
  PROP_LIMIT_STRAIN,
} from '@/lib/calc/materialProperties';
import { fmt1 } from '@/lib/calc/units1';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import Frac from '@/components/Frac';
import { ToggleRow, ResetButton, ResultGrid, ResultCard, StepCard } from './sm1/Controls';
import { CalcGate, useCalcGate } from './sm1/CalcGate';

// CH.1-2 Mechanical Properties of Materials — 원본 renderMaterialProperties()의 React 버전.
// 슬라이더로 변형률을 옮기면 응력-변형률 선도 위의 점이 따라 움직이고, 지금 어느 구간인지와
// 탄성/소성 여부를 판정해준다.

const DEFAULTS = { material: 'ductile', strain: 0.05 };

export default function MaterialProperties() {
  const [s, setS] = useState(DEFAULTS);
  const res = useMemo(() => computeMaterialProperties(s), [s]);
  const gate = useCalcGate(s);
  const maxStrain = curveFor(s.material).slice(-1)[0].x;

  // 재료를 바꾸면 곡선의 길이가 달라지므로, 슬라이더 값이 범위를 넘지 않게 원본처럼 잘라준다.
  function setMaterial(v) {
    const newMax = curveFor(v).slice(-1)[0].x;
    setS((prev) => ({ material: v, strain: Math.min(prev.strain, newMax * 0.5) }));
  }


  const tone = res.state === 'Elastic' ? 'tens' : 'comp';

  return (
    <>
      {/* ---------------- Setting Menu ---------------- */}
      <div className="panel">
        <h3>SETTING MENU</h3>
        <EditableText
          as="div"
          className="note-box"
          contentKey="calc.MaterialProperties.note"
          defaultText="이 그래프는 **Illustrative / Conceptual Curve**입니다. 강의자료에 제시된 재료거동의 정성적 형태(구간 순서·명칭)를 나타낼 뿐, 실제 재료의 물성치 수치가 아닙니다."
        />
        <ToggleRow
          value={s.material}
          onChange={setMaterial}
          options={[
            { value: 'ductile', label: 'Ductile (연성)' },
            { value: 'brittle', label: 'Brittle (취성)' },
          ]}
        />
        <div className="field">
          <label>변형률 위치 (슬라이더)</label>
          <input
            type="range"
            min={0}
            max={maxStrain}
            step={maxStrain / 300}
            value={s.strain}
            onChange={(e) => setS((prev) => ({ ...prev, strain: parseFloat(e.target.value) }))}
            style={{ width: '100%' }}
          />
          <div className="hint">0 ~ {fmt1(maxStrain, 2)} (normalized strain)</div>
        </div>
        <ResetButton onClick={() => setS(DEFAULTS)} />
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="panel">
        <h3>VISUALIZER</h3>
        <CurveSVG material={s.material} res={res} />
        <ResultGrid>
          <ResultCard label="현재 변형률 ε" value={`${fmt1(res.strain, 3)} (normalized)`} />
          <ResultCard label="현재 응력 σ" value={`${fmt1(res.stress, 3)} (normalized)`} />
          <ResultCard label="상태" value={res.state} tone={tone} />
          <ResultCard label="현재 구간" value={res.label} full />
        </ResultGrid>
        <EditableText
          as="div"
          className="ai-hint"
          contentKey="calc.MaterialProperties.aiHint"
          defaultText="💬 항복점 이후 하중을 제거하면 왜 원래 길이로 돌아오지 않는지, 오른쪽 AI 튜터에게 물어보세요."
        />

        <div className="steps" style={{ marginTop: 20 }}>
          <CalcGate gate={gate}>
            {(frozen) => {
              const fres = computeMaterialProperties(frozen);
              return <Steps s={frozen} res={fres} />;
            }}
          </CalcGate>
        </div>
      </div>

      <AiTutorPanel question="취성 재료는 왜 항복점이 없나요?" />
    </>
  );
}

function Steps({ s, res }) {
  const tone = res.state === 'Elastic' ? 'tens' : 'comp';
  return (
    <>
          <StepCard
            title="Step 1. 현재 위치(변형률) 확인"
            formula="ε = slider value"
            eqLines={[`ε = ${fmt1(res.strain, 3)}`]}
            final={`ε = ${fmt1(res.strain, 3)}`}
          />
          <StepCard
            title="Step 2. 구간 판별"
            formula="구간의 시작점 A, 끝점 B 사이에 위치"
            eqLines={[
              `구간: ${res.label}`,
              `구간 시작 (εₐ=${fmt1(res.seg.a.x, 3)}, σₐ=${fmt1(res.seg.a.y, 3)}) → 구간 끝 (ε_b=${fmt1(res.seg.b.x, 3)}, σ_b=${fmt1(res.seg.b.y, 3)})`,
            ]}
            final={`현재 구간 = ${res.label}`}
          />
          <StepCard
            title="Step 3. 선형보간으로 응력 계산"
            formula={
              <>
                t = <Frac num="ε−εₐ" den="ε_b−εₐ" />, σ = σₐ + t·(σ_b−σₐ)
              </>
            }
            eqLines={[
              `t = ${fmt1(res.seg.t * 100, 1)}%`,
              `σ = ${fmt1(res.seg.a.y, 3)} + ${fmt1(res.seg.t, 3)} × (${fmt1(res.seg.b.y, 3)} − ${fmt1(res.seg.a.y, 3)})`,
            ]}
            final={`σ = ${fmt1(res.stress, 3)} (normalized)`}
          />
          <StepCard
            title="Step 4. 탄성/소성 판정"
            formula={`Elastic if ε ≤ ε_proportional-limit (${fmt1(PROP_LIMIT_STRAIN[s.material], 3)})`}
            eqLines={[`ε = ${fmt1(res.strain, 3)}`]}
            final={
              <>
                상태 = <span className={tone}>{res.state}</span>
              </>
            }
          />
    </>
  );
}

function CurveSVG({ material, res }) {
  const w = 440, h = 300, padL = 42, padB = 34, padT = 16, padR = 16;
  const points = curveFor(material);
  const markers = markersFor(material);
  const maxX = points.slice(-1)[0].x;
  const maxY = 1.15;
  const X = (x) => padL + (x / maxX) * (w - padL - padR);
  const Y = (y) => h - padB - (y / maxY) * (h - padB - padT);
  const pathD = points.map((p, i) => (i === 0 ? 'M' : 'L') + X(p.x) + ' ' + Y(p.y)).join(' ');
  const cx = X(res.strain), cy = Y(res.stress);
  const midY = (padT + h - padB) / 2;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 460, margin: '0 auto', display: 'block' }}>
      <line x1={padL} y1={h - padB} x2={w - padR} y2={h - padB} stroke="#8A97A2" strokeWidth="1.2" />
      <line x1={padL} y1={padT} x2={padL} y2={h - padB} stroke="#8A97A2" strokeWidth="1.2" />
      <text x={(padL + w - padR) / 2} y={h - 6} fontSize="10.5" textAnchor="middle" fill="var(--gray)">
        변형률 ε (normalized)
      </text>
      <text x="12" y={midY} fontSize="10.5" fill="var(--gray)" textAnchor="middle" transform={`rotate(-90 12 ${midY})`}>
        응력 σ (normalized)
      </text>
      <path d={pathD} fill="none" stroke="var(--crimson)" strokeWidth="2.4" />
      {markers.map((m) => (
        <g key={m.tag}>
          <circle cx={X(m.x)} cy={Y(m.y)} r="3.5" fill="#fff" stroke="var(--gray)" strokeWidth="1.4" />
          <text x={X(m.x)} y={Y(m.y) - 9} fontSize="10" fontWeight="800" fill="var(--gray)" textAnchor="middle">
            {m.tag}
          </text>
        </g>
      ))}
      <line x1={cx} y1={h - padB} x2={cx} y2={cy} stroke="var(--teal)" strokeWidth="1.2" strokeDasharray="3 2" />
      <line x1={padL} y1={cy} x2={cx} y2={cy} stroke="var(--teal)" strokeWidth="1.2" strokeDasharray="3 2" />
      <circle cx={cx} cy={cy} r="6" fill="var(--teal)" stroke="#fff" strokeWidth="2" />
    </svg>
  );
}
