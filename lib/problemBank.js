// 챕터/소주제별로 "문제 템플릿 + 랜덤 숫자"를 조합해 문제를 만드는 뱅크.
// 지문/숫자는 전부 새로 작성한 것이고(교재 문제를 그대로 베끼지 않음), 정답 계산은 각 계산기가
// 쓰는 것과 동일한 검증된 순수 함수(lib/calc/*.js)를 그대로 재사용해서 정확성을 보장한다.
// generator()를 호출할 때마다 새 숫자로 다시 뽑히므로 매번 다른 문제가 나온다.

import { fmt, fmtSci, UNIT_OPTIONS } from './calc/unitOptions';
import { computeComposite } from './calc/compositeBeams';
import { computeTransformed } from './calc/transformedSection';
import { volFracA } from './calc/fgm';
import { computeInclinedLoads } from './calc/inclinedLoads';
import { computeElastoplastic } from './calc/elastoplastic';
import { computePlaneStress } from './calc/planeStress';
import { principalFromState } from './calc/principalStress';
import { computeHookesLaw } from './calc/hookesLaw';
import { computeSphericalVessel, computeCylindricalVessel } from './calc/pressureVessels';
import { computeMaxBeamStress } from './calc/maxBeamStress';
import {
  ssUDLmax,
  ssPointLoadInfo,
  cantileverUDLmax,
  cantileverPointLoadMax,
} from './calc/deflection';
import { bendingStrainEnergy } from './calc/strainEnergy';
import { proppedCantileverUDL, releaseAtB } from './calc/indeterminateBeams';

const mmF = UNIT_OPTIONS.length.mm;
const MPaF = UNIT_OPTIONS.stress.MPa;
const GPaF = UNIT_OPTIONS.E.GPa;
const kNmF = UNIT_OPTIONS.moment['kN·m'];
const kNF = UNIT_OPTIONS.force.kN;

function rand(min, max) {
  return min + Math.random() * (max - min);
}
function randStep(min, max, step) {
  const n = Math.round(rand(min, max) / step) * step;
  return Math.round(n / step) * step;
}
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const MATERIALS = [
  { name: '강철(Steel)', GPa: 200 },
  { name: '알루미늄(Aluminum)', GPa: 70 },
  { name: '목재(Wood)', GPa: 12 },
  { name: '황동(Brass)', GPa: 100 },
];

function pickTwoMaterials() {
  const a = pick(MATERIALS);
  let b = pick(MATERIALS);
  while (b.name === a.name) b = pick(MATERIALS);
  return [a, b];
}

// ============================== CH.6 ==============================

function genCompositeBeams() {
  const [matBottom, matTop] = pickTwoMaterials();
  const width = randStep(80, 200, 10); // mm
  const hBottom = randStep(80, 200, 10); // mm
  const hTop = randStep(80, 200, 10); // mm
  const moment = randStep(10, 60, 5); // kN·m

  const blocks = [
    { colorId: 0, width: width * mmF, height: hBottom * mmF, E: matBottom.GPa * GPaF },
    { colorId: 1, width: width * mmF, height: hTop * mmF, E: matTop.GPa * GPaF },
  ];
  const r = computeComposite(blocks, moment * kNmF);
  const sBottom = r.stressAt(0, blocks[0].E);
  const sTop = r.stressAt(r.totalHeight, blocks[1].E);

  return {
    prompt:
      `폭 ${width}mm, 두 재료로 이루어진 복합 단면보가 있다. 아래쪽 블록은 ${matBottom.name}(E=${matBottom.GPa}GPa, 높이 ${hBottom}mm)이고, ` +
      `위쪽 블록은 ${matTop.name}(E=${matTop.GPa}GPa, 높이 ${hTop}mm)이다. 이 단면에 굽힘모멘트 M=${moment}kN·m가 작용할 때, ` +
      `(1) 하단을 기준으로 한 중립축 위치 ȳ, (2) 최하단 응력, (3) 최상단 응력을 구하시오.`,
    answers: [
      `ȳ = ${fmt(r.ybar / mmF)} mm (하단 기준)`,
      `σ(최하단) = ${fmt(sBottom / MPaF)} MPa`,
      `σ(최상단) = ${fmt(sTop / MPaF)} MPa`,
    ],
  };
}

function genTransformedSection() {
  const [matBottom, matTop] = pickTwoMaterials();
  const width = randStep(80, 200, 10);
  const hBottom = randStep(80, 200, 10);
  const hTop = randStep(80, 200, 10);
  const moment = randStep(10, 60, 5);

  const blocks = [
    { colorId: 0, topWidth: width * mmF, bottomWidth: width * mmF, height: hBottom * mmF, E: matBottom.GPa * GPaF },
    { colorId: 1, topWidth: width * mmF, bottomWidth: width * mmF, height: hTop * mmF, E: matTop.GPa * GPaF },
  ];
  const r = computeTransformed(blocks, moment * kNmF);
  const n = matTop.GPa / matBottom.GPa;
  const sBottom = r.stressAt(0, blocks[0].E);

  return {
    prompt:
      `${matBottom.name}(E₁=${matBottom.GPa}GPa) 위에 ${matTop.name}(E₂=${matTop.GPa}GPa)를 덧댄 복합보가 있다. ` +
      `아래쪽 블록은 폭 ${width}mm·높이 ${hBottom}mm, 위쪽 블록은 폭 ${width}mm·높이 ${hTop}mm이다. 굽힘모멘트 M=${moment}kN·m가 작용할 때, ` +
      `환산계수 n=E₂/E₁을 이용한 환산단면법으로 (1) 환산계수 n, (2) 중립축 위치 ȳ(하단 기준), (3) 최하단(재료 1) 응력을 구하시오.`,
    answers: [`n = ${fmt(n)}`, `ȳ = ${fmt(r.ybar / mmF)} mm (하단 기준)`, `σ(최하단) = ${fmt(sBottom / MPaF)} MPa`],
  };
}

function genFGM() {
  const n = pick([0.5, 1, 1.5, 2, 3, 5]);
  const zeta = randStep(0.1, 0.9, 0.1);
  const fracA = volFracA(zeta, n);

  return {
    prompt:
      `기능성 경사재료(FGM) 보의 단면에서 하단(ζ=0)은 재료 B, 상단(ζ=1)은 재료 A로 이루어져 있고, 체적분율은 ` +
      `V_A(ζ) = ζⁿ 을 따른다. 구배지수 n=${n}일 때, 무차원 높이 ζ=${fmt(zeta)} 지점에서 재료 A의 체적분율 V_A를 구하시오.`,
    answers: [`V_A(${fmt(zeta)}) = ${fmt(fracA * 100)} %`],
  };
}

function genInclinedLoads() {
  const width = randStep(100, 250, 10); // mm
  const height = randStep(200, 400, 10); // mm
  const moment = randStep(10, 50, 5); // kN·m
  const alpha = randStep(10, 60, 5); // deg

  const r = computeInclinedLoads(width * mmF, height * mmF, moment * kNmF, alpha);
  const yCorner = height * mmF / 2;
  const zCorner = width * mmF / 2;
  const sCorner = r.stressAt(yCorner, zCorner);

  return {
    prompt:
      `폭 b=${width}mm, 높이 h=${height}mm인 직사각형 단면보에, 수직축(z축)에서 α=${alpha}° 기울어진 굽힘모멘트 M=${moment}kN·m가 작용한다. ` +
      `(1) 이 모멘트의 z축 성분 Mz와 y축 성분 My, (2) 단면 모서리 점(y=h/2, z=b/2)에서의 굽힘응력 σ를 구하시오.`,
    answers: [
      `Mz = ${fmt(r.Mz / kNmF)} kN·m, My = ${fmt(r.My / kNmF)} kN·m`,
      `σ(모서리) = ${fmt(sCorner / MPaF)} MPa`,
    ],
  };
}

function genElastoplasticBending() {
  const width = randStep(80, 200, 10);
  const height = randStep(150, 350, 10);
  const sigmaY = randStep(200, 350, 10); // MPa

  const r = computeElastoplastic(width * mmF, height * mmF, sigmaY * MPaF, 0);

  return {
    prompt:
      `폭 b=${width}mm, 높이 h=${height}mm인 직사각형 단면의 탄완전소성(elastic-perfectly plastic) 보가 있다. 항복응력 σY=${sigmaY}MPa일 때, ` +
      `(1) 항복모멘트 My, (2) 완전소성모멘트 Mp, (3) 형상계수(shape factor) f=Mp/My를 구하시오.`,
    answers: [
      `My = ${fmt(r.My / kNmF)} kN·m`,
      `Mp = ${fmt(r.Mp / kNmF)} kN·m`,
      `f = Mp/My = ${fmt(r.shapeFactor)}`,
    ],
  };
}

// ============================== CH.7 ==============================

function genPlaneStress() {
  const sigmaX = randStep(-80, 120, 5); // MPa
  const sigmaY = randStep(-60, 100, 5);
  const tauXY = randStep(-40, 60, 5);
  const theta = randStep(-60, 60, 5); // deg

  const r = computePlaneStress(sigmaX * MPaF, sigmaY * MPaF, tauXY * MPaF, theta);

  return {
    prompt:
      `평면응력 상태에서 σx=${sigmaX}MPa, σy=${sigmaY}MPa, τxy=${tauXY}MPa가 작용한다. x축에서 θ=${theta}° 회전한 x'y' 좌표계에서의 ` +
      `σx', σy', τx'y'을 구하시오.`,
    answers: [
      `σx' = ${fmt(r.sx1 / MPaF)} MPa`,
      `σy' = ${fmt(r.sy1 / MPaF)} MPa`,
      `τx'y' = ${fmt(r.tx1y1 / MPaF)} MPa`,
    ],
  };
}

function genMohrsCircle() {
  const sigmaX = randStep(-80, 120, 5);
  const sigmaY = randStep(-60, 100, 5);
  const tauXY = randStep(-40, 60, 5);

  const r = principalFromState(sigmaX * MPaF, sigmaY * MPaF, tauXY * MPaF);

  return {
    prompt:
      `평면응력 상태 σx=${sigmaX}MPa, σy=${sigmaY}MPa, τxy=${tauXY}MPa에 대해 모어의 원을 이용하여 ` +
      `(1) 주응력 σ1, σ2와 그 방향 θp, (2) 최대전단응력 τmax를 구하시오.`,
    answers: [
      `σ1 = ${fmt(r.sigma1 / MPaF)} MPa, σ2 = ${fmt(r.sigma2 / MPaF)} MPa`,
      `θp = ${fmt(r.thetaP)}°`,
      `τmax = ${fmt(r.tauMax / MPaF)} MPa`,
    ],
  };
}

function genHookesLaw() {
  const E = pick([70, 100, 200]); // GPa
  const nu = pick([0.25, 0.3, 0.33]);
  const sigmaX = randStep(20, 150, 5); // MPa
  const sigmaY = randStep(-50, 100, 5);
  const tauXY = randStep(-40, 60, 5);

  const r = computeHookesLaw({
    mode: 'stressToStrain',
    E: E * GPaF,
    nu,
    sigmaX: sigmaX * MPaF,
    sigmaY: sigmaY * MPaF,
    tauXY: tauXY * MPaF,
  });

  return {
    prompt:
      `평면응력 상태 σx=${sigmaX}MPa, σy=${sigmaY}MPa, τxy=${tauXY}MPa가 작용하는 재료의 탄성계수 E=${E}GPa, 푸아송비 ν=${nu}이다. ` +
      `후크의 법칙을 이용해 εx, εy, γxy를 구하시오.`,
    answers: [
      `εx = ${fmtSci(r.ex)}`,
      `εy = ${fmtSci(r.ey)}`,
      `γxy = ${fmtSci(r.gxy)}`,
    ],
  };
}

// ============================== CH.8 ==============================

function genSphericalVessel() {
  const r = randStep(300, 1200, 50); // mm
  const t = randStep(5, 20, 1); // mm
  const p = randStep(0.5, 3, 0.1); // MPa

  const res = computeSphericalVessel(r * mmF, t * mmF, p * MPaF);

  return {
    prompt:
      `평균 반지름 r=${r}mm, 두께 t=${t}mm인 구형 압력용기에 내압 p=${fmt(p)}MPa가 작용한다. ` +
      `(1) 막응력 σ, (2) 외벽 기준 최대전단응력 τmax(외부)를 구하시오.`,
    answers: [`σ = ${fmt(res.sigma / MPaF)} MPa`, `τmax(외부) = ${fmt(res.tauOuter / MPaF)} MPa`],
  };
}

function genCylindricalVessel() {
  const r = randStep(300, 1200, 50);
  const t = randStep(5, 20, 1);
  const p = randStep(0.5, 3, 0.1);

  const res = computeCylindricalVessel(r * mmF, t * mmF, p * MPaF, 0);

  return {
    prompt:
      `평균 반지름 r=${r}mm, 두께 t=${t}mm인 원통형 압력용기에 내압 p=${fmt(p)}MPa가 작용한다. ` +
      `(1) 원주응력(hoop stress) σ1, (2) 축방향응력 σ2를 구하시오.`,
    answers: [`σ1 = ${fmt(res.sigma1 / MPaF)} MPa`, `σ2 = ${fmt(res.sigma2 / MPaF)} MPa`],
  };
}

function genMaxBeamStress() {
  const width = randStep(80, 200, 10);
  const height = randStep(200, 400, 10);
  const M = randStep(10, 60, 5); // kN·m
  const V = randStep(10, 100, 5); // kN
  const yFrac = randStep(0.1, 0.4, 0.05); // 중립축에서 (1-yFrac)*h/2 만큼 떨어진 점

  const yPoint = (height * mmF / 2) * (1 - yFrac); // 중립축 기준 y좌표
  const res = computeMaxBeamStress(width * mmF, height * mmF, M * kNmF, V * kNF, yPoint);

  return {
    prompt:
      `폭 b=${width}mm, 높이 h=${height}mm인 직사각형 단면보의 한 단면에 굽힘모멘트 M=${M}kN·m와 전단력 V=${V}kN이 동시에 작용한다. ` +
      `중립축에서 ${fmt((height / 2) * (1 - yFrac))}mm 떨어진 점에서 (1) 굽힘응력 σx, (2) 전단응력 τ, (3) 주응력 σ1, σ2를 구하시오.`,
    answers: [
      `σx = ${fmt(res.sigmaX / MPaF)} MPa`,
      `τ = ${fmt(res.tau / MPaF)} MPa`,
      `σ1 = ${fmt(res.sigma1 / MPaF)} MPa, σ2 = ${fmt(res.sigma2 / MPaF)} MPa`,
    ],
  };
}

function genCombinedLoadings() {
  const d = randStep(40, 100, 5); // mm, 원형축 지름
  const P = randStep(5, 40, 5); // kN, 축하중
  const M = randStep(1, 8, 0.5); // kN·m, 굽힘모멘트
  const T = randStep(1, 8, 0.5); // kN·m, 비틀림모멘트

  const dSI = d * mmF;
  const A = (Math.PI * dSI * dSI) / 4;
  const sigmaAxial = (P * kNF) / A;
  const sigmaBend = (32 * (M * kNmF)) / (Math.PI * dSI ** 3);
  const sigma = sigmaAxial + sigmaBend;
  const tau = (16 * (T * kNmF)) / (Math.PI * dSI ** 3);
  const pr = principalFromState(sigma, 0, tau);

  return {
    prompt:
      `지름 d=${d}mm인 원형 축에 축하중 P=${P}kN, 굽힘모멘트 M=${M}kN·m, 비틀림모멘트 T=${T}kN·m가 동시에 작용한다. ` +
      `표면의 가장 응력이 큰 지점에서 (1) 굽힘+축하중에 의한 수직응력 σ, (2) 비틀림에 의한 전단응력 τ, (3) 주응력 σ1, σ2와 최대전단응력 τmax를 구하시오.`,
    answers: [
      `σ = ${fmt(sigma / MPaF)} MPa`,
      `τ = ${fmt(tau / MPaF)} MPa`,
      `σ1 = ${fmt(pr.sigma1 / MPaF)} MPa, σ2 = ${fmt(pr.sigma2 / MPaF)} MPa, τmax = ${fmt(pr.tauMax / MPaF)} MPa`,
    ],
  };
}

// ============================== CH.9 ==============================

function randEI() {
  const E = pick([70, 200]); // GPa
  const I = randStep(20, 120, 5); // x10^6 mm^4
  return { E: E * GPaF, I: I * 1e-6, EGPa: E, IDisp: I };
}

function genBendingMomentEquation() {
  const L = randStep(3, 8, 0.5); // m
  const a = randStep(1, L - 1, 0.5);
  const P = randStep(10, 60, 5); // kN
  const { E, I, EGPa, IDisp } = randEI();
  const EI = E * I;

  const info = ssPointLoadInfo(L, a, P * kNF, EI);

  return {
    prompt:
      `길이 L=${L}m인 단순보 A-B의 A로부터 a=${a}m 떨어진 위치에 집중하중 P=${P}kN이 작용한다. E=${EGPa}GPa, I=${IDisp}×10⁶mm⁴일 때, ` +
      `굽힘모멘트식을 적분하여 (1) A점의 처짐각 θA, (2) 하중 작용점의 처짐 δ를 구하시오.`,
    answers: [`θA = ${fmtSci(info.thetaA)} rad`, `δ(하중점) = ${fmt(info.deltaAtLoad * 1000)} mm`],
  };
}

function genShearForceEquation() {
  const L = randStep(2, 6, 0.5);
  const q = randStep(5, 25, 1); // kN/m
  const { E, I, EGPa, IDisp } = randEI();
  const EI = E * I;

  const r = cantileverUDLmax(L, q * kNF, EI);

  return {
    prompt:
      `길이 L=${L}m인 캔틸레버보(고정단 A, 자유단 B)에 전길이에 걸쳐 등분포하중 q=${q}kN/m가 작용한다. E=${EGPa}GPa, I=${IDisp}×10⁶mm⁴일 때, ` +
      `전단력식을 적분하여 (1) 자유단 처짐각 θB, (2) 자유단 처짐 δB를 구하시오.`,
    answers: [`θB = ${fmtSci(r.thetaB)} rad`, `δB = ${fmt(r.deltaB * 1000)} mm`],
  };
}

function genMethodOfSuperpositionCh9() {
  const L = randStep(2, 6, 0.5);
  const q = randStep(5, 20, 1); // kN/m
  const P = randStep(5, 30, 5); // kN
  const { E, I, EGPa, IDisp } = randEI();
  const EI = E * I;

  const r1 = cantileverUDLmax(L, q * kNF, EI);
  const r2 = cantileverPointLoadMax(L, P * kNF, EI);
  const thetaB = r1.thetaB + r2.thetaB;
  const deltaB = r1.deltaB + r2.deltaB;

  return {
    prompt:
      `길이 L=${L}m인 캔틸레버보(고정단 A, 자유단 B)에 전길이 등분포하중 q=${q}kN/m와 자유단 집중하중 P=${P}kN이 동시에 작용한다. ` +
      `E=${EGPa}GPa, I=${IDisp}×10⁶mm⁴일 때, 중첩법(Method of Superposition)으로 자유단의 (1) 처짐각 θB, (2) 처짐 δB를 구하시오.`,
    answers: [`θB = ${fmtSci(thetaB)} rad`, `δB = ${fmt(deltaB * 1000)} mm`],
  };
}

function genMomentAreaMethod() {
  const L = randStep(3, 8, 0.5);
  const q = randStep(5, 25, 1);
  const { E, I, EGPa, IDisp } = randEI();
  const EI = E * I;

  const r = ssUDLmax(L, q * kNF, EI);

  return {
    prompt:
      `길이 L=${L}m인 단순보에 전길이 등분포하중 q=${q}kN/m가 작용한다. E=${EGPa}GPa, I=${IDisp}×10⁶mm⁴일 때, ` +
      `모멘트-면적법(Moment-Area Method)으로 (1) A점의 처짐각 θA, (2) 중앙점 최대처짐 δmax를 구하시오.`,
    answers: [`θA = ${fmtSci(r.thetaA)} rad`, `δmax = ${fmt(r.deltaMax * 1000)} mm`],
  };
}

function genNonprismaticBeams() {
  const L = randStep(3, 6, 0.5);
  const c = randStep(1, L - 1, 0.5);
  const P = randStep(10, 40, 5);
  const E = pick([70, 200]);
  const I1 = randStep(20, 60, 5); // x10^6 mm^4, [0,c] 구간
  const I2 = randStep(60, 140, 5); // [c,L] 구간

  const EPa = E * GPaF;
  const EI1 = EPa * (I1 * 1e-6);
  const EI2 = EPa * (I2 * 1e-6);
  const PSI = P * kNF;

  const N = 800;
  let theta = 0;
  let delta = 0;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const x = (L * i) / N;
    const EIx = x < c ? EI1 : EI2;
    pts.push({ x, m: (PSI * (L - x)) / EIx });
  }
  for (let i = 0; i < N; i++) {
    const dx = L / N;
    const mAvg = (pts[i].m + pts[i + 1].m) / 2;
    const xAvg = (pts[i].x + pts[i + 1].x) / 2;
    theta += mAvg * dx;
    delta += mAvg * (L - xAvg) * dx;
  }

  return {
    prompt:
      `길이 L=${L}m인 캔틸레버보(고정단 A, 자유단 B)의 단면 2차모멘트가 x=c=${c}m 지점에서 I₁=${I1}×10⁶mm⁴(구간 [0,c])에서 ` +
      `I₂=${I2}×10⁶mm⁴(구간 [c,L])로 바뀐다. 자유단에 집중하중 P=${P}kN이 작용하고 E=${E}GPa일 때, ` +
      `모멘트-면적법으로 자유단의 (1) 처짐각 θB, (2) 처짐 δB를 구하시오. (구간별 M/EI 적분 필요)`,
    answers: [`θB ≈ ${fmtSci(theta)} rad`, `δB ≈ ${fmt(delta * 1000)} mm`],
  };
}

function genStrainEnergyOfBending() {
  const L = randStep(2, 6, 0.5);
  const P = randStep(5, 40, 5);
  const M0 = randStep(2, 20, 1);
  const { E, I, EGPa, IDisp } = randEI();
  const EI = E * I;

  const U = bendingStrainEnergy(L, P * kNF, M0 * kNmF, EI);

  return {
    prompt:
      `길이 L=${L}m인 캔틸레버보(고정단 A, 자유단 B)의 자유단에 집중하중 P=${P}kN과 모멘트 M₀=${M0}kN·m가 동시에 작용한다. ` +
      `E=${EGPa}GPa, I=${IDisp}×10⁶mm⁴일 때, 굽힘에 의한 변형에너지 U를 구하시오.`,
    answers: [`U = ${fmtSci(U)} J`],
  };
}

function genCastiglianosTheorem() {
  const L = randStep(2, 6, 0.5);
  const P = randStep(5, 40, 5);
  const M0 = randStep(2, 20, 1);
  const { E, I, EGPa, IDisp } = randEI();
  const EI = E * I;

  // Castigliano: delta_B = dU/dP = P*L^3/(3EI) + M0*L^2/(2EI)  (자유단 처짐, 하중 방향)
  const deltaB = (P * kNF * L ** 3) / (3 * EI) + (M0 * kNmF * L ** 2) / (2 * EI);

  return {
    prompt:
      `길이 L=${L}m인 캔틸레버보(고정단 A, 자유단 B)의 자유단에 집중하중 P=${P}kN과 모멘트 M₀=${M0}kN·m가 동시에 작용한다. ` +
      `E=${EGPa}GPa, I=${IDisp}×10⁶mm⁴일 때, 카스틸리아노 정리(δ=∂U/∂P)를 이용해 자유단의 처짐 δB를 구하시오.`,
    answers: [`δB = ${fmt(deltaB * 1000)} mm`],
  };
}

// ============================== CH.10 ==============================

function genDifferentialEquationMethod() {
  const L = randStep(3, 8, 0.5);
  const q = randStep(5, 30, 1);

  const r = proppedCantileverUDL(L, q * kNF);

  return {
    prompt:
      `길이 L=${L}m인 돌출 캔틸레버보(A=고정단, B=롤러 지점)에 전길이 등분포하중 q=${q}kN/m가 작용하는 1차 부정정보이다. ` +
      `미분방정식법(EIv''=M(x))으로 (1) A의 반력모멘트 MA, (2) 롤러 반력 RB를 구하시오.`,
    answers: [`MA = ${fmt(r.MA / kNmF)} kN·m`, `RB = ${fmt(r.RB / kNF)} kN`],
  };
}

function genIndeterminateSuperposition() {
  const L = randStep(3, 8, 0.5);
  const q = randStep(5, 30, 1);
  const { E, I, EGPa, IDisp } = randEI();
  const EI = E * I;

  const r = releaseAtB(L, q * kNF, EI);

  return {
    prompt:
      `길이 L=${L}m인 돌출 캔틸레버보(A=고정단, B=롤러 지점)에 전길이 등분포하중 q=${q}kN/m가 작용한다. E=${EGPa}GPa, I=${IDisp}×10⁶mm⁴일 때, ` +
      `B의 반력 RB를 여분력으로 하는 중첩법(단위하중법)으로 (1) 실제하중에 의한 B점의 처짐 δB(released), (2) 반력 RB를 구하시오.`,
    answers: [`δB(released) = ${fmt(r.deltaB * 1000)} mm`, `RB = ${fmt(r.RB / kNF)} kN`],
  };
}

// ============================== 등록 ==============================

export const PROBLEM_BANK = {
  'CH.6::composite-beams': genCompositeBeams,
  'CH.6::transformed-section': genTransformedSection,
  'CH.6::fgm': genFGM,
  'CH.6::inclined-loads': genInclinedLoads,
  'CH.6::elastoplastic-bending': genElastoplasticBending,

  'CH.7::plane-stress': genPlaneStress,
  'CH.7::mohrs-circle': genMohrsCircle,
  'CH.7::hookes-law': genHookesLaw,

  'CH.8::spherical-pressure-vessels': genSphericalVessel,
  'CH.8::cylindrical-pressure-vessels': genCylindricalVessel,
  'CH.8::max-beam-stress': genMaxBeamStress,
  'CH.8::combined-loadings': genCombinedLoadings,

  'CH.9::bending-moment-equation': genBendingMomentEquation,
  'CH.9::shear-force-equation': genShearForceEquation,
  'CH.9::method-of-superposition': genMethodOfSuperpositionCh9,
  'CH.9::moment-area-method': genMomentAreaMethod,
  'CH.9::nonprismatic-beams': genNonprismaticBeams,
  'CH.9::strain-energy-of-bending': genStrainEnergyOfBending,
  "CH.9::castiglianos-theorem": genCastiglianosTheorem,

  'CH.10::differential-equation-method': genDifferentialEquationMethod,
  'CH.10::method-of-superposition': genIndeterminateSuperposition,
};

export function generateProblem(chapterNum, slug) {
  const gen = PROBLEM_BANK[`${chapterNum}::${slug}`];
  return gen ? gen() : null;
}
