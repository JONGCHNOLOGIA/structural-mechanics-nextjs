'use client';

import { useMemo, useState } from 'react';
import { UNIT_OPTIONS, fmt } from '@/lib/calc/unitOptions';
import { computeElastoplastic } from '@/lib/calc/elastoplastic';

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
    <div className="grid grid-cols-[300px_1fr_300px] gap-6 max-w-[1700px] mx-auto p-6">
      {/* ---------------- Setting Menu ---------------- */}
      <div className="bg-white border border-line rounded-2xl p-5">
        <h3 className="text-crimson text-xs font-extrabold mb-4">SETTING MENU</h3>
        <p className="text-xs text-gray bg-bg rounded-xl p-3 mb-4 leading-relaxed">
          직사각형 단면에 모멘트를 점점 키우면, 처음엔 <b>탄성</b>이다가 표면부터 <b>항복</b>하기 시작하고, 계속 키우면 단면 전체가 <b>완전소성</b> 상태가 돼요. 아래 슬라이더로 모멘트를 올려보세요.
        </p>
        <Field label="Width (b)">
          <input type="number" className="field-input" defaultValue={fmt(disp(width, lenF))} onBlur={(e) => setWidth(parseFloat(e.target.value) * lenF)} />
        </Field>
        <Field label="Height (h)">
          <input type="number" className="field-input" defaultValue={fmt(disp(height, lenF))} onBlur={(e) => setHeight(parseFloat(e.target.value) * lenF)} />
        </Field>
        <Field label="항복응력 σY">
          <input type="number" className="field-input" defaultValue={fmt(disp(sigmaY, stressF))} onBlur={(e) => setSigmaY(parseFloat(e.target.value) * stressF)} />
        </Field>
        {r0 && (
          <Field label={`Moment M — 0 ~ Mp(${fmt(mpDisp)} ${units.moment})`}>
            <input
              type="range"
              min="0"
              max={mpDisp}
              step={mpDisp / 200}
              value={disp(moment, momF)}
              onChange={(e) => setMoment(parseFloat(e.target.value) * momF)}
              className="w-full"
            />
          </Field>
        )}
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="bg-white border border-line rounded-2xl p-6">
        <h3 className="text-crimson text-xs font-extrabold mb-4">
          VISUALIZER <span className="ml-2 text-[10px] bg-tealSoft text-teal rounded-full px-2 py-0.5">실시간</span>
        </h3>
        {r ? (
          <>
            <ElastoplasticSVG width={width} height={height} r={r} />
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <ResultCard label="현재 단계" value={r.stage} />
              <ResultCard label="e / c (탄성코어 비율)" value={(r.e / r.c).toFixed(2)} />
              <ResultCard label="My (항복모멘트)" value={`${fmt(disp(r.My, momF))} ${units.moment}`} />
              <ResultCard label="Mp (완전소성모멘트)" value={`${fmt(disp(r.Mp, momF))} ${units.moment}`} />
            </div>
            <p className="text-xs text-graySoft mt-2">형상계수 f = Mp/My = {r.shapeFactor.toFixed(2)} (직사각형은 항상 1.5)</p>
            <p className="text-xs text-graySoft mt-3">
              e = c·√(3 − 2M/My) (My ≤ M ≤ Mp). M ≤ My면 e=c(완전탄성), M ≥ Mp면 e=0(완전소성).
            </p>
          </>
        ) : (
          <div className="text-graySoft text-sm border-2 border-dashed border-line rounded-xl p-16 text-center">폭·높이·항복응력을 입력하면 단면과 응력 분포가 나타납니다.</div>
        )}
      </div>

      {/* ---------------- AI Tutor ---------------- */}
      <div className="bg-white border border-line rounded-2xl p-5 sticky top-6 self-start">
        <h3 className="text-crimson text-xs font-extrabold mb-4">
          AI TUTOR <span className="ml-2 text-[10px] bg-crimsonSoft text-crimson rounded-full px-2 py-0.5">준비중</span>
        </h3>
        <div className="text-sm text-gray bg-crimsonSoft rounded-xl p-3 mb-3">왜 e가 이 공식으로 나오는지 궁금하다면, 다음 단계에서 연결될 AI 튜터에게 물어보세요.</div>
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
    <svg viewBox={`0 0 ${w} ${hh}`} className="w-full max-w-[560px] mx-auto block">
      {/* 단면: 탄성 코어 + 소성 영역 */}
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

      {/* 응력 다이어그램 */}
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
