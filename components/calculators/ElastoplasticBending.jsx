'use client';

import { useMemo, useState } from 'react';
import { UNIT_OPTIONS, fmt } from '@/lib/calc/unitOptions';
import { computeElastoplastic } from '@/lib/calc/elastoplastic';
import FormulaSection, { Tip } from './FormulaSection';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import Frac from '@/components/Frac';
import FieldBlockCard from './FieldBlockCard';
import { DimLineH, DimLineV } from './EditableDim';

// 프로토타입 renderElastoplastic() / epBuildVisuals()를 React로 옮긴 버전.

export default function ElastoplasticBending() {
  const [units, setUnits] = useState({ length: 'in', stress: 'psi', moment: 'kip·in' });
  const [width, setWidth] = useState(4 * 0.0254);
  const [height, setHeight] = useState(6 * 0.0254);
  const [sigmaY, setSigmaY] = useState(36 * 6894.757);
  const [moment, setMoment] = useState(0);
  const [activeField, setActiveField] = useState('width');

  const lenF = UNIT_OPTIONS.length[units.length];
  const stressF = UNIT_OPTIONS.stress[units.stress];
  const momF = UNIT_OPTIONS.moment[units.moment];
  const disp = (b, f) => b / f;

  const r0 = useMemo(() => (width && height && sigmaY ? computeElastoplastic(width, height, sigmaY, 0) : null), [width, height, sigmaY]);
  const r = useMemo(() => (width && height && sigmaY ? computeElastoplastic(width, height, sigmaY, moment) : null), [width, height, sigmaY, moment]);

  const mpDisp = r0 ? disp(r0.Mp, momF) : 100;

  return (
    <>
      {/* ---------------- Setting Menu ---------------- */}
      <div className="panel">
        <h3>SETTING MENU</h3>
        <EditableText
          contentKey="calc.ElastoplasticBending.intro"
          defaultText="직사각형 단면에 모멘트를 점점 키우면, 처음엔 **탄성**이다가 표면부터 **항복**하기 시작하고, 계속 키우면 단면 전체가 **완전소성** 상태가 돼요. 아래 슬라이더로 모멘트를 올려보세요."
          style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.6, marginBottom: 16, background: 'var(--bg)', borderRadius: 0, padding: '12px 14px' }}
        />
        <FieldBlockCard
          title="단면 · 항복응력 (b, h, σY)"
          activeKey={activeField}
          onActiveChange={setActiveField}
          fields={[
            { key: 'width', label: 'Width', value: disp(width, lenF), unitType: 'length', unit: units.length },
            { key: 'height', label: 'Height', value: disp(height, lenF), unitType: 'length', unit: units.length },
            { key: 'sigmaY', label: '항복응력 σY', value: disp(sigmaY, stressF), unitType: 'stress', unit: units.stress },
          ]}
          onUnitChange={(unitType, v) => setUnits((prev) => ({ ...prev, [unitType]: v }))}
          onFieldChange={(key, value) => {
            const val = parseFloat(value);
            if (isNaN(val)) return;
            if (key === 'width') setWidth(val * lenF);
            else if (key === 'height') setHeight(val * lenF);
            else if (key === 'sigmaY') setSigmaY(val * stressF);
          }}
        />
        <div className="field">
          <label>모멘트 표시 단위</label>
          <select className="unit-inline" style={{ width: '100%' }} value={units.moment} onChange={(e) => setUnits((p) => ({ ...p, moment: e.target.value }))}>
            {Object.keys(UNIT_OPTIONS.moment).map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
        {r0 && (
          <div className="field">
            <label>Moment M — 0 ~ Mp({fmt(mpDisp)} {units.moment})</label>
            <input type="range" min="0" max={mpDisp} step={mpDisp / 200} value={disp(moment, momF)} onChange={(e) => setMoment(parseFloat(e.target.value) * momF)} style={{ width: '100%' }} />
          </div>
        )}
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="panel">
        <h3>
          VISUALIZER
        </h3>
        {r ? (
          <>
            <ElastoplasticSVG
              width={width}
              height={height}
              r={r}
              lenUnit={units.length}
              lenF={lenF}
              onEditWidth={(v) => setWidth(v * lenF)}
              onEditHeight={(v) => setHeight(v * lenF)}
            />
            <div className="result-grid">
              <div className="result-card">
                <div className="l">현재 단계</div>
                <div className="v">{r.stage}</div>
              </div>
              <div className="result-card">
                <div className="l">e / c (탄성코어 비율)</div>
                <div className="v">{(r.e / r.c).toFixed(2)}</div>
              </div>
              <div className="result-card">
                <div className="l">My (항복모멘트)</div>
                <div className="v">{fmt(disp(r.My, momF))} {units.moment}</div>
              </div>
              <div className="result-card">
                <div className="l">Mp (완전소성모멘트)</div>
                <div className="v">{fmt(disp(r.Mp, momF))} {units.moment}</div>
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--gray-soft)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 3 }}>
              형상계수 f = <Frac num="Mp" den="My" /> = {r.shapeFactor.toFixed(2)} (직사각형은 항상 1.5)
            </div>
            <div className="steps">
              <FormulaSection title="탄성코어 계산">
                <div className="step-formula">
                  <Tip title="탄성코어 절반 높이">e</Tip> = c·√(3 − <Frac num="2M" den="My" />) (My ≤ M ≤ Mp)
                </div>
                <div className="step-row">
                  My = <Frac num="σY·I" den="c" /> &nbsp; Mp = <Frac num="σY·b·h²" den="4" /> &nbsp; f = <Frac num="Mp" den="My" /> = 1.5
                </div>
                <EditableText
                  as="div"
                  style={{ fontSize: 11, color: 'var(--gray-soft)', marginTop: 6 }}
                  contentKey="calc.ElastoplasticBending.note"
                  defaultText="M ≤ My면 e=c(완전탄성), M ≥ Mp면 e=0(완전소성)"
                />
              </FormulaSection>
            </div>
            <EditableText as="div" className="ai-hint" contentKey="calc.ElastoplasticBending.aiHint" defaultText="💬 왜 e가 이 공식으로 나오는지 궁금하다면, 오른쪽 AI 튜터에게 물어보세요." />
          </>
        ) : (
          <div className="viz-placeholder" style={{ minHeight: 400 }}>폭·높이·항복응력을 입력하면 단면과 응력 분포가 나타납니다.</div>
        )}
      </div>

      <AiTutorPanel />
    </>
  );
}

function ElastoplasticSVG({ width, height, r, lenUnit, lenF, onEditWidth, onEditHeight }) {
  // 왼쪽 높이 치수와 아래쪽 폭 치수를 적을 자리를 만들려고 그림판을 조금 넓혔다(원래 520×320).
  const w = 660, hh = 352, padTop = 30;
  const scale = 220 / height;
  const bPx = width * scale, hPx = height * scale;
  const cx1 = 200, cy = padTop + hPx / 2;
  const ePx = r.e * scale;

  const diagCx = 430, diagHalfW = 110;
  const yTopPx = padTop, yBotPx = padTop + hPx;
  const yMidTopPx = padTop + (hPx - ePx) / 2, yMidBotPx = padTop + (hPx + ePx) / 2;
  const sYpx = diagHalfW;

  return (
    <svg viewBox={`0 0 ${w} ${hh}`} style={{ width: '100%', maxWidth: 660, margin: '0 auto', display: 'block', overflow: 'visible' }}>
      <rect x={cx1 - bPx / 2} y={cy - hPx / 2} width={bPx} height={hPx} fill="#F4F1E8" stroke="#51626F" strokeWidth="1.3" />
      <rect x={cx1 - bPx / 2} y={cy - ePx / 2} width={bPx} height={ePx} fill="#E1F2EF" stroke="#1E7F72" strokeWidth="1.2" />
      {ePx < hPx && (
        <>
          <rect x={cx1 - bPx / 2} y={cy - hPx / 2} width={bPx} height={(hPx - ePx) / 2} fill="#F7E3E6" stroke="#C3002F" strokeWidth="1.2" />
          <rect x={cx1 - bPx / 2} y={cy + ePx / 2} width={bPx} height={(hPx - ePx) / 2} fill="#F7E3E6" stroke="#C3002F" strokeWidth="1.2" />
        </>
      )}
      <line x1={cx1 - bPx / 2 - 10} y1={cy} x2={cx1 + bPx / 2 + 10} y2={cy} stroke="#51626F" strokeWidth="1" strokeDasharray="4 3" />
      <text x={cx1} y={cy - hPx / 2 - 10} fontSize="13" fill="#8A97A2" textAnchor="middle" fontWeight="700">단면 (탄성코어 vs 소성영역)</text>

      {/* 치수 — 숫자를 클릭하면 그 자리에서 폭/높이를 고칠 수 있다. 단위는 SETTING MENU 설정을 따른다. */}
      <DimLineV
        x={cx1 - bPx / 2 - 16}
        y1={cy - hPx / 2}
        y2={cy + hPx / 2}
        fontSize={12}
        value={height / lenF}
        unit={lenUnit}
        boxW={62}
        onChange={onEditHeight}
      />
      <DimLineH
        x1={cx1 - bPx / 2}
        x2={cx1 + bPx / 2}
        y={cy + hPx / 2 + 14}
        labelDy={15}
        fontSize={12}
        value={width / lenF}
        unit={lenUnit}
        boxW={62}
        onChange={onEditWidth}
      />

      <line x1={diagCx} y1={padTop} x2={diagCx} y2={padTop + hPx} stroke="#8A97A2" strokeWidth="1.3" />
      <text x={diagCx - diagHalfW - 4} y={padTop - 8} fontSize="13" fill="#8A97A2" textAnchor="middle" fontWeight="700">압축(−)</text>
      <text x={diagCx + diagHalfW + 4} y={padTop - 8} fontSize="13" fill="#8A97A2" textAnchor="middle" fontWeight="700">인장(+)</text>
      {ePx < hPx && (
        <>
          <rect x={diagCx - sYpx} y={yTopPx} width={sYpx} height={yMidTopPx - yTopPx} fill="#F7E3E6" stroke="#C3002F" strokeWidth="1.2" />
          <rect x={diagCx} y={yMidBotPx} width={sYpx} height={yBotPx - yMidBotPx} fill="#E1F2EF" stroke="#1E7F72" strokeWidth="1.2" />
        </>
      )}
      <line x1={diagCx - sYpx} y1={yMidTopPx} x2={diagCx} y2={cy} stroke="#C3002F" strokeWidth="1.8" />
      <line x1={diagCx} y1={cy} x2={diagCx + sYpx} y2={yMidBotPx} stroke="#1E7F72" strokeWidth="1.8" />
      <text x={diagCx} y={padTop + hPx + 20} fontSize="13" fill="#8A97A2" textAnchor="middle" fontWeight="700">STRESS DIAGRAM</text>
    </svg>
  );
}
