// 프로토타입의 computeComposite() / isDoublySymmetric()를 순수 함수로 옮긴 것.
// 원본은 전역 `cb.blocks`/`cb.moment`를 직접 참조했지만, 여기서는 인자로 받도록 바꿔서
// React의 useState와 자연스럽게 맞물리게 함 (로직 자체는 완전히 동일).

export function computeComposite(blocks, moment) {
  let cum = 0;
  const withY = blocks.map((b) => {
    const yBottom = cum;
    const yTop = cum + b.height;
    const yc = (yBottom + yTop) / 2;
    cum = yTop;
    return { ...b, yBottom, yTop, yc, area: b.width * b.height };
  });
  const totalHeight = cum;
  const num = withY.reduce((s, b) => s + b.E * b.area * b.yc, 0);
  const den = withY.reduce((s, b) => s + b.E * b.area, 0);
  const ybar = den > 0 ? num / den : 0;

  let EIsum = 0;
  const withI = withY.map((b) => {
    const d = b.yc - ybar;
    const I0 = (b.width * Math.pow(b.height, 3)) / 12;
    const I = I0 + b.area * d * d;
    EIsum += b.E * I;
    return { ...b, I, d };
  });

  // 표준(Gere) 부호 관례: σ = -M(y-ȳ)E/ΣEI → M>0이면 새깅(sagging)
  const stressAt = (y, E) => (EIsum > 0 ? (-moment * (y - ybar) * E) / EIsum : 0);

  return { blocks: withI, ybar, EIsum, totalHeight, stressAt };
}

export function isDoublySymmetric(blocks) {
  const n = blocks.length;
  if (n < 3) return false;
  for (let i = 0; i < Math.floor(n / 2); i++) {
    const a = blocks[i];
    const b = blocks[n - 1 - i];
    if (Math.abs(a.height - b.height) > 1e-9 * Math.max(1, a.height)) return false;
    if (Math.abs(a.width - b.width) > 1e-9 * Math.max(1, a.width)) return false;
    if (Math.abs(a.E - b.E) > 1e-6 * Math.max(1, Math.abs(a.E))) return false;
  }
  return true;
}
