// 굽힘 변형에너지와 그것을 써서 처짐을 구하는 방법들 (CH.9 Strain Energy / Castigliano 공용).
// 모두 solveBeamFull이 돌려준 pts([{ x, M, v, slope, EI }])를 받아 수치적분한다.
// SI 단위(m, N, Pa). v는 아래로 +.

import { solveBeamFull } from './beamBuilder';

// ∫ f dx (사다리꼴)
function integ(pts, f) {
  let s = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    s += ((f(pts[i]) + f(pts[i + 1])) / 2) * (pts[i + 1].x - pts[i].x);
  }
  return s;
}

// 굽힘이 저장하는 변형에너지 U = ∫ M²/(2EI) dx
//
// midPts(구간 중점 표본)가 있으면 그걸 쓴다. M(x)는 모멘트 하중이 걸린 자리와 자유단에서
// 절점 값이 "뛴 뒤"의 값을 갖는데, 그대로 사다리꼴을 돌리면 그 한 칸에서 값이 크게 어긋난다
// (캔틸레버 + 선단 모멘트에서 U가 0.25% 높게 나왔다). 중점은 그 자리를 비껴간다.
export function bendingEnergy(pts, midPts) {
  if (midPts && midPts.length) {
    return midPts.reduce((s, m) => s + ((m.M * m.M) / (2 * m.EI)) * m.dx, 0);
  }
  return integ(pts, (p) => (p.M * p.M) / (2 * p.EI));
}

// 하중이 천천히 걸리면서 한 일 W = ½ Σ P·δ + ½ ∫ q·v dx + ½ Σ M₀·θ  (Clapeyron)
//
// 탄성체에서는 이 일이 전부 변형에너지로 저장되므로 W = U여야 한다. 두 값을 따로 구해서
// 나란히 보여주면 "변형에너지가 무엇인가"가 말이 아니라 숫자로 확인된다.
//
// 부호: P와 v는 둘 다 아래가 +라 그대로 곱하면 된다. 적용 모멘트 M₀(반시계가 +)가 하는 일은
// 그 방향의 회전각과 짝을 이루는데, 이 엔진의 slope는 dv/dx(아래가 +)라 교재의 θ와 부호가
// 반대다. 그래서 θ = −slope를 쓴다.
export function externalWork(pts, loads, L) {
  const at = (x) => {
    const t = (x / L) * (pts.length - 1);
    const i = Math.min(pts.length - 2, Math.max(0, Math.floor(t)));
    const f = t - i;
    return {
      v: pts[i].v + (pts[i + 1].v - pts[i].v) * f,
      slope: pts[i].slope + (pts[i + 1].slope - pts[i].slope) * f,
    };
  };
  let W = 0;
  loads.forEach((l) => {
    if (l.kind === 'point') W += 0.5 * l.P * at(l.x).v;
    else if (l.kind === 'moment') W += 0.5 * l.M0 * -at(l.x).slope;
    else {
      const qAt = (x) => {
        if (x < l.xStart || x > l.xEnd) return 0;
        if (l.kind === 'udl') return l.q;
        const t = (x - l.xStart) / Math.max(1e-12, l.xEnd - l.xStart);
        return l.qStart + (l.qEnd - l.qStart) * t;
      };
      W += 0.5 * integ(pts, (p) => qAt(p.x) * p.v);
    }
  });
  return W;
}

// 구하려는 곳에 "가상의 단위하중"만 얹은 보를 따로 푼다.
//   kind 'force'  — 단위 하향 집중하중 1 N → 그 점의 처짐을 구할 때
//   kind 'moment' — 단위 모멘트 1 N·m     → 그 점의 처짐각을 구할 때
// 반환된 pts의 M이 교재가 말하는 m(x)(또는 δM)다.
export function unitLoadCase(L, supports, ei, xStar, kind = 'force', N = 600) {
  const load =
    kind === 'force'
      ? { id: 'unit', kind: 'point', x: xStar, P: 1 }
      : { id: 'unit', kind: 'moment', x: xStar, M0: 1 };
  return solveBeamFull(L, supports, [load], ei, N);
}

// 단위하중법(가상일): δ = ∫ M·m / EI dx
// realPts와 unitPts는 같은 격자를 써야 한다(같은 N으로 풀 것).
export function virtualWork(real, unit) {
  // 두 해 모두 중점 표본을 갖고 있으면 그것으로 적분한다 (bendingEnergy와 같은 이유).
  if (real.midPts && unit.midPts) {
    const n = Math.min(real.midPts.length, unit.midPts.length);
    let s = 0;
    for (let i = 0; i < n; i++) {
      s += ((real.midPts[i].M * unit.midPts[i].M) / real.midPts[i].EI) * real.midPts[i].dx;
    }
    return s;
  }
  const rp = real.pts || real, up = unit.pts || unit;
  let s = 0;
  for (let i = 0; i < Math.min(rp.length, up.length) - 1; i++) {
    const a = (rp[i].M * up[i].M) / rp[i].EI;
    const b = (rp[i + 1].M * up[i + 1].M) / rp[i + 1].EI;
    s += ((a + b) / 2) * (rp[i + 1].x - rp[i].x);
  }
  return s;
}

// Castigliano 제2정리를 "정의 그대로" 확인한다: δ = ∂U/∂Q |_{Q=0}
//
// 구하려는 점에 크기 Q인 가상의 집중하중을 얹고 U(Q)를 구한 뒤, Q에 대해 미분한다.
// 손으로는 U를 Q의 식으로 쓴 다음 미분하지만, 여기서는 중앙차분으로 같은 일을 한다.
// h는 하중 규모에 맞춰 잡아야 자릿수 손실이 없다.
export function castiglianoDeflection(L, supports, loads, ei, xStar, N = 600) {
  const scale = Math.max(
    1,
    ...loads.map((l) => Math.abs(l.P || l.q || l.qStart || l.M0 || 0))
  );
  const h = scale * 1e-3;
  const U = (Q) => {
    const r = solveBeamFull(L, supports, [...loads, { id: 'q-dummy', kind: 'point', x: xStar, P: Q }], ei, N);
    return r.pts ? bendingEnergy(r.pts, r.midPts) : NaN;
  };
  return { value: (U(h) - U(-h)) / (2 * h), h };
}
