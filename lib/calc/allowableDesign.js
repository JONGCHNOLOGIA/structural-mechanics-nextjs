// CH.1-5 Allowable Stresses and Design — 원본 calculateAllowableDesign()를 그대로 옮긴 것.
// mode: 'A'(안전성 판정) | 'B'(허용하중 P_allow) | 'C'(필요 단면적/치수 역산)
import { LENGTH_UNITS, STRESS_UNITS, FORCE_UNITS, toBase } from './units1';

// 단면 형상별 면적 — CH.1-1의 것과 같은 규칙이지만, 이쪽은 Mode C에서 일부 치수만 쓰기 때문에
// 원본에서도 별도 함수(sectionAreaCalc)로 두고 있어서 그대로 옮겼다.
export function sectionArea(sectionType, dims, dimUnit) {
  const errors = [];
  let A_m2 = NaN;
  if (sectionType === 'solid_circular') {
    if (!(dims.d > 0)) errors.push('직경(d)은 0보다 커야 합니다.');
    else A_m2 = (Math.PI / 4) * Math.pow(toBase(dims.d, dimUnit, LENGTH_UNITS), 2);
  } else if (sectionType === 'hollow_circular') {
    const dO = dims.d_outer, dI = dims.d_inner;
    if (!(dO > 0)) errors.push('외경(d₂)은 0보다 커야 합니다.');
    if (!(dI > 0)) errors.push('내경(d₁)은 0보다 커야 합니다.');
    if (dO > 0 && dI > 0 && dI >= dO) errors.push('내경(d₁)은 외경(d₂)보다 작아야 합니다.');
    if (dO > 0 && dI > 0 && dI < dO) {
      const DO = toBase(dO, dimUnit, LENGTH_UNITS), DI = toBase(dI, dimUnit, LENGTH_UNITS);
      A_m2 = (Math.PI / 4) * (DO * DO - DI * DI);
    }
  } else {
    if (!(dims.b > 0)) errors.push('폭(b)은 0보다 커야 합니다.');
    if (!(dims.h > 0)) errors.push('높이(h)는 0보다 커야 합니다.');
    if (dims.b > 0 && dims.h > 0) A_m2 = toBase(dims.b, dimUnit, LENGTH_UNITS) * toBase(dims.h, dimUnit, LENGTH_UNITS);
  }
  return { A_m2, errors };
}

// 허용응력은 직접 입력하거나, 파괴강도를 안전율로 나눠서 얻는다.
function resolveAllowableStress(s) {
  const errors = [];
  let sigma_allow_Pa;
  if (s.useFOS) {
    if (!(s.failureStrength > 0)) errors.push('파괴강도(failure strength)는 0보다 커야 합니다.');
    if (!(s.n > 0)) errors.push('안전율(n)은 0보다 커야 합니다.');
    sigma_allow_Pa = s.failureStrength > 0 && s.n > 0 ? toBase(s.failureStrength, s.stressUnit, STRESS_UNITS) / s.n : NaN;
  } else {
    if (!(s.sigmaAllow > 0)) errors.push('허용응력(σ_allow)은 0보다 커야 합니다.');
    sigma_allow_Pa = toBase(s.sigmaAllow, s.stressUnit, STRESS_UNITS);
  }
  return { sigma_allow_Pa, errors };
}

export function computeAllowableDesign(s) {
  const { sigma_allow_Pa, errors: e1 } = resolveAllowableStress(s);
  let errors = [...e1];

  if (s.mode === 'A') {
    const { A_m2, errors: e2 } = sectionArea(s.sectionType, s.dims, s.dimUnit);
    errors = errors.concat(e2);
    if (!(s.P >= 0)) errors.push('하중(P)의 크기는 0 이상이어야 합니다.');
    const valid = errors.length === 0 && A_m2 > 0 && isFinite(sigma_allow_Pa) && sigma_allow_Pa > 0;
    if (!valid) return { valid: false, errors };
    const P_N = toBase(s.P, s.PUnit, FORCE_UNITS);
    const sigma_actual_Pa = P_N / A_m2;
    return {
      valid: true,
      A_m2,
      sigma_actual_Pa,
      sigma_allow_Pa,
      ratio: sigma_actual_Pa / sigma_allow_Pa,
      safe: sigma_actual_Pa <= sigma_allow_Pa,
    };
  }

  if (s.mode === 'B') {
    const { A_m2, errors: e2 } = sectionArea(s.sectionType, s.dims, s.dimUnit);
    errors = errors.concat(e2);
    const valid = errors.length === 0 && A_m2 > 0 && isFinite(sigma_allow_Pa) && sigma_allow_Pa > 0;
    if (!valid) return { valid: false, errors };
    return { valid: true, A_m2, sigma_allow_Pa, P_allow_N: sigma_allow_Pa * A_m2 };
  }

  // Mode C — 필요한 단면적을 먼저 구하고, 형상별로 역산할 치수를 하나씩 뽑는다.
  if (!(s.P >= 0)) errors.push('하중(P)의 크기는 0 이상이어야 합니다.');
  const valid0 = errors.length === 0 && isFinite(sigma_allow_Pa) && sigma_allow_Pa > 0;
  if (!valid0) return { valid: false, errors };

  const P_N = toBase(s.P, s.PUnit, FORCE_UNITS);
  const A_required_m2 = P_N / sigma_allow_Pa;
  const result = { valid: true, A_required_m2, sigma_allow_Pa };

  if (s.sectionType === 'solid_circular') {
    result.d_required_m = Math.sqrt((4 * A_required_m2) / Math.PI);
  } else if (s.sectionType === 'hollow_circular') {
    const dO_m = toBase(s.dims.d_outer, s.dimUnit, LENGTH_UNITS);
    if (!(dO_m > 0)) return { valid: false, errors: ['외경(d₂)은 0보다 커야 합니다.'] };
    const inside = dO_m * dO_m - (4 * A_required_m2) / Math.PI;
    if (inside < 0) return { valid: false, errors: ['외경이 너무 작아 필요한 단면적을 만들 수 없습니다. 외경을 늘려주세요.'] };
    result.d_inner_required_m = Math.sqrt(inside);
  } else {
    const b_m = toBase(s.dims.b, s.dimUnit, LENGTH_UNITS);
    if (!(b_m > 0)) return { valid: false, errors: ['폭(b)은 0보다 커야 합니다.'] };
    result.h_required_m = A_required_m2 / b_m;
  }
  return result;
}
