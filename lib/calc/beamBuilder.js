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

// ---------------- 처짐 v(x): M(x)/EI를 수치적으로 두 번 적분 후, 지지조건으로 적분상수 결정 ----------------
export function solveBeam(L, supports, loads, EI, N = 400) {
  const determinacy = checkDeterminacy(supports);
  if (determinacy !== 'determinate') return { determinacy };

  const supportsR = solveReactions(L, supports, loads);
  if (!supportsR) return { determinacy: 'unstable' };

  const xs = [];
  const Ms = [];
  for (let i = 0; i <= N; i++) {
    const x = (L * i) / N;
    xs.push(x);
    Ms.push(momentAt(x, supportsR, loads));
  }

  // 수치 누적적분 (사다리꼴) — v1: 처짐각의 "원시함수"(v'(0)=0 가정), v0: 처짐의 "원시함수"(v(0)=0 가정)
  // v(양수=아래로) 규약에서는 EIv'' = -M(x) 관계가 성립 (M(x) 자체는 Gere 부호 규약 그대로 유지).
  const v1 = new Array(N + 1).fill(0); // ∫ -M/EI dx
  const v0 = new Array(N + 1).fill(0); // ∫ v1 dx
  for (let i = 1; i <= N; i++) {
    const dx = xs[i] - xs[i - 1];
    v1[i] = v1[i - 1] + ((-Ms[i - 1] - Ms[i]) / 2 / EI) * dx;
  }
  for (let i = 1; i <= N; i++) {
    const dx = xs[i] - xs[i - 1];
    v0[i] = v0[i - 1] + ((v1[i - 1] + v1[i]) / 2) * dx;
  }

  const sampleAt = (arr, x) => {
    const idx = Math.min(N - 1, Math.max(0, Math.floor((x / L) * N)));
    const x0 = xs[idx], x1 = xs[idx + 1];
    const t = x1 > x0 ? (x - x0) / (x1 - x0) : 0;
    return arr[idx] + (arr[idx + 1] - arr[idx]) * t;
  };

  // 경계조건: 지지단마다 v=0 (+고정단이면 slope=0도) → C1,C2에 대한 선형방정식
  const rows = []; // each: [coeffC1, coeffC2, rhs]  (rhs = -known part)
  supportsR.forEach((sup) => {
    const v0s = sampleAt(v0, sup.x);
    rows.push([sup.x, 1, -v0s]); // v0(x)+C1*x+C2=0
    if (sup.type === 'fixed') {
      const v1s = sampleAt(v1, sup.x);
      rows.push([1, 0, -v1s]); // v1(x)+C1=0
    }
  });

  if (rows.length !== 2) return { determinacy: 'unstable' };
  const [r0, r1] = rows;
  const det = r0[0] * r1[1] - r0[1] * r1[0];
  if (Math.abs(det) < EPS) return { determinacy: 'unstable' };
  const C1 = (r0[2] * r1[1] - r0[1] * r1[2]) / det;
  const C2 = (r0[0] * r1[2] - r0[2] * r1[0]) / det;

  const pts = xs.map((x, i) => ({ x, M: Ms[i], v: v0[i] + C1 * x + C2, slope: v1[i] + C1 }));

  return { determinacy: 'determinate', supports: supportsR, pts, EI };
}
