// 프로토타입의 epCompute()를 순수 함수로 옮긴 것. 직사각형 단면, 탄성→탄소성→완전소성.

export function computeElastoplastic(width, height, sigmaY, moment) {
  const c = height / 2;
  const I = (width * Math.pow(height, 3)) / 12;
  const My = (sigmaY * I) / c;
  const Mp = (sigmaY * width * height * height) / 4;
  let e, stage;
  if (moment <= My) {
    e = c;
    stage = moment <= 0 ? '하중 없음' : '탄성 (Elastic)';
  } else if (moment < Mp) {
    e = c * Math.sqrt(Math.max(0, 3 - (2 * moment) / My));
    stage = '탄소성 (Elastoplastic)';
  } else {
    e = 0;
    stage = '완전소성 (Fully Plastic)';
  }
  return { c, I, My, Mp, e, stage, shapeFactor: Mp / My };
}
