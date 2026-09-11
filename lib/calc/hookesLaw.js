// 프로토타입의 hkCompute()를 순수 함수로 옮긴 것.
// mode: 'stressToStrain' | 'strainToStress'

export function computeHookesLaw({ mode, E, nu, sigmaX, sigmaY, tauXY, epsX, epsY, gammaXY, thickness }) {
  const G = E / (2 * (1 + nu));
  let sx, sy, txy, ex, ey, gxy;
  if (mode === 'stressToStrain') {
    sx = sigmaX; sy = sigmaY; txy = tauXY;
    ex = (sx - nu * sy) / E;
    ey = (sy - nu * sx) / E;
    gxy = txy / G;
  } else {
    ex = epsX; ey = epsY; gxy = gammaXY;
    sx = (E / (1 - nu * nu)) * (ex + nu * ey);
    sy = (E / (1 - nu * nu)) * (ey + nu * ex);
    txy = G * gxy;
  }
  const ez = -(nu / E) * (sx + sy);
  const e = ex + ey + ez; // dilatation
  const u = 0.5 * (sx * ex + sy * ey + txy * gxy); // strain energy density
  const deltaT = thickness !== null && thickness !== undefined ? ez * thickness : null;
  return { G, sx, sy, txy, ex, ey, gxy, ez, e, u, deltaT };
}
