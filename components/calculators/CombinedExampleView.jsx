'use client';

import { useMemo, useState } from 'react';
import { fmt } from '@/lib/calc/unitOptions';
import { principalFromState } from '@/lib/calc/principalStress';
import { COMBINED_EXAMPLES } from '@/lib/calc/combinedExamples';
import EditableText from '@/components/EditableText';

/*
  교재(mmch8.pdf) Combined Loadings 예제 8-4 ~ 8-7을 골라 볼 수 있는 화면.

  학생이 혼자 풀 때 막히는 지점이 "여러 하중이 각각 어떤 응력이 되는지"와
  "그걸 어떻게 한 점에서 합치는지"라서, 그 두 단계를 그림과 단계 카드로 나눠 보여준다.

  - 왼쪽: 무슨 상황인지 그림으로 (압력+자중+비틀림 / 압력+굽힘 / 바람+비틀림 / 편심+전단)
  - 오른쪽: 주어진 값 → 하중별 응력 → 합친 σx·σy·τxy → 주응력
  - 각 단계는 접혀 있고, 눌러야 답이 나온다. 바로 답을 보여주면 읽고 넘어가게 된다.

  교재에 인쇄된 최종 답이 있는 예제는 계산 결과와 나란히 적어 둔다 — 둘이 어긋나면
  옮기는 과정에서 틀린 것이므로 바로 드러난다.
*/

const CRIMSON = '#C3002F';
const TEAL = '#1E7F72';
const GRAY = '#8A97A2';
const INK = '#51626F';

// 예제마다 상황이 달라서 그림도 다르다. 치수보다 "무엇이 무엇을 어떻게 미는가"를 우선했다.
function SceneSVG({ scene }) {
  const common = { width: '100%', maxWidth: 300, margin: '0 auto', display: 'block', overflow: 'visible' };

  if (scene === 'casing') {
    return (
      <svg viewBox="0 0 300 260" style={common}>
        <ellipse cx="150" cy="46" rx="42" ry="12" fill="#DCE9F2" stroke={INK} strokeWidth="1.4" />
        <path d="M108 46 L108 206 A42 12 0 0 0 192 206 L192 46" fill="#DCE9F2" fillOpacity="0.7" stroke={INK} strokeWidth="1.4" />
        <ellipse cx="150" cy="206" rx="42" ry="12" fill="none" stroke={INK} strokeWidth="1.2" strokeDasharray="4 3" />
        {/* 안쪽 압력 */}
        {[70, 110, 150, 190].map((y) => (
          <g key={y}>
            <line x1="150" y1={y} x2="182" y2={y} stroke={CRIMSON} strokeWidth="1.6" />
            <polygon points={`188,${y} 180,${y - 4} 180,${y + 4}`} fill={CRIMSON} />
            <line x1="150" y1={y} x2="118" y2={y} stroke={CRIMSON} strokeWidth="1.6" />
            <polygon points={`112,${y} 120,${y - 4} 120,${y + 4}`} fill={CRIMSON} />
          </g>
        ))}
        <text x="196" y="130" fontSize="11" fill={CRIMSON} fontWeight="800">p</text>
        {/* 자중 */}
        <line x1="150" y1="12" x2="150" y2="34" stroke={INK} strokeWidth="2.4" />
        <polygon points="150,40 144,28 156,28" fill={INK} />
        <text x="158" y="24" fontSize="11" fill={INK} fontWeight="800">P</text>
        {/* 비틀림 */}
        <path d="M100 34 A 52 16 0 0 0 200 30" fill="none" stroke={TEAL} strokeWidth="2" />
        <polygon points="204,30 194,24 195,36" fill={TEAL} />
        <text x="206" y="44" fontSize="11" fill={TEAL} fontWeight="800">T</text>
        <text x="150" y="238" fontSize="10.5" fill={GRAY} textAnchor="middle">압력 + 자중 + 비틀림</text>
      </svg>
    );
  }

  if (scene === 'tank') {
    return (
      <svg viewBox="0 0 300 260" style={common}>
        <rect x="46" y="88" width="208" height="76" rx="38" fill="#DCE9F2" stroke={INK} strokeWidth="1.5" />
        {[80, 120, 160, 200, 240].map((x) => (
          <g key={x}>
            <line x1={x} y1="58" x2={x} y2="82" stroke={CRIMSON} strokeWidth="1.8" />
            <polygon points={`${x},88 ${x - 5},78 ${x + 5},78`} fill={CRIMSON} />
          </g>
        ))}
        <line x1="70" y1="56" x2="250" y2="56" stroke={CRIMSON} strokeWidth="1.4" />
        <text x="160" y="48" fontSize="11" fill={CRIMSON} textAnchor="middle" fontWeight="800">q (자중)</text>
        <polygon points="76,166 64,190 88,190" fill="none" stroke={INK} strokeWidth="1.5" />
        <polygon points="224,166 212,190 236,190" fill="none" stroke={INK} strokeWidth="1.5" />
        {[110, 150, 190].map((x) => (
          <g key={x}>
            <line x1={x} y1="126" x2={x + 22} y2="126" stroke={TEAL} strokeWidth="1.4" />
            <polygon points={`${x + 28},126 ${x + 20},122 ${x + 20},130`} fill={TEAL} />
          </g>
        ))}
        <text x="150" y="212" fontSize="11" fill={TEAL} textAnchor="middle" fontWeight="800">안쪽 압력 p</text>
        <text x="150" y="238" fontSize="10.5" fill={GRAY} textAnchor="middle">압력 + 보처럼 휨</text>
      </svg>
    );
  }

  if (scene === 'sign') {
    return (
      <svg viewBox="0 0 300 260" style={common}>
        <rect x="136" y="40" width="20" height="176" fill="#DCE9F2" stroke={INK} strokeWidth="1.5" />
        <rect x="120" y="212" width="52" height="10" fill="#C8D2DA" stroke={INK} strokeWidth="1.2" />
        <rect x="156" y="52" width="96" height="52" fill="#DCE9F2" stroke={INK} strokeWidth="1.4" />
        <text x="204" y="82" fontSize="11" fill={INK} textAnchor="middle" fontWeight="800">간판</text>
        {[64, 80, 96].map((y) => (
          <g key={y}>
            <line x1="270" y1={y} x2="258" y2={y} stroke={CRIMSON} strokeWidth="1.8" />
            <polygon points={`252,${y} 260,${y - 4} 260,${y + 4}`} fill={CRIMSON} />
          </g>
        ))}
        <text x="274" y="82" fontSize="11" fill={CRIMSON} fontWeight="800">W</text>
        <path d="M120 44 A 26 9 0 0 0 172 41" fill="none" stroke={TEAL} strokeWidth="1.8" />
        <polygon points="176,41 166,36 167,47" fill={TEAL} />
        <text x="180" y="38" fontSize="11" fill={TEAL} fontWeight="800">T</text>
        <circle cx="140" cy="216" r="3" fill={CRIMSON} />
        <circle cx="152" cy="216" r="3" fill={CRIMSON} />
        <text x="146" y="238" fontSize="10.5" fill={GRAY} textAnchor="middle">A·B점 (밑동) — 굽힘 + 비틀림</text>
      </svg>
    );
  }

  // bracket
  return (
    <svg viewBox="0 0 300 260" style={common}>
      <rect x="128" y="76" width="44" height="140" fill="#DCE9F2" stroke={INK} strokeWidth="1.5" />
      <rect x="112" y="212" width="76" height="10" fill="#C8D2DA" stroke={INK} strokeWidth="1.2" />
      <rect x="128" y="54" width="104" height="22" fill="#C8D2DA" stroke={INK} strokeWidth="1.3" />
      <line x1="214" y1="16" x2="214" y2="44" stroke={CRIMSON} strokeWidth="2.4" />
      <polygon points="214,52 207,38 221,38" fill={CRIMSON} />
      <text x="222" y="32" fontSize="11" fill={CRIMSON} fontWeight="800">P₁</text>
      <line x1="66" y1="96" x2="112" y2="96" stroke={TEAL} strokeWidth="2.2" />
      <polygon points="120,96 108,90 108,102" fill={TEAL} />
      <text x="58" y="92" fontSize="11" fill={TEAL} fontWeight="800" textAnchor="end">P₂</text>
      <line x1="150" y1="60" x2="214" y2="60" stroke={GRAY} strokeWidth="1" strokeDasharray="3 3" />
      <text x="182" y="52" fontSize="10" fill={GRAY} textAnchor="middle">d</text>
      <circle cx="140" cy="216" r="3" fill={CRIMSON} />
      <circle cx="160" cy="216" r="3" fill={CRIMSON} />
      <text x="150" y="238" fontSize="10.5" fill={GRAY} textAnchor="middle">편심 압축 + 전단 + 굽힘</text>
    </svg>
  );
}

function Step({ step, index }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="step-card">
      <div className="step-header" role="button" tabIndex={0} onClick={() => setOpen((v) => !v)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen((v) => !v); } }}>
        <span style={{ display: 'inline-block', width: 14 }}>{open ? '▾' : '▸'}</span>
        {step.title}
      </div>
      {open && (
        <div className="step-body">
          <div className="step-formula">{step.formula}</div>
          {step.detail && <div className="step-row">= {step.detail}</div>}
          {step.result !== null && step.result !== undefined && (
            <div className="step-final">
              = {fmt(step.result)} {step.unit}
            </div>
          )}
          {step.note && <div style={{ fontSize: 11.5, color: 'var(--gray-soft)', marginTop: 8, lineHeight: 1.7 }}>{step.note}</div>}
        </div>
      )}
    </div>
  );
}

export default function CombinedExampleView() {
  const [id, setId] = useState(COMBINED_EXAMPLES[0].id);
  const ex = COMBINED_EXAMPLES.find((e) => e.id === id) || COMBINED_EXAMPLES[0];

  // 합친 응력 상태가 있는 예제만 주응력까지 계산해서 보여준다.
  // (8-6·8-7은 A점·B점을 따로 봐야 해서 교재도 상태 하나로 묶지 않는다)
  const pr = useMemo(() => {
    if (!ex.state) return null;
    return principalFromState(ex.state.sigmaX, ex.state.sigmaY, ex.state.tauXY);
  }, [ex]);

  return (
    <div>
      <div className="tabs" style={{ padding: 0, margin: '0 0 14px', maxWidth: 'none' }}>
        {COMBINED_EXAMPLES.map((e) => (
          <button key={e.id} className={'tab' + (e.id === id ? ' active' : '')} onClick={() => setId(e.id)} type="button">
            {e.id}
          </button>
        ))}
      </div>

      <h3 style={{ marginBottom: 6 }}>{ex.title}</h3>
      <p style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.8, marginBottom: 14 }}>{ex.summary}</p>

      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: '0 1 300px', minWidth: 220 }}>
          <SceneSVG scene={ex.scene} />
        </div>
        <div style={{ flex: '1 1 260px', minWidth: 240 }}>
          <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--gray-soft)', marginBottom: 6 }}>주어진 값</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
            <tbody>
              {ex.given.map((g) => (
                <tr key={g.sym} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '5px 6px', fontWeight: 800, color: 'var(--ink)', width: 44 }}>{g.sym}</td>
                  <td style={{ padding: '5px 6px', color: 'var(--gray-soft)' }}>{g.label}</td>
                  <td style={{ padding: '5px 6px', textAlign: 'right', fontFamily: "'JetBrains Mono',monospace" }}>
                    {fmt(g.value)} {g.unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <EditableText
        as="div"
        contentKey={`calc.CombinedLoadings.ex${ex.id}.hint`}
        defaultText="각 단계를 눌러서 하나씩 펴보세요. 먼저 스스로 세워보고 나서 확인하는 편이 훨씬 남습니다."
        style={{ fontSize: 11.5, color: 'var(--gray-soft)', margin: '16px 0 8px', lineHeight: 1.7 }}
      />

      <div className="steps">
        {ex.steps.map((s, i) => (
          <Step key={s.title} step={s} index={i} />
        ))}

        {ex.state && pr && (
          <div className="step-card">
            <div className="step-header static">한 점에서 합치기 → 주응력</div>
            <div className="step-body">
              <div className="step-row">
                σx = {fmt(ex.state.sigmaX)} {ex.state.unit} &nbsp; σy = {fmt(ex.state.sigmaY)} {ex.state.unit} &nbsp; τxy ={' '}
                {fmt(ex.state.tauXY)} {ex.state.unit}
              </div>
              <div className="step-final">
                σ1 = {fmt(pr.sigma1)} &nbsp; σ2 = {fmt(pr.sigma2)} &nbsp; τmax = {fmt(pr.tauMax)} {ex.state.unit}
              </div>
              {ex.textbookAnswer && (
                <div style={{ fontSize: 11, color: 'var(--gray-soft)', marginTop: 8, lineHeight: 1.7 }}>
                  교재에 인쇄된 답: σ1 = {ex.textbookAnswer.sigma1}, σ2 = {ex.textbookAnswer.sigma2}, τmax ={' '}
                  {ex.textbookAnswer.tauMax} {ex.textbookAnswer.unit}
                </div>
              )}
            </div>
          </div>
        )}

        {!ex.state && (
          <div className="step-card">
            <div className="step-header static">여기서부터는 점을 골라야 한다</div>
            <div className="step-body" style={{ lineHeight: 1.8 }}>
              이 예제는 단면 위의 <b>A점과 B점</b>에서 응력이 서로 달라서, 한 덩어리로 합칠 수 없어요. 두 점 각각에 대해 σ와 τ를 구한
              다음, 위쪽 <b>SETTING MENU</b>에 그 값을 넣어 주응력을 확인해보세요.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
