// CH.2-1 Spring Constant and Flexibility — 원본 calculateSpring()을 그대로 옮긴 것.
// 축방향 부재를 스프링으로 보면 k = EA/L, f = 1/k, δ = P/k 가 된다.
import { LENGTH_UNITS, STRESS_UNITS, FORCE_UNITS, AREA_UNITS, toBase } from './units1';

export function computeSpringConstant(s) {
  const errors = [];
  if (!(s.A > 0)) errors.push('단면적(A)은 0보다 커야 합니다.');
  if (!(s.L > 0)) errors.push('부재 길이(L)는 0보다 커야 합니다.');
  if (!(s.E > 0)) errors.push('탄성계수(E)는 0보다 커야 합니다.');
  if (!(s.P >= 0)) errors.push('하중(P)의 크기는 0 이상이어야 합니다.');
  if (errors.length) return { valid: false, errors };

  const A_m2 = toBase(s.A, s.AUnit, AREA_UNITS);
  const L_m = toBase(s.L, s.LUnit, LENGTH_UNITS);
  const E_Pa = toBase(s.E, s.EUnit, STRESS_UNITS);
  const sign = s.mode === 'tension' ? 1 : -1;
  const P_N = sign * toBase(s.P, s.PUnit, FORCE_UNITS);

  const k = (E_Pa * A_m2) / L_m; // 축강성 [N/m]
  const f = 1 / k; // 유연도 [m/N]
  const delta_m = P_N / k;

  // 같은 k에서 하중만 바꾸면 변위가 정비례한다는 걸 보여주기 위한 비교값
  const P2_N = sign * toBase(s.P2, s.P2Unit, FORCE_UNITS);
  const delta2_m = P2_N / k;

  return { valid: true, k, f, delta_m, sign, delta2_m, A_m2, L_m, E_Pa };
}
