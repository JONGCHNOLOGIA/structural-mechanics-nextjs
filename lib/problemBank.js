// 챕터/소주제별로 "문제 템플릿 + 랜덤 숫자"를 조합해 문제를 만드는 뱅크.
// 지문은 교재(Gere & Goodno) 수준의 영어 문장으로 새로 작성한 것이고(그대로 베끼지 않음),
// 정답 계산은 각 계산기가 쓰는 것과 동일한 검증된 순수 함수(lib/calc/*.js)를 그대로 재사용해서
// 정확성을 보장한다. generator()를 호출할 때마다 새 숫자로 다시 뽑히므로 매번 다른 문제가 나온다.

import { fmt, fmtSci, UNIT_OPTIONS, BLOCK_COLORS } from './calc/unitOptions';
import { computeComposite } from './calc/compositeBeams';
import { computeTransformed } from './calc/transformedSection';
import { computeInclinedLoads } from './calc/inclinedLoads';
import { computeElastoplastic } from './calc/elastoplastic';
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
  { name: 'steel', GPa: 200 },
  { name: 'aluminum', GPa: 70 },
  { name: 'wood', GPa: 12 },
  { name: 'brass', GPa: 100 },
];

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function pickTwoMaterials() {
  const a = pick(MATERIALS);
  let b = pick(MATERIALS);
  while (b.name === a.name) b = pick(MATERIALS);
  return [a, b];
}

const pxScale = (mm) => Math.max(28, Math.min(140, mm * 0.45)); // 단면 도식용 mm→px 축척

// ============================== CH.6 ==============================

// 두 블록 단면 도식 (아래→위) — Composite Beams / Transformed Section이 공유
function twoBlockCrossSection(width, hBottom, hTop, matBottom, matTop) {
  return {
    widthLabel: `${width} mm`,
    blocks: [
      { widthPx: pxScale(width), heightPx: pxScale(hBottom), heightLabel: `${hBottom} mm`, label: cap(matBottom.name), fill: BLOCK_COLORS[0].fill, stroke: BLOCK_COLORS[0].stroke },
      { widthPx: pxScale(width), heightPx: pxScale(hTop), heightLabel: `${hTop} mm`, label: cap(matTop.name), fill: BLOCK_COLORS[1].fill, stroke: BLOCK_COLORS[1].stroke },
    ],
  };
}

function genCompositeBeams() {
  const [matBottom, matTop] = pickTwoMaterials();
  const width = randStep(80, 200, 10); // mm
  const hBottom = randStep(80, 200, 10); // mm
  const hTop = randStep(80, 200, 10); // mm
  const L = randStep(3, 6, 0.5); // m, 단순보 스팬
  const q = randStep(10, 40, 5); // kN/m
  const moment = (q * L * L) / 8; // kN·m, 최대모멘트(스팬 중앙)

  const blocks = [
    { colorId: 0, width: width * mmF, height: hBottom * mmF, E: matBottom.GPa * GPaF },
    { colorId: 1, width: width * mmF, height: hTop * mmF, E: matTop.GPa * GPaF },
  ];
  const r = computeComposite(blocks, moment * kNmF);
  const sBottom = r.stressAt(0, blocks[0].E);
  const sTop = r.stressAt(r.totalHeight, blocks[1].E);

  return {
    prompt:
      `A composite beam is simply supported and carries a uniform load of q = ${q} kN/m on a span length of L = ${L} m. The beam is built of a ` +
      `${matBottom.name} member (E = ${matBottom.GPa} GPa) of width ${width} mm and height ${hBottom} mm, with a ${matTop.name} member ` +
      `(E = ${matTop.GPa} GPa) of the same width and height ${hTop} mm on top of it. At the cross section of maximum bending moment, determine ` +
      `(a) the location of the neutral axis ȳ (measured from the bottom of the section), and (b) the maximum stresses σ in the bottom and top of the beam.`,
    answers: [
      `M(max) = qL²/8 = ${fmt(moment)} kN·m`,
      `ȳ = ${fmt(r.ybar / mmF)} mm (from the bottom)`,
      `σ(bottom) = ${fmt(sBottom / MPaF)} MPa`,
      `σ(top) = ${fmt(sTop / MPaF)} MPa`,
    ],
    diagram: {
      type: 'beamAndCrossSection',
      beamProps: { support: 'simple', spanLabel: `L = ${L} m`, loads: [{ kind: 'udl', label: `q = ${q} kN/m` }] },
      crossSectionProps: twoBlockCrossSection(width, hBottom, hTop, matBottom, matTop),
    },
  };
}

function genTransformedSection() {
  const [matBottom, matTop] = pickTwoMaterials();
  const width = randStep(80, 200, 10);
  const hBottom = randStep(80, 200, 10);
  const hTop = randStep(80, 200, 10);
  const L = randStep(3, 6, 0.5);
  const q = randStep(10, 40, 5);
  const moment = (q * L * L) / 8;

  const blocks = [
    { colorId: 0, topWidth: width * mmF, bottomWidth: width * mmF, height: hBottom * mmF, E: matBottom.GPa * GPaF },
    { colorId: 1, topWidth: width * mmF, bottomWidth: width * mmF, height: hTop * mmF, E: matTop.GPa * GPaF },
  ];
  const r = computeTransformed(blocks, moment * kNmF);
  const n = matTop.GPa / matBottom.GPa;
  const sBottom = r.stressAt(0, blocks[0].E);

  return {
    prompt:
      `The composite beam shown is simply supported and carries a total uniform load of q = ${q} kN/m on a span length of L = ${L} m. The beam is ` +
      `built of a ${matBottom.name} member (E₁ = ${matBottom.GPa} GPa) of width ${width} mm and height ${hBottom} mm, reinforced on top by a ` +
      `${matTop.name} plate (E₂ = ${matTop.GPa} GPa) of the same width and height ${hTop} mm. At the section of maximum moment, using the ` +
      `transformed-section method with n = E₂/E₁, determine (a) the modular ratio n, (b) the neutral axis ȳ (from the bottom), and (c) the maximum ` +
      `stress in material 1 (bottom).`,
    answers: [`M(max) = qL²/8 = ${fmt(moment)} kN·m`, `n = ${fmt(n)}`, `ȳ = ${fmt(r.ybar / mmF)} mm (from the bottom)`, `σ(bottom) = ${fmt(sBottom / MPaF)} MPa`],
    diagram: {
      type: 'beamAndCrossSection',
      beamProps: { support: 'simple', spanLabel: `L = ${L} m`, loads: [{ kind: 'udl', label: `q = ${q} kN/m` }] },
      crossSectionProps: twoBlockCrossSection(width, hBottom, hTop, matBottom, matTop),
    },
  };
}

function genInclinedLoads() {
  const width = randStep(100, 250, 10); // mm
  const height = randStep(200, 400, 10); // mm
  const L = randStep(2, 4, 0.25); // m, 단순보 스팬
  const q = randStep(5, 20, 1); // kN/m
  const moment = (q * L * L) / 8; // kN·m, 최대모멘트
  const alpha = randStep(10, 60, 5); // deg

  const r = computeInclinedLoads(width * mmF, height * mmF, moment * kNmF, alpha);
  const yCorner = height * mmF / 2;
  const zCorner = width * mmF / 2;
  const sCorner = r.stressAt(yCorner, zCorner);

  return {
    prompt:
      `A simply supported beam with span length L = ${L} m carries a uniform load q = ${q} kN/m acting through the centroid. The rectangular cross ` +
      `section (width b = ${width} mm, height h = ${height} mm) is tilted at an angle α = ${alpha}° to the vertical (z) axis. At the section of ` +
      `maximum moment, determine (a) the z- and y-axis components Mz and My of the bending moment, and (b) the bending stress σ at the corner ` +
      `point (y = h/2, z = b/2).`,
    answers: [
      `M(max) = qL²/8 = ${fmt(moment)} kN·m`,
      `Mz = ${fmt(r.Mz / kNmF)} kN·m, My = ${fmt(r.My / kNmF)} kN·m`,
      `σ(corner) = ${fmt(sCorner / MPaF)} MPa`,
    ],
    diagram: {
      type: 'beamAndCrossSection',
      beamProps: { support: 'simple', spanLabel: `L = ${L} m`, loads: [{ kind: 'udl', label: `q = ${q} kN/m` }] },
      crossSectionProps: {
        angleDeg: alpha,
        widthLabel: `b = ${width} mm`,
        blocks: [
          { widthPx: pxScale(width), heightPx: pxScale(height), heightLabel: `h = ${height} mm`, label: '', fill: BLOCK_COLORS[3].fill, stroke: BLOCK_COLORS[3].stroke },
        ],
      },
    },
  };
}

function genElastoplasticBending() {
  const width = randStep(80, 200, 10);
  const height = randStep(150, 350, 10);
  const sigmaY = randStep(200, 350, 10); // MPa

  const r = computeElastoplastic(width * mmF, height * mmF, sigmaY * MPaF, 0);

  return {
    prompt:
      `A beam of elastoplastic material has a rectangular cross section of width b = ${width} mm and height h = ${height} mm. The yield stress of ` +
      `the material is σY = ${sigmaY} MPa. Determine (a) the yield moment My, (b) the plastic moment Mp, and (c) the shape factor f = Mp/My.`,
    answers: [
      `My = ${fmt(r.My / kNmF)} kN·m`,
      `Mp = ${fmt(r.Mp / kNmF)} kN·m`,
      `f = Mp/My = ${fmt(r.shapeFactor)}`,
    ],
    diagram: {
      type: 'crossSection',
      props: {
        widthLabel: `b = ${width} mm`,
        blocks: [
          { widthPx: pxScale(width), heightPx: pxScale(height), heightLabel: `h = ${height} mm`, label: `σY = ${sigmaY} MPa`, fill: BLOCK_COLORS[2].fill, stroke: BLOCK_COLORS[2].stroke },
        ],
      },
    },
  };
}

// ============================== CH.7 ==============================

function genMohrsCircle() {
  const sigmaX = randStep(-80, 120, 5);
  const sigmaY = randStep(-60, 100, 5);
  const tauXY = randStep(-40, 60, 5);

  const r = principalFromState(sigmaX * MPaF, sigmaY * MPaF, tauXY * MPaF);

  return {
    prompt:
      `An element in plane stress is subjected to stresses σx = ${sigmaX} MPa, σy = ${sigmaY} MPa, and τxy = ${tauXY} MPa. Using Mohr's circle, ` +
      `determine (a) the principal stresses σ1, σ2 and the angle θp defining the principal planes, and (b) the maximum shear stress τmax.`,
    answers: [
      `σ1 = ${fmt(r.sigma1 / MPaF)} MPa, σ2 = ${fmt(r.sigma2 / MPaF)} MPa`,
      `θp = ${fmt(r.thetaP)}°`,
      `τmax = ${fmt(r.tauMax / MPaF)} MPa`,
    ],
    diagram: {
      type: 'stressElement',
      props: { sigmaX, sigmaY, tauXY, sigmaXLabel: `σx = ${sigmaX} MPa`, sigmaYLabel: `σy = ${sigmaY} MPa`, tauLabel: `τxy = ${tauXY} MPa` },
    },
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
      `An element in plane stress is subjected to stresses σx = ${sigmaX} MPa, σy = ${sigmaY} MPa, and τxy = ${tauXY} MPa. The material has ` +
      `modulus of elasticity E = ${E} GPa and Poisson's ratio ν = ${nu}. Using Hooke's law, determine the strains εx, εy, and γxy.`,
    answers: [
      `εx = ${fmtSci(r.ex)}`,
      `εy = ${fmtSci(r.ey)}`,
      `γxy = ${fmtSci(r.gxy)}`,
    ],
    diagram: {
      type: 'stressElement',
      props: { sigmaX, sigmaY, tauXY, sigmaXLabel: `σx = ${sigmaX} MPa`, sigmaYLabel: `σy = ${sigmaY} MPa`, tauLabel: `τxy = ${tauXY} MPa` },
    },
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
      `A spherical pressure vessel of mean radius r = ${r} mm and wall thickness t = ${t} mm is subjected to an internal pressure p = ${fmt(p)} MPa. ` +
      `Determine (a) the membrane stress σ, and (b) the maximum in-plane shear stress τmax at the outer surface.`,
    answers: [`σ = ${fmt(res.sigma / MPaF)} MPa`, `τmax(outer) = ${fmt(res.tauOuter / MPaF)} MPa`],
    diagram: { type: 'vessel', props: { kind: 'sphere', rLabel: `r = ${r} mm`, tLabel: `t = ${t} mm`, pLabel: `p = ${fmt(p)} MPa` } },
  };
}

function genCylindricalVessel() {
  const r = randStep(300, 1200, 50);
  const t = randStep(5, 20, 1);
  const p = randStep(0.5, 3, 0.1);

  const res = computeCylindricalVessel(r * mmF, t * mmF, p * MPaF, 0);

  return {
    prompt:
      `A cylindrical pressure vessel of mean radius r = ${r} mm and wall thickness t = ${t} mm is subjected to an internal pressure p = ${fmt(p)} MPa. ` +
      `Determine (a) the circumferential (hoop) stress σ1, and (b) the longitudinal stress σ2.`,
    answers: [`σ1 = ${fmt(res.sigma1 / MPaF)} MPa`, `σ2 = ${fmt(res.sigma2 / MPaF)} MPa`],
    diagram: { type: 'vessel', props: { kind: 'cylinder', rLabel: `r = ${r} mm`, tLabel: `t = ${t} mm`, pLabel: `p = ${fmt(p)} MPa` } },
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
      `A beam with a rectangular cross section (width b = ${width} mm, height h = ${height} mm) is subjected at a certain section to a bending ` +
      `moment M = ${M} kN·m and a shear force V = ${V} kN acting simultaneously. At a point ${fmt((height / 2) * (1 - yFrac))} mm from the neutral ` +
      `axis, determine (a) the bending stress σx, (b) the shear stress τ, and (c) the principal stresses σ1 and σ2.`,
    answers: [
      `σx = ${fmt(res.sigmaX / MPaF)} MPa`,
      `τ = ${fmt(res.tau / MPaF)} MPa`,
      `σ1 = ${fmt(res.sigma1 / MPaF)} MPa, σ2 = ${fmt(res.sigma2 / MPaF)} MPa`,
    ],
    diagram: {
      type: 'maxStressPoint',
      props: { widthLabel: `b = ${width} mm`, heightLabel: `h = ${height} mm`, MLabel: `M = ${M} kN·m`, VLabel: `V = ${V} kN`, yFrac: 1 - yFrac },
    },
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
      `A solid circular shaft of diameter d = ${d} mm is subjected simultaneously to an axial force P = ${P} kN, a bending moment M = ${M} kN·m, ` +
      `and a torque T = ${T} kN·m. At the point on the surface where the stresses are largest, determine (a) the normal stress σ due to combined ` +
      `axial load and bending, (b) the shear stress τ due to torsion, and (c) the principal stresses σ1, σ2 and maximum shear stress τmax.`,
    answers: [
      `σ = ${fmt(sigma / MPaF)} MPa`,
      `τ = ${fmt(tau / MPaF)} MPa`,
      `σ1 = ${fmt(pr.sigma1 / MPaF)} MPa, σ2 = ${fmt(pr.sigma2 / MPaF)} MPa, τmax = ${fmt(pr.tauMax / MPaF)} MPa`,
    ],
    diagram: {
      type: 'shaft',
      props: { dLabel: `d = ${d} mm`, PLabel: `P = ${P} kN`, MLabel: `M = ${M} kN·m`, TLabel: `T = ${T} kN·m` },
    },
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
      `A simply supported beam AB with span length L = ${L} m carries a concentrated load P = ${P} kN at a distance a = ${a} m from support A. ` +
      `The beam has E = ${EGPa} GPa and I = ${IDisp} × 10⁶ mm⁴. By integrating the bending-moment equation, determine (a) the angle of rotation ` +
      `θA at support A, and (b) the deflection δ at the point where the load is applied.`,
    answers: [`θA = ${fmtSci(info.thetaA)} rad`, `δ(under load) = ${fmt(info.deltaAtLoad * 1000)} mm`],
    diagram: { type: 'beam', props: { support: 'simple', spanLabel: `L = ${L} m`, loads: [{ kind: 'point', posFrac: a / L, label: `P = ${P} kN` }] } },
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
      `A cantilever beam AB (fixed at A, free at B) of length L = ${L} m carries a uniform load q = ${q} kN/m over its full length together with a ` +
      `concentrated load P = ${P} kN at the free end. The beam has E = ${EGPa} GPa and I = ${IDisp} × 10⁶ mm⁴. Using the method of superposition, ` +
      `determine (a) the angle of rotation θB and (b) the deflection δB at the free end.`,
    answers: [`θB = ${fmtSci(thetaB)} rad`, `δB = ${fmt(deltaB * 1000)} mm`],
    diagram: {
      type: 'beam',
      props: {
        support: 'cantilever',
        spanLabel: `L = ${L} m`,
        loads: [
          { kind: 'udl', label: `q = ${q} kN/m` },
          { kind: 'point', posFrac: 1, label: `P = ${P} kN` },
        ],
      },
    },
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
      `A simply supported beam of length L = ${L} m carries a uniform load q = ${q} kN/m over its full length. The beam has E = ${EGPa} GPa and ` +
      `I = ${IDisp} × 10⁶ mm⁴. Using the moment-area method, determine (a) the angle of rotation θA at support A, and (b) the maximum deflection ` +
      `δmax at the midpoint.`,
    answers: [`θA = ${fmtSci(r.thetaA)} rad`, `δmax = ${fmt(r.deltaMax * 1000)} mm`],
    diagram: { type: 'beam', props: { support: 'simple', spanLabel: `L = ${L} m`, loads: [{ kind: 'udl', label: `q = ${q} kN/m` }] } },
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
      `A nonprismatic cantilever beam AB (fixed at A, free at B) of length L = ${L} m has a moment of inertia I₁ = ${I1} × 10⁶ mm⁴ over the segment ` +
      `[0, c] and I₂ = ${I2} × 10⁶ mm⁴ over the segment [c, L], with c = ${c} m. A concentrated load P = ${P} kN acts at the free end, and ` +
      `E = ${E} GPa. Using the moment-area method with the M/EI diagram integrated over each segment, determine (a) the angle of rotation θB and ` +
      `(b) the deflection δB at the free end.`,
    answers: [`θB ≈ ${fmtSci(theta)} rad`, `δB ≈ ${fmt(delta * 1000)} mm`],
    diagram: {
      type: 'beam',
      props: { support: 'cantilever', spanLabel: `L = ${L} m`, loads: [{ kind: 'point', posFrac: 1, label: `P = ${P} kN` }], stepAtFrac: c / L },
    },
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
      `A cantilever beam AB (fixed at A, free at B) of length L = ${L} m carries a concentrated load P = ${P} kN and a moment M₀ = ${M0} kN·m, ` +
      `both applied at the free end. The beam has E = ${EGPa} GPa and I = ${IDisp} × 10⁶ mm⁴. Determine the strain energy U stored in the beam ` +
      `due to bending.`,
    answers: [`U = ${fmtSci(U)} J`],
    diagram: {
      type: 'beam',
      props: {
        support: 'cantilever',
        spanLabel: `L = ${L} m`,
        loads: [
          { kind: 'point', posFrac: 1, label: `P = ${P} kN` },
          { kind: 'moment', posFrac: 1, label: `M₀ = ${M0} kN·m` },
        ],
      },
    },
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
      `A cantilever beam AB (fixed at A, free at B) of length L = ${L} m carries a concentrated load P = ${P} kN and a moment M₀ = ${M0} kN·m, ` +
      `both applied at the free end. The beam has E = ${EGPa} GPa and I = ${IDisp} × 10⁶ mm⁴. Using Castigliano's theorem (δ = ∂U/∂P), determine ` +
      `the deflection δB at the free end.`,
    answers: [`δB = ${fmt(deltaB * 1000)} mm`],
    diagram: {
      type: 'beam',
      props: {
        support: 'cantilever',
        spanLabel: `L = ${L} m`,
        loads: [
          { kind: 'point', posFrac: 1, label: `P = ${P} kN` },
          { kind: 'moment', posFrac: 1, label: `M₀ = ${M0} kN·m` },
        ],
      },
    },
  };
}

// ============================== CH.10 ==============================

function genDifferentialEquationMethod() {
  const L = randStep(3, 8, 0.5);
  const q = randStep(5, 30, 1);

  const r = proppedCantileverUDL(L, q * kNF);

  return {
    prompt:
      `A propped cantilever beam AB (fixed at A, roller support at B) of length L = ${L} m, statically indeterminate to the first degree, carries a ` +
      `uniform load q = ${q} kN/m over its full length. Using the differential-equation method (EIv'' = M(x)), determine (a) the reaction moment ` +
      `MA at the fixed support, and (b) the reaction RB at the roller.`,
    answers: [`MA = ${fmt(r.MA / kNmF)} kN·m`, `RB = ${fmt(r.RB / kNF)} kN`],
    diagram: { type: 'beam', props: { support: 'propped', spanLabel: `L = ${L} m`, loads: [{ kind: 'udl', label: `q = ${q} kN/m` }] } },
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
      `A propped cantilever beam AB (fixed at A, roller support at B) of length L = ${L} m carries a uniform load q = ${q} kN/m over its full ` +
      `length. The beam has E = ${EGPa} GPa and I = ${IDisp} × 10⁶ mm⁴. Taking the reaction RB as the redundant and using the method of ` +
      `superposition (unit-load method), determine (a) the deflection δB of the released structure under the actual load, and (b) the reaction RB.`,
    answers: [`δB(released) = ${fmt(r.deltaB * 1000)} mm`, `RB = ${fmt(r.RB / kNF)} kN`],
    diagram: { type: 'beam', props: { support: 'propped', spanLabel: `L = ${L} m`, loads: [{ kind: 'udl', label: `q = ${q} kN/m` }] } },
  };
}

// ============================== 등록 ==============================

export const PROBLEM_BANK = {
  'CH.6::composite-beams': genCompositeBeams,
  'CH.6::transformed-section': genTransformedSection,
  'CH.6::inclined-loads': genInclinedLoads,
  'CH.6::elastoplastic-bending': genElastoplasticBending,

  // Mohr 원 전용 페이지를 없애면서, 이 문제들은 같은 내용을 다루는 Plane Stress로 옮겼다.
  'CH.7::plane-stress': genMohrsCircle,
  'CH.7::hookes-law': genHookesLaw,

  'CH.8::spherical-pressure-vessels': genSphericalVessel,
  'CH.8::cylindrical-pressure-vessels': genCylindricalVessel,
  'CH.8::max-beam-stress': genMaxBeamStress,
  'CH.8::combined-loadings': genCombinedLoadings,

  'CH.9::bending-moment-equation': genBendingMomentEquation,
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
