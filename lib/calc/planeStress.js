// 프로토타입의 psCompute()를 순수 함수로 옮긴 것. sigmaX/sigmaY/tauXY: Pa, thetaDeg: 도

export function computePlaneStress(sigmaX, sigmaY, tauXY, thetaDeg) {
  const rad = (thetaDeg * Math.PI) / 180;
  const avg = (sigmaX + sigmaY) / 2;
  const diff = (sigmaX - sigmaY) / 2;
  const sx1 = avg + diff * Math.cos(2 * rad) + tauXY * Math.sin(2 * rad);
  const sy1 = avg - diff * Math.cos(2 * rad) - tauXY * Math.sin(2 * rad);
  const tx1y1 = -diff * Math.sin(2 * rad) + tauXY * Math.cos(2 * rad);
  const R = Math.sqrt(diff * diff + tauXY * tauXY);
  const thetaPrad = 0.5 * Math.atan2(tauXY, diff);
  const thetaSrad = thetaPrad - Math.PI / 4;
  return {
    sx1, sy1, tx1y1, avg, diff, R,
    sigma1: avg + R,
    sigma2: avg - R,
    thetaPdeg: (thetaPrad * 180) / Math.PI,
    thetaSdeg: (thetaSrad * 180) / Math.PI,
  };
}
