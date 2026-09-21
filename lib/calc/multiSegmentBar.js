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
    // 절단법: 왼쪽 자유물체(반력 + 지금까지 지나온 외력)에 내력 N이 절단면에서
    // +x 방향(인장 관례)으로 걸린다고 두면 평형은 cum + N = 0 → N = −cum이다.
    // (cum을 그대로 N으로 쓰면 부호가 거꾸로 나온다 — 자유단을 밖으로 당기는
    // 하중을 줘도 압축·수축으로 계산되던 버그를 여기서 고쳤다. 자유단에 P만
    // 준 가장 단순한 경우로 검산: N = +P(인장), δ = +PL/EA(늘어남)가 나와야
    // 맞는데, 고치기 전에는 N = −P, δ가 음수로 나왔었다.)
    const N_N = -cum; // 이 구간의 내력 (+인장/−압축)
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
