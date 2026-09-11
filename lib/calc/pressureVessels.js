// 프로토타입의 svCompute() / cvCompute()를 순수 함수로 옮긴 것.

export function computeSphericalVessel(r, t, p, E, nu) {
  const sigma = (p * r) / (2 * t);
  const tauOuter = sigma / 2;
  const tauInner = (sigma + p) / 2;
  const eps = E && nu !== null && nu !== undefined ? (sigma * (1 - nu)) / E : null;
  return { sigma, tauOuter, tauInner, eps };
}

export function computeCylindricalVessel(r, t, p, thetaDeg) {
  const sigma1 = (p * r) / t; // hoop
  const sigma2 = (p * r) / (2 * t); // longitudinal
  const tauOuter = sigma1 / 2;
  const tauInner = sigma1 / 2 + p / 2;
  const avg = (sigma1 + sigma2) / 2, diff = (sigma2 - sigma1) / 2; // x=longitudinal(sigma2), y=hoop(sigma1)
  const rad = (thetaDeg * Math.PI) / 180;
  const sx1 = avg + diff * Math.cos(2 * rad);
  const sy1 = 2 * avg - sx1;
  const tx1y1 = -diff * Math.sin(2 * rad);
  return { sigma1, sigma2, tauOuter, tauInner, sx1, sy1, tx1y1 };
}
