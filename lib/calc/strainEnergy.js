// 캔틸레버(고정단 A, 자유단 B)에 P와 M0가 동시에(또는 하나만) 작용할 때의 굽힘 변형에너지.
// s: 자유단 B로부터 잰 거리 (0~L). M(s) = -(P*s + M0)
export function bendingStrainEnergy(L, P, M0, EI) {
  const U = (P ** 2 * L ** 3) / 3 + P * M0 * L ** 2 + M0 ** 2 * L;
  return U / (2 * EI);
}
