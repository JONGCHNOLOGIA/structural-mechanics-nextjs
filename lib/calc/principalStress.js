// 프로토타입의 principalFromState()를 순수 함수로 옮긴 것.

export function principalFromState(sx, sy, txy) {
  const avg = (sx + sy) / 2, diff = (sx - sy) / 2;
  const R = Math.sqrt(diff * diff + txy * txy);
  const thetaP = (0.5 * Math.atan2(txy, diff) * 180) / Math.PI;
  return { avg, diff, R, sigma1: avg + R, sigma2: avg - R, tauMax: R, thetaP, thetaS: thetaP - 45 };
}
