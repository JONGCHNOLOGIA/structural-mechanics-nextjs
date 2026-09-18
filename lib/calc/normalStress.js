// CH.1-1 Normal Stress and Strain — 원본 프로토타입의 calculateNormalStress()를 그대로 옮긴 것.
// 계산식/검증 메시지/부호 규약 모두 원본과 동일하게 유지했다(인장 +, 압축 −).
import { LENGTH_UNITS, STRESS_UNITS, FORCE_UNITS, toBase } from './units1';

// 단면 형상별 단면적 A [m²] — 유효하지 않으면 NaN과 에러 메시지를 함께 돌려준다.
function crossSectionArea(sectionType, dims, dimUnit) {
  const errors = [];
  let A = NaN;

  if (sectionType === 'solid_circular') {
    if (!(dims.d > 0)) errors.push('직경(d)은 0보다 커야 합니다.');
    else A = (Math.PI / 4) * Math.pow(toBase(dims.d, dimUnit, LENGTH_UNITS), 2);
  } else if (sectionType === 'hollow_circular') {
    const dOut = dims.d_outer, dIn = dims.d_inner;
    if (!(dOut > 0)) errors.push('외경(d₂)은 0보다 커야 합니다.');
    if (!(dIn > 0)) errors.push('내경(d₁)은 0보다 커야 합니다.');
    if (dOut > 0 && dIn > 0 && dIn >= dOut) errors.push('내경(d₁)은 외경(d₂)보다 작아야 합니다.');
    if (dOut > 0 && dIn > 0 && dIn < dOut) {
      const DO = toBase(dOut, dimUnit, LENGTH_UNITS);
      const DI = toBase(dIn, dimUnit, LENGTH_UNITS);
      A = (Math.PI / 4) * (DO * DO - DI * DI);
    }
  } else {
    if (!(dims.b > 0)) errors.push('폭(b)은 0보다 커야 합니다.');
    if (!(dims.h > 0)) errors.push('높이(h)는 0보다 커야 합니다.');
    if (dims.b > 0 && dims.h > 0) {
      A = toBase(dims.b, dimUnit, LENGTH_UNITS) * toBase(dims.h, dimUnit, LENGTH_UNITS);
    }
  }
  return { A, errors };
}

export function computeNormalStress(s) {
  const { A: A_m2, errors } = crossSectionArea(s.sectionType, s.dims, s.dimUnit);

  if (!(s.L > 0)) errors.push('부재 길이(L)는 0보다 커야 합니다.');
  if (!(s.E > 0)) errors.push('탄성계수(E)는 0보다 커야 합니다.');
  if (!(s.P >= 0)) errors.push('하중(P)의 크기는 0 이상이어야 합니다.');

  const L_m = toBase(s.L, s.LUnit, LENGTH_UNITS);
  const E_Pa = toBase(s.E, s.EUnit, STRESS_UNITS);
  const sign = s.mode === 'tension' ? 1 : -1;
  const P_N = sign * toBase(s.P, s.PUnit, FORCE_UNITS);

  const valid =
    errors.length === 0 && isFinite(A_m2) && A_m2 > 0 && isFinite(L_m) && L_m > 0 && isFinite(E_Pa) && E_Pa > 0;
  if (!valid) return { valid: false, errors };

  const sigma_Pa = P_N / A_m2; // σ = P/A
  const epsilon = sigma_Pa / E_Pa; // ε = σ/E (Hooke)
  const delta_m = epsilon * L_m; // δ = εL

  return { valid: true, A_m2, sigma_Pa, epsilon, delta_m, sign, E_Pa, L_m };
}
