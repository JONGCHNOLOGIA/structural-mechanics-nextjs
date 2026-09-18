// CH.5 보의 응력 — 원본의 calculateFlexure / calculateSectionModulus / calculateShearRect /
// calculateShearCircularOrFlow / calculateCombined를 옮긴 것.
// 부호규약은 CH.4와 같다: 굽힘모멘트 M은 아래로 볼록(sagging)이 +, 단면 위쪽이 +y.
import {
  LENGTH_UNITS,
  FORCE_UNITS,
  STRESS_UNITS,
  TORQUE_UNITS,
  VOLUME3_UNITS,
  IN4_UNITS,
  toBase,
  Irect,
  Icircle,
} from './units1';

/* --------------------------- CH.5-1 굽힘공식 --------------------------- */
export function computeFlexure(s) {
  const errors = [];
  let I = NaN;
  let c = NaN;

  if (s.sectionType === 'rectangular') {
    if (!(s.dims.b > 0)) errors.push('폭(b)은 0보다 커야 합니다.');
    if (!(s.dims.h > 0)) errors.push('높이(h)는 0보다 커야 합니다.');
    if (s.dims.b > 0 && s.dims.h > 0) {
      const b = toBase(s.dims.b, s.dimUnit, LENGTH_UNITS);
      const h = toBase(s.dims.h, s.dimUnit, LENGTH_UNITS);
      I = Irect(b, h);
      c = h / 2;
    }
  } else {
    if (!(s.dims.d > 0)) errors.push('직경(d)은 0보다 커야 합니다.');
    else {
      const d = toBase(s.dims.d, s.dimUnit, LENGTH_UNITS);
      I = Icircle(d);
      c = d / 2;
    }
  }
  if (!(s.E > 0)) errors.push('탄성계수(E)는 0보다 커야 합니다.');
  if (errors.length || !(I > 0)) return { valid: false, errors };

  const M_Nm = toBase(s.M, s.MUnit, TORQUE_UNITS);
  const E_Pa = toBase(s.E, s.EUnit, STRESS_UNITS);

  const sigmaMax = (M_Nm * c) / I;
  // σ = −M·y/I (y는 위쪽이 +) → sagging(+M)이면 상단은 압축, 하단은 인장
  const sigmaTop = -sigmaMax;
  const sigmaBottom = sigmaMax;
  const kappa = M_Nm / (E_Pa * I); // 곡률 1/ρ
  const epsilonMax = c * kappa;

  return { valid: true, I, c, sigmaMax, sigmaTop, sigmaBottom, kappa, epsilonMax };
}

/* ----------------------- CH.5-2 단면계수와 단면설계 ----------------------- */
export function computeSectionModulus(s) {
  const errors = [];
  if (!(s.sigmaAllow > 0)) errors.push('허용응력(σ_allow)은 0보다 커야 합니다.');
  if (!(s.M >= 0)) errors.push('굽힘모멘트(M)의 크기는 0 이상이어야 합니다.');
  if (s.sectionType === 'rectangular' && !(s.bFixed > 0)) errors.push('고정 폭(b)은 0보다 커야 합니다.');
  if (errors.length) return { valid: false, errors };

  const M_Nm = toBase(s.M, s.MUnit, TORQUE_UNITS);
  const sigmaAllow_Pa = toBase(s.sigmaAllow, s.sigmaAllowUnit, STRESS_UNITS);
  const S_required = M_Nm / sigmaAllow_Pa; // σ_allow = M/S 에서 역산

  let h_required;
  let d_required;
  if (s.sectionType === 'rectangular') {
    const b_m = toBase(s.bFixed, s.dimUnit, LENGTH_UNITS);
    h_required = Math.sqrt((6 * S_required) / b_m); // S = bh²/6
  } else {
    d_required = Math.pow((32 * S_required) / Math.PI, 1 / 3); // S = πd³/32
  }
  return { valid: true, S_required, h_required, d_required };
}

/* --------------------- CH.5-3 직사각형 단면의 전단응력 --------------------- */
export function computeShearRect(s) {
  const errors = [];
  if (!(s.b > 0)) errors.push('폭(b)은 0보다 커야 합니다.');
  if (!(s.h > 0)) errors.push('높이(h)는 0보다 커야 합니다.');
  if (!(s.V >= 0)) errors.push('전단력(V)의 크기는 0 이상이어야 합니다.');
  if (errors.length) return { valid: false, errors };

  const b = toBase(s.b, s.dimUnit, LENGTH_UNITS);
  const h = toBase(s.h, s.dimUnit, LENGTH_UNITS);
  const V = toBase(s.V, s.VUnit, FORCE_UNITS);
  const I = Irect(b, h);
  const A = b * h;

  const tauMax = (1.5 * V) / A; // 직사각형 특수해
  // 같은 값을 일반식 τ=VQ/(Ib)로도 구해서 검산에 쓴다 (중립축의 Q = b·(h/2)·(h/4))
  const Q_na = b * (h / 2) * (h / 4);
  const tauMaxCheck = (V * Q_na) / (I * b);

  return { valid: true, I, A, Q_na, tauMax, tauMaxCheck, b, h, V };
}

/* ------------ CH.5-4 원형 단면 전단응력 / 조립보의 전단흐름 ------------ */
export function computeShearCircularOrFlow(s) {
  const errors = [];
  if (s.mode === 'circular') {
    if (!(s.d > 0)) errors.push('직경(d)은 0보다 커야 합니다.');
    if (!(s.V >= 0)) errors.push('전단력(V)의 크기는 0 이상이어야 합니다.');
    if (errors.length) return { valid: false, errors };

    const d = toBase(s.d, s.dimUnit, LENGTH_UNITS);
    const V = toBase(s.V, s.VUnit, FORCE_UNITS);
    const I = Icircle(d);
    const A = (Math.PI / 4) * d * d;
    const tauMax = (4 * V) / (3 * A); // 원형 특수해
    return { valid: true, mode: 'circular', I, A, tauMax };
  }

  if (!(s.V >= 0)) errors.push('전단력(V)의 크기는 0 이상이어야 합니다.');
  if (!(s.Q > 0)) errors.push('단면1차모멘트(Q)는 0보다 커야 합니다.');
  if (!(s.I > 0)) errors.push('단면2차모멘트(I)는 0보다 커야 합니다.');
  if (!(s.Fallow > 0)) errors.push('체결재 허용하중(F_allow)은 0보다 커야 합니다.');
  if (errors.length) return { valid: false, errors };

  const V = toBase(s.V, s.VUnit, FORCE_UNITS);
  const Q = toBase(s.Q, s.QUnit, VOLUME3_UNITS);
  const I = toBase(s.I, s.IUnit, IN4_UNITS);
  const q = (V * Q) / I; // 전단흐름 [N/m]
  const Fallow_N = toBase(s.Fallow, s.FallowUnit, FORCE_UNITS);
  const spacing = Fallow_N / q; // 체결재 하나가 담당할 수 있는 길이

  return { valid: true, mode: 'shearflow', q, spacing };
}

/* ------------------ CH.5-5 조합하중 (축력 + 굽힘 / 편심) ------------------ */
export function computeCombined(s) {
  const errors = [];
  if (!(s.b > 0)) errors.push('폭(b)은 0보다 커야 합니다.');
  if (!(s.h > 0)) errors.push('높이(h)는 0보다 커야 합니다.');
  if (errors.length) return { valid: false, errors };

  const b = toBase(s.b, s.dimUnit, LENGTH_UNITS);
  const h = toBase(s.h, s.dimUnit, LENGTH_UNITS);
  const A = b * h;
  const I = Irect(b, h);
  const c = h / 2;

  let N_N;
  let M_Nm;
  if (s.mode === 'axial_bending') {
    N_N = toBase(s.N, s.NUnit, FORCE_UNITS);
    M_Nm = toBase(s.M, s.MUnit, TORQUE_UNITS);
  } else {
    if (!(s.P >= 0)) errors.push('하중(P)의 크기는 0 이상이어야 합니다.');
    if (errors.length) return { valid: false, errors };
    N_N = toBase(s.P, s.PUnit, FORCE_UNITS);
    const e_m = toBase(s.e, s.eUnit, LENGTH_UNITS);
    M_Nm = N_N * e_m; // 편심하중을 "축력 + 등가 모멘트"로 옮긴 것
  }

  const sigmaAxial = N_N / A;
  const sigmaBend = (M_Nm * c) / I;
  // 축력+굽힘: σ = N/A − M·y/I 이므로 상단(+y)은 굽힘분이 깎이고 하단은 더해진다.
  // 편심하중: 편심이 있는 쪽을 상단으로 정의하므로 그 쪽이 오히려 보강된다(부호 반대).
  const sigmaTop = s.mode === 'eccentric' ? sigmaAxial + sigmaBend : sigmaAxial - sigmaBend;
  const sigmaBottom = s.mode === 'eccentric' ? sigmaAxial - sigmaBend : sigmaAxial + sigmaBend;

  return { valid: true, A, I, c, N_N, M_Nm, sigmaAxial, sigmaBend, sigmaTop, sigmaBottom };
}
