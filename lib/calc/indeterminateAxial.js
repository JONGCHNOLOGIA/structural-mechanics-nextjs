// CH.2-3 Statically Indeterminate Axial Members — 원본 calculateIndeterminate()를 그대로 옮긴 것.
// mode: 'fixedBar'(양단고정 부재 + 중간하중) | 'rigidBeam'(강체보 + 탄성기둥 지지)
import { LENGTH_UNITS, STRESS_UNITS, FORCE_UNITS, AREA_UNITS, toBase } from './units1';

export function computeIndeterminate(s) {
  const errors = [];

  if (s.mode === 'fixedBar') {
    if (!(s.a > 0)) errors.push('a는 0보다 커야 합니다.');
    if (!(s.b > 0)) errors.push('b는 0보다 커야 합니다.');
    if (!(s.A > 0)) errors.push('단면적(A)은 0보다 커야 합니다.');
    if (!(s.E > 0)) errors.push('탄성계수(E)는 0보다 커야 합니다.');
    if (!(s.P >= 0)) errors.push('하중(P)의 크기는 0 이상이어야 합니다.');
    if (errors.length) return { valid: false, errors };

    const a_m = toBase(s.a, s.LUnit, LENGTH_UNITS);
    const b_m = toBase(s.b, s.LUnit, LENGTH_UNITS);
    const L_m = a_m + b_m;
    const A_m2 = toBase(s.A, s.AUnit, AREA_UNITS);
    const E_Pa = toBase(s.E, s.EUnit, STRESS_UNITS);
    const P_N = toBase(s.P, s.PUnit, FORCE_UNITS);

    // 평형식만으로는 못 풀고(미지수 2개, 식 1개), 적합조건 δ_AC+δ_CB=0을 더해야 나오는 결과
    const R_A = (P_N * b_m) / L_m;
    const R_B = (P_N * a_m) / L_m;
    const N_AC = R_A;
    const N_CB = -R_B;
    const delta_C = (N_AC * a_m) / (E_Pa * A_m2);

    return { valid: true, mode: 'fixedBar', a_m, b_m, L_m, R_A, R_B, N_AC, N_CB, delta_C, A_m2, E_Pa };
  }

  if (!(s.rbB > 0)) errors.push('기둥 위치(b)는 0보다 커야 합니다.');
  if (!(s.rbL > s.rbB)) errors.push('하중 위치(L)는 기둥 위치(b)보다 커야 합니다.');
  if (!(s.rbP >= 0)) errors.push('하중(P)의 크기는 0 이상이어야 합니다.');
  if (!(s.rbEc > 0)) errors.push('기둥 탄성계수(E)는 0보다 커야 합니다.');
  if (!(s.rbAc > 0)) errors.push('기둥 단면적(A)은 0보다 커야 합니다.');
  if (!(s.rbLc > 0)) errors.push('기둥 길이(L)는 0보다 커야 합니다.');
  if (errors.length) return { valid: false, errors };

  const b_m = toBase(s.rbB, s.LUnit, LENGTH_UNITS);
  const L_m = toBase(s.rbL, s.LUnit, LENGTH_UNITS);
  const P_N = toBase(s.rbP, s.rbPUnit, FORCE_UNITS);
  const Ec_Pa = toBase(s.rbEc, s.rbEcUnit, STRESS_UNITS);
  const Ac_m2 = toBase(s.rbAc, s.rbAcUnit, AREA_UNITS);
  const Lc_m = toBase(s.rbLc, s.rbLcUnit, LENGTH_UNITS);

  const F_B = (P_N * L_m) / b_m; // ΣM_A=0
  const A_y = P_N - F_B; // ΣFy=0 (음수면 핀이 아래로 당김)
  const delta_B = (F_B * Lc_m) / (Ec_Pa * Ac_m2); // 기둥 축변형
  const delta_C = delta_B * (L_m / b_m); // 보가 강체라 변위가 거리에 비례(닮음비)

  return { valid: true, mode: 'rigidBeam', b_m, L_m, F_B, A_y, delta_B, delta_C, Ec_Pa, Ac_m2, Lc_m, P_N };
}
