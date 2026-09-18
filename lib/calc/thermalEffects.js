// CH.2-4 Thermal Effects and Prestrain — 원본 calculateThermal()을 그대로 옮긴 것.
// mode: 'free'(자유 팽창/수축, 응력 0) | 'restrained'(양단 완전구속, 길이변화 0 대신 열응력 발생)
import { LENGTH_UNITS, STRESS_UNITS, AREA_UNITS, toBase } from './units1';

export function computeThermal(s) {
  const errors = [];
  if (!(s.L > 0)) errors.push('부재 길이(L)는 0보다 커야 합니다.');
  if (!isFinite(s.alpha)) errors.push('열팽창계수(α)가 올바르지 않습니다.');
  if (!isFinite(s.deltaT)) errors.push('온도변화(ΔT)가 올바르지 않습니다.');
  if (s.mode === 'restrained') {
    if (!(s.E > 0)) errors.push('탄성계수(E)는 0보다 커야 합니다.');
    if (!(s.A > 0)) errors.push('단면적(A)은 0보다 커야 합니다.');
  }
  if (errors.length) return { valid: false, errors };

  const L_m = toBase(s.L, s.LUnit, LENGTH_UNITS);
  const epsT = s.alpha * s.deltaT;

  if (s.mode === 'free') {
    return { valid: true, epsT, deltaDisp_m: epsT * L_m, sigmaT_Pa: 0, N_T: 0 };
  }

  // 완전 구속이면 늘어나려는 만큼을 그대로 눌러야 하므로 부호가 반대인 응력이 생긴다.
  const E_Pa = toBase(s.E, s.EUnit, STRESS_UNITS);
  const A_m2 = toBase(s.A, s.AUnit, AREA_UNITS);
  const sigmaT = -E_Pa * epsT;
  return { valid: true, epsT, deltaDisp_m: 0, sigmaT_Pa: sigmaT, N_T: sigmaT * A_m2 };
}
