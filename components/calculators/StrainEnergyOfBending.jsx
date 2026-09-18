'use client';

import { useMemo, useState } from 'react';
import { UNIT_OPTIONS, fmtSci } from '@/lib/calc/unitOptions';
import { bendingStrainEnergy } from '@/lib/calc/strainEnergy';
import FormulaSection, { Tip } from './FormulaSection';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import Frac from '@/components/Frac';
import FieldBlockCard from './FieldBlockCard';

// 캔틸레버 자유단에 P, M0가 작용할 때 굽힘이 저장하는 변형에너지 U = ∫M²/2EI dx.
// a) P만  b) M0만  c) P와 M0 동시 — 세 경우를 토글로 비교.

export default function StrainEnergyOfBending() {
  const [caseType, setCaseType] = useState('both'); // 'point' | 'moment' | 'both'
  const [units, setUnits] = useState({ length: 'm', force: 'kN', moment: 'kN·m', E: 'GPa', inertia: 'mm⁴' });
  const [L, setL] = useState(4);
  const [P, setP] = useState(20 * 1000);
  const [M0, setM0] = useState(15 * 1000);
  const [E, setE] = useState(200 * 1e9);
  const [I, setI] = useState(60e6 * 1e-12);
  const [activeField, setActiveField] = useState('L');

  const lenF = UNIT_OPTIONS.length[units.length];
  const forceF = UNIT_OPTIONS.force[units.force];
  const momF = UNIT_OPTIONS.moment[units.moment];
  const EF = UNIT_OPTIONS.E[units.E];
  const inertiaF = UNIT_OPTIONS.inertia[units.inertia];
  const disp = (b, f) => b / f;

  const EI = E * I;
  const PSI = caseType === 'moment' ? 0 : P;
  const M0SI = caseType === 'point' ? 0 : M0;

  const result = useMemo(() => {
    const U = bendingStrainEnergy(L, PSI, M0SI, EI);
    const Up = (PSI ** 2 * L ** 3) / (6 * EI); // P만 있을 때 기여분
    const Um = (M0SI ** 2 * L) / (2 * EI); // M0만 있을 때 기여분
    const Ucross = U - Up - Um; // 교차항 (P·M0)
    return { U, Up, Um, Ucross };
  }, [L, PSI, M0SI, EI]);

  const N = 40;
  const diagramPts = [];
  for (let i = 0; i <= N; i++) {
    const s = (L * i) / N;
    diagramPts.push({ s, M: PSI * s + M0SI });
  }
  const maxAbsM = Math.max(1e-9, ...diagramPts.map((p) => Math.abs(p.M)));

  return (
    <>
      {/* ---------------- Setting Menu ---------------- */}
      <div className="panel">
        <h3>SETTING MENU</h3>
        <EditableText
          contentKey="calc.StrainEnergyOfBending.intro"
          defaultText="굽힘모멘트가 있으면 보 안에 **변형에너지** U = ∫ M²/2EI dx 가 저장돼요. 캔틸레버 자유단에 P, M0를 각각 또는 동시에 줘서 비교해보세요."
          style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.6, marginBottom: 14, background: 'var(--bg)', borderRadius: 0, padding: '12px 14px' }}
        />
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          <button className={'add-block' + (caseType === 'point' ? ' active' : '')} style={{ margin: 0 }} onClick={() => setCaseType('point')}>
            P만
          </button>
          <button className={'add-block' + (caseType === 'moment' ? ' active' : '')} style={{ margin: 0 }} onClick={() => setCaseType('moment')}>
            M0만
          </button>
          <button className={'add-block' + (caseType === 'both' ? ' active' : '')} style={{ margin: 0 }} onClick={() => setCaseType('both')}>
            P + M0
          </button>
        </div>
        <FieldBlockCard
          title="보 조건 (L, P, M0, E, I)"
          activeKey={activeField}
          onActiveChange={setActiveField}
          fields={[
            { key: 'L', label: '스팬 L', value: disp(L, lenF), unitType: 'length', unit: units.length },
            ...(caseType !== 'moment' ? [{ key: 'P', label: '집중하중 P', value: disp(P, forceF), unitType: 'force', unit: units.force }] : []),
            ...(caseType !== 'point' ? [{ key: 'M0', label: '모멘트 M0', value: disp(M0, momF), unitType: 'moment', unit: units.moment }] : []),
            { key: 'E', label: '탄성계수 E', value: disp(E, EF), unitType: 'E', unit: units.E },
            { key: 'I', label: '단면2차모멘트 I', value: disp(I, inertiaF), unitType: 'inertia', unit: units.inertia },
          ]}
          onUnitChange={(unitType, v) => setUnits((prev) => ({ ...prev, [unitType]: v }))}
          onFieldChange={(key, value) => {
            const val = parseFloat(value);
            if (isNaN(val)) return;
            if (key === 'L') setL(val * lenF);
            else if (key === 'P') setP(val * forceF);
            else if (key === 'M0') setM0(val * momF);
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
        <MomentDiagramSVG pts={diagramPts} L={L} maxAbsM={maxAbsM} />
        <div className="result-grid">
          <div className="result-card">
            <div className="l">총 변형에너지 U</div>
            <div className="v">{fmtSci(result.U)} J</div>
          </div>
          <div className="result-card">
            <div className="l">P 기여분 (P만 있었다면)</div>
            <div className="v">{fmtSci(result.Up)} J</div>
          </div>
        </div>
        <div className="steps">
          <FormulaSection title="변형에너지 적분">
            <div className="step-formula">
              <Tip title="자유단 B로부터 잰 거리 s에서의 굽힘모멘트">M(s)</Tip> = P·s + M0
            </div>
            <div className="step-row">
              U = ∫₀ᴸ <Frac num="M(s)²" den="2EI" /> ds = <Frac num="P²L³" den="6EI" /> + <Frac num="PM0L²" den="2EI" /> +{' '}
              <Frac num="M0²L" den="2EI" />
            </div>
            {caseType === 'both' && (
              <div className="step-row">
                교차항(<Frac num="PM0L²" den="2EI" />) = {fmtSci(result.Ucross)} J — P와 M0가 같은 방향이면 에너지가 단순 합보다 커져요.
              </div>
            )}
            <div className="step-final">U = {fmtSci(result.U)} J</div>
          </FormulaSection>
        </div>
        <EditableText as="div" className="ai-hint" contentKey="calc.StrainEnergyOfBending.aiHint" defaultText="💬 U를 P로 편미분하면 왜 처짐 δ가 나오는지 궁금하다면, 다음 소주제(Castigliano's Theorem)에서 바로 이어집니다." />
      </div>

      <AiTutorPanel />
    </>
  );
}

function MomentDiagramSVG({ pts, L, maxAbsM }) {
  const w = 620, h = 220;
  const padL = 50, padR = 40, padTop = 30, padBottom = 40;
  const drawW = w - padL - padR;
  const drawH = h - padTop - padBottom;
  const xToPx = (s) => padL + (s / L) * drawW;
  const mToPx = (m) => padTop + drawH - (m / maxAbsM) * drawH;

  const areaPath =
    `M ${xToPx(0)} ${padTop + drawH} ` +
    pts.map((p) => `L ${xToPx(p.s).toFixed(2)} ${mToPx(p.M).toFixed(2)}`).join(' ') +
    ` L ${xToPx(L)} ${padTop + drawH} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 660, margin: '0 auto', display: 'block' }}>
      <line x1={padL} y1={padTop + drawH} x2={padL + drawW} y2={padTop + drawH} stroke="#8A97A2" strokeWidth="1.2" />
      <path d={areaPath} fill="#E7E9F7" stroke="#4A5FBF" strokeWidth="1.6" />
      <text x={padL} y={padTop + drawH + 20} fontSize="13" fill="#8A97A2">B (자유단, s=0)</text>
      <text x={padL + drawW} y={padTop + drawH + 20} fontSize="13" fill="#8A97A2" textAnchor="end">A (고정단, s=L)</text>
      <text x={padL + drawW / 2} y={h - 6} fontSize="13" fill="#8A97A2" textAnchor="middle">굽힘모멘트 M(s) 다이어그램</text>
    </svg>
  );
}
