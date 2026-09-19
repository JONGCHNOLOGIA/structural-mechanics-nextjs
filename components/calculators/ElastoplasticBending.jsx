'use client';

import { useMemo, useState } from 'react';
import { UNIT_OPTIONS, fmt } from '@/lib/calc/unitOptions';
import { computeElastoplastic } from '@/lib/calc/elastoplastic';
import FormulaSection, { Tip } from './FormulaSection';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import Frac from '@/components/Frac';
import FieldBlockCard from './FieldBlockCard';
import ElastoplasticBeam3D from './ElastoplasticBeam3D';
import { DimLineH, DimLineV } from './EditableDim';

// 프로토타입 renderElastoplastic() / epBuildVisuals()를 React로 옮긴 버전.

export default function ElastoplasticBending() {
  const [units, setUnits] = useState({ length: 'in', stress: 'psi', moment: 'kip·in' });
  const [width, setWidth] = useState(4 * 0.0254);
  const [height, setHeight] = useState(6 * 0.0254);
  const [sigmaY, setSigmaY] = useState(36 * 6894.757);
  const [moment, setMoment] = useState(0);
  // 소성은 되돌릴 수 없다 — 그래서 "지금 모멘트"와 별개로 "지금까지 겪은 최대 모멘트"를 기억한다.
  // 모멘트를 다시 내려도 이 값은 안 내려가고, 초기화 버튼을 눌러야 0으로 돌아간다.
  const [peakMoment, setPeakMoment] = useState(0);
  const [activeField, setActiveField] = useState('width');

  function applyMoment(v) {
    setMoment(v);
    setPeakMoment((prev) => Math.max(prev, v));
  }
  function resetPlastic() {
    setMoment(0);
    setPeakMoment(0);
  }

  const lenF = UNIT_OPTIONS.length[units.length];
  const stressF = UNIT_OPTIONS.stress[units.stress];
  const momF = UNIT_OPTIONS.moment[units.moment];
  const disp = (b, f) => b / f;

  const r0 = useMemo(() => (width && height && sigmaY ? computeElastoplastic(width, height, sigmaY, 0) : null), [width, height, sigmaY]);
  const r = useMemo(() => (width && height && sigmaY ? computeElastoplastic(width, height, sigmaY, moment) : null), [width, height, sigmaY, moment]);
  // 겪은 최대 모멘트 기준 상태 — 잔류변형은 "지금"이 아니라 "가장 심했을 때"가 결정한다
  const rPeak = useMemo(
    () => (width && height && sigmaY ? computeElastoplastic(width, height, sigmaY, peakMoment) : null),
    [width, height, sigmaY, peakMoment]
  );

  // 곡률은 항복 시점 곡률(κy)을 1로 놓고 비로만 다룬다 (E가 없어도 비는 정해진다).
  //   탄성 구간: κ/κy = M/My
  //   탄소성 구간: κ/κy = c/e  (탄성코어가 얇아질수록 급격히 휜다)
  // 최대 모멘트에서 힘을 빼면 탄성분만 되돌아오므로, 남는 것이 잔류 곡률이다:
  //   κ잔류/κy = c/e(M최대) − M최대/My
  // 한 번도 항복한 적이 없으면 c/e = 1, M/My = 1이라 잔류가 정확히 0이 된다.
  const plastic = useMemo(() => {
    if (!r || !rPeak || !(r.My > 0)) return { kappaRatio: 0, residualRatio: 0, yielded: false };
    // 최대 모멘트에서의 곡률. 항복 전과 후가 다른 식이라는 게 중요하다 —
    // 항복 전에는 e = c여서 c/e가 늘 1이 되므로, 탄성 구간에까지 c/e를 쓰면
    // 아무 하중도 준 적 없는데 곡률이 1로 잡혀 잔류변형이 생긴 것처럼 보인다.
    const peakKappa =
      peakMoment <= rPeak.My
        ? peakMoment / rPeak.My // 탄성: 모멘트에 그대로 비례
        : rPeak.e > 0
        ? rPeak.c / rPeak.e // 탄소성: 탄성코어가 얇아질수록 급격히 휜다
        : 50; // 완전소성은 곡률이 발산하므로 화면용 상한으로 대신함
    const residual = Math.max(0, peakKappa - peakMoment / rPeak.My);
    return {
      kappaRatio: moment / r.My,
      residualRatio: residual,
      yielded: peakMoment > rPeak.My,
    };
  }, [r, rPeak, moment, peakMoment]);

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
            <input type="range" min="0" max={mpDisp} step={mpDisp / 200} value={disp(moment, momF)} onChange={(e) => applyMoment(parseFloat(e.target.value) * momF)} style={{ width: '100%' }} />
            {plastic.yielded && (
              <p style={{ fontSize: 11, color: 'var(--crimson)', lineHeight: 1.6, marginTop: 6 }}>
                이미 항복한 적이 있어요 (겪은 최대 모멘트 {fmt(disp(peakMoment, momF))} {units.moment}). 모멘트를 0으로 내려도 보는 휜 채로 남습니다.
              </p>
            )}
            <button className="add-block" onClick={resetPlastic} style={{ marginTop: 8 }}>
              ↺ 초기화 (소성 이전으로)
            </button>
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
              moment={moment}
              lenUnit={units.length}
              lenF={lenF}
              onEditWidth={(v) => setWidth(v * lenF)}
              onEditHeight={(v) => setHeight(v * lenF)}
            />

            {/* 3D — 모멘트를 키우면 실제로 휘고, 항복을 넘기면 표면부터 소성(붉은색)이 안으로 먹어 들어온다.
                여기서 보여주려는 건 "소성은 되돌릴 수 없다"이므로, 모멘트를 0으로 내려도 휜 채로 남는다.
                소성 영역(e)도 "지금" 모멘트가 아니라 "겪은 최대" 모멘트로 정한다 — 한 번 항복한 재료는
                힘을 빼도 탄성으로 돌아가지 않기 때문이다. 올리는 동안에는 둘이 같고, 내릴 때만 갈린다. */}
            <h3 style={{ marginTop: 18, marginBottom: 4 }}>보가 휘는 모습 (3D)</h3>
            <ElastoplasticBeam3D
              width={width}
              height={height}
              c={r.c}
              e={rPeak ? rPeak.e : r.e}
              kappaRatio={plastic.kappaRatio}
              residualRatio={plastic.residualRatio}
              stage={r.stage}
            />
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', fontSize: 11, color: 'var(--gray-soft)', margin: '6px 0 4px' }}>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: 'var(--crimson)', marginRight: 5 }} />항복한 부분 (소성)</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#E1F2EF', border: '1px solid #1E7F72', marginRight: 5 }} />아직 탄성인 코어</span>
            </div>
            <EditableText
              as="div"
              contentKey="calc.ElastoplasticBending.plastic3dNote"
              defaultText="모멘트를 **항복모멘트 My보다 크게** 올렸다가 다시 0으로 내려보세요. 탄성 범위 안에서만 움직였다면 보는 원래대로 펴지지만, 한 번이라도 항복하고 나면 **휜 채로 남습니다**. 이것이 소성변형이 되돌릴 수 없다는 뜻이에요. 왼쪽 초기화 버튼을 누르면 겪은 이력이 지워집니다."
              style={{ fontSize: 11.5, color: 'var(--gray-soft)', lineHeight: 1.7, marginBottom: 14 }}
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

function ElastoplasticSVG({ width, height, r, moment, lenUnit, lenF, onEditWidth, onEditHeight }) {
  // 왼쪽 높이 치수와 아래쪽 폭 치수를 적을 자리를 만들려고 그림판을 조금 넓혔다(원래 520×320).
  const w = 660, hh = 352, padTop = 30;
  const scale = 220 / height;
  const bPx = width * scale, hPx = height * scale;
  const cx1 = 200, cy = padTop + hPx / 2;
  // ⚠️ r.e는 탄성코어의 "반높이"다 (중립축에서 위아래로 각각 e). 전체 높이가 아니다.
  // 예전에는 이걸 전체 높이로 잘못 써서, 아직 항복하지 않은 탄성 상태(e = c = h/2)에서도
  // 코어가 절반만 그려지고 나머지가 소성(빨강)으로 칠해졌다.
  const ePx = r.e * scale;
  const coreTopY = cy - ePx;
  const coreBotY = cy + ePx;
  // 항복 전에는 e가 정확히 c(=h/2)라서 코어가 단면 전체를 채운다 — 그때는 소성 영역이 없다.
  const yielded = ePx < hPx / 2 - 0.01;

  const diagCx = 430, diagHalfW = 110;
  const yTopPx = padTop, yBotPx = padTop + hPx;
  const sYpx = diagHalfW;
  // 응력도의 표면 응력. 항복 후에는 코어 경계에서 σY에 닿지만, 항복 전에는 아직 σY에 못 미치므로
  // 모멘트 비율(M/My)만큼만 뻗는다. (이게 없으면 M이 0이든 My든 응력도가 똑같이 그려졌다)
  const surfRatio = yielded ? 1 : r.My > 0 ? Math.max(0, Math.min(1, (moment || 0) / r.My)) : 0;
  const tipPx = sYpx * surfRatio;

  return (
    <svg viewBox={`0 0 ${w} ${hh}`} style={{ width: '100%', maxWidth: 660, margin: '0 auto', display: 'block', overflow: 'visible' }}>
      <rect x={cx1 - bPx / 2} y={cy - hPx / 2} width={bPx} height={hPx} fill="#F4F1E8" stroke="#51626F" strokeWidth="1.3" />
      <rect x={cx1 - bPx / 2} y={coreTopY} width={bPx} height={2 * ePx} fill="#E1F2EF" stroke="#1E7F72" strokeWidth="1.2" />
      {yielded && (
        <>
          <rect x={cx1 - bPx / 2} y={cy - hPx / 2} width={bPx} height={hPx / 2 - ePx} fill="#F7E3E6" stroke="#C3002F" strokeWidth="1.2" />
          <rect x={cx1 - bPx / 2} y={coreBotY} width={bPx} height={hPx / 2 - ePx} fill="#F7E3E6" stroke="#C3002F" strokeWidth="1.2" />
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
      {yielded && (
        <>
          <rect x={diagCx - sYpx} y={yTopPx} width={sYpx} height={coreTopY - yTopPx} fill="#F7E3E6" stroke="#C3002F" strokeWidth="1.2" />
          <rect x={diagCx} y={coreBotY} width={sYpx} height={yBotPx - coreBotY} fill="#E1F2EF" stroke="#1E7F72" strokeWidth="1.2" />
        </>
      )}
      <line x1={diagCx - tipPx} y1={coreTopY} x2={diagCx} y2={cy} stroke="#C3002F" strokeWidth="1.8" />
      <line x1={diagCx} y1={cy} x2={diagCx + tipPx} y2={coreBotY} stroke="#1E7F72" strokeWidth="1.8" />
      <text x={diagCx} y={padTop + hPx + 20} fontSize="13" fill="#8A97A2" textAnchor="middle" fontWeight="700">STRESS DIAGRAM</text>
    </svg>
  );
}
