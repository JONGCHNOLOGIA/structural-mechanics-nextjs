// 자유 배치 보 빌더(Bending-Moment Equation 개편용) 범용 계산 엔진.
// 지지단·하중을 몇 개든 임의 위치에 조합할 수 있고, 정정보일 때만 반력·M(x)·처짐을 계산한다.
// 모든 값은 SI 단위(m, N, Pa) 기준. 좌표계: x=0(왼쪽 끝) ~ x=L(오른쪽 끝), v 양수 = 아래로 처짐.
//
// 입력값 부호 규약(사용자 관점, Gere 표와 동일): P, q(UDL/삼각형의 세기), M0 모두 "양수 = 기존
// 표에서 쓰던 방향"(하중은 아래로 누르는 방향, 모멘트는 Gere cantileverMoment 표와 같은 방향)이면
// 양수로 입력한다. 엔진 내부에서는 이걸 반력 계산에 맞는 부호로 변환해서 쓴다("Fup" = 힘의
// 위쪽방향-양수 표현, "M0 내부값" = -M0_user).
//
// supports: [{ id, x, type }]  type: 'fixed' | 'pin' | 'roller'
// loads:
//   { id, kind:'point',    x, P }                          // P>0: 아래로
//   { id, kind:'udl',      xStart, xEnd, q }                // q>0: 아래로, 구간 내내 균일
//   { id, kind:'triangle', xStart, xEnd, qStart, qEnd }     // 선형으로 변하는 분포하중, >0: 아래로
//   { id, kind:'moment',   x, M0 }                          // Gere cantileverMoment 표와 동일 부호

const EPS = 1e-9;

function isDistributed(load) {
  return load.kind === 'udl' || load.kind === 'triangle';
}

// 분포하중을 "위쪽-양수" 선형함수로 정규화: q_up(x') = qA + m*(x'-xStart), x' in [xStart,xEnd]
function distributedUp(load) {
  const span = load.xEnd - load.xStart;
  const qStartDown = load.kind === 'udl' ? load.q : load.qStart;
  const qEndDown = load.kind === 'udl' ? load.q : load.qEnd;
  const qA = -qStartDown;
  const qB = -qEndDown;
  const m = span > EPS ? (qB - qA) / span : 0;
  return { qA, m, span };
}

// ΣFy(위쪽-양수)에 대한 분포하중의 전체 기여분 (사다리꼴 넓이)
function distTotalForce(load) {
  const { qA, m, span } = distributedUp(load);
  const qB = qA + m * span;
  return ((qA + qB) / 2) * span;
}

// ΣM(원점 기준, 위쪽-양수 힘 * 위치)에 대한 분포하중의 전체 기여분
function distMomentAboutOrigin(load) {
  const { qA, m, span } = distributedUp(load);
  const xs = load.xStart;
  return qA * xs * span + (qA * span * span) / 2 + (m * xs * span * span) / 2 + (m * span * span * span) / 3;
}

// 절단면 x에서 M(x)에 대한 분포하중의 기여분 (x가 구간 중간이면 부분적분, 지나면 전체)
function distMomentAboutCut(load, x) {
  const d = x - load.xStart;
  if (d <= EPS) return 0;
  const { qA, m, span } = distributedUp(load);
  const t = Math.min(d, span);
  return qA * d * t - (qA * t * t) / 2 + (m * d * t * t) / 2 - (m * t * t * t) / 3;
}

// ---------------- 정정/부정정/불안정 판별 ----------------
export function checkDeterminacy(supports) {
  if (!supports.length) return 'unstable';
  const unknowns = supports.reduce((s, sup) => s + (sup.type === 'fixed' ? 2 : 1), 0);
  if (unknowns < 2) return 'unstable';
  if (unknowns > 2) return 'indeterminate';
  return 'determinate';
}

// ---------------- 반력 계산 (정정보에서만 호출) ----------------
// 반환: supports 배열을 복사해서 각 지지단에 reactionFy(위쪽+), reactionM(고정단만, 내부부호) 채움
export function solveReactions(L, supports, loads) {
  const pointLoads = loads.filter((l) => l.kind === 'point');
  const momentLoads = loads.filter((l) => l.kind === 'moment');
  const distLoads = loads.filter((l) => isDistributed(l));

  let knownFySum = 0;
  let knownMSum = 0;
  pointLoads.forEach((l) => {
    const Fup = -l.P;
    knownFySum += Fup;
    knownMSum += Fup * l.x;
  });
  momentLoads.forEach((l) => {
    knownMSum += -l.M0; // 내부부호 M0_int = -M0_user
  });
  distLoads.forEach((l) => {
    knownFySum += distTotalForce(l);
    knownMSum += distMomentAboutOrigin(l);
  });

  // 미지수 목록: 지지단마다 Fy 하나(+고정단이면 M 하나 추가)
  const unknowns = [];
  supports.forEach((sup, idx) => {
    unknowns.push({ supIdx: idx, type: 'Fy', x: sup.x });
    if (sup.type === 'fixed') unknowns.push({ supIdx: idx, type: 'M', x: sup.x });
  });

  if (unknowns.length !== 2) return null; // determinate가 아니면 호출하지 않는 게 원칙

  // 2x2 연립방정식: row0=ΣFy, row1=ΣM(원점)
  // 모멘트류 미지수(고정단 반력모멘트)는 M(x)에는 +1로 기여하지만, 평형방정식에서는 -1
  // 계수를 가져야 한다 (적용 모멘트 M0와 동일한 부호 규약 — knownMSum 쪽 참고).
  const A = unknowns.map((u) => [u.type === 'Fy' ? 1 : 0, u.type === 'Fy' ? u.x : -1]);
  // A는 [unknown][eq] 형태로 만들었으니 전치해서 [eq][unknown]으로 바꿔 사용
  const a11 = A[0][0], a12 = A[1][0];
  const a21 = A[0][1], a22 = A[1][1];
  const b1 = -knownFySum;
  const b2 = -knownMSum;
  const det = a11 * a22 - a12 * a21;
  if (Math.abs(det) < EPS) return null; // 축퇴(불안정) 조합

  const u1 = (b1 * a22 - a12 * b2) / det;
  const u2 = (a11 * b2 - b1 * a21) / det;
  const values = [u1, u2];

  const result = supports.map((sup) => ({ ...sup, reactionFy: 0, reactionM: 0 }));
  unknowns.forEach((u, i) => {
    if (u.type === 'Fy') result[u.supIdx].reactionFy = values[i];
    else result[u.supIdx].reactionM = values[i];
  });
  return result;
}

// ---------------- M(x) ----------------
export function momentAt(x, supportsWithReactions, loads) {
  let total = 0;
  supportsWithReactions.forEach((sup) => {
    if (sup.x <= x + EPS) {
      total += sup.reactionFy * (x - sup.x);
      if (sup.type === 'fixed') total += sup.reactionM;
    }
  });
  loads.forEach((l) => {
    if (l.kind === 'point' && l.x <= x + EPS) {
      total += -l.P * (x - l.x);
    } else if (l.kind === 'moment' && l.x <= x + EPS) {
      total += -l.M0;
    } else if (isDistributed(l)) {
      total += distMomentAboutCut(l, x);
    }
  });
  return total;
}

// ---------------- 처짐 v(x) — 정정보 전용 래퍼 ----------------
// 예전에는 여기에 별도의 풀이가 들어 있었지만, 지금은 정정·부정정을 함께 푸는
// solveBeamFull 하나로 모았다. 이 래퍼는 "정정보가 아니면 풀지 않는다"는
// Bending-Moment Equation 쪽 규약만 그대로 유지한다.
export function solveBeam(L, supports, loads, EI, N = 400) {
  const r = solveBeamFull(L, supports, loads, EI, N);
  if (r.determinacy !== 'determinate') return { determinacy: r.determinacy };
  return r;
}

// ---------------- 전단력 V(x) ----------------
// M(x)를 x로 미분한 것과 같다(부호규약 동일). CH.10의 SFD를 그리려고 따로 뽑았다.
export function shearAt(x, supportsWithReactions, loads) {
  let total = 0;
  supportsWithReactions.forEach((sup) => {
    if (sup.x <= x + EPS) total += sup.reactionFy;
  });
  loads.forEach((l) => {
    if (l.kind === 'point' && l.x <= x + EPS) {
      total += -l.P;
    } else if (isDistributed(l)) {
      const d = x - l.xStart;
      if (d > EPS) {
        const { qA, m, span } = distributedUp(l);
        const t = Math.min(d, span);
        total += qA * t + (m * t * t) / 2;
      }
    }
  });
  return total;
}

// ---------------- 정정/부정정 판정 (차수까지) ----------------
// 반력 미지수가 평형방정식(ΣFy, ΣM 두 개)보다 몇 개 많은지가 곧 부정정 차수다.
export function determinacyInfo(supports) {
  const unknowns = supports.reduce((s, sup) => s + (sup.type === 'fixed' ? 2 : 1), 0);
  const degree = unknowns - 2;
  if (!supports.length || degree < 0) return { kind: 'unstable', unknowns, equations: 2, degree };
  return { kind: degree === 0 ? 'determinate' : 'indeterminate', unknowns, equations: 2, degree };
}

// ---------------- EI 지정 ----------------
// 숫자 하나(등단면), 함수 (x)=>EI, 또는 구간 배열 [{ xStart, xEnd, EI }] 모두 받는다.
// 배열은 Nonprismatic(구간마다 단면이 다른 보)용.
export function eiAt(spec, x) {
  if (typeof spec === 'function') return spec(x);
  if (Array.isArray(spec)) {
    for (const seg of spec) {
      if (x >= seg.xStart - EPS && x <= seg.xEnd + EPS) return seg.EI;
    }
    return spec.length ? spec[spec.length - 1].EI : 1;
  }
  return spec;
}

// ---------------- 선형연립방정식 (부분피벗 + 행 스케일링) ----------------
// 평형식(계수 ~1)과 처짐식(계수 ~1e-6)이 한 행렬에 섞이므로, 각 행을 최대계수로 나눠
// 크기를 맞춘 뒤에 소거한다. 그러지 않으면 피벗 선택이 단위계에 휘둘린다.
function solveLinear(A, b) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let i = 0; i < n; i++) {
    const s = Math.max(...M[i].slice(0, n).map(Math.abs));
    if (s > 0) for (let j = 0; j <= n; j++) M[i][j] /= s;
  }
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    if (Math.abs(M[piv][col]) < 1e-12) return null; // 특이행렬 = 불안정한 조합
    if (piv !== col) { const t = M[piv]; M[piv] = M[col]; M[col] = t; }
    for (let r = col + 1; r < n; r++) {
      const f = M[r][col] / M[col][col];
      if (f === 0) continue;
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = M[i][n];
    for (let j = i + 1; j < n; j++) sum -= M[i][j] * x[j];
    x[i] = sum / M[i][i];
  }
  return x;
}

// ---------------- 통합 풀이: 정정보·부정정보를 한 코드로 ----------------
//
// 반력을 "평형식으로 먼저 구하고 그 다음 적분상수를 구한다"는 순서로 풀면 정정보밖에 못 푼다.
// 대신 반력과 적분상수를 하나의 미지수 벡터로 묶어서 한꺼번에 푼다:
//
//   미지수: [각 지지단의 Fy, 고정단의 M, C1, C2]        → (nS + nFixed) + 2 개
//   방정식: ΣFy=0, ΣM=0, 지지단마다 v=0, 고정단마다 v'=0 → 2 + nS + nFixed 개
//
// 개수가 항상 정확히 맞는다. 부정정보에서는 평형식만으로 반력이 안 정해지는 대신
// 처짐 조건이 그만큼 더 있어서 전체로는 풀린다 — 이게 CH.10에서 말하는 "적합조건"이다.
// M(x)가 반력에 대해 선형이고 적분도 선형이라, 각 반력을 1로 둔 기저해를 미리 적분해 두고
// 계수만 맞추면 된다.
export function solveBeamFull(L, supports, loads, EIspec, N = 400) {
  const info = determinacyInfo(supports);
  if (info.kind === 'unstable') return { determinacy: 'unstable', ...info };

  // 미지수 목록
  const unknowns = [];
  supports.forEach((sup, idx) => {
    unknowns.push({ supIdx: idx, type: 'Fy', x: sup.x });
    if (sup.type === 'fixed') unknowns.push({ supIdx: idx, type: 'M', x: sup.x });
  });
  const k = unknowns.length;

  // 하중만의 ΣFy, ΣM(원점)
  let knownFySum = 0, knownMSum = 0;
  loads.forEach((l) => {
    if (l.kind === 'point') { knownFySum += -l.P; knownMSum += -l.P * l.x; }
    else if (l.kind === 'moment') { knownMSum += -l.M0; }
    else if (isDistributed(l)) { knownFySum += distTotalForce(l); knownMSum += distMomentAboutOrigin(l); }
  });

  const h = L / N;
  const xs = [];
  for (let i = 0; i <= N; i++) xs.push((L * i) / N);
  // 적분은 절점이 아니라 구간 중점에서 값을 읽는다(중점법). 고정단 반력모멘트나 집중모멘트는
  // M(x)를 그 위치에서 계단처럼 뛰게 만드는데, 절점이 그 자리에 놓이면 사다리꼴 적분이 존재하지
  // 않는 반 칸을 세면서 오차가 O(h)로 커진다. 중점에서 읽으면 뛰는 자리를 비껴가서 O(h²)가 된다.
  const xm = [];
  for (let i = 0; i < N; i++) xm.push((xs[i] + xs[i + 1]) / 2);

  const momentFromLoads = (x) => {
    let t = 0;
    loads.forEach((l) => {
      if (l.kind === 'point' && l.x <= x + EPS) t += -l.P * (x - l.x);
      else if (l.kind === 'moment' && l.x <= x + EPS) t += -l.M0;
      else if (isDistributed(l)) t += distMomentAboutCut(l, x);
    });
    return t;
  };
  // 각 반력을 1로 뒀을 때의 M(x) (기저)
  const basisAt = (u, x) => (x >= u.x - EPS ? (u.type === 'Fy' ? x - u.x : 1) : 0);

  const EIs = xs.map((x) => Math.max(1e-30, eiAt(EIspec, x)));
  const EIm = xm.map((x) => Math.max(1e-30, eiAt(EIspec, x)));
  const Mload = xs.map(momentFromLoads);
  const Mbasis = unknowns.map((u) => xs.map((x) => basisAt(u, x)));

  // EIv'' = −M (v 아래로 +) → 두 번 적분. 1차는 중점법, 2차는 이미 연속인 함수라 사다리꼴.
  const integrateMid = (fMid) => {
    const g = new Array(N + 1).fill(0);
    for (let i = 1; i <= N; i++) g[i] = g[i - 1] + fMid[i - 1] * h;
    return g;
  };
  const integrateTrap = (f) => {
    const g = new Array(N + 1).fill(0);
    for (let i = 1; i <= N; i++) g[i] = g[i - 1] + ((f[i - 1] + f[i]) / 2) * h;
    return g;
  };
  const Sload = integrateMid(xm.map((x, i) => -momentFromLoads(x) / EIm[i]));
  const Dload = integrateTrap(Sload);
  const Sbasis = unknowns.map((u) => integrateMid(xm.map((x, i) => -basisAt(u, x) / EIm[i])));
  const Dbasis = Sbasis.map((S) => integrateTrap(S));

  const sampleAt = (arr, x) => {
    const t = (x / L) * N;
    const i = Math.min(N - 1, Math.max(0, Math.floor(t)));
    const f = t - i;
    return arr[i] + (arr[i + 1] - arr[i]) * f;
  };

  // 방정식 조립 — 미지수 순서는 [u_0..u_{k-1}, C1, C2]
  const A = [], b = [];
  A.push([...unknowns.map((u) => (u.type === 'Fy' ? 1 : 0)), 0, 0]);
  b.push(-knownFySum);
  A.push([...unknowns.map((u) => (u.type === 'Fy' ? u.x : -1)), 0, 0]);
  b.push(-knownMSum);
  supports.forEach((sup) => {
    A.push([...Dbasis.map((D) => sampleAt(D, sup.x)), sup.x, 1]);
    b.push(-sampleAt(Dload, sup.x));
    if (sup.type === 'fixed') {
      A.push([...Sbasis.map((S) => sampleAt(S, sup.x)), 1, 0]);
      b.push(-sampleAt(Sload, sup.x));
    }
  });

  const sol = solveLinear(A, b);
  if (!sol) return { determinacy: 'unstable', ...info };

  const R = sol.slice(0, k);
  const C1 = sol[k], C2 = sol[k + 1];

  const supportsR = supports.map((sup) => ({ ...sup, reactionFy: 0, reactionM: 0 }));
  unknowns.forEach((u, i) => {
    if (u.type === 'Fy') supportsR[u.supIdx].reactionFy = R[i];
    else supportsR[u.supIdx].reactionM = R[i];
  });

  const pts = xs.map((x, i) => {
    let M = Mload[i], v = Dload[i] + C1 * x + C2, slope = Sload[i] + C1;
    for (let j = 0; j < k; j++) {
      M += R[j] * Mbasis[j][i];
      v += R[j] * Dbasis[j][i];
      slope += R[j] * Sbasis[j][i];
    }
    return { x, M, V: shearAt(x, supportsR, loads), v, slope, EI: EIs[i] };
  });

  return { determinacy: info.kind, ...info, supports: supportsR, pts, EI: EIspec, C1, C2 };
}

// ---------------- 적분상수를 정하는 조건들을 종류별로 분류 ----------------
//
// 교재(mmch9)는 적분상수를 정할 때 쓰는 식을 세 가지로 나눠 부른다. 화면에서는 전부
// "경계조건"으로 뭉뚱그려 적고 있었는데, 어느 것이 무엇인지 구분해서 보여달라는 요청이 있었다.
//
//   Boundary condition   — 보의 끝/지지단에서 처짐·처짐각이 정해지는 조건
//   Continuity condition — 하중이 바뀌는 지점에서 좌우 구간의 v, v'가 이어져야 한다는 조건
//   Symmetry condition   — 보와 하중이 좌우대칭이면 중앙에서 처짐각이 0이라는 조건
//
// 반환: [{ kind, x, text, why }]
export function conditionsFor(L, supports, loads) {
  const out = [];
  const f = (v) => Number(v.toFixed(6));

  supports.forEach((s) => {
    out.push({
      kind: 'boundary',
      x: s.x,
      text: `v(${f(s.x)}) = 0`,
      why: `${s.type === 'fixed' ? '고정' : s.type === 'pin' ? '힌지' : '롤러'} 지지단이라 그 자리에서는 내려앉지 않아요`,
    });
    if (s.type === 'fixed') {
      out.push({ kind: 'boundary', x: s.x, text: `v'(${f(s.x)}) = 0`, why: '고정단은 회전도 막혀 있어요' });
    }
  });

  // 하중이 시작/끝나는 자리와 내부 지지단이 구간의 경계가 된다 — 그 경계에서 v, v'가 이어져야 한다.
  const breaks = new Set();
  loads.forEach((l) => {
    if (l.kind === 'point' || l.kind === 'moment') breaks.add(f(l.x));
    else { breaks.add(f(l.xStart)); breaks.add(f(l.xEnd)); }
  });
  supports.forEach((s) => breaks.add(f(s.x)));
  [...breaks]
    .filter((x) => x > 1e-9 && x < L - 1e-9)
    .sort((a, b) => a - b)
    .forEach((x) => {
      out.push({
        kind: 'continuity',
        x,
        text: `v(${x}⁻) = v(${x}⁺),  v'(${x}⁻) = v'(${x}⁺)`,
        why: '이 자리에서 M(x) 식이 바뀌지만 보는 끊기지 않으니, 처짐과 기울기는 이어져야 해요',
      });
    });

  if (isSymmetric(L, supports, loads)) {
    out.push({
      kind: 'symmetry',
      x: L / 2,
      text: `v'(${f(L / 2)}) = 0`,
      why: '보와 하중이 좌우대칭이라 중앙에서는 기울기가 0이에요 — 절반만 풀어도 돼요',
    });
  }
  return out;
}

// 보와 하중이 중앙(L/2)에 대해 좌우대칭인지.
export function isSymmetric(L, supports, loads) {
  const near = (a, b) => Math.abs(a - b) < Math.max(L * 1e-6, 1e-9);
  // 거울에 비춘 항목마다 짝이 있으면 대칭. 거울 대칭은 두 번 적용하면 제자리라
  // 한쪽 방향만 확인해도 충분하다.
  const mirrored = (arr, mirror, same) => arr.every((a) => arr.some((b) => same(mirror(a), b)));

  // 지지단은 "회전까지 막느냐(고정단)"만 구분한다. 힌지와 롤러는 수평 구속만 다르고
  // 연직 처짐 문제에서는 같은 역할이라, 힌지-롤러 단순보도 대칭으로 본다.
  const rot = (t) => (t === 'fixed' ? 'fixed' : 'pinned');
  const supOk = mirrored(
    supports,
    (s) => ({ ...s, x: L - s.x }),
    (a, b) => rot(a.type) === rot(b.type) && near(a.x, b.x)
  );
  if (!supOk) return false;

  const loadOk = mirrored(
    loads,
    (l) => {
      if (l.kind === 'point') return { ...l, x: L - l.x };
      if (l.kind === 'moment') return { ...l, x: L - l.x, M0: -l.M0 };
      if (l.kind === 'udl') return { ...l, xStart: L - l.xEnd, xEnd: L - l.xStart };
      return { ...l, xStart: L - l.xEnd, xEnd: L - l.xStart, qStart: l.qEnd, qEnd: l.qStart };
    },
    (a, b) => {
      if (a.kind !== b.kind) return false;
      if (a.kind === 'point') return near(a.x, b.x) && Math.abs(a.P - b.P) < 1e-6 * Math.max(1, Math.abs(a.P));
      if (a.kind === 'moment') return near(a.x, b.x) && Math.abs(a.M0 - b.M0) < 1e-6 * Math.max(1, Math.abs(a.M0));
      if (a.kind === 'udl') return near(a.xStart, b.xStart) && near(a.xEnd, b.xEnd) && Math.abs(a.q - b.q) < 1e-6 * Math.max(1, Math.abs(a.q));
      return (
        near(a.xStart, b.xStart) && near(a.xEnd, b.xEnd) &&
        Math.abs(a.qStart - b.qStart) < 1e-6 * Math.max(1, Math.abs(a.qStart)) &&
        Math.abs(a.qEnd - b.qEnd) < 1e-6 * Math.max(1, Math.abs(a.qEnd))
      );
    }
  );
  return loadOk && (supports.length > 0 || loads.length > 0);
}
