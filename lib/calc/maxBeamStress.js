// 프로토타입의 mbCompute()를 순수 함수로 옮긴 것. 직사각형 단면.

import { principalFromState } from './principalStress';

export function computeMaxBeamStress(width, height, M, V, y) {
  const I = (width * Math.pow(height, 3)) / 12;
  const sigmaX = (-M * y) / I;
  const Q = (width / 2) * (Math.pow(height, 2) / 4 - y * y);
  const tau = (V * Q) / (I * width);
  const pr = principalFromState(sigmaX, 0, tau);
  return { I, sigmaX, tau, ...pr };
}
