// 구조역학 1(CH.1~CH.5) 문제은행.
// 원본 프로토타입에서 각 소주제 아래에 붙어있던 "연습문제 추천"(problemNS, problemSP …)을 그대로
// 옮긴 것 — 소주제 화면에서는 빼고 문제 제작 페이지 한 곳으로 모았다.
// 정답은 각 계산기가 쓰는 검증된 순수 함수(lib/calc/*.js)를 그대로 재사용해서 계산하므로,
// 숫자가 매번 달라져도 계산기가 내놓는 값과 항상 일치한다.
//
// 문제 형태는 구조역학 2와 같은 { prompt, answers } 모양으로 맞춘다. 구조역학 2 문제에 붙는
// 도형 그림(diagram)은 이쪽 문제에는 아직 없어서 넣지 않는다.

import { LENGTH_UNITS, STRESS_UNITS, FORCE_UNITS, fromBase, fmt1 } from './calc/units1';
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
  if (mode === 'A') {
    return {
      prompt: `허용응력 σ_allow=${sigmaAllow}MPa인 재료로 만든 직경 d=${d}mm 원형봉에 P=${P}kN이 작용한다. 안전한지 판정하시오.`,
      answers: [`σ_actual = ${MPa(r.sigma_actual_Pa)} MPa`, `판정 = ${r.safe ? 'SAFE' : 'NOT SAFE'} (utilization ${fmt1(r.ratio, 3)})`],
    };
  }
  return {
    prompt: `허용응력 σ_allow=${sigmaAllow}MPa인 재료로 P=${P}kN을 지지하려 한다. 필요한 원형 단면의 직경을 구하시오.`,
    answers: [`A_required = ${fmt1(r.A_required_m2 / 1e-6, 2)} mm²`, `d_required = ${fmt1(fromBase(r.d_required_m, 'mm', LENGTH_UNITS), 2)} mm`],
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
  };
}

function genIndeterminateAxial() {
  const P = randInt(50, 300), a = randInt(1, 8), b = randInt(1, 8);
  const r = computeIndeterminate({ mode: 'fixedBar', P, PUnit: 'kN', a, b, LUnit: 'm', A: 500, AUnit: 'mm2', E: 200, EUnit: 'GPa' });
  if (!r.valid) return null;
  return {
    prompt: `양단고정 부재(A-B)에서 A로부터 a=${a}m 지점에 P=${P}kN이 작용한다. 전체 길이는 a+b=${a + b}m(b=${b}m), A=500mm², E=200GPa이다. R_A, R_B, 하중점 변위 δ_C를 구하시오.`,
    answers: [`R_A = ${kN(r.R_A)} kN`, `R_B = ${kN(r.R_B)} kN`, `δ_C = ${mm(r.delta_C)} mm`],
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

// 아직 계산기를 만들지 않은 소주제(CH.3~CH.5)는 여기 없으므로, 문제 제작 화면의 선택 목록에도
// 나타나지 않는다. 각 챕터를 옮길 때 같이 채워 넣는다.
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
};

export function generateProblem1(chapterNum, slug) {
  const gen = PROBLEM_BANK_1[`${chapterNum}::${slug}`];
  return gen ? gen() : null;
}
