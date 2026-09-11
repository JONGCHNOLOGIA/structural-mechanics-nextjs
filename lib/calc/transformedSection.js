// 프로토타입의 tsTrapezoid() / computeTransformed()를 순수 함수로 옮긴 것.
// blocks: [{colorId, topWidth, bottomWidth, height, E, EUnit}], bottom→top 순서

function trapezoid(a, b, h) {
  const area = ((a + b) / 2) * h;
  if (area <= 0) return { area: 0, ybarLocal: 0, I0: 0 };
  const ybarLocal = (h * (2 * a + b)) / (3 * (a + b)); // 하단(폭 b)에서부터의 도심 위치
  const I0 = (Math.pow(h, 3) * (a * a + 4 * a * b + b * b)) / (36 * (a + b));
  return { area, ybarLocal, I0 };
}

export function computeTransformed(blocks, moment) {
  let cum = 0;
  const withY = blocks.map((b) => {
    const yBottom = cum;
    const yTop = cum + b.height;
    const tz = trapezoid(b.topWidth, b.bottomWidth, b.height);
    const yc = yBottom + tz.ybarLocal;
    cum = yTop;
    return { ...b, yBottom, yTop, yc, area: tz.area, I0own: tz.I0 };
  });
  const totalHeight = cum;
  const num = withY.reduce((s, b) => s + b.E * b.area * b.yc, 0);
  const den = withY.reduce((s, b) => s + b.E * b.area, 0);
  const ybar = den > 0 ? num / den : 0;

  let EIsum = 0;
  const withI = withY.map((b) => {
    const d = b.yc - ybar;
    const I = b.I0own + b.area * d * d;
    EIsum += b.E * I;
    return { ...b, I, d };
  });

  const stressAt = (y, E) => (EIsum > 0 ? (-moment * (y - ybar) * E) / EIsum : 0);

  return { blocks: withI, ybar, EIsum, totalHeight, stressAt };
}
