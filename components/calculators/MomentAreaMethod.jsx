'use client';

import { useMemo, useState } from 'react';
import { UNIT_OPTIONS, fmt } from '@/lib/calc/unitOptions';
import FormulaSection, { Tip } from './FormulaSection';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import Frac from '@/components/Frac';
import FieldBlockCard from './FieldBlockCard';
import { DimLineH } from './EditableDim';

// 캔틸레버 보(고정단 A, 자유단 B)의 M/EI 다이어그램을 그려서,
// 1st 정리(면적=처짐각), 2nd 정리(면적의 1차모멘트=처짐)를 눈으로 확인.
// 하중 종류에 따라 다이어그램 모양이 삼각형(집중하중) 또는 포물선(등분포하중)이 됨.

export default function MomentAreaMethod() {
  const [loadType, setLoadType] = useState('point'); // 'point' | 'udl'
  const [units, setUnits] = useState({ length: 'm', force: 'kN', distLoad: 'kN/m', E: 'GPa', inertia: 'mm⁴' });
  const [L, setL] = useState(4);
  const [P, setP] = useState(20 * 1000);
  const [q, setQ] = useState(10 * 1000);
  const [E, setE] = useState(200 * 1e9);
  const [I, setI] = useState(60e6 * 1e-12);
  const [activeField, setActiveField] = useState('L');

  const lenF = UNIT_OPTIONS.length[units.length];
  const forceF = UNIT_OPTIONS.force[units.force];
  const distF = UNIT_OPTIONS.distLoad[units.distLoad];
  const EF = UNIT_OPTIONS.E[units.E];
  const inertiaF = UNIT_OPTIONS.inertia[units.inertia];
  const disp = (b, f) => b / f;

  const EI = E * I;
  const PSI = P;
  const qSI = q;

  const result = useMemo(() => {
    const N = 60;
    const pts = [];
    // M/EI 크기 (부호는 무시하고 면적/도심 계산용 절대값)
    const mOverEI = (x) => (loadType === 'point' ? (PSI * (L - x)) / EI : (qSI * (L - x) ** 2) / (2 * EI));
    for (let i = 0; i <= N; i++) {
      const x = (L * i) / N;
      pts.push({ x, m: mOverEI(x) });
    }
    let theta, delta;
    if (loadType === 'point') {
      theta = (PSI * L ** 2) / (2 * EI);
      delta = (PSI * L ** 3) / (3 * EI);
    } else {
      theta = (qSI * L ** 3) / (6 * EI);
      delta = (qSI * L ** 4) / (8 * EI);
    }
    const centroidFromB = (delta / theta) || 0;
    return { pts, theta, delta, centroidFromB };
  }, [loadType, L, PSI, qSI, EI]);

  return (
    <>
      {/* ---------------- Setting Menu ---------------- */}
      <div className="panel">
        <h3>SETTING MENU</h3>
        <EditableText
          contentKey="calc.MomentAreaMethod.intro"
          defaultText="**1st 정리**: 두 점 사이 접선의 각도 차이 = 그 구간 M/EI 다이어그램의 면적. **2nd 정리**: 한 점의 접선으로부터 다른 점까지의 편차 = M/EI 면적의 1차모멘트(면적×도심거리)."
          style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.6, marginBottom: 14, background: 'var(--bg)', borderRadius: 0, padding: '12px 14px' }}
        />
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          <button className={'add-block' + (loadType === 'point' ? ' active' : '')} style={{ margin: 0 }} onClick={() => setLoadType('point')}>
            자유단 집중하중 P
          </button>
          <button className={'add-block' + (loadType === 'udl' ? ' active' : '')} style={{ margin: 0 }} onClick={() => setLoadType('udl')}>
            등분포하중 q
          </button>
        </div>
        <FieldBlockCard
          title={`보 조건 (L, ${loadType === 'point' ? 'P' : 'q'}, E, I)`}
          activeKey={activeField}
          onActiveChange={setActiveField}
          fields={[
            { key: 'L', label: '스팬 L', value: disp(L, lenF), unitType: 'length', unit: units.length },
            loadType === 'point'
              ? { key: 'P', label: '집중하중 P', value: disp(P, forceF), unitType: 'force', unit: units.force }
              : { key: 'q', label: '등분포하중 q', value: disp(q, distF), unitType: 'distLoad', unit: units.distLoad },
            { key: 'E', label: '탄성계수 E', value: disp(E, EF), unitType: 'E', unit: units.E },
            { key: 'I', label: '단면2차모멘트 I', value: disp(I, inertiaF), unitType: 'inertia', unit: units.inertia },
          ]}
          onUnitChange={(unitType, v) => setUnits((prev) => ({ ...prev, [unitType]: v }))}
          onFieldChange={(key, value) => {
            const val = parseFloat(value);
            if (isNaN(val)) return;
            if (key === 'L') setL(val * lenF);
            else if (key === 'P') setP(val * forceF);
            else if (key === 'q') setQ(val * distF);
            else if (key === 'E') setE(val * EF);
            else if (key === 'I') setI(val * inertiaF);
          }}
        />
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="panel">
        <h3>
          VISUALIZER
        </h3>
        <MomentAreaSVG
          pts={result.pts}
          L={L}
          centroidFromB={result.centroidFromB}
          LDisp={disp(L, lenF)}
          lengthUnit={units.length}
          onEditL={(v) => setL(v * lenF)}
        />
        <div className="result-grid">
          <div className="result-card">
            <div className="l">θB (면적 = 1st 정리)</div>
            <div className="v">{result.theta.toExponential(3)} rad</div>
          </div>
          <div className="result-card">
            <div className="l">δB (1차모멘트 = 2nd 정리)</div>
            <div className="v">{fmt(result.delta * 1000)} mm</div>
          </div>
        </div>
        <div className="steps">
          <FormulaSection
            title={
              <>
                {loadType === 'point' ? '삼각형 ' : '포물선 '}
                <Frac num="M" den="EI" /> 다이어그램
              </>
            }
          >
            <div className="step-formula">
              <Tip title="1st 모멘트-면적 정리">θB</Tip> = <Frac num="M" den="EI" /> 다이어그램의 면적 = {result.theta.toExponential(3)} rad
            </div>
            <div className="step-row">도심(centroid)까지 B로부터의 거리 = {fmt(disp(result.centroidFromB, lenF))} {units.length}</div>
            <div className="step-final">
              <Tip title="2nd 모멘트-면적 정리">δB</Tip> = 면적 × 도심거리 = {fmt(result.delta * 1000)} mm
            </div>
          </FormulaSection>
        </div>
        <EditableText as="div" className="ai-hint" contentKey="calc.MomentAreaMethod.aiHint" defaultText="💬 왜 도심까지의 거리를 곱해야 처짐이 나오는지 궁금하다면, 오른쪽 AI 튜터에게 물어보세요." />
      </div>

      <AiTutorPanel />
    </>
  );
}

function MomentAreaSVG({ pts, L, centroidFromB, LDisp, lengthUnit, onEditL }) {
  // 아래에 스팬 치수선을 넣을 자리를 두려고 높이를 260에서 늘렸다.
  const w = 620, h = 306;
  const padL = 50, padR = 40, padTop = 30, padBottom = 86;
  const drawW = w - padL - padR;
  const drawH = h - padTop - padBottom;
  const maxM = Math.max(1e-12, ...pts.map((p) => p.m));

  const xToPx = (x) => padL + (x / L) * drawW;
  const mToPx = (m) => padTop + drawH - (m / maxM) * drawH;

  const areaPath =
    `M ${xToPx(0)} ${padTop + drawH} ` +
    pts.map((p) => `L ${xToPx(p.x).toFixed(2)} ${mToPx(p.m).toFixed(2)}`).join(' ') +
    ` L ${xToPx(L)} ${padTop + drawH} Z`;

  const centroidX = L - centroidFromB;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 660, margin: '0 auto', display: 'block', overflow: 'visible' }}>
      <line x1={padL} y1={padTop + drawH} x2={padL + drawW} y2={padTop + drawH} stroke="#8A97A2" strokeWidth="1.2" />
      <path d={areaPath} fill="#F7E3E6" stroke="#C3002F" strokeWidth="1.6" />
      <line x1={xToPx(centroidX)} y1={padTop} x2={xToPx(centroidX)} y2={padTop + drawH} stroke="#4A5FBF" strokeWidth="1.4" strokeDasharray="5 4" />
      <text x={xToPx(centroidX)} y={padTop - 8} fontSize="13" fill="#4A5FBF" textAnchor="middle" fontWeight="800">도심</text>
      <text x={padL} y={padTop + drawH + 20} fontSize="13" fill="#8A97A2">A (고정단)</text>
      <text x={padL + drawW} y={padTop + drawH + 20} fontSize="13" fill="#8A97A2" textAnchor="end">B (자유단)</text>
      {/* 스팬 치수 — 숫자를 클릭하면 그 자리에서 고칠 수 있다(단위는 SETTING MENU 설정). */}
      <DimLineH
        x1={padL}
        x2={padL + drawW}
        y={padTop + drawH + 44}
        labelDy={15}
        fontSize={12}
        value={LDisp !== undefined ? LDisp : L}
        unit={lengthUnit}
        prefix="L = "
        boxW={64}
        onChange={onEditL}
      />
      <text x={padL + drawW / 2} y={h - 6} fontSize="13" fill="#8A97A2" textAnchor="middle">M/EI 다이어그램 (빨간 음영 = 면적 = θB)</text>
    </svg>
  );
}
