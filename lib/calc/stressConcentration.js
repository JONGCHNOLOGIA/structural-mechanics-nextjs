// CH.2-5 Stress Concentration — 원본 calculateStressConcentration()을 그대로 옮긴 것.
// K(응력집중계수)는 계산하지 않고 사용자가 교재 선도에서 읽은 값을 그대로 받는다.
import { LENGTH_UNITS, FORCE_UNITS, toBase } from './units1';

export function computeStressConcentration(s) {
  const errors = [];
  if (!(s.b > 0)) errors.push('판 폭(b)은 0보다 커야 합니다.');
  if (!(s.t > 0)) errors.push('판 두께(t)는 0보다 커야 합니다.');
  if (!(s.d > 0)) errors.push('구멍 직경(d)은 0보다 커야 합니다.');
  if (s.b > 0 && s.d > 0 && s.d >= s.b) errors.push('구멍 직경(d)은 판 폭(b)보다 작아야 합니다.');
  if (!(s.K > 0)) errors.push('응력집중계수(K)는 0보다 커야 합니다.');
  if (!(s.P >= 0)) errors.push('하중(P)의 크기는 0 이상이어야 합니다.');
  if (errors.length) return { valid: false, errors };

  const b_m = toBase(s.b, s.dimUnit, LENGTH_UNITS);
  const t_m = toBase(s.t, s.dimUnit, LENGTH_UNITS);
  const d_m = toBase(s.d, s.dimUnit, LENGTH_UNITS);
  const Anet = (b_m - d_m) * t_m; // 구멍을 뺀 순단면
  const P_N = toBase(s.P, s.PUnit, FORCE_UNITS);
  const sigmaNom = P_N / Anet;

  return { valid: true, Anet, sigmaNom, sigmaMax: s.K * sigmaNom };
}
