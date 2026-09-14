// 참고자료 Example 6-6(지붕 purlin) 그대로: 직사각형 단면이 경사 α만큼 기울어진 채로
// 얹혀 있고, 항상 수직으로 작용하는 등분포하중 q가 그 기울어진 단면의 y/z 축 기준으로
// qy = q·cosα, qz = q·sinα로 분해된다. 단순보 가정(M = qL²/8)으로 My, Mz를 구함.
// 부호 규약은 정확히 참고자료 표(D/E/F/G 코너별 My·Mz 부호)와 맞춘 것.

export function computeInclinedLoads(b, h, q, L, alphaRad) {
  const Iy = (h * Math.pow(b, 3)) / 12; // z방향 두께 = b
  const Iz = (b * Math.pow(h, 3)) / 12; // y방향 두께 = h

  const qy = q * Math.cos(alphaRad);
  const qz = q * Math.sin(alphaRad);
  const My = (qz * L * L) / 8;
  const Mz = (qy * L * L) / 8;

  const stressAt = (y, z) => -(My * z) / Iy - (Mz * y) / Iz;

  // 중립축(n-n) 방향각 — tan β = (h²/b²)·tan α
  const betaRad = Math.atan(((h * h) / (b * b)) * Math.tan(alphaRad));

  const corners = [
    { name: 'D', y: h / 2, z: b / 2 },
    { name: 'E', y: -h / 2, z: -b / 2 },
    { name: 'F', y: h / 2, z: -b / 2 },
    { name: 'G', y: -h / 2, z: b / 2 },
  ].map((c) => {
    const sMy = -(My * c.z) / Iy;
    const sMz = -(Mz * c.y) / Iz;
    return { ...c, sMy, sMz, sigma: sMy + sMz };
  });

  return { Iy, Iz, qy, qz, My, Mz, betaRad, stressAt, corners };
}

// "경사 1:N" 같은 정수비로 각도를 고르게 하기 위한 헬퍼 — 소수점 각도 슬라이더 대신 씀.
export function slopeRatioToRad(run) {
  return Math.atan(1 / run);
}
export function radToSlopeRun(rad) {
  return 1 / Math.tan(rad);
}
