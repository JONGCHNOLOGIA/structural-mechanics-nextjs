'use client';

import { useMemo, useState } from 'react';
import { UNIT_OPTIONS, fmt, fmtInput } from '@/lib/calc/unitOptions';
import { computeElastoplastic } from '@/lib/calc/elastoplastic';
import FormulaSection, { Tip } from './FormulaSection';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import Frac from '@/components/Frac';

// 프로토타입 renderElastoplastic() / epBuildVisuals()를 React로 옮긴 버전.

export default function ElastoplasticBending() {
  const [units] = useState({ length: 'in', stress: 'psi', moment: 'kip·in' });
  const [width, setWidth] = useState(4 * 0.0254);
  const [height, setHeight] = useState(6 * 0.0254);
  const [sigmaY, setSigmaY] = useState(36 * 6894.757);
  const [moment, setMoment] = useState(0);

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
        <p style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.6, marginBottom: 16, background: 'var(--bg)', borderRadius: 10, padding: '12px 14px' }}>
          직사각형 단면에 모멘트를 점점 키우면, 처음엔 <b>탄성</b>이다가 표면부터 <b>항복</b>하기 시작하고, 계속 키우면 단면 전체가 <b>완전소성</b> 상태가 돼요. 아래 슬라이더로 모멘트를 올려보세요.
        </p>
        <div className="field">
          <label>Width (b)</label>
          <input type="number" defaultValue={fmtInput(disp(width, lenF))} onBlur={(e) => setWidth(parseFloat(e.target.value) * lenF)} />
        </div>
        <div className="field">
          <label>Height (h)</label>
          <input type="number" defaultValue={fmtInput(disp(height, lenF))} onBlur={(e) => setHeight(parseFloat(e.target.value) * lenF)} />
        </div>
        <div className="field">
          <label>항복응력 σY</label>
          <input type="number" defaultValue={fmtInput(disp(sigmaY, stressF))} onBlur={(e) => setSigmaY(parseFloat(e.target.value) * stressF)} />
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
          VISUALIZER <span className="badge live" style={{ marginLeft: 6 }}>실시간</span>
        </h3>
        {r ? (
          <>
            <ElastoplasticSVG width={width} height={height} r={r} />
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
            <div style={{ fontSize: 11, color: 'var(--gray-soft)', marginTop: 8 }}>형상계수 f = Mp/My = {r.shapeFactor.toFixed(2)} (직사각형은 항상 1.5)</div>
            <div className="steps">
              <FormulaSection title="탄성코어 계산">
                <div className="step-formula">
                  <Tip title="탄성코어 절반 높이">e</Tip> = c·√(3 − <Frac num="2M" den="My" />) (My ≤ M ≤ Mp)
                </div>
                <div className="step-row">
                  My = <Frac num="σY·I" den="c" /> &nbsp; Mp = <Frac num="σY·b·h²" den="4" /> &nbsp; f = <Frac num="Mp" den="My" /> = 1.5
                </div>
                <div style={{ fontSize: 11, color: 'var(--gray-soft)', marginTop: 6 }}>M ≤ My면 e=c(완전탄성), M ≥ Mp면 e=0(완전소성)</div>
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

function ElastoplasticSVG({ width, height, r }) {
  const w = 520, hh = 320, padTop = 30;
  const scale = 220 / height;
  const bPx = width * scale, hPx = height * scale;
  const cx1 = 130, cy = padTop + hPx / 2;
  const ePx = r.e * scale;

  const diagCx = 340, diagHalfW = 110;
  const yTopPx = padTop, yBotPx = padTop + hPx;
  const yMidTopPx = padTop + (hPx - ePx) / 2, yMidBotPx = padTop + (hPx + ePx) / 2;
  const sYpx = diagHalfW;

  return (
    <svg viewBox={`0 0 ${w} ${hh}`} style={{ width: '100%', maxWidth: 560, margin: '0 auto', display: 'block' }}>
      <rect x={cx1 - bPx / 2} y={cy - hPx / 2} width={bPx} height={hPx} fill="#F4F1E8" stroke="#51626F" strokeWidth="1.3" />
      <rect x={cx1 - bPx / 2} y={cy - ePx / 2} width={bPx} height={ePx} fill="#E1F2EF" stroke="#1E7F72" strokeWidth="1.2" />
      {ePx < hPx && (
        <>
          <rect x={cx1 - bPx / 2} y={cy - hPx / 2} width={bPx} height={(hPx - ePx) / 2} fill="#F7E3E6" stroke="#C3002F" strokeWidth="1.2" />
          <rect x={cx1 - bPx / 2} y={cy + ePx / 2} width={bPx} height={(hPx - ePx) / 2} fill="#F7E3E6" stroke="#C3002F" strokeWidth="1.2" />
        </>
      )}
      <line x1={cx1 - bPx / 2 - 10} y1={cy} x2={cx1 + bPx / 2 + 10} y2={cy} stroke="#51626F" strokeWidth="1" strokeDasharray="4 3" />
      <text x={cx1} y={cy - hPx / 2 - 10} fontSize="11" fill="#8A97A2" textAnchor="middle" fontWeight="700">단면 (탄성코어 vs 소성영역)</text>

      <line x1={diagCx} y1={padTop} x2={diagCx} y2={padTop + hPx} stroke="#8A97A2" strokeWidth="1.3" />
      <text x={diagCx - diagHalfW - 4} y={padTop - 8} fontSize="10" fill="#8A97A2" textAnchor="middle" fontWeight="700">압축(−)</text>
      <text x={diagCx + diagHalfW + 4} y={padTop - 8} fontSize="10" fill="#8A97A2" textAnchor="middle" fontWeight="700">인장(+)</text>
      {ePx < hPx && (
        <>
          <rect x={diagCx - sYpx} y={yTopPx} width={sYpx} height={yMidTopPx - yTopPx} fill="#F7E3E6" stroke="#C3002F" strokeWidth="1.2" />
          <rect x={diagCx} y={yMidBotPx} width={sYpx} height={yBotPx - yMidBotPx} fill="#E1F2EF" stroke="#1E7F72" strokeWidth="1.2" />
        </>
      )}
      <line x1={diagCx - sYpx} y1={yMidTopPx} x2={diagCx} y2={cy} stroke="#C3002F" strokeWidth="1.8" />
      <line x1={diagCx} y1={cy} x2={diagCx + sYpx} y2={yMidBotPx} stroke="#1E7F72" strokeWidth="1.8" />
      <text x={diagCx} y={padTop + hPx + 20} fontSize="10.5" fill="#8A97A2" textAnchor="middle" fontWeight="700">STRESS DIAGRAM</text>
    </svg>
  );
}
