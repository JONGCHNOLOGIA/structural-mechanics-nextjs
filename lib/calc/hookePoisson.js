// CH.1-3 Hooke's Law and Poisson's Ratio — 원본 calculateHookePoisson()를 그대로 옮긴 것.
// mode: 'load'(P와 A로 σ를 구함) | 'stress'(σ를 직접 입력)
import { LENGTH_UNITS, STRESS_UNITS, FORCE_UNITS, AREA_UNITS, toBase } from './units1';

export function computeHookePoisson(s) {
  const errors = [];
  if (!(s.E > 0)) errors.push('탄성계수(E)는 0보다 커야 합니다.');
  if (!(s.L > 0)) errors.push('초기 길이(L)는 0보다 커야 합니다.');
  if (!(s.w > 0)) errors.push('초기 폭/직경(w)은 0보다 커야 합니다.');
  if (!(s.nu > -1 && s.nu <= 0.5)) errors.push("Poisson's ratio(ν)는 -1과 0.5 사이여야 합니다.");

  let A_m2 = NaN;
  if (s.mode === 'load') {
    if (!(s.A > 0)) errors.push('단면적(A)은 0보다 커야 합니다.');
    else A_m2 = toBase(s.A, s.AUnit, AREA_UNITS);
  }
  if (s.mode === 'stress' && !(s.sigma >= 0)) errors.push('응력 크기는 0 이상이어야 합니다.');
  if (s.mode === 'load' && !(s.P >= 0)) errors.push('하중(P)의 크기는 0 이상이어야 합니다.');

  const E_Pa = toBase(s.E, s.EUnit, STRESS_UNITS);
  const L_m = toBase(s.L, s.LUnit, LENGTH_UNITS);
  const w_m = toBase(s.w, s.wUnit, LENGTH_UNITS);
  const sign = s.T === 'tension' ? 1 : -1;

  const valid =
    errors.length === 0 &&
    isFinite(E_Pa) && E_Pa > 0 &&
    isFinite(L_m) && L_m > 0 &&
    isFinite(w_m) && w_m > 0 &&
    (s.mode !== 'load' || (isFinite(A_m2) && A_m2 > 0));
  if (!valid) return { valid: false, errors };

  const sigma_Pa =
    s.mode === 'load'
      ? (sign * toBase(s.P, s.PUnit, FORCE_UNITS)) / A_m2
      : sign * toBase(s.sigma, s.sigmaUnit, STRESS_UNITS);

  const epsLong = sigma_Pa / E_Pa; // ε = σ/E
  const epsLat = -s.nu * epsLong; // 횡방향은 부호가 반대 (Poisson 효과)
  const deltaL_m = epsLong * L_m;
  const deltaW_m = epsLat * w_m;

  return { valid: true, sigma_Pa, epsLong, epsLat, deltaL_m, deltaW_m, A_m2, E_Pa, L_m, w_m, sign };
}
