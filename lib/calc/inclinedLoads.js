// 프로토타입의 ilCompute()를 순수 함수로 옮긴 것.
// width(b), height(h): 직사각형 단면. moment: 크기, alphaDeg: Z축 기준 기울기(도)

export function computeInclinedLoads(width, height, moment, alphaDeg) {
  const Iz = (width * Math.pow(height, 3)) / 12; // z축 굽힘 (y방향 두께 = height)
  const Iy = (height * Math.pow(width, 3)) / 12; // y축 굽힘 (z방향 두께 = width)
  const rad = (alphaDeg * Math.PI) / 180;
  const Mz = moment * Math.cos(rad);
  const My = moment * Math.sin(rad);
  const stressAt = (y, z) => -(Mz * y) / Iz + (My * z) / Iy;
  const betaRad = Math.atan2(My / Iy, Mz / Iz); // 중립축 방향각 (z축 기준)
  return { Iz, Iy, Mz, My, stressAt, betaRad };
}
