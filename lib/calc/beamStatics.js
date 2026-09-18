// CH.4 보 정역학 엔진 — 원본 프로토타입의 computeVM/sampleVM/solveSimpleReactions와
// 소주제별 calculate*() 6개를 옮긴 것. 부호규약은 교재(Gere Fig.4-6)를 그대로 따른다:
// 전단력 V는 왼쪽 조각을 위로 밀어올리는 방향이 +, 굽힘모멘트 M은 아래로 볼록(sagging)이 +.
import { LENGTH_UNITS, FORCE_UNITS, TORQUE_UNITS, QINTENSITY_UNITS, toBase } from './units1';

// 위치 x에서의 V, M — "x보다 왼쪽에 있는 것들"만 모아서 더한다(단면법).
// udls의 한 항목은 {start, end, q} (균일) 또는 {start, end, q1, q2} (선형변화)를 받는다.
export function computeVM(x, reactions, pointLoads, udls, momentReactions = [], appliedMoments = []) {
  let V = 0;
  let M = 0;

  reactions.forEach((r) => {
    if (r.pos <= x + 1e-9) {
      V += r.R;
      M += r.R * (x - r.pos);
    }
  });
  pointLoads.forEach((p) => {
    if (p.pos <= x + 1e-9) {
      V -= p.P;
      M -= p.P * (x - p.pos);
    }
  });
  udls.forEach((u) => {
    const q1 = u.q1 !== undefined ? u.q1 : u.q;
    const q2 = u.q2 !== undefined ? u.q2 : u.q;
    const Lseg = u.end - u.start;
    const t = Math.max(0, Math.min(x - u.start, Lseg)); // x까지 실제로 실린 길이
    if (t > 1e-12 && Lseg > 0) {
      const slope = (q2 - q1) / Lseg;
      const d = x - u.start;
      // 실린 부분의 합력 F = ∫₀ᵗ(q1+slope·ξ)dξ, x에 대한 모멘트 Mc = ∫₀ᵗ(q1+slope·ξ)(d−ξ)dξ
      const F = q1 * t + (slope * t * t) / 2;
      const Mc = q1 * d * t - (q1 * t * t) / 2 + (slope * d * t * t) / 2 - (slope * t * t * t) / 3;
      V -= F;
      M -= Mc;
    }
  });
  momentReactions.forEach((mr) => {
    if (mr.pos <= x + 1e-9) M += mr.M;
  });
  appliedMoments.forEach((am) => {
    if (am.pos <= x + 1e-9) M -= am.M;
  });

  return { V, M };
}

// 선도용 샘플링. 하중점·지점처럼 값이 튀는 자리(breakpoints)는 양옆을 아주 가깝게 한 번 더 찍어서,
// 계단으로 뚝 떨어지는 구간이 비스듬한 직선으로 뭉개지지 않게 한다.
export function sampleVM(reactions, pointLoads, udls, momentReactions, appliedMoments, L, breakpoints) {
  const xs = new Set();
  const N = 80;
  for (let i = 0; i <= N; i++) xs.add((i * L) / N);
  breakpoints.forEach((bp) => {
    xs.add(Math.max(0, bp - L * 1e-5));
    xs.add(bp);
    xs.add(Math.min(L, bp + L * 1e-5));
  });
  const sorted = [...xs].sort((a, b) => a - b);

  const Vpts = [];
  const Mpts = [];
  sorted.forEach((x) => {
    const r = computeVM(x, reactions, pointLoads, udls, momentReactions, appliedMoments);
    Vpts.push({ x, y: r.V });
    Mpts.push({ x, y: r.M });
  });
  return { Vpts, Mpts };
}

// 단순보(A=핀 x=0, B=롤러 x=L)의 반력 — ΣM_A=0으로 R_B, ΣFy=0으로 R_A.
export function solveSimpleReactions(L, P1, a1, P2, a2, q, qStart, qEnd, M0) {
  const loadsTermForRA = P1 * (L - a1) + P2 * (L - a2) + q * (qEnd - qStart) * (L - (qStart + qEnd) / 2) + M0;
  const RA = loadsTermForRA / L;
  const totalDown = P1 + P2 + q * (qEnd - qStart);
  const RB = totalDown - RA;
  return { RA, RB };
}

/* ------------------------------ CH.4-1 반력 ------------------------------ */
export function computeReactions(s) {
  const errors = [];
  if (!(s.L > 0)) errors.push('경간(L)은 0보다 커야 합니다.');
  if (s.a1 < 0 || s.a1 > s.L) errors.push('P₁ 위치(a₁)는 0~L 사이여야 합니다.');
  if (s.a2 < 0 || s.a2 > s.L) errors.push('P₂ 위치(a₂)는 0~L 사이여야 합니다.');
  if (s.qStart < 0 || s.qEnd > s.L || s.qStart > s.qEnd) errors.push('분포하중 구간이 올바르지 않습니다.');
  if (errors.length) return { valid: false, errors };

  const L = toBase(s.L, s.LUnit, LENGTH_UNITS);
  const P1 = toBase(s.P1, s.P1Unit, FORCE_UNITS);
  const a1 = toBase(s.a1, s.LUnit, LENGTH_UNITS);
  const P2 = toBase(s.P2, s.P2Unit, FORCE_UNITS);
  const a2 = toBase(s.a2, s.LUnit, LENGTH_UNITS);
  const q = toBase(s.q, s.qUnit, QINTENSITY_UNITS);
  const qStart = toBase(s.qStart, s.LUnit, LENGTH_UNITS);
  const qEnd = toBase(s.qEnd, s.LUnit, LENGTH_UNITS);
  const M0 = toBase(s.M0, s.M0Unit, TORQUE_UNITS);

  const { RA, RB } = solveSimpleReactions(L, P1, a1, P2, a2, q, qStart, qEnd, M0);
  // 검산: 보 오른쪽 끝을 지나면 남는 내력이 없어야 하므로 V(L)=0, M(L)=0
  const check = computeVM(
    L,
    [{ pos: 0, R: RA }, { pos: L, R: RB }],
    [{ pos: a1, P: P1 }, { pos: a2, P: P2 }],
    [{ start: qStart, end: qEnd, q }],
    [],
    [{ pos: 0, M: M0 }]
  );
  return { valid: true, L, P1, a1, P2, a2, q, qStart, qEnd, M0, RA, RB, checkV: check.V, checkM: check.M };
}

/* --------------------- CH.4-2 단순보 + 집중하중 SFD/BMD --------------------- */
export function computePointLoadSFDBMD(s) {
  const errors = [];
  if (!(s.L > 0)) errors.push('경간(L)은 0보다 커야 합니다.');
  if (s.a1 < 0 || s.a1 > s.L) errors.push('P₁ 위치(a₁)는 0~L 사이여야 합니다.');
  if (s.a2 < 0 || s.a2 > s.L) errors.push('P₂ 위치(a₂)는 0~L 사이여야 합니다.');
  if (s.cutX < 0 || s.cutX > s.L) errors.push('단면 위치(x)는 0~L 사이여야 합니다.');
  if (errors.length) return { valid: false, errors };

  const L = toBase(s.L, s.LUnit, LENGTH_UNITS);
  const P1 = toBase(s.P1, s.P1Unit, FORCE_UNITS);
  const a1 = toBase(s.a1, s.LUnit, LENGTH_UNITS);
  const P2 = toBase(s.P2, s.P2Unit, FORCE_UNITS);
  const a2 = toBase(s.a2, s.LUnit, LENGTH_UNITS);
  const cutX = toBase(s.cutX, s.LUnit, LENGTH_UNITS);

  const { RA, RB } = solveSimpleReactions(L, P1, a1, P2, a2, 0, 0, 0, 0);
  const reactions = [{ pos: 0, R: RA }, { pos: L, R: RB }];
  const pointLoads = [{ pos: a1, P: P1 }, { pos: a2, P: P2 }].filter((p) => p.P > 0);
  const { Vpts, Mpts } = sampleVM(reactions, pointLoads, [], [], [], L, [0, a1, a2, L]);
  const Mmax = Mpts.reduce((mx, p) => (Math.abs(p.y) > Math.abs(mx) ? p.y : mx), 0);
  const cutVM = computeVM(cutX, reactions, pointLoads, []);
  const passedLoads = pointLoads.filter((p) => p.pos <= cutX + 1e-9);

  return { valid: true, L, RA, RB, Vpts, Mpts, Mmax, reactions, pointLoads, cutX, cutV: cutVM.V, cutM: cutVM.M, passedLoads };
}

/* ------------------- CH.4-3 단순보 + 등분포하중 SFD/BMD ------------------- */
export function computeUDLSFDBMD(s) {
  const errors = [];
  if (!(s.L > 0)) errors.push('경간(L)은 0보다 커야 합니다.');
  if (!(s.q >= 0)) errors.push('분포하중(q)의 크기는 0 이상이어야 합니다.');
  if (s.qStart < 0 || s.qEnd > s.L || s.qStart >= s.qEnd) errors.push('분포하중 구간(시작~끝)이 올바르지 않습니다.');
  if (errors.length) return { valid: false, errors };

  const L = toBase(s.L, s.LUnit, LENGTH_UNITS);
  const q = toBase(s.q, s.qUnit, QINTENSITY_UNITS);
  const qStart = toBase(s.qStart, s.LUnit, LENGTH_UNITS);
  const qEnd = toBase(s.qEnd, s.LUnit, LENGTH_UNITS);

  const { RA, RB } = solveSimpleReactions(L, 0, 0, 0, 0, q, qStart, qEnd, 0);
  const reactions = [{ pos: 0, R: RA }, { pos: L, R: RB }];
  const udls = [{ start: qStart, end: qEnd, q }];
  const { Vpts, Mpts } = sampleVM(reactions, [], udls, [], [], L, [0, qStart, qEnd, L]);
  const Mmax = Mpts.reduce((mx, p) => (Math.abs(p.y) > Math.abs(mx) ? p.y : mx), 0);

  return { valid: true, L, q, qStart, qEnd, RA, RB, Vpts, Mpts, Mmax };
}

/* ------------------------ CH.4-4 캔틸레버 SFD/BMD ------------------------ */
export function computeCantileverSFDBMD(s) {
  const errors = [];
  if (!(s.L > 0)) errors.push('경간(L)은 0보다 커야 합니다.');
  if (!(s.P >= 0)) errors.push('하중(P)의 크기는 0 이상이어야 합니다.');
  if (!(s.q >= 0)) errors.push('분포하중(q)의 크기는 0 이상이어야 합니다.');
  if (s.a < 0 || s.a > s.L) errors.push('하중 위치(a)는 0~L 사이여야 합니다.');
  if (errors.length) return { valid: false, errors };

  const L = toBase(s.L, s.LUnit, LENGTH_UNITS);
  const P = toBase(s.P, s.PUnit, FORCE_UNITS);
  const q = toBase(s.q, s.qUnit, QINTENSITY_UNITS);
  const a = toBase(s.a, s.LUnit, LENGTH_UNITS);

  const R = P + q * L; // 고정단이 전체 하중을 다 받는다
  const M0 = -(P * a + (q * L * L) / 2); // 고정단 모멘트(hogging이라 음수)
  const reactions = [{ pos: 0, R }];
  const momentReactions = [{ pos: 0, M: M0 }];
  const pointLoads = P > 0 ? [{ pos: a, P }] : [];
  const udls = q > 0 ? [{ start: 0, end: L, q }] : [];
  const { Vpts, Mpts } = sampleVM(reactions, pointLoads, udls, momentReactions, [], L, [0, a, L]);

  return { valid: true, L, P, q, a, R, M0, Vpts, Mpts };
}

/* ------------------------- CH.4-5 돌출보 SFD/BMD ------------------------- */
export function computeOverhangSFDBMD(s) {
  const errors = [];
  if (!(s.L > 0)) errors.push('전체 길이(L)는 0보다 커야 합니다.');
  if (!(s.Lb > 0 && s.Lb < s.L)) errors.push('오른쪽 지점 위치(Lb)는 0과 L 사이여야 합니다.');
  if (!(s.P >= 0)) errors.push('하중(P)의 크기는 0 이상이어야 합니다.');
  if (s.a < 0 || s.a > s.L) errors.push('하중 위치(a)는 0~L 사이여야 합니다.');
  if (errors.length) return { valid: false, errors };

  const L = toBase(s.L, s.LUnit, LENGTH_UNITS);
  const Lb = toBase(s.Lb, s.LUnit, LENGTH_UNITS);
  const P = toBase(s.P, s.PUnit, FORCE_UNITS);
  const a = toBase(s.a, s.LUnit, LENGTH_UNITS);

  const RB = (P * a) / Lb; // ΣM_A=0
  const RA = P - RB; // 하중이 돌출 구간에 있으면 음수(A가 보를 눌러 잡아야 함)가 된다
  const reactions = [{ pos: 0, R: RA }, { pos: Lb, R: RB }];
  const pointLoads = [{ pos: a, P }];
  const { Vpts, Mpts } = sampleVM(reactions, pointLoads, [], [], [], L, [0, Lb, a, L]);
  const Mmax = Mpts.reduce((mx, p) => (Math.abs(p.y) > Math.abs(mx) ? p.y : mx), 0);

  return { valid: true, L, Lb, P, a, RA, RB, Vpts, Mpts, Mmax };
}

/* --------------------- CH.4-6 삼각형(선형변화) 분포하중 --------------------- */
// 하중은 A(x=0)에서 0, B(x=L)에서 q₀인 삼각형으로 고정. 지지조건만 세 가지로 바꾼다.
export function computeTriangularLoad(s) {
  const errors = [];
  if (!(s.L > 0)) errors.push('경간(L)은 0보다 커야 합니다.');
  if (!(s.q0 >= 0)) errors.push('최대 하중강도(q₀)는 0 이상이어야 합니다.');
  if (errors.length) return { valid: false, errors };

  const L = toBase(s.L, s.LUnit, LENGTH_UNITS);
  const q0 = toBase(s.q0, s.qUnit, QINTENSITY_UNITS);
  const udls = [{ start: 0, end: L, q1: 0, q2: q0 }];
  const totalLoad = (q0 * L) / 2; // 삼각형 넓이

  let reactions = [];
  let RA;
  let RB;
  let M0;
  if (s.mode === 'cantilever') {
    // A(x=0)가 자유단, B(x=L)가 고정단 — 왼쪽에서부터 훑으면 반력이 하나도 안 걸리므로 하중만으로 계산된다.
    reactions = [];
    RA = totalLoad; // 고정단 반력 크기
    M0 = (-totalLoad * L) / 3; // 삼각형 도심이 B에서 L/3
  } else if (s.mode === 'simple') {
    RA = totalLoad / 3; // 도심이 A에서 2L/3이므로 A쪽이 1/3
    RB = (totalLoad * 2) / 3;
    reactions = [{ pos: 0, R: RA }, { pos: L, R: RB }];
  } else {
    // rollerslide: A는 롤러(수직반력만), B는 슬라이딩 가이드(모멘트반력만, 수직력 없음)
    RA = totalLoad;
    reactions = [{ pos: 0, R: RA }];
  }

  const { Vpts, Mpts } = sampleVM(reactions, [], udls, [], [], L, [0, L]);
  const Mmax = Mpts.reduce((mx, p) => (Math.abs(p.y) > Math.abs(mx) ? p.y : mx), 0);
  const MB = Mpts[Mpts.length - 1].y; // x=L에서의 모멘트 (고정단/슬라이딩단 반력모멘트)

  return { valid: true, L, q0, totalLoad, RA, RB, M0, MB, Vpts, Mpts, Mmax };
}
