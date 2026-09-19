'use client';

import { useMemo, useState } from 'react';
import { UNIT_OPTIONS, fmt, fmtInput } from '@/lib/calc/unitOptions';
import { computeHookesLaw } from '@/lib/calc/hookesLaw';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import StressStateCard from './StressStateCard';

/*
  평면응력에서 응력과 변형률의 관계.

  이 화면이 보여주려는 건 딱 하나다 — **x·y·z 축이 서로 묶여 있다는 것**.
  σx만 당겨도 y가 줄고(포아송) z도 줄어든다. 그 구조를 가장 정확하게 담고 있는 건
  교재의 행렬이라, 행렬을 화면 가운데에 그대로 두고 값만 실시간으로 채운다.

  행렬이 못 하는 게 하나 있다: ν가 "얼마나 세게" 작용하는지가 식만 봐서는 안 온다.
  그래서 ν 슬라이더와 변형 그림만 곁들인다. 0에서 0.5로 끌면 세로가 줄어드는 정도가
  눈에 띄게 달라지고, 행렬의 −ν 자리가 같이 바뀐다.

  (예전에는 여기에 변형률 표, 응력↔변형률 모드 토글, 두께 입력, 얇은 판 3D까지 있었는데
   한 화면에 너무 많아서 정작 행렬이 묻혔다. 전부 덜어내고 행렬 중심으로 되돌린 것)
*/

const CRIMSON = '#C3002F';
const TEAL = '#1E7F72';
const GOLD = '#B0790A';
const GRAY = '#8A97A2';
const INK = '#51626F';

export default function HookesLaw() {
  const [units, setUnits] = useState({ stress: 'psi' });
  const [E, setE] = useState(30000 * 6894757);
  const [nu, setNu] = useState(0.3);
  const [sigmaX, setSigmaX] = useState(10000 * 6894.757);
  const [sigmaY, setSigmaY] = useState(-4000 * 6894.757);
  const [tauXY, setTauXY] = useState(3000 * 6894.757);

  const stressF = UNIT_OPTIONS.stress[units.stress];
  const disp = (b, f) => b / f;

  const r = useMemo(
    () => (E && nu !== null ? computeHookesLaw({ mode: 'stressToStrain', E, nu, sigmaX, sigmaY, tauXY }) : null),
    [E, nu, sigmaX, sigmaY, tauXY]
  );

  return (
    <>
      {/* ---------------- Setting Menu ---------------- */}
      <div className="panel">
        <h3>SETTING MENU</h3>
        <EditableText
          contentKey="calc.HookesLaw.intro"
          defaultText="응력을 주면 재료가 얼마나 변형되는지를 정하는 관계예요. 핵심은 **x·y·z가 따로 놀지 않는다**는 것 — 한 방향으로만 당겨도 나머지 두 방향이 같이 움직입니다."
          style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.6, marginBottom: 14, background: 'var(--bg)', borderRadius: 0, padding: '12px 14px' }}
        />

        <div className="field">
          <label>응력 단위</label>
          <select
            className="unit-inline"
            style={{ width: '100%' }}
            value={units.stress}
            onChange={(e) => setUnits((p) => ({ ...p, stress: e.target.value }))}
          >
            {Object.keys(UNIT_OPTIONS.stress).map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>탄성계수 E — {fmt(disp(E, stressF))} {units.stress}</label>
          <input
            key={`E-${E}-${units.stress}`}
            type="number"
            defaultValue={fmtInput(disp(E, stressF))}
            onBlur={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v) && v > 0) setE(v * stressF);
            }}
          />
        </div>

        <div className="field">
          <label>포아송비 ν — {nu}</label>
          {/* 이 슬라이더가 이 페이지의 핵심 조작이다. 0 → 0.5로 끌면 가로로 당길 때
              세로가 얼마나 따라 줄어드는지가 오른쪽 그림과 행렬에서 동시에 바뀐다. */}
          <input
            type="range"
            min="0"
            max="0.5"
            step="0.01"
            value={nu}
            onChange={(e) => setNu(parseFloat(e.target.value))}
            style={{ width: '100%', marginBottom: 6 }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            {[0, 0.3, 0.5].map((v) => (
              <button
                key={v}
                type="button"
                className={'add-block' + (Math.abs(nu - v) < 1e-9 ? ' active' : '')}
                style={{ margin: 0, flex: 1, padding: '6px 0', fontSize: 11.5 }}
                onClick={() => setNu(v)}
              >
                ν = {v}
              </button>
            ))}
          </div>
        </div>

        <StressStateCard
          sigmaX={sigmaX}
          sigmaY={sigmaY}
          tauXY={tauXY}
          units={units}
          onFieldChange={(field, value) => {
            const val = parseFloat(value);
            if (isNaN(val)) return;
            const newVal = val * stressF;
            if (field === 'sigmaX') setSigmaX(newVal);
            else if (field === 'sigmaY') setSigmaY(newVal);
            else if (field === 'tauXY') setTauXY(newVal);
          }}
          onUnitChange={(v) => setUnits((p) => ({ ...p, stress: v }))}
        />
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="panel">
        <h3>VISUALIZER</h3>
        {r ? (
          <>
            <DeformSVG r={r} />
            <ComplianceMatrix r={r} nu={nu} E={E} stressF={stressF} unitStress={units.stress} />
            <EditableText
              as="div"
              className="ai-hint"
              contentKey="calc.HookesLaw.aiHint"
              defaultText="💬 왜 εz가 σx, σy만으로 결정되는지 궁금하다면, 오른쪽 AI 튜터에게 물어보세요."
            />
          </>
        ) : (
          <div className="viz-placeholder" style={{ minHeight: 300 }}>
            E와 ν를 입력하면 계산 결과가 나타납니다.
          </div>
        )}
      </div>

      <AiTutorPanel />
    </>
  );
}

// 점선 = 변형 전, 실선 = 변형 후. 숫자는 아래 행렬이 맡고, 여기서는 모양만 보여준다.
// 변형률이 1e-4 수준이라 실제 비율로는 아무 변화도 안 보이므로 크게 부풀려 그린다.
function DeformSVG({ r }) {
  const w = 440, h = 230;
  const cx = 150, cy = 112, s0 = 68;

  const maxStrain = Math.max(Math.abs(r.ex), Math.abs(r.ey), Math.abs(r.gxy), 1e-12);
  const gain = 0.5 / maxStrain;
  const hw = s0 * (1 + r.ex * gain);
  const hh = s0 * (1 + r.ey * gain);
  const skew = s0 * r.gxy * gain;
  const P = [
    [cx - hw - skew, cy - hh],
    [cx + hw - skew, cy - hh],
    [cx + hw + skew, cy + hh],
    [cx - hw + skew, cy + hh],
  ];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 440, margin: '0 auto', display: 'block', overflow: 'visible' }}>
      <rect x={cx - s0} y={cy - s0} width={s0 * 2} height={s0 * 2} fill="none" stroke={GRAY} strokeWidth="1.3" strokeDasharray="5 4" />
      <polygon points={P.map((q) => q.join(',')).join(' ')} fill={INK} fillOpacity="0.14" stroke={INK} strokeWidth="1.8" />

      {/* 당기고 미는 방향 */}
      {[
        { x1: cx + hw, dir: r.sx >= 0 ? 1 : -1, key: 'rx' },
        { x1: cx - hw, dir: r.sx >= 0 ? -1 : 1, key: 'lx' },
      ].map((a) => (
        <g key={a.key}>
          <line x1={a.x1} y1={cy} x2={a.x1 + a.dir * 26} y2={cy} stroke={CRIMSON} strokeWidth="2" />
          <polygon points={`${a.x1 + a.dir * 26},${cy} ${a.x1 + a.dir * 19},${cy - 4.5} ${a.x1 + a.dir * 19},${cy + 4.5}`} fill={CRIMSON} />
        </g>
      ))}
      {[
        { y1: cy - hh, dir: r.sy >= 0 ? -1 : 1, key: 'ty' },
        { y1: cy + hh, dir: r.sy >= 0 ? 1 : -1, key: 'by' },
      ].map((a) => (
        <g key={a.key}>
          <line x1={cx} y1={a.y1} x2={cx} y2={a.y1 + a.dir * 26} stroke={TEAL} strokeWidth="2" />
          <polygon points={`${cx},${a.y1 + a.dir * 26} ${cx - 4.5},${a.y1 + a.dir * 19} ${cx + 4.5},${a.y1 + a.dir * 19}`} fill={TEAL} />
        </g>
      ))}
      <text x={cx + hw + 32} y={cy + 4} fontSize="11.5" fill={CRIMSON} fontWeight="800">σx</text>
      <text x={cx + 7} y={cy - hh - 32} fontSize="11.5" fill={TEAL} fontWeight="800">σy</text>
      <text x={cx - s0} y={cy - s0 - 10} fontSize="10.5" fill={GRAY}>변형 전</text>

      {/* z방향은 그림에 그릴 수 없으므로(화면 밖으로 나가는 축) 글씨로 알려준다 */}
      <g transform="translate(300 0)">
        <text x="0" y="52" fontSize="11.5" fill={GOLD} fontWeight="800">z (두께) 방향</text>
        <text x="0" y="70" fontSize="10.5" fill={GRAY}>화면 안쪽으로 들어가는 축</text>
        <text x="0" y="94" fontSize="12" fill={GOLD} fontWeight="800">
          {r.ez > 0 ? '두꺼워짐' : r.ez < 0 ? '얇아짐' : '변화 없음'}
        </text>
        <text x="0" y="112" fontSize="10.5" fill={GRAY}>σz = 0 인데도 그렇다</text>
        <text x="0" y="150" fontSize="10" fill={GRAY}>변형은 실제보다</text>
        <text x="0" y="164" fontSize="10" fill={GRAY}>
          약 {gain >= 1e4 ? gain.toExponential(1) : Math.round(gain).toLocaleString('en-US')}배 부풀렸습니다
        </text>
      </g>
    </svg>
  );
}

// 교재의 평면응력 컴플라이언스 행렬. ν가 들어가는 자리를 강조해서,
// "x와 y가 −ν로 묶여 있다"가 식에서 바로 보이게 한다.
function ComplianceMatrix({ r, nu, E, stressF, unitStress }) {
  const cell = { padding: '6px 12px', textAlign: 'center', fontFamily: "'JetBrains Mono',monospace", fontSize: 12.5 };
  const coupled = { ...cell, color: CRIMSON, fontWeight: 800, background: 'var(--crimson-soft)' };
  const bracket = { fontSize: 46, color: INK, lineHeight: 1, fontWeight: 300 };

  const Col = ({ rows, color }) => (
    <table style={{ borderCollapse: 'collapse' }}>
      <tbody>
        {rows.map((t, i) => (
          <tr key={i}>
            <td style={{ ...cell, color: color || 'var(--ink)', fontWeight: 700, whiteSpace: 'nowrap' }}>{t}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div style={{ marginTop: 6 }}>
      <EditableText
        as="div"
        contentKey="calc.HookesLaw.matrixIntro"
        defaultText="**x와 y가 −ν로 묶여 있는 게 보이시나요?** 붉은 칸이 그 자리예요. ν를 0으로 내리면 이 칸이 사라지고, 그 순간 가로로 당겨도 세로는 꿈쩍하지 않습니다."
        style={{ fontSize: 11.5, color: 'var(--gray-soft)', lineHeight: 1.7, margin: '14px 0 10px' }}
      />

      <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, minWidth: 520 }}>
          <span style={bracket}>⎡</span>
          <Col rows={[r.ex.toExponential(3), r.ey.toExponential(3), r.gxy.toExponential(3)]} />
          <span style={bracket}>⎤</span>

          <span style={{ margin: '0 10px', fontSize: 16, color: INK }}>=</span>

          <div style={{ textAlign: 'center', fontSize: 12.5, color: INK, fontFamily: "'JetBrains Mono',monospace" }}>
            <div style={{ borderBottom: `1px solid ${INK}`, padding: '0 6px' }}>1</div>
            <div style={{ padding: '0 6px' }}>E</div>
          </div>

          <span style={bracket}>⎡</span>
          <table style={{ borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={cell}>1</td>
                <td style={coupled}>−{nu}</td>
                <td style={cell}>0</td>
              </tr>
              <tr>
                <td style={coupled}>−{nu}</td>
                <td style={cell}>1</td>
                <td style={cell}>0</td>
              </tr>
              <tr>
                <td style={cell}>0</td>
                <td style={cell}>0</td>
                <td style={cell}>{fmt(2 * (1 + nu))}</td>
              </tr>
            </tbody>
          </table>
          <span style={bracket}>⎤</span>

          <span style={bracket}>⎡</span>
          <Col
            rows={[
              `${fmt(r.sx / stressF)}`,
              `${fmt(r.sy / stressF)}`,
              `${fmt(r.txy / stressF)}`,
            ]}
            color={GRAY}
          />
          <span style={bracket}>⎤</span>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 30, fontSize: 10.5, color: GRAY, marginTop: 2 }}>
        <span>εx, εy, γxy</span>
        <span>σx, σy, τxy ({unitStress})</span>
      </div>

      {/* z는 위 3×3에 안 들어가므로 따로 적는다 — 이 줄이 이 페이지에서 가장 중요한 줄이다 */}
      <div
        style={{
          marginTop: 18,
          padding: '14px 16px',
          background: 'var(--bg)',
          borderLeft: `3px solid ${GOLD}`,
          fontSize: 12.5,
          lineHeight: 1.9,
        }}
      >
        <div style={{ fontFamily: "'JetBrains Mono',monospace", color: GOLD, fontWeight: 800 }}>
          εz = −(ν/E)(σx + σy) = {r.ez.toExponential(3)}
        </div>
        <EditableText
          as="div"
          contentKey="calc.HookesLaw.ezNote"
          defaultText="평면응력은 **σz = 0**이라는 뜻이지 **εz = 0**이라는 뜻이 아니에요. z방향으로는 아무도 밀지 않는데도, x·y가 당겨지는 만큼 두께가 따라 변합니다. ν = 0으로 놓으면 이 값도 0이 됩니다."
          style={{ fontSize: 11.5, color: 'var(--gray-soft)', marginTop: 6, lineHeight: 1.7 }}
        />
      </div>
    </div>
  );
}
