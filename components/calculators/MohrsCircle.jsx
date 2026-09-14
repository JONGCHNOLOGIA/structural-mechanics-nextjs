'use client';

import { useMemo, useState } from 'react';
import { UNIT_OPTIONS, fmt, fmtInput } from '@/lib/calc/unitOptions';
import { computePlaneStress } from '@/lib/calc/planeStress';
import FormulaSection from './FormulaSection';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import Frac from '@/components/Frac';

// 프로토타입 renderMohrCircle() / mcBuildVisuals()를 React로 옮긴 버전.

export default function MohrsCircle() {
  const [units, setUnits] = useState({ stress: 'psi' });
  const [sigmaX, setSigmaX] = useState(10000 * 6894.757);
  const [sigmaY, setSigmaY] = useState(-4000 * 6894.757);
  const [tauXY, setTauXY] = useState(3000 * 6894.757);
  const [theta, setTheta] = useState(0);

  const stressF = UNIT_OPTIONS.stress[units.stress];
  const disp = (b, f) => b / f;

  const r = useMemo(() => computePlaneStress(sigmaX, sigmaY, tauXY, theta), [sigmaX, sigmaY, tauXY, theta]);

  return (
    <>
      {/* ---------------- Setting Menu ---------------- */}
      <div className="panel">
        <h3>SETTING MENU</h3>
        <EditableText
          contentKey="calc.MohrsCircle.intro"
          defaultText="Plane Stress와 **같은 입력**이에요 — 같은 계산을 숫자 대신 **원(circle)**으로 표현하는 방법입니다."
          style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.6, marginBottom: 16, background: 'var(--bg)', borderRadius: 10, padding: '12px 14px' }}
        />
        <div className="field">
          <label>응력 단위</label>
          <select className="unit-inline" style={{ width: '100%' }} value={units.stress} onChange={(e) => setUnits((p) => ({ ...p, stress: e.target.value }))}>
            {Object.keys(UNIT_OPTIONS.stress).map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>σx — {fmt(disp(sigmaX, stressF))} {units.stress}</label>
          <input type="number" defaultValue={fmtInput(disp(sigmaX, stressF))} onBlur={(e) => setSigmaX(parseFloat(e.target.value) * stressF)} />
        </div>
        <div className="field">
          <label>σy — {fmt(disp(sigmaY, stressF))} {units.stress}</label>
          <input type="number" defaultValue={fmtInput(disp(sigmaY, stressF))} onBlur={(e) => setSigmaY(parseFloat(e.target.value) * stressF)} />
        </div>
        <div className="field">
          <label>τxy — {fmt(disp(tauXY, stressF))} {units.stress}</label>
          <input type="number" defaultValue={fmtInput(disp(tauXY, stressF))} onBlur={(e) => setTauXY(parseFloat(e.target.value) * stressF)} />
        </div>
        <div className="field">
          <label>회전각 θ — {theta.toFixed(0)}°</label>
          <input type="range" min="-90" max="90" step="1" value={theta} onChange={(e) => setTheta(parseFloat(e.target.value))} style={{ width: '100%' }} />
        </div>
        <button className="add-block" onClick={() => setTheta(r.thetaPdeg)}>주응력 각도로 이동</button>
        <button className="add-block" onClick={() => setTheta(r.thetaSdeg)}>최대전단 각도로 이동</button>
      </div>

      {/* ---------------- Visualizer ---------------- */}
      <div className="panel">
        <h3>
          VISUALIZER <span className="badge live" style={{ marginLeft: 6 }}>실시간</span>
        </h3>
        <MohrCircleSVG sigmaX={sigmaX} sigmaY={sigmaY} tauXY={tauXY} theta={theta} r={r} />
        <div className="steps">
          <FormulaSection title="원 그리는 방법">
            <div className="step-formula">
              중심 C = (σave, 0) &nbsp; 반지름 R = √[(<Frac num="σx−σy" den="2" />)² + τxy²]
            </div>
            <div className="step-row">σave = {fmt(disp(r.avg, stressF))} {units.stress} &nbsp; R = {fmt(disp(r.R, stressF))} {units.stress}</div>
            <div className="step-row">x1면 점 = (σx1, τx1y1) = ({fmt(disp(r.sx1, stressF))}, {fmt(disp(r.tx1y1, stressF))}) {units.stress}</div>
            <EditableText
              as="div"
              style={{ fontSize: 11, color: 'var(--gray-soft)', marginTop: 8 }}
              contentKey="calc.MohrsCircle.note"
              defaultText="지름의 양 끝(x1면·y1면)을 중심 C를 기준으로 **2θ**만큼 돌리면, 실제 θ만큼 요소를 돌렸을 때의 응력이 나와요."
            />
          </FormulaSection>
        </div>
        <EditableText as="div" className="ai-hint" contentKey="calc.MohrsCircle.aiHint" defaultText="💬 왜 각도가 θ가 아니라 2θ만큼 회전하는지 궁금하다면, 오른쪽 AI 튜터에게 물어보세요." />
      </div>

      <AiTutorPanel />
    </>
  );
}

function MohrCircleSVG({ sigmaX, sigmaY, tauXY, theta, r }) {
  const w = 480, h = 420, cx = 240, cy = 210;
  const scale = r.R > 0 ? 130 / r.R : 1;

  const px = cx + (r.sx1 - r.avg) * scale, py = cy + r.tx1y1 * scale;
  const qx = cx + (r.sy1 - r.avg) * scale, qy = cy - r.tx1y1 * scale;
  const ax = cx + (sigmaX - r.avg) * scale, ay = cy + tauXY * scale;
  const bx = cx + (sigmaY - r.avg) * scale, by = cy - tauXY * scale;
  const R_px = r.R * scale;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 520, margin: '0 auto', display: 'block' }}>
      <line x1="20" y1={cy} x2={w - 20} y2={cy} stroke="#8A97A2" strokeWidth="1.2" />
      <line x1={cx} y1="20" x2={cx} y2={h - 60} stroke="#8A97A2" strokeWidth="1.2" />
      <text x={w - 16} y={cy - 6} fontSize="13" fill="#8A97A2" textAnchor="end" fontWeight="700">σ</text>
      <text x={cx + 8} y="26" fontSize="13" fill="#8A97A2" fontWeight="700">τ (아래 = +)</text>

      <circle cx={cx} cy={cy} r={R_px} fill="#F7E3E6" fillOpacity="0.35" stroke="#51626F" strokeWidth="1.4" />
      <circle cx={cx} cy={cy} r="2.5" fill="#51626F" />
      <text x={cx} y={cy - 8} fontSize="13" fill="#51626F" textAnchor="middle">C</text>

      <line x1={ax} y1={ay} x2={bx} y2={by} stroke="#8A97A2" strokeWidth="1.2" strokeDasharray="4 3" />
      <circle cx={ax} cy={ay} r="3" fill="#8A97A2" />
      <text x={ax + 6} y={ay - 6} fontSize="13" fill="#8A97A2">A(θ=0)</text>

      <line x1={px} y1={py} x2={qx} y2={qy} stroke="#C3002F" strokeWidth="1.8" />
      <circle cx={px} cy={py} r="4" fill="#C3002F" />
      <text x={px + 7} y={py + 4} fontSize="14" fill="#C3002F" fontWeight="800">x1면</text>
      <circle cx={qx} cy={qy} r="4" fill="#1E7F72" />
      <text x={qx + 7} y={qy + 4} fontSize="14" fill="#1E7F72" fontWeight="800">y1면</text>

      <circle cx={cx + R_px} cy={cy} r="3" fill="#B0790A" />
      <text x={cx + R_px} y={cy + 16} fontSize="13" fill="#B0790A" textAnchor="middle">σ1</text>
      <circle cx={cx - R_px} cy={cy} r="3" fill="#B0790A" />
      <text x={cx - R_px} y={cy + 16} fontSize="13" fill="#B0790A" textAnchor="middle">σ2</text>
      <circle cx={cx} cy={cy + R_px} r="3" fill="#4A5FBF" />
      <text x={cx + 8} y={cy + R_px + 3} fontSize="13" fill="#4A5FBF">τmax</text>
      <text x={cx} y={h - 30} fontSize="14" fill="#8A97A2" textAnchor="middle">2θ = {(2 * theta).toFixed(0)}° (θ={theta.toFixed(0)}°)</text>
    </svg>
  );
}
