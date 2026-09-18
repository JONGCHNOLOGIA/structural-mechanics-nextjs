// CH.2-2 Nonuniform (Multi-Segment) Bar — 원본 calculateMultiSegment()를 그대로 옮긴 것.
// 왼쪽 끝은 고정단(반력 R은 전체 평형으로 결정), 오른쪽 끝은 자유단이고,
// 각 구간의 "오른쪽 끝 경계"에 외력이 작용한다(오른쪽 방향이 +).
import { LENGTH_UNITS, STRESS_UNITS, FORCE_UNITS, AREA_UNITS, toBase } from './units1';

export function computeMultiSegment(state) {
  const errors = [];
  const active = state.segs.slice(0, state.segCount);

  active.forEach((s, i) => {
    if (!(s.L > 0)) errors.push(`구간 ${i + 1}: 길이(L)는 0보다 커야 합니다.`);
    if (!(s.A > 0)) errors.push(`구간 ${i + 1}: 단면적(A)은 0보다 커야 합니다.`);
    if (!(s.E > 0)) errors.push(`구간 ${i + 1}: 탄성계수(E)는 0보다 커야 합니다.`);
  });
  if (errors.length) return { valid: false, errors };

  const loads_N = active.map((s) => toBase(s.load, s.loadUnit, FORCE_UNITS));
  const R_N = -loads_N.reduce((a, b) => a + b, 0); // ΣFx=0 으로 고정단 반력 결정

  let cum = R_N;
  let total = 0;
  const perSeg = active.map((s, i) => {
    const N_N = cum; // 이 구간까지 지나온 힘의 합 = 이 구간의 내력
    cum += loads_N[i]; // 구간 오른쪽 경계의 외력을 통과
    const L_m = toBase(s.L, s.LUnit, LENGTH_UNITS);
    const A_m2 = toBase(s.A, s.AUnit, AREA_UNITS);
    const E_Pa = toBase(s.E, s.EUnit, STRESS_UNITS);
    const d = (N_N * L_m) / (E_Pa * A_m2); // δᵢ = NᵢLᵢ/(EᵢAᵢ)
    total += d;
    return { N_N, L_m, A_m2, E_Pa, delta_m: d, loadHere_N: loads_N[i] };
  });

  // 마지막 하중까지 지나면 자유단이므로 0이어야 한다 (평형 검산용)
  const finalCheck_N = cum;
  return { valid: true, perSeg, delta_total_m: total, R_N, finalCheck_N };
}
