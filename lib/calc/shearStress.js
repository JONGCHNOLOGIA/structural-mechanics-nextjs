// CH.1-4 Shear Stress and Strain — 원본 calculateShear()를 그대로 옮긴 것.
// mode: 'single'(전단면 1개) | 'double'(전단면 2개) | 'bearing'(지압응력) | 'strain'(순수전단 변형)
import { LENGTH_UNITS, STRESS_UNITS, FORCE_UNITS, toBase } from './units1';

export function computeShear(s) {
  const errors = [];

  if (s.mode === 'single' || s.mode === 'double') {
    if (!(s.d > 0)) errors.push('직경(d)은 0보다 커야 합니다.');
    if (!(s.P >= 0)) errors.push('하중(P)의 크기는 0 이상이어야 합니다.');
    if (errors.length) return { valid: false, errors };

    const D = toBase(s.d, s.dimUnit, LENGTH_UNITS);
    const A_m2 = (Math.PI / 4) * D * D;
    const P_N = toBase(s.P, s.PUnit, FORCE_UNITS);
    // 이중전단은 하중이 두 전단면에 나뉘어 걸리므로 분모가 2A가 된다.
    const tau_Pa = s.mode === 'single' ? P_N / A_m2 : P_N / (2 * A_m2);
    return { valid: true, A_m2, tau_Pa, nPlanes: s.mode === 'single' ? 1 : 2, P_N };
  }

  if (s.mode === 'bearing') {
    if (!(s.d > 0)) errors.push('직경(d)은 0보다 커야 합니다.');
    if (!(s.t > 0)) errors.push('판 두께(t)는 0보다 커야 합니다.');
    if (!(s.P >= 0)) errors.push('하중(P)의 크기는 0 이상이어야 합니다.');
    if (errors.length) return { valid: false, errors };

    const D = toBase(s.d, s.dimUnit, LENGTH_UNITS);
    const T = toBase(s.t, s.dimUnit, LENGTH_UNITS);
    const Ab_m2 = D * T; // 지압은 원통면이 아니라 "투영" 면적 d×t를 쓴다
    const P_N = toBase(s.P, s.PUnit, FORCE_UNITS);
    return { valid: true, Ab_m2, sigma_b_Pa: P_N / Ab_m2, P_N };
  }

  // 'strain' — 전단변형각만 있으면 γ를 구하고, G가 있으면 τ=Gγ까지 계산한다.
  if (!isFinite(s.gammaDeg)) errors.push('전단변형각(γ)이 올바르지 않습니다.');
  if (s.G !== null && s.G !== undefined && s.G !== '' && !(s.G > 0)) errors.push('전단탄성계수(G)는 0보다 커야 합니다.');
  if (errors.length) return { valid: false, errors };

  const gamma_rad = (s.gammaDeg * Math.PI) / 180;
  const tau_Pa = s.G > 0 ? toBase(s.G, s.GUnit, STRESS_UNITS) * gamma_rad : null;
  return { valid: true, gamma_rad, tau_Pa };
}
