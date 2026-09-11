// Ch9 처짐(Deflection of Beams) 계산기들이 공유하는 순수 함수 모음.
// 표준 보 처짐 공식 (Gere & Goodno, Mechanics of Materials). 모든 값은 SI 단위(m, N, Pa) 기준.
// v: 처짐(양수=아래로), slope: 처짐각(rad)

// ---------------- 단순보 (Simply Supported) ----------------

// 등분포하중 q, 전체 스팬에 작용
export function ssUDL(x, L, q, EI) {
  const v = ((q * x) / (24 * EI)) * (L ** 3 - 2 * L * x ** 2 + x ** 3);
  const slope = (q / (24 * EI)) * (L ** 3 - 6 * L * x ** 2 + 4 * x ** 3);
  return { v, slope };
}
export function ssUDLmax(L, q, EI) {
  return { thetaA: (q * L ** 3) / (24 * EI), deltaMax: (5 * q * L ** 4) / (384 * EI) };
}

// 집중하중 P, 왼쪽 지점에서 a만큼 떨어진 위치에 작용 (b = L-a)
export function ssPointLoad(x, L, a, P, EI) {
  const b = L - a;
  if (x <= a) {
    return { v: ((P * b * x) / (6 * L * EI)) * (L ** 2 - b ** 2 - x ** 2) };
  }
  const xp = L - x;
  return { v: ((P * a * xp) / (6 * L * EI)) * (L ** 2 - a ** 2 - xp ** 2) };
}
export function ssPointLoadInfo(L, a, P, EI) {
  const b = L - a;
  return {
    thetaA: (P * b * (L ** 2 - b ** 2)) / (6 * L * EI),
    thetaB: (P * a * (L ** 2 - a ** 2)) / (6 * L * EI),
    deltaAtLoad: (P * a ** 2 * b ** 2) / (3 * L * EI),
  };
}

// ---------------- 캔틸레버 (Cantilever, 고정단 x=0, 자유단 x=L) ----------------

// 등분포하중 q
export function cantileverUDL(x, L, q, EI) {
  const v = (q / (24 * EI)) * (x ** 4 - 4 * L * x ** 3 + 6 * L ** 2 * x ** 2);
  const slope = (q / (6 * EI)) * (x ** 3 - 3 * L * x ** 2 + 3 * L ** 2 * x);
  return { v, slope };
}
export function cantileverUDLmax(L, q, EI) {
  return { thetaB: (q * L ** 3) / (6 * EI), deltaB: (q * L ** 4) / (8 * EI) };
}

// 자유단 집중하중 P
export function cantileverPointLoad(x, L, P, EI) {
  const v = ((P * x ** 2) / (6 * EI)) * (3 * L - x);
  const slope = ((P * x) / (2 * EI)) * (2 * L - x);
  return { v, slope };
}
export function cantileverPointLoadMax(L, P, EI) {
  return { thetaB: (P * L ** 2) / (2 * EI), deltaB: (P * L ** 3) / (3 * EI) };
}

// 자유단 모멘트 M0
export function cantileverMoment(x, L, M0, EI) {
  const v = (M0 * x ** 2) / (2 * EI);
  const slope = (M0 * x) / EI;
  return { v, slope };
}
export function cantileverMomentMax(L, M0, EI) {
  return { thetaB: (M0 * L) / EI, deltaB: (M0 * L ** 2) / (2 * EI) };
}
