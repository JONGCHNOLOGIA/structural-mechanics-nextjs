// Ch10 부정정보(Statically Indeterminate Beams) 계산기들이 공유하는 순수 함수.
// 표준 공식 (Gere & Goodno). SI 단위(m, N, Pa) 기준. v: 처짐(아래로 +)

// ---------------- 돌출 캔틸레버(Propped Cantilever), A=고정단, B=롤러, 등분포하중 q ----------------
// 여분력(redundant)으로 RB를 선택하든 MA를 선택하든 같은 결과가 나옴.
export function proppedCantileverUDL(L, q, EI) {
  const RB = (3 * q * L) / 8;
  const RA = (5 * q * L) / 8;
  const MA = (q * L ** 2) / 8;
  return { RA, RB, MA };
}

export function proppedCantileverUDLCurve(x, L, q, EI) {
  const { RA, MA } = proppedCantileverUDL(L, q, EI);
  // EIv'' = RA*x - MA - q*x^2/2, v(0)=v'(0)=0 로 두 번 적분
  const v = ((5 * q * L) / 48) * x ** 3 - (MA / 2) * x ** 2 - (q / 24) * x ** 4;
  return v / EI;
}

// ---------------- 양단고정(Fixed-Fixed), 중앙 집중하중 P ----------------
export function fixedFixedCenterLoad(L, P, EI) {
  const MA = (P * L) / 8;
  return { MA, MB: MA, RA: P / 2, RB: P / 2 };
}

export function fixedFixedCenterLoadCurve(x, L, P, EI) {
  const xx = x <= L / 2 ? x : L - x; // 대칭
  const v = (P * xx ** 2 * (3 * L - 4 * xx)) / (48 * EI);
  return v;
}

// ---------------- 단위하중법(Method of Superposition)으로 여분력 구하기 ----------------

// (a) RB를 여분력으로: released structure = 고정단 A만 남은 캔틸레버.
// deltaB: 실제하중(q)에 의한 B의 처짐, deltaBB: B에 단위하중 1일 때 B의 처짐
export function releaseAtB(L, q, EI) {
  const deltaB = (q * L ** 4) / (8 * EI);
  const deltaBB = L ** 3 / (3 * EI);
  const RB = deltaB / deltaBB;
  return { deltaB, deltaBB, RB };
}

// (b) MA를 여분력으로: released structure = 양 끝 핀-롤러인 단순보.
// thetaA: 실제하중(q)에 의한 A의 처짐각, thetaAA: A에 단위모멘트 1일 때 A의 처짐각
export function releaseAtA(L, q, EI) {
  const thetaA = (q * L ** 3) / (24 * EI);
  const thetaAA = L / (3 * EI);
  const MA = thetaA / thetaAA;
  return { thetaA, thetaAA, MA };
}
