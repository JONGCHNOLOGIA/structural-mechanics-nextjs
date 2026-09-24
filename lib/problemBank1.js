// 구조역학 1(CH.1~CH.5) 문제은행.
// 원본 프로토타입에서 각 소주제 아래에 붙어있던 "연습문제 추천"(problemNS, problemSP …)을 그대로
// 옮긴 것 — 소주제 화면에서는 빼고 문제 제작 페이지 한 곳으로 모았다.
// 정답은 각 계산기가 쓰는 검증된 순수 함수(lib/calc/*.js)를 그대로 재사용해서 계산하므로,
// 숫자가 매번 달라져도 계산기가 내놓는 값과 항상 일치한다.
//
// 문제 형태는 구조역학 2와 같은 { prompt, answers } 모양으로 맞춘다. 구조역학 2 문제에 붙는
// 도형 그림(diagram)도 구조역학 2와 같은 방식(components/problemDiagrams/ProblemDiagram.jsx가
// type으로 실제 SVG를 골라 그림)으로 붙인다 — 다만 구조역학 1은 축하중 봉/단일 단면 형상처럼
// 구조역학 2에 없던 모양이 많아서, 전용 도식(AxialBarDiagram·SectionShapeDiagram)을 새로 추가하고
// 기존 ShaftDiagram(순수 비틀림만 보이게 show로 P/M을 끔)·BeamDiagram(삼각형 분포하중 kind 추가)은
// 그대로 재사용한다. 개념 설명형이거나(재료 물성, 열응력) 기존 도식이 표현하기 애매한 형태(볼트
// 전단, 응력집중 구멍, 돌출보, 2구간 토크선도, 두 축 무게비교)는 도형 없이 텍스트만 낸다.

import { LENGTH_UNITS, STRESS_UNITS, FORCE_UNITS, TORQUE_UNITS, fromBase, fmt1 } from './calc/units1';
import { computeNormalStress } from './calc/normalStress';
import { computeMaterialProperties, curveFor } from './calc/materialProperties';
import { computeHookePoisson } from './calc/hookePoisson';
import { computeShear } from './calc/shearStress';
import { computeAllowableDesign } from './calc/allowableDesign';
import { computeSpringConstant } from './calc/springConstant';
import { computeMultiSegment } from './calc/multiSegmentBar';
import { computeIndeterminate } from './calc/indeterminateAxial';
import { computeThermal } from './calc/thermalEffects';
import { computeStressConcentration } from './calc/stressConcentration';
import {
  computeTorsionalDeformation,
  computeTorsionFormula,
  computeTorsionDesign,
  computeTorqueDiagram,
  computeStrengthToWeight,
} from './calc/torsion';
import {
  computeReactions,
  computePointLoadSFDBMD,
  computeUDLSFDBMD,
  computeCantileverSFDBMD,
  computeOverhangSFDBMD,
  computeTriangularLoad,
} from './calc/beamStatics';
import {
  computeFlexure,
  computeSectionModulus,
  computeShearRect,
  computeShearCircularOrFlow,
  computeCombined,
} from './calc/beamStresses';

function rand(min, max) {
  return min + Math.random() * (max - min);
}
function randInt(min, max) {
  return Math.round(rand(min, max));
}
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const mm = (v) => fmt1(fromBase(v, 'mm', LENGTH_UNITS), 4);
const MPa = (v) => fmt1(fromBase(v, 'MPa', STRESS_UNITS), 2);
const kN = (v) => fmt1(fromBase(v, 'kN', FORCE_UNITS), 3);
const Nm = (v) => fmt1(fromBase(v, 'N·m', TORQUE_UNITS), 1);
const kNm = (v) => fmt1(fromBase(v, 'kN·m', TORQUE_UNITS), 2);
const deg = (rad) => fmt1((rad * 180) / Math.PI, 3);

/* ---------------------------- CH.1 ---------------------------- */

function genNormalStress() {
  const P = randInt(5, 150);
  const mode = pick(['tension', 'compression']);
  const type = pick(['solid_circular', 'rectangular']);
  let dims, dimsText;
  if (type === 'solid_circular') {
    const d = randInt(10, 80);
    dims = { d, d_outer: 80, d_inner: 40, b: 20, h: 30 };
    dimsText = `지름 d=${d}mm 원형`;
  } else {
    const b = randInt(10, 60), h = randInt(10, 80);
    dims = { d: 30, d_outer: 80, d_inner: 40, b, h };
    dimsText = `${b}×${h}mm 사각형`;
  }
  const L = randInt(5, 30) / 10;
  const E = pick([70, 100, 200]);
  const r = computeNormalStress({ P, PUnit: 'kN', mode, sectionType: type, dims, dimUnit: 'mm', L, LUnit: 'm', E, EUnit: 'GPa' });
  if (!r.valid) return null;
  return {
    prompt: `${dimsText} 단면봉이 길이 L=${L}m, E=${E}GPa일 때 ${mode === 'tension' ? '인장' : '압축'}하중 P=${P}kN이 작용한다. 수직응력 σ와 변형량 δ를 구하시오.`,
    answers: [`σ = ${MPa(r.sigma_Pa)} MPa`, `δ = ${mm(r.delta_m)} mm`],
    diagram: {
      type: 'axialBar',
      props: {
        leftSupport: 'fixed',
        rightSupport: 'free',
        segments: [{ lengthFrac: 1, label: `L = ${L} m` }],
        loads: [{ posFrac: 1, label: `P = ${P} kN`, dir: mode === 'tension' ? 1 : -1 }],
      },
    },
  };
}

function genMaterialProperties() {
  const material = pick(['ductile', 'brittle']);
  const maxS = curveFor(material).slice(-1)[0].x;
  const strain = Math.round(rand(0.001, maxS) * 1000) / 1000;
  const r = computeMaterialProperties({ material, strain });
  return {
    prompt: `${material === 'ductile' ? '연성' : '취성'} 재료의 개념 곡선에서 변형률 ε=${strain}일 때, 현재 구간과 탄성/소성 상태를 판정하시오.`,
    answers: [`구간 = ${r.label}`, `상태 = ${r.state}`, `σ(normalized) = ${fmt1(r.stress, 3)}`],
  };
}

function genHookePoisson() {
  const mode = pick(['load', 'stress']);
  const T = pick(['tension', 'compression']);
  const E = pick([70, 100, 200]);
  const nu = Math.round(rand(0.2, 0.4) * 100) / 100;
  const L = randInt(5, 20) / 10, w = randInt(10, 50);
  let st, desc;
  if (mode === 'load') {
    const P = randInt(5, 80), A = randInt(200, 1000);
    st = { mode, T, P, PUnit: 'kN', A, AUnit: 'mm2', E, EUnit: 'GPa', nu, L, LUnit: 'm', w, wUnit: 'mm' };
    desc = `P=${P}kN, A=${A}mm²`;
  } else {
    const sigma = randInt(10, 150);
    st = { mode, T, sigma, sigmaUnit: 'MPa', E, EUnit: 'GPa', nu, L, LUnit: 'm', w, wUnit: 'mm' };
    desc = `σ=${sigma}MPa (직접입력)`;
  }
  const r = computeHookePoisson(st);
  if (!r.valid) return null;
  return {
    prompt: `${T === 'tension' ? '인장' : '압축'} 상태에서 ${desc}, E=${E}GPa, ν=${nu}, L=${L}m, w=${w}mm일 때 ε_long, ε_lat, ΔL, Δw를 구하시오.`,
    answers: [
      `ε_long = ${fmt1(r.epsLong * 1e6, 1)} µ`,
      `ε_lat = ${fmt1(r.epsLat * 1e6, 1)} µ`,
      `ΔL = ${mm(r.deltaL_m)} mm`,
      `Δw = ${mm(r.deltaW_m)} mm`,
    ],
    diagram: {
      type: 'axialBar',
      props: {
        leftSupport: 'fixed',
        rightSupport: 'free',
        segments: [{ lengthFrac: 1, label: `L = ${L} m` }],
        loads: [{ posFrac: 1, label: mode === 'load' ? `P = ${st.P} kN` : `σ = ${st.sigma} MPa`, dir: T === 'tension' ? 1 : -1 }],
      },
    },
  };
}

function genShearStress() {
  const mode = pick(['single', 'double', 'bearing']);
  const d = randInt(10, 40), P = randInt(5, 60);
  let st, prompt;
  if (mode === 'bearing') {
    const t = randInt(5, 20);
    st = { mode, d, dimUnit: 'mm', t, P, PUnit: 'kN' };
    prompt = `볼트 d=${d}mm, 판두께 t=${t}mm에 P=${P}kN이 작용할 때 지압응력 σ_b를 구하시오.`;
  } else {
    st = { mode, d, dimUnit: 'mm', P, PUnit: 'kN' };
    prompt = `볼트 d=${d}mm에 P=${P}kN이 작용할 때 ${mode === 'single' ? '단일' : '이중'}전단응력 τ를 구하시오.`;
  }
  const r = computeShear(st);
  if (!r.valid) return null;
  return { prompt, answers: [mode === 'bearing' ? `σ_b = ${MPa(r.sigma_b_Pa)} MPa` : `τ = ${MPa(r.tau_Pa)} MPa`] };
}

function genAllowableDesign() {
  const mode = pick(['A', 'C']);
  const sigmaAllow = randInt(80, 200), P = randInt(20, 150), d = randInt(15, 50);
  const st = {
    mode, useFOS: false, sigmaAllow, stressUnit: 'MPa', failureStrength: 250, n: 2,
    P, PUnit: 'kN', sectionType: 'solid_circular',
    dims: { d, d_outer: 40, d_inner: 25, b: 20, h: 30 }, dimUnit: 'mm',
  };
  const r = computeAllowableDesign(st);
  if (!r.valid) return null;
  const diagram = {
    type: 'axialBar',
    props: {
      leftSupport: 'fixed',
      rightSupport: 'free',
      segments: [{ lengthFrac: 1, label: mode === 'A' ? `d = ${d} mm` : '' }],
      loads: [{ posFrac: 1, label: `P = ${P} kN`, dir: 1 }],
    },
  };
  if (mode === 'A') {
    return {
      prompt: `허용응력 σ_allow=${sigmaAllow}MPa인 재료로 만든 직경 d=${d}mm 원형봉에 P=${P}kN이 작용한다. 안전한지 판정하시오.`,
      answers: [`σ_actual = ${MPa(r.sigma_actual_Pa)} MPa`, `판정 = ${r.safe ? 'SAFE' : 'NOT SAFE'} (utilization ${fmt1(r.ratio, 3)})`],
      diagram,
    };
  }
  return {
    prompt: `허용응력 σ_allow=${sigmaAllow}MPa인 재료로 P=${P}kN을 지지하려 한다. 필요한 원형 단면의 직경을 구하시오.`,
    answers: [`A_required = ${fmt1(r.A_required_m2 / 1e-6, 2)} mm²`, `d_required = ${fmt1(fromBase(r.d_required_m, 'mm', LENGTH_UNITS), 2)} mm`],
    diagram,
  };
}

/* ---------------------------- CH.2 ---------------------------- */

function genSpringConstant() {
  const P = randInt(5, 100), A = randInt(200, 1000), L = randInt(5, 30) / 10, E = pick([70, 100, 200]);
  const r = computeSpringConstant({ P, PUnit: 'kN', mode: 'tension', A, AUnit: 'mm2', L, LUnit: 'm', E, EUnit: 'GPa', P2: P * 2, P2Unit: 'kN' });
  if (!r.valid) return null;
  return {
    prompt: `A=${A}mm², L=${L}m, E=${E}GPa인 봉의 스프링상수 k와, P=${P}kN일 때 변위 δ를 구하시오.`,
    answers: [`k = ${fmt1(r.k / 1e6, 3)} MN/m`, `δ = ${mm(r.delta_m)} mm`],
    diagram: {
      type: 'axialBar',
      props: {
        leftSupport: 'fixed',
        rightSupport: 'free',
        segments: [{ lengthFrac: 1, label: `L = ${L} m` }],
        loads: [{ posFrac: 1, label: `P = ${P} kN`, dir: 1 }],
      },
    },
  };
}

function genMultiSegment() {
  const load1 = randInt(-200, 300), load2 = randInt(-200, 300);
  const L1 = randInt(5, 20) / 10, L2 = randInt(5, 20) / 10;
  const r = computeMultiSegment({
    segCount: 2,
    segs: [
      { load: load1, loadUnit: 'kN', L: L1, LUnit: 'm', A: 500, AUnit: 'mm2', E: 200, EUnit: 'GPa' },
      { load: load2, loadUnit: 'kN', L: L2, LUnit: 'm', A: 400, AUnit: 'mm2', E: 200, EUnit: 'GPa' },
    ],
  });
  if (!r.valid) return null;
  return {
    prompt: `왼쪽 고정단, 구간1 끝(경계1)에 ${load1}kN, 자유단(구간2 끝)에 ${load2}kN이 작용(→ 방향 +)한다. L1=${L1}m, L2=${L2}m, A1=500mm², A2=400mm², E=200GPa일 때 R, N1, N2, δ_total을 구하시오.`,
    answers: [`R = ${kN(r.R_N)} kN`, `N1 = ${kN(r.perSeg[0].N_N)} kN`, `N2 = ${kN(r.perSeg[1].N_N)} kN`, `δ_total = ${mm(r.delta_total_m)} mm`],
    diagram: {
      type: 'axialBar',
      props: {
        leftSupport: 'fixed',
        rightSupport: 'free',
        segments: [
          { lengthFrac: L1 / (L1 + L2), label: `L1 = ${L1} m` },
          { lengthFrac: L2 / (L1 + L2), label: `L2 = ${L2} m` },
        ],
        loads: [
          { posFrac: L1 / (L1 + L2), label: `${load1} kN`, dir: load1 >= 0 ? 1 : -1 },
          { posFrac: 1, label: `${load2} kN`, dir: load2 >= 0 ? 1 : -1 },
        ],
      },
    },
  };
}

function genIndeterminateAxial() {
  const P = randInt(50, 300), a = randInt(1, 8), b = randInt(1, 8);
  const r = computeIndeterminate({ mode: 'fixedBar', P, PUnit: 'kN', a, b, LUnit: 'm', A: 500, AUnit: 'mm2', E: 200, EUnit: 'GPa' });
  if (!r.valid) return null;
  return {
    prompt: `양단고정 부재(A-B)에서 A로부터 a=${a}m 지점에 P=${P}kN이 작용한다. 전체 길이는 a+b=${a + b}m(b=${b}m), A=500mm², E=200GPa이다. R_A, R_B, 하중점 변위 δ_C를 구하시오.`,
    answers: [`R_A = ${kN(r.R_A)} kN`, `R_B = ${kN(r.R_B)} kN`, `δ_C = ${mm(r.delta_C)} mm`],
    diagram: {
      type: 'axialBar',
      props: {
        leftSupport: 'fixed',
        rightSupport: 'fixed',
        segments: [
          { lengthFrac: a / (a + b), label: `a = ${a} m` },
          { lengthFrac: b / (a + b), label: `b = ${b} m` },
        ],
        loads: [{ posFrac: a / (a + b), label: `P = ${P} kN`, dir: 1 }],
      },
    },
  };
}

function genThermal() {
  const alpha = randInt(8, 20);
  const deltaT = pick([-40, -20, 20, 40, 60]);
  const mode = pick(['free', 'restrained']);
  const r = computeThermal({ mode, alpha: alpha * 1e-6, deltaT, L: 1, LUnit: 'm', E: 200, EUnit: 'GPa', A: 500, AUnit: 'mm2' });
  if (!r.valid) return null;
  return {
    prompt: `α=${alpha}×10⁻⁶/°C, L=1m인 부재의 온도가 ΔT=${deltaT}°C 변했다. ${mode === 'free' ? '자유 팽창일 때 ε_T와 δ_T를' : '양단 완전구속(E=200GPa, A=500mm²)일 때 σ_T와 N_T를'} 구하시오.`,
    answers:
      mode === 'free'
        ? [`ε_T = ${fmt1(r.epsT * 1e6, 1)} µ`, `δ_T = ${mm(r.deltaDisp_m)} mm`]
        : [`ε_T = ${fmt1(r.epsT * 1e6, 1)} µ`, `σ_T = ${MPa(r.sigmaT_Pa)} MPa`, `N_T = ${kN(r.N_T)} kN`],
  };
}

function genStressConcentration() {
  const b = randInt(30, 120);
  const d = randInt(5, Math.max(6, Math.floor(b / 3)));
  const t = randInt(5, 25), P = randInt(5, 80);
  const K = pick([1.8, 2.0, 2.1, 2.3, 2.5]);
  const r = computeStressConcentration({ P, PUnit: 'kN', b, t, d, dimUnit: 'mm', K });
  if (!r.valid) return null;
  return {
    prompt: `폭 b=${b}mm, 두께 t=${t}mm 평판 중앙에 직경 d=${d}mm 구멍이 있고 P=${P}kN이 작용한다. 응력집중계수 K=${K}일 때 A_net, σ_nom, σ_max를 구하시오.`,
    answers: [`A_net = ${fmt1(r.Anet / 1e-6, 2)} mm²`, `σ_nom = ${MPa(r.sigmaNom)} MPa`, `σ_max = ${MPa(r.sigmaMax)} MPa`],
  };
}

/* ---------------------------- CH.3 ---------------------------- */

function genTorsionalDeformation() {
  const T = randInt(100, 800), d = randInt(20, 80), L = randInt(1, 4), G = pick([80, 40, 27]);
  const r = computeTorsionalDeformation({
    T, TUnit: 'N·m', dir: 'cw', sectionType: 'solid_circular',
    dims: { d, d_outer: 80, d_inner: 40 }, dimUnit: 'mm', L, LUnit: 'm', G, GUnit: 'GPa',
  });
  if (!r.valid) return null;
  return {
    prompt: `T=${T}N·m, 지름 d=${d}mm, L=${L}m, G=${G}GPa인 중실 원형축의 비틀림각 φ와 최대 전단변형률 γ_max를 구하시오.`,
    answers: [`Ip = ${fmt1(r.Ip * 1e12, 1)} mm⁴`, `φ = ${deg(r.phi_rad)}°`, `γ_max = ${fmt1(r.gammaMax * 1e6, 1)} µrad`],
    diagram: { type: 'shaft', props: { dLabel: `d = ${d} mm, L = ${L} m`, TLabel: `T = ${T} N·m`, show: { P: false, M: false, T: true } } },
  };
}

function genTorsionFormula() {
  const T = randInt(100, 1000);
  const type = pick(['solid_circular', 'hollow_circular']);
  let dims, dimsText;
  if (type === 'solid_circular') {
    const d = randInt(20, 80);
    dims = { d, d_outer: 80, d_inner: 40 };
    dimsText = `d=${d}mm`;
  } else {
    const dO = randInt(40, 100);
    const dI = Math.round(dO * rand(0.3, 0.7));
    dims = { d: 30, d_outer: dO, d_inner: dI };
    dimsText = `d₂=${dO}mm, d₁=${dI}mm`;
  }
  const r = computeTorsionFormula({ T, TUnit: 'N·m', sectionType: type, dims, dimUnit: 'mm' });
  if (!r.valid) return null;
  return {
    prompt: `T=${T}N·m, ${dimsText}인 ${type === 'solid_circular' ? '중실' : '중공'} 원형축의 최대 전단응력 τ_max를 구하시오.`,
    answers: [`Ip = ${fmt1(r.Ip * 1e12, 1)} mm⁴`, `τ_max = ${MPa(r.tauMax)} MPa`],
    diagram: { type: 'shaft', props: { dLabel: dimsText, TLabel: `T = ${T} N·m`, show: { P: false, M: false, T: true } } },
  };
}

function genTorsionDesign() {
  const d = randInt(30, 60), tauAllow = randInt(40, 100);
  const phiAllow = Math.round(rand(1, 4) * 10) / 10;
  const L = randInt(1, 3), G = 80;
  const r = computeTorsionDesign({
    calcMode: 'maxTorque', sectionType: 'solid_circular', twistMode: 'total',
    dims: { d, d_outer: 80 }, dimUnit: 'mm', L, LUnit: 'm', G, GUnit: 'GPa',
    tauAllow, tauAllowUnit: 'MPa', phiAllowDeg: phiAllow, thetaAllowDeg: 0.75, thetaLenUnit: 'm',
    T: 0, TUnit: 'N·m',
  });
  if (!r.valid) return null;
  return {
    prompt: `d=${d}mm, L=${L}m, G=${G}GPa, τ_allow=${tauAllow}MPa, φ_allow=${phiAllow}°일 때 최대 허용토크를 구하고, 어느 조건이 지배하는지 판정하시오.`,
    answers: [
      `T_stress = ${Nm(r.T_stress)} N·m`,
      `T_twist = ${Nm(r.T_twist)} N·m`,
      `지배조건 = ${r.governedBy === 'stress' ? '응력' : '비틀림'} 조건`,
      `T_allow = ${Nm(r.governing)} N·m`,
    ],
    diagram: { type: 'shaft', props: { dLabel: `d = ${d} mm, L = ${L} m`, TLabel: 'T = ?', show: { P: false, M: false, T: true } } },
  };
}

function genTorqueDiagram() {
  const T1 = randInt(200, 1500), T2 = -randInt(50, 400);
  const d = randInt(30, 60), G = pick([80, 40]);
  const r = computeTorqueDiagram({
    segCount: 2,
    segs: [
      { T: T1, TUnit: 'N·m', L: 0.5, LUnit: 'm', d, dimUnit: 'mm', G, GUnit: 'GPa' },
      { T: T2, TUnit: 'N·m', L: 0.4, LUnit: 'm', d, dimUnit: 'mm', G, GUnit: 'GPa' },
    ],
  });
  if (!r.valid) return null;
  return {
    prompt: `2구간 축(각 구간 d=${d}mm, G=${G}GPa, L=0.5m/0.4m)에서 구간1 내부토크 T=${T1}N·m, 구간2 T=${T2}N·m이다. 각 구간의 τ_max와 전체 비틀림각 φ_total을 구하시오.`,
    answers: [`τ₁ = ${MPa(r.perSeg[0].tauMax)} MPa`, `τ₂ = ${MPa(r.perSeg[1].tauMax)} MPa`, `φ_total = ${deg(r.totalPhi)}°`],
  };
}

function genStrengthToWeight() {
  const D = randInt(50, 150);
  const k = Math.round(rand(0.3, 0.8) * 100) / 100;
  const r = computeStrengthToWeight({ D, DUnit: 'mm', k });
  if (!r.valid) return null;
  return {
    prompt: `외경 D=${D}mm로 같은 중공축과 중실축이 있다. 중공축의 내외경비가 k=${k}일 때, 같은 토크에서의 응력비와 무게비, 그리고 (T/W)비를 구하시오.`,
    answers: [`τ 비 = ${fmt1(r.tauRatio, 3)}`, `무게비 = ${fmt1(r.weightRatio, 3)}`, `(T/W)비 = ${fmt1(r.TW_ratio, 3)}`],
  };
}

/* ---------------------------- CH.4 ---------------------------- */

function genBeamReactions() {
  const L = randInt(6, 15);
  const P1 = randInt(20, 100);
  const a1 = randInt(1, L - 1);
  const r = computeReactions({
    L, LUnit: 'm', P1, P1Unit: 'kN', a1, P2: 0, P2Unit: 'kN', a2: L / 2,
    q: 0, qUnit: 'kN/m', qStart: 0, qEnd: L, M0: 0, M0Unit: 'kN·m',
  });
  if (!r.valid) return null;
  return {
    prompt: `단순보(L=${L}m, A는 핀·B는 롤러)의 A로부터 ${a1}m 지점에 P=${P1}kN이 작용한다. 반력 R_A, R_B를 구하시오.`,
    answers: [`R_A = ${kN(r.RA)} kN`, `R_B = ${kN(r.RB)} kN`],
    diagram: { type: 'beam', props: { support: 'simple', spanLabel: `L = ${L} m`, loads: [{ kind: 'point', posFrac: a1 / L, label: `P = ${P1} kN` }] } },
  };
}

function genPointLoadSFDBMD() {
  const L = randInt(6, 15);
  const P1 = randInt(20, 150);
  const a1 = randInt(1, L - 1);
  const r = computePointLoadSFDBMD({ L, LUnit: 'm', P1, P1Unit: 'kN', a1, P2: 0, P2Unit: 'kN', a2: 1, cutX: a1 });
  if (!r.valid) return null;
  return {
    prompt: `단순보(L=${L}m)의 A로부터 ${a1}m 지점에 P=${P1}kN이 작용한다. R_A, R_B와 최대 굽힘모멘트 M_max를 구하시오.`,
    answers: [`R_A = ${kN(r.RA)} kN`, `R_B = ${kN(r.RB)} kN`, `M_max = ${kNm(r.Mmax)} kN·m (하중점에서 발생)`],
    diagram: { type: 'beam', props: { support: 'simple', spanLabel: `L = ${L} m`, loads: [{ kind: 'point', posFrac: a1 / L, label: `P = ${P1} kN` }] } },
  };
}

function genUDLSFDBMD() {
  const L = randInt(4, 12);
  const q = randInt(5, 40);
  const r = computeUDLSFDBMD({ L, LUnit: 'm', q, qUnit: 'kN/m', qStart: 0, qEnd: L });
  if (!r.valid) return null;
  return {
    prompt: `단순보(L=${L}m)에 전 구간 등분포하중 q=${q}kN/m가 작용한다. 반력과 최대 굽힘모멘트를 구하시오.`,
    answers: [`R_A = R_B = ${kN(r.RA)} kN`, `M_max = ${kNm(r.Mmax)} kN·m (x = L/2)`],
    diagram: { type: 'beam', props: { support: 'simple', spanLabel: `L = ${L} m`, loads: [{ kind: 'udl', label: `q = ${q} kN/m` }] } },
  };
}

function genCantileverSFDBMD() {
  const L = randInt(3, 10);
  const P = randInt(10, 80);
  const a = randInt(Math.ceil(L * 0.4), L);
  const r = computeCantileverSFDBMD({ L, LUnit: 'm', P, PUnit: 'kN', a, q: 0, qUnit: 'kN/m' });
  if (!r.valid) return null;
  return {
    prompt: `캔틸레버보(L=${L}m, 고정단 x=0)의 x=${a}m 지점에 P=${P}kN이 작용한다. 고정단 반력 R과 고정단 모멘트 M₀를 구하시오.`,
    answers: [`R = ${kN(r.R)} kN`, `M₀ = ${kNm(r.M0)} kN·m (음수 = hogging)`],
    diagram: { type: 'beam', props: { support: 'cantilever', spanLabel: `L = ${L} m`, loads: [{ kind: 'point', posFrac: a / L, label: `P = ${P} kN` }] } },
  };
}

function genOverhangSFDBMD() {
  const L = randInt(8, 18);
  const Lb = randInt(Math.ceil(L * 0.5), L - 1);
  const P = randInt(20, 100);
  const r = computeOverhangSFDBMD({ L, LUnit: 'm', Lb, P, PUnit: 'kN', a: L });
  if (!r.valid) return null;
  return {
    prompt: `돌출보 A(x=0, 핀) — B(x=${Lb}m, 롤러) — 자유단(x=${L}m) 에서, 자유단에 P=${P}kN이 작용한다. R_A, R_B를 구하시오.`,
    answers: [`R_A = ${kN(r.RA)} kN${r.RA < 0 ? ' (음수 → A가 보를 아래로 잡아줘야 함)' : ''}`, `R_B = ${kN(r.RB)} kN`],
  };
}

function genTriangularLoad() {
  const mode = pick(['cantilever', 'simple', 'rollerslide']);
  const L = randInt(4, 10);
  const q0 = randInt(5, 30);
  const r = computeTriangularLoad({ mode, L, LUnit: 'm', q0, qUnit: 'kN/m' });
  if (!r.valid) return null;
  const modeKr =
    mode === 'cantilever' ? '캔틸레버(B가 고정단)' : mode === 'simple' ? '단순보(A 핀, B 롤러)' : '롤러(A) + 슬라이딩(B)';
  const answers =
    mode === 'cantilever'
      ? [`W = ${kN(r.totalLoad)} kN`, `R_B = ${kN(r.RA)} kN`, `M_B = ${kNm(r.M0)} kN·m`]
      : mode === 'simple'
      ? [`R_A = ${kN(r.RA)} kN`, `R_B = ${kN(r.RB)} kN`, `M_max = ${kNm(r.Mmax)} kN·m`]
      : [`R_A = ${kN(r.RA)} kN`, `M_B = ${kNm(r.MB)} kN·m`];
  return {
    prompt: `${modeKr} 구조, L=${L}m에 A에서 0, B에서 최대 q₀=${q0}kN/m인 삼각형 분포하중이 작용한다. 반력을 구하시오.`,
    answers,
    // 캔틸레버(B가 고정단)·롤러+슬라이딩 변형은 기존 BeamDiagram의 지점 표기(왼쪽 고정단/A핀·B롤러)와
    // 안 맞아서 오해를 살 수 있어, 그 도식이 정확히 맞는 단순보(A 핀·B 롤러)일 때만 그림을 붙인다.
    ...(mode === 'simple'
      ? { diagram: { type: 'beam', props: { support: 'simple', spanLabel: `L = ${L} m`, loads: [{ kind: 'triangular', label: `q₀ = ${q0} kN/m` }] } } }
      : {}),
  };
}

/* ---------------------------- CH.5 ---------------------------- */

function genFlexure() {
  const M = randInt(500, 5000);
  const type = pick(['rectangular', 'circular']);
  let dims;
  let dimsText;
  if (type === 'rectangular') {
    const b = randInt(30, 100), h = randInt(50, 150);
    dims = { b, h, d: 80 };
    dimsText = `${b}×${h}mm 사각형`;
  } else {
    const d = randInt(40, 120);
    dims = { b: 50, h: 100, d };
    dimsText = `d=${d}mm 원형`;
  }
  const r = computeFlexure({ M, MUnit: 'N·m', sectionType: type, dims, dimUnit: 'mm', E: 200, EUnit: 'GPa' });
  if (!r.valid) return null;
  return {
    prompt: `M=${M}N·m(sagging)가 작용하는 ${dimsText} 단면보의 I와 상단·하단 굽힘응력을 구하시오. (E=200GPa)`,
    answers: [
      `I = ${fmt1(r.I * 1e12, 1)} mm⁴`,
      `σ_top = ${MPa(r.sigmaTop)} MPa (압축)`,
      `σ_bottom = ${MPa(r.sigmaBottom)} MPa (인장)`,
    ],
    diagram:
      type === 'rectangular'
        ? { type: 'sectionShape', props: { shape: 'rectangular', b: dims.b, h: dims.h, topLabel: `M = ${M} N·m` } }
        : { type: 'sectionShape', props: { shape: 'circular', d: dims.d, topLabel: `M = ${M} N·m` } },
  };
}

function genSectionModulus() {
  const M = randInt(500, 5000);
  const sigmaAllow = randInt(80, 200);
  const b = randInt(30, 80);
  const r = computeSectionModulus({ M, MUnit: 'N·m', sigmaAllow, sigmaAllowUnit: 'MPa', sectionType: 'rectangular', bFixed: b, dimUnit: 'mm' });
  if (!r.valid) return null;
  return {
    prompt: `M=${M}N·m, σ_allow=${sigmaAllow}MPa이고 폭 b=${b}mm로 고정할 때, 필요한 단면계수와 높이 h를 구하시오.`,
    answers: [`S_required = ${fmt1(r.S_required * 1e9, 1)} mm³`, `h_required = ${mm(r.h_required)} mm`],
    diagram: { type: 'sectionShape', props: { shape: 'rectangular', b, h: null, topLabel: `M = ${M} N·m` } },
  };
}

function genShearRect() {
  const V = randInt(500, 5000);
  const b = randInt(30, 80), h = randInt(50, 150);
  const r = computeShearRect({ V, VUnit: 'N', b, h, dimUnit: 'mm' });
  if (!r.valid) return null;
  return {
    prompt: `V=${V}N이 작용하는 ${b}×${h}mm 사각형 단면에서, 중립축의 Q와 최대 전단응력 τ_max를 구하시오.`,
    answers: [`Q = ${fmt1(r.Q_na * 1e9, 1)} mm³`, `τ_max = 1.5V/A = ${MPa(r.tauMax)} MPa`],
    diagram: { type: 'sectionShape', props: { shape: 'rectangular', b, h, topLabel: `V = ${V} N` } },
  };
}

function genShearCircular() {
  const V = randInt(500, 5000);
  const d = randInt(40, 100);
  const r = computeShearCircularOrFlow({ mode: 'circular', V, VUnit: 'N', d, dimUnit: 'mm' });
  if (!r.valid) return null;
  return {
    prompt: `V=${V}N이 작용하는 지름 d=${d}mm 원형 단면보의 최대 전단응력 τ_max를 구하시오.`,
    answers: [`A = ${fmt1(r.A * 1e6, 1)} mm²`, `τ_max = 4V/(3A) = ${MPa(r.tauMax)} MPa`],
    diagram: { type: 'sectionShape', props: { shape: 'circular', d, topLabel: `V = ${V} N` } },
  };
}

function genCombined() {
  const N = randInt(-5000, 5000);
  const M = randInt(200, 3000);
  const b = randInt(30, 80), h = randInt(50, 150);
  const r = computeCombined({ mode: 'axial_bending', N, NUnit: 'N', M, MUnit: 'N·m', b, h, dimUnit: 'mm' });
  if (!r.valid) return null;
  return {
    prompt: `축력 N=${N}N(인장 +)과 굽힘모멘트 M=${M}N·m(sagging)가 함께 작용하는 ${b}×${h}mm 사각형 단면에서, 상단·하단 응력을 구하시오.`,
    answers: [
      `σ_N = ${MPa(r.sigmaAxial)} MPa, σ_M = ${MPa(r.sigmaBend)} MPa`,
      `σ_top = ${MPa(r.sigmaTop)} MPa`,
      `σ_bottom = ${MPa(r.sigmaBottom)} MPa`,
    ],
    diagram: { type: 'sectionShape', props: { shape: 'rectangular', b, h, topLabel: `N = ${N} N, M = ${M} N·m` } },
  };
}

export const PROBLEM_BANK_1 = {
  'CH.1::normal-stress-and-strain': genNormalStress,
  'CH.1::mechanical-properties': genMaterialProperties,
  'CH.1::hookes-law-poisson': genHookePoisson,
  'CH.1::shear-stress-and-strain': genShearStress,
  'CH.1::allowable-stresses-design': genAllowableDesign,

  'CH.2::spring-constant': genSpringConstant,
  'CH.2::nonuniform-bar': genMultiSegment,
  'CH.2::statically-indeterminate-axial': genIndeterminateAxial,
  'CH.2::thermal-effects': genThermal,
  'CH.2::stress-concentration': genStressConcentration,

  'CH.3::torsional-deformation': genTorsionalDeformation,
  'CH.3::torsion-formula': genTorsionFormula,
  'CH.3::allowable-torque-diameter': genTorsionDesign,
  'CH.3::torque-diagram': genTorqueDiagram,
  'CH.3::strength-to-weight': genStrengthToWeight,

  'CH.4::beam-reactions': genBeamReactions,
  'CH.4::sfd-bmd-point-load': genPointLoadSFDBMD,
  'CH.4::sfd-bmd-udl': genUDLSFDBMD,
  'CH.4::sfd-bmd-cantilever': genCantileverSFDBMD,
  'CH.4::sfd-bmd-overhang': genOverhangSFDBMD,
  'CH.4::sfd-bmd-triangular-load': genTriangularLoad,

  'CH.5::flexure-formula': genFlexure,
  'CH.5::section-modulus-design': genSectionModulus,
  'CH.5::shear-stress-rectangular': genShearRect,
  'CH.5::shear-stress-circular-flow': genShearCircular,
  'CH.5::combined-loading': genCombined,
};

export function generateProblem1(chapterNum, slug) {
  const gen = PROBLEM_BANK_1[`${chapterNum}::${slug}`];
  return gen ? gen() : null;
}
