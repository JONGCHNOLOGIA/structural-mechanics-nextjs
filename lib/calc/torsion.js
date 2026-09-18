// CH.3 Torsion 공용 계산 — 원본 calculateTorsionalDeformation() / calculateTorsionFormula() /
// calculateTorsionDesign() / calculateTorqueDiagram() / calculateStrengthToWeight()를 옮긴 것.
import { LENGTH_UNITS, STRESS_UNITS, TORQUE_UNITS, toBase, IpSolid, IpHollow } from './units1';

// 중공축 설계에서 쓰는 두께 가정 — 교재 예제와 같이 t = d₂/10, 즉 d₁ = 0.8·d₂.
export const HOLLOW_K = 0.8;

// 원형/중공 단면의 극관성모멘트와 반지름 — CH.3의 여러 소주제가 같은 규칙을 쓴다.
export function polarProperties(sectionType, dims, dimUnit) {
  const errors = [];
  let Ip = NaN, rOuter = NaN, rInner = 0;

  if (sectionType === 'solid_circular') {
    if (!(dims.d > 0)) errors.push('직경(d)은 0보다 커야 합니다.');
    else {
      const D = toBase(dims.d, dimUnit, LENGTH_UNITS);
      Ip = IpSolid(D);
      rOuter = D / 2;
    }
  } else {
    const dO = dims.d_outer, dI = dims.d_inner;
    if (!(dO > 0)) errors.push('외경(d₂)은 0보다 커야 합니다.');
    if (!(dI > 0)) errors.push('내경(d₁)은 0보다 커야 합니다.');
    if (dO > 0 && dI > 0 && dI >= dO) errors.push('내경(d₁)은 외경(d₂)보다 작아야 합니다.');
    if (dO > 0 && dI > 0 && dI < dO) {
      const DO = toBase(dO, dimUnit, LENGTH_UNITS);
      const DI = toBase(dI, dimUnit, LENGTH_UNITS);
      Ip = IpHollow(DO, DI);
      rOuter = DO / 2;
      rInner = DI / 2;
    }
  }
  return { Ip, rOuter, rInner, errors };
}

// CH.3-1 — 비틀림각 φ, 단위길이당 비틀림률 θ, 표면 전단변형률 γ_max
export function computeTorsionalDeformation(s) {
  const { Ip, rOuter, errors } = polarProperties(s.sectionType, s.dims, s.dimUnit);
  if (!(s.L > 0)) errors.push('부재 길이(L)는 0보다 커야 합니다.');
  if (!(s.G > 0)) errors.push('전단탄성계수(G)는 0보다 커야 합니다.');
  if (!(s.T >= 0)) errors.push('토크(T)의 크기는 0 이상이어야 합니다.');
  if (errors.length || !(Ip > 0)) return { valid: false, errors };

  const L_m = toBase(s.L, s.LUnit, LENGTH_UNITS);
  const G_Pa = toBase(s.G, s.GUnit, STRESS_UNITS);
  const T_Nm = toBase(s.T, s.TUnit, TORQUE_UNITS);

  const phi_rad = (T_Nm * L_m) / (G_Pa * Ip); // φ = TL/(G·Ip)
  const theta = phi_rad / L_m; // 단위길이당 비틀림률
  const gammaMax = rOuter * theta; // 표면에서 최대

  return { valid: true, Ip, phi_rad, theta, gammaMax, rOuter };
}

// CH.3-2 — 단면 내 전단응력 분포 (중심 0 → 표면 최대, 반지름에 선형)
export function computeTorsionFormula(s) {
  const { Ip, rOuter, rInner, errors } = polarProperties(s.sectionType, s.dims, s.dimUnit);
  if (!(s.T >= 0)) errors.push('토크(T)의 크기는 0 이상이어야 합니다.');
  if (errors.length || !(Ip > 0)) return { valid: false, errors };

  const T_Nm = toBase(s.T, s.TUnit, TORQUE_UNITS);
  const tauMax = (T_Nm * rOuter) / Ip; // τ_max = T·r/Ip
  const tauMin = rInner > 0 ? (T_Nm * rInner) / Ip : 0;

  return { valid: true, Ip, tauMax, tauMin, rOuter, rInner };
}

// CH.3-3 — 허용토크 / 필요지름 설계.
// 응력 조건과 비틀림 조건을 각각 따로 풀고, 둘 다 만족하는 쪽(토크는 더 작은 값, 지름은 더 큰 값)을 택한다.
// 원본은 중공축 + 허용토크 모드에서 존재하지 않는 dims.d_inner를 검사해 항상 에러가 났다.
// SETTING MENU의 안내문(d₁ = 0.8·d₂)과 필요지름 모드의 형상계수가 이미 같은 가정을 쓰고 있으므로,
// 여기서도 d₁ = HOLLOW_K·d₂ 로 통일했다.
export function computeTorsionDesign(s) {
  const errors = [];
  if (!(s.L > 0)) errors.push('부재 길이(L)는 0보다 커야 합니다.');
  if (!(s.G > 0)) errors.push('전단탄성계수(G)는 0보다 커야 합니다.');
  if (!(s.tauAllow > 0)) errors.push('허용 전단응력(τ_allow)은 0보다 커야 합니다.');
  if (s.twistMode === 'total' && !(s.phiAllowDeg > 0)) errors.push('허용 비틀림각(φ_allow)은 0보다 커야 합니다.');
  if (s.twistMode === 'rate' && !(s.thetaAllowDeg > 0)) errors.push('허용 비틀림률(θ_allow)은 0보다 커야 합니다.');

  const L_m = toBase(s.L, s.LUnit, LENGTH_UNITS);
  const G_Pa = toBase(s.G, s.GUnit, STRESS_UNITS);
  const tauAllow_Pa = toBase(s.tauAllow, s.tauAllowUnit, STRESS_UNITS);
  // 비틀림 제한을 단위길이당 비틀림률(rad/m) 하나로 환산해 둔다 (전체 각도 모드면 φ_allow/L).
  const thetaAllow_rad_per_m =
    s.twistMode === 'total'
      ? ((s.phiAllowDeg * Math.PI) / 180) / L_m
      : ((s.thetaAllowDeg * Math.PI) / 180) / LENGTH_UNITS[s.thetaLenUnit];
  const hollow = s.sectionType === 'hollow_circular';
  const shapeFactor = 1 - Math.pow(HOLLOW_K, 4); // Ip = π d₂⁴(1−k⁴)/32

  if (s.calcMode === 'maxTorque') {
    if (!hollow && !(s.dims.d > 0)) errors.push('직경(d)은 0보다 커야 합니다.');
    if (hollow && !(s.dims.d_outer > 0)) errors.push('외경(d₂)은 0보다 커야 합니다.');
    if (errors.length) return { valid: false, errors };

    const D = toBase(hollow ? s.dims.d_outer : s.dims.d, s.dimUnit, LENGTH_UNITS);
    const Ip = hollow ? IpHollow(D, HOLLOW_K * D) : IpSolid(D);
    const r = D / 2;

    const T_stress = (tauAllow_Pa * Ip) / r; // τ_allow = T·r/Ip
    const T_twist = G_Pa * Ip * thetaAllow_rad_per_m; // θ_allow = T/(G·Ip)
    const governing = Math.min(T_stress, T_twist);
    return {
      valid: true, mode: 'maxTorque', Ip, r, D,
      T_stress, T_twist, governing, governedBy: T_stress < T_twist ? 'stress' : 'twist',
    };
  }

  if (!(s.T >= 0)) errors.push('토크(T)의 크기는 0 이상이어야 합니다.');
  if (errors.length) return { valid: false, errors };

  const T_Nm = toBase(s.T, s.TUnit, TORQUE_UNITS);
  // 응력 조건: τ_allow = 16T/(πd³)  (중공이면 형상계수로 나눈다)
  const d_stress = Math.pow((16 * T_Nm) / (Math.PI * tauAllow_Pa * (hollow ? shapeFactor : 1)), 1 / 3);
  // 비틀림 조건: 필요한 Ip를 먼저 구하고 지름으로 되돌린다.
  const reqIp = T_Nm / (G_Pa * thetaAllow_rad_per_m);
  const d_twist = Math.pow((32 * reqIp) / (Math.PI * (hollow ? shapeFactor : 1)), 1 / 4);
  const governing = Math.max(d_stress, d_twist);
  return {
    valid: true, mode: 'reqDiameter', reqIp,
    d_stress, d_twist, governing, governedBy: d_stress > d_twist ? 'stress' : 'twist',
  };
}

// CH.3-4 — 여러 구간으로 나뉜 축. 구간마다 내부토크·지름·재질이 달라도 비틀림각은 그냥 더하면 된다.
export function computeTorqueDiagram(state) {
  const errors = [];
  const active = state.segs.slice(0, state.segCount);
  active.forEach((s, i) => {
    if (!(s.L > 0)) errors.push(`구간 ${i + 1}: 길이(L)는 0보다 커야 합니다.`);
    if (!(s.d > 0)) errors.push(`구간 ${i + 1}: 직경(d)은 0보다 커야 합니다.`);
    if (!(s.G > 0)) errors.push(`구간 ${i + 1}: 전단탄성계수(G)는 0보다 커야 합니다.`);
  });
  if (errors.length) return { valid: false, errors };

  let totalPhi = 0;
  const perSeg = active.map((s) => {
    const D = toBase(s.d, s.dimUnit, LENGTH_UNITS);
    const L_m = toBase(s.L, s.LUnit, LENGTH_UNITS);
    const G_Pa = toBase(s.G, s.GUnit, STRESS_UNITS);
    const T_Nm = toBase(s.T, s.TUnit, TORQUE_UNITS);
    const Ip = IpSolid(D);
    const phi = (T_Nm * L_m) / (G_Pa * Ip);
    // τ_max는 "가장 큰 전단응력의 크기"라서 음수로 적으면 이상하다.
    // T의 부호는 회전 방향일 뿐이므로(선도에서는 그대로 살린다) 응력은 절댓값으로 돌려준다.
    const tauMax = Math.abs((T_Nm * (D / 2)) / Ip);
    totalPhi += phi;
    return { T_Nm, L_m, D, G_Pa, Ip, phi, tauMax };
  });
  return { valid: true, perSeg, totalPhi };
}

// CH.3-5 — 같은 외경의 중공축과 중실축 비교. 모든 결과가 "비율"이라 단위가 약분돼 사라진다.
export function computeStrengthToWeight(s) {
  const errors = [];
  if (!(s.D > 0)) errors.push('외경(D)은 0보다 커야 합니다.');
  if (!(s.k > 0 && s.k < 1)) errors.push('내외경비(k)는 0과 1 사이여야 합니다.');
  if (errors.length) return { valid: false, errors };

  const D_m = toBase(s.D, s.DUnit, LENGTH_UNITS);
  const IpSol = IpSolid(D_m);
  const IpHol = IpHollow(D_m, s.k * D_m);
  const Asol = (Math.PI / 4) * D_m * D_m;
  const Ahol = (Math.PI / 4) * (D_m * D_m - Math.pow(s.k * D_m, 2));

  const tauRatio = IpSol / IpHol; // 같은 T를 걸었을 때 τ_hollow/τ_solid (r이 같으므로 Ip만 남는다)
  const weightRatio = Ahol / Asol; // 길이·비중량이 같으면 무게비는 단면적비
  const T_ratio = IpHol / IpSol; // 같은 τ_allow에서 버틸 수 있는 토크비
  const TW_ratio = T_ratio / weightRatio;
  return { valid: true, IpSol, IpHol, Asol, Ahol, tauRatio, weightRatio, T_ratio, TW_ratio };
}
